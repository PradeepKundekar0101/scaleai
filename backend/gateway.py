"""
API Gateway: reverse proxy, rate limiting, field stripping, and usage logging.
"""
import hashlib
import json
import re
import time
import logging
import base64
from datetime import datetime, timezone

import httpx
from bson import ObjectId

logger = logging.getLogger(__name__)


def hash_api_key(raw_key: str) -> str:
    return hashlib.sha256(raw_key.encode("utf-8")).hexdigest()


def strip_fields(data, fields_to_strip: set):
    """Recursively remove sensitive fields from response data."""
    if isinstance(data, dict):
        return {k: strip_fields(v, fields_to_strip) for k, v in data.items() if k not in fields_to_strip}
    elif isinstance(data, list):
        return [strip_fields(item, fields_to_strip) for item in data]
    return data


def path_matches(pattern: str, actual: str) -> bool:
    """Check if an actual path matches a pattern with :param placeholders."""
    # Normalize
    pattern = pattern.rstrip("/")
    actual = actual.rstrip("/")

    pattern_parts = pattern.split("/")
    actual_parts = actual.split("/")

    if len(pattern_parts) != len(actual_parts):
        return False

    for pp, ap in zip(pattern_parts, actual_parts):
        if pp.startswith(":"):
            continue  # wildcard match
        if pp != ap:
            return False
    return True


def decode_jwt_payload(token: str) -> dict:
    """Decode JWT payload without verification (just base64)."""
    try:
        parts = token.split(".")
        if len(parts) != 3:
            return {}
        payload = parts[1]
        # Add padding
        padding = 4 - len(payload) % 4
        if padding != 4:
            payload += "=" * padding
        decoded = base64.urlsafe_b64decode(payload)
        return json.loads(decoded)
    except Exception:
        return {}


async def get_valid_token(project: dict, db) -> str:
    """Get a valid auth token, re-logging in if necessary."""
    cached = project.get("cached_jwt")
    if cached and cached != "mock_jwt_token":
        payload = decode_jwt_payload(cached)
        exp = payload.get("exp", 0)
        if exp > time.time() + 300:  # Valid for more than 5 minutes
            return cached

    # Need to re-login
    target_url = project.get("target_backend_url", "").rstrip("/")
    login_endpoint = project.get("login_endpoint", "/api/auth/login")
    sa_email = project.get("service_account_email", "")
    sa_password = project.get("service_account_password", "")

    if not target_url:
        return cached or ""

    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.post(
                f"{target_url}{login_endpoint}",
                json={"email": sa_email, "password": sa_password},
                headers={"Content-Type": "application/json"},
            )
            if resp.status_code == 200:
                data = resp.json()
                token = (
                    data.get("token")
                    or data.get("accessToken")
                    or data.get("access_token")
                    or (data.get("data", {}) or {}).get("token")
                    or ""
                )
                if token:
                    now = datetime.now(timezone.utc).isoformat()
                    await db.projects.update_one(
                        {"_id": project["_id"]},
                        {"$set": {"cached_jwt": token, "jwt_cached_at": now}}
                    )
                    return token
    except Exception as e:
        logger.error(f"Gateway auth failed: {e}")

    return cached or ""


async def gateway_handler(project_slug: str, api_path: str, request, db):
    """Main gateway handler implementing the 11-step flow."""
    start_time = time.time()
    api_path_full = f"/{api_path}" if not api_path.startswith("/") else api_path

    # Step 1-2: Find project
    project = await db.projects.find_one({"slug": project_slug, "status": "live"})
    if not project:
        return {
            "status": 404,
            "body": {"error": "project_not_found", "message": f"No active API found for '{project_slug}'"},
            "headers": {},
        }

    project_id = project["_id"]

    # Step 3: Extract & validate API key
    api_key_raw = request.headers.get("x-api-key", "")
    if not api_key_raw:
        return {
            "status": 401,
            "body": {"error": "missing_api_key", "message": "Provide your API key via X-API-Key header"},
            "headers": {},
        }

    key_hash = hash_api_key(api_key_raw)
    api_key_doc = await db.api_keys.find_one({"key_hash": key_hash, "project_id": project_id, "is_active": True})
    if not api_key_doc:
        return {
            "status": 403,
            "body": {"error": "invalid_api_key", "message": "This API key is invalid or has been revoked"},
            "headers": {},
        }

    # Step 4: Check endpoint is exposed
    endpoint_doc = None
    exposed_endpoints = await db.exposed_endpoints.find(
        {"project_id": project_id, "method": request.method, "is_active": True}
    ).to_list(500)

    for ep in exposed_endpoints:
        if path_matches(ep.get("path", ""), api_path_full):
            endpoint_doc = ep
            break

    if not endpoint_doc:
        return {
            "status": 404,
            "body": {"error": "endpoint_not_found", "message": f"{request.method} {api_path_full} is not available via the public API"},
            "headers": {},
        }

    # Step 5: Rate limiting
    rate_limit = endpoint_doc.get("rate_limit", 100)
    current_minute = int(time.time() / 60)
    rate_key = f"{key_hash}:{current_minute}"

    await db.rate_limits.update_one(
        {"_id": rate_key},
        {"$inc": {"count": 1}, "$setOnInsert": {"created_at": datetime.now(timezone.utc)}},
        upsert=True,
    )
    rate_doc = await db.rate_limits.find_one({"_id": rate_key})
    current_count = rate_doc.get("count", 1) if rate_doc else 1

    next_window = (current_minute + 1) * 60
    rate_headers = {
        "X-RateLimit-Limit": str(rate_limit),
        "X-RateLimit-Remaining": str(max(0, rate_limit - current_count)),
        "X-RateLimit-Reset": str(next_window),
    }

    if current_count > rate_limit:
        rate_headers["X-RateLimit-Remaining"] = "0"
        return {
            "status": 429,
            "body": {"error": "rate_limit_exceeded", "message": "Too many requests. Try again shortly."},
            "headers": rate_headers,
        }

    # Step 6: Get valid auth token
    token = await get_valid_token(project, db)

    # Step 7: Forward request
    target_url = project.get("target_backend_url", "").rstrip("/")

    if not target_url or not token:
        latency_ms = int((time.time() - start_time) * 1000)
        try:
            await db.usage_logs.insert_one({
                "key_hash": key_hash, "key_name": api_key_doc.get("name", ""),
                "project_slug": project_slug, "endpoint": api_path_full,
                "method": request.method, "status_code": 502,
                "latency_ms": latency_ms, "timestamp": datetime.now(timezone.utc),
            })
        except Exception:
            pass
        return {
            "status": 502,
            "body": {"error": "backend_unreachable", "message": "The upstream service is not configured or not responding"},
            "headers": rate_headers,
        }

    forward_url = f"{target_url}{api_path_full}"

    # Build query string
    query_string = str(request.query_params)
    if query_string:
        forward_url += f"?{query_string}"

    forward_headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": request.headers.get("content-type", "application/json"),
        "X-Forwarded-For": request.client.host if request.client else "unknown",
        "X-Scalable-Key": api_key_doc.get("key_prefix", ""),
    }

    upstream_status = 502
    response_data = None

    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            body = None
            if request.method in ("POST", "PUT", "PATCH"):
                body = await request.body()

            resp = await client.request(
                method=request.method,
                url=forward_url,
                headers=forward_headers,
                content=body,
            )
            upstream_status = resp.status_code
            try:
                response_data = resp.json()
            except Exception:
                response_data = {"raw": resp.text}

    except httpx.ConnectError:
        upstream_status = 502
        response_data = {"error": "backend_unreachable", "message": "The upstream service is not responding"}
    except httpx.TimeoutException:
        upstream_status = 502
        response_data = {"error": "backend_unreachable", "message": "The upstream service did not respond in time"}
    except Exception as e:
        upstream_status = 502
        response_data = {"error": "backend_unreachable", "message": f"Error contacting upstream: {str(e)}"}

    # Step 8: Filter response
    fields_to_strip = set(endpoint_doc.get("fields_to_strip", []))
    if fields_to_strip and response_data:
        response_data = strip_fields(response_data, fields_to_strip)

    # Step 9: Log usage (fire-and-forget via unawaited task - just insert, don't block)
    latency_ms = int((time.time() - start_time) * 1000)
    log_doc = {
        "key_hash": key_hash,
        "key_name": api_key_doc.get("name", ""),
        "project_slug": project_slug,
        "endpoint": api_path_full,
        "method": request.method,
        "status_code": upstream_status,
        "latency_ms": latency_ms,
        "timestamp": datetime.now(timezone.utc),
    }
    # Use background insert - don't await
    try:
        await db.usage_logs.insert_one(log_doc)
    except Exception:
        pass

    # Step 10-11: Set response headers and return
    final_headers = {
        **rate_headers,
        "X-Powered-By": "Scalable",
        "Access-Control-Allow-Origin": "*",
    }

    return {
        "status": upstream_status,
        "body": response_data,
        "headers": final_headers,
    }
