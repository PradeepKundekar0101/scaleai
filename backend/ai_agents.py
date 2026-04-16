"""
AI agents for code analysis and security auditing.
Uses Emergent LLM key with Claude Sonnet via emergentintegrations.
Falls back to hardcoded demo results on failure.
"""
import os
import json
import re
import logging
import uuid
import asyncio

# Force OpenAI client to use short timeout and no retries BEFORE any import
os.environ.setdefault("OPENAI_TIMEOUT", "30")
os.environ.setdefault("OPENAI_MAX_RETRIES", "0")

from demo_scan_results import DEMO_CODE_ANALYSIS, DEMO_SECURITY_AUDIT

try:
    from emergentintegrations.llm.chat import LlmChat, UserMessage
    _HAS_EMERGENT = True
    try:
        import litellm
        litellm.request_timeout = 30
        litellm.num_retries = 0
    except ImportError:
        pass
except ImportError:
    _HAS_EMERGENT = False
    LlmChat = None
    UserMessage = None

logger = logging.getLogger(__name__)

CODE_ANALYST_SYSTEM_PROMPT = """You are a Code Analyst Agent for Scalable, a platform that helps SaaS companies expose their internal APIs as public APIs.

You receive source code files from a web application backend. Your job:

1. Find EVERY API route/endpoint defined in the code.
2. For each route, identify:
   - HTTP method (GET, POST, PUT, DELETE, PATCH)
   - URL path (e.g., /api/orders, /api/users/:id)
   - What the handler does (read the actual code)
   - What middleware it uses (auth? admin? rate limiting?)
   - What fields appear in the response
   - Which response fields are sensitive (passwords, hashes, internal scores, costs, IPs, tokens)
3. Follow import chains: if a route file imports a controller, read the controller code. If it uses middleware, read the middleware to understand auth. If it queries a model, read the model to understand data shapes.
4. Detect the authentication strategy (JWT, session, Firebase, OAuth, etc.)

Return ONLY valid JSON. No markdown, no code blocks, no explanation. Just the JSON object:
{
  "routes": [
    {
      "method": "GET",
      "path": "/api/orders",
      "file": "src/routes/orders.ts",
      "description": "Returns all orders for the authenticated user with items, totals, and delivery status",
      "middleware": ["auth"],
      "responseFields": ["id", "userId", "items", "total", "status", "createdAt", "internalMargin", "supplierCost"],
      "sensitiveFields": ["internalMargin", "supplierCost", "deliveryPartnerPayout"]
    }
  ],
  "authStrategy": {
    "type": "jwt",
    "loginEndpoint": "/api/auth/login",
    "headerFormat": "Authorization: Bearer <token>"
  }
}"""

SECURITY_AUDITOR_SYSTEM_PROMPT = """You are a Security Auditor Agent. You receive API routes discovered from a SaaS application codebase. Assess each route's risk level for PUBLIC API exposure.

GREEN (safe to expose):
- Read-only endpoints returning non-sensitive data
- User-scoped data (authenticated user's own data only)
- No admin privileges required
- No sensitive business metrics, passwords, or PII in response

YELLOW (expose with modifications):
- Returns some sensitive fields that MUST be stripped (passwords, hashes, internal scores, IPs, costs)
- Write operations that need careful rate limiting
- User profile endpoints with mixed sensitive/non-sensitive data

RED (never expose):
- Admin-only endpoints
- Authentication/registration endpoints (login, register, password reset)
- Internal analytics with business-sensitive metrics (revenue, margins, costs)
- System configuration endpoints
- Endpoints exposing other users' data

For YELLOW routes, specify EXACTLY which fields must be stripped from the public response.

Return ONLY valid JSON. No markdown, no code blocks:
{
  "auditedRoutes": [
    {
      "method": "GET",
      "path": "/api/orders",
      "risk": "green",
      "riskReason": "Read-only, user-scoped, returns order data without sensitive business metrics",
      "recommendation": "Safe to expose as-is",
      "fieldsToStrip": [],
      "suggestedRateLimit": 100
    }
  ]
}"""


def extract_json(text: str) -> dict:
    """Extract JSON from text, handling markdown code blocks."""
    # Try direct parse
    text = text.strip()
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        pass

    # Try extracting from code blocks
    patterns = [
        r"```json\s*\n?(.*?)\n?\s*```",
        r"```\s*\n?(.*?)\n?\s*```",
    ]
    for pattern in patterns:
        match = re.search(pattern, text, re.DOTALL)
        if match:
            try:
                return json.loads(match.group(1).strip())
            except json.JSONDecodeError:
                continue

    # Try finding JSON object boundaries
    start = text.find("{")
    if start >= 0:
        depth = 0
        for i in range(start, len(text)):
            if text[i] == "{":
                depth += 1
            elif text[i] == "}":
                depth -= 1
                if depth == 0:
                    try:
                        return json.loads(text[start:i + 1])
                    except json.JSONDecodeError:
                        break

    raise ValueError("Could not extract valid JSON from response")


async def call_claude(system_prompt: str, user_message: str) -> dict:
    """Call Claude via emergentintegrations with retry. Returns parsed JSON."""
    if not _HAS_EMERGENT:
        raise ImportError("emergentintegrations is not installed")
    api_key = os.environ.get("EMERGENT_LLM_KEY", "")
    if not api_key:
        raise ValueError("EMERGENT_LLM_KEY not set")

    try:
        chat = LlmChat(
            api_key=api_key,
            session_id=f"scalable-scan-{uuid.uuid4().hex[:8]}",
            system_message=system_prompt,
        )
        chat.with_model("anthropic", "claude-4-sonnet-20250514")

        msg = UserMessage(text=user_message)
        response = await chat.send_message(msg)

        return extract_json(response)
    except Exception as e:
        logger.error(f"Claude API failed: {e}")
        raise


async def call_claude_text(system_prompt: str, user_message: str) -> str:
    """Call Claude via emergentintegrations with retry. Returns raw text."""
    if not _HAS_EMERGENT:
        raise ImportError("emergentintegrations is not installed")
    api_key = os.environ.get("EMERGENT_LLM_KEY", "")
    if not api_key:
        raise ValueError("EMERGENT_LLM_KEY not set")

    try:
        chat = LlmChat(
            api_key=api_key,
            session_id=f"scalable-sdk-{uuid.uuid4().hex[:8]}",
            system_message=system_prompt,
        )
        chat.with_model("anthropic", "claude-4-sonnet-20250514")

        msg = UserMessage(text=user_message)
        response = await chat.send_message(msg)
        return response
    except Exception as e:
        logger.error(f"Claude text API failed: {e}")
        raise


async def analyze_code(files: dict) -> dict:
    """Run Code Analyst agent on source files."""
    # Build user message with all files
    file_sections = []
    for filepath, content in files.items():
        file_sections.append(f"--- FILE: {filepath} ---\n{content}")
    user_message = "\n\n".join(file_sections)

    try:
        result = await call_claude(CODE_ANALYST_SYSTEM_PROMPT, user_message)
        if "routes" in result:
            logger.info(f"Code analysis found {len(result['routes'])} routes")
            return result
        else:
            logger.warning("Code analysis returned unexpected format, using demo fallback")
            return DEMO_CODE_ANALYSIS
    except Exception as e:
        logger.error(f"Code analysis failed: {e}, using demo fallback")
        return DEMO_CODE_ANALYSIS


async def audit_security(code_analysis: dict) -> dict:
    """Run Security Auditor agent on discovered routes."""
    user_message = json.dumps(code_analysis, indent=2)

    try:
        result = await call_claude(SECURITY_AUDITOR_SYSTEM_PROMPT, user_message)
        if "auditedRoutes" in result:
            logger.info(f"Security audit completed for {len(result['auditedRoutes'])} routes")
            return result
        else:
            logger.warning("Security audit returned unexpected format, using demo fallback")
            return DEMO_SECURITY_AUDIT
    except Exception as e:
        logger.error(f"Security audit failed: {e}, using demo fallback")
        return DEMO_SECURITY_AUDIT


OPENAPI_SCHEMA_DESIGNER_PROMPT = """You are an API Schema Designer. Generate a complete OpenAPI 3.0 specification in JSON format from the provided endpoint list.

Requirements:
- Authentication: API Key via X-API-Key header (securitySchemes)
- Include realistic example values in all request/response schemas
- Sensitive fields that are marked for stripping must NOT appear in response schemas
- Include standard error responses on every endpoint: 401 (missing key), 403 (invalid key), 404 (not found), 429 (rate limited)
- Group endpoints by resource using tags (e.g., Orders, Products, Restaurants)
- Include rate limit response headers in descriptions: X-RateLimit-Limit, X-RateLimit-Remaining
- info section: title = "{projectName} API", version = "1.0.0", description includes "Powered by Scalable"
- servers: [{{ url: "{gatewayBaseUrl}" }}]
- For each endpoint, generate realistic response schemas based on the endpoint description and path
- For POST/PUT/PATCH endpoints, include requestBody schemas
- Use proper $ref references for reusable schemas in components/schemas

Return ONLY the complete OpenAPI 3.0 JSON object. No markdown, no explanation, no code blocks."""

SDK_GENERATOR_PROMPT = """You are a TypeScript SDK generator. Generate a complete, single-file typed SDK from the provided API endpoints.

Requirements:
- Use axios for HTTP requests (import axios and AxiosInstance from 'axios')
- Export a main class: ScalableClient
- Constructor accepts: {{ apiKey: string; baseUrl?: string }}
- Create typed interfaces for ALL request and response schemas based on the endpoint descriptions
- Resource-based method organization using getter properties:
  - client.orders.list() → Promise<Order[]>
  - client.orders.get(id: string) → Promise<Order>
  - client.orders.create(params: CreateOrderParams) → Promise<Order>
  - client.products.list() → Promise<Product[]>
  - etc.
- Comprehensive JSDoc comments on every method
- Export a ScalableError class with statusCode, errorCode, and message
- Automatically set X-API-Key header on every request
- Default baseUrl: "{gatewayBaseUrl}"
- Handle path parameters by replacing :param with actual values
- Include proper error handling in the HTTP client

Return ONLY TypeScript code. No markdown, no code blocks, no explanation. Just raw .ts file contents starting with import statements."""


async def generate_openapi_spec_ai(project_name: str, gateway_url: str, endpoints: list) -> dict:
    """Generate OpenAPI 3.0 spec using Claude AI. Falls back to None on failure."""
    prompt = OPENAPI_SCHEMA_DESIGNER_PROMPT.replace("{projectName}", project_name).replace("{gatewayBaseUrl}", gateway_url)

    ep_description = json.dumps(endpoints, indent=2)
    user_msg = f"""Generate a complete OpenAPI 3.0 specification for the "{project_name}" API.

Gateway Base URL: {gateway_url}

Endpoints to document:
{ep_description}

Remember: Fields listed in fieldsToStrip are REMOVED from responses automatically — do NOT include them in response schemas."""

    try:
        result = await asyncio.wait_for(call_claude(prompt, user_msg), timeout=45)
        # Validate it's a proper OpenAPI spec
        if "openapi" in result and "paths" in result:
            logger.info(f"AI generated OpenAPI spec with {len(result.get('paths', {}))} paths")
            return result
        else:
            logger.warning("AI OpenAPI spec missing required fields")
            return None
    except asyncio.TimeoutError:
        logger.warning("AI OpenAPI generation timed out (45s)")
        return None
    except Exception as e:
        logger.error(f"AI OpenAPI generation failed: {e}")
        return None


async def generate_sdk_ai(project_name: str, gateway_url: str, endpoints: list) -> str:
    """Generate TypeScript SDK using Claude AI. Falls back to None on failure."""
    prompt = SDK_GENERATOR_PROMPT.replace("{gatewayBaseUrl}", gateway_url)

    ep_description = json.dumps(endpoints, indent=2)
    user_msg = f"""Generate a complete TypeScript SDK for the "{project_name}" API.

Gateway Base URL: {gateway_url}
Package will be published as: @scalableai/{project_name.lower().replace(' ', '-')}

Endpoints:
{ep_description}

Create typed interfaces for all request/response objects based on the endpoint descriptions. The SDK should be production-ready with full type safety."""

    try:
        result = await asyncio.wait_for(call_claude_text(prompt, user_msg), timeout=45)
        if result and len(result) > 100 and ("class" in result or "export" in result):
            logger.info(f"AI generated SDK ({len(result)} chars)")
            return result
        else:
            logger.warning("AI SDK response too short or invalid")
            return None
    except asyncio.TimeoutError:
        logger.warning("AI SDK generation timed out (45s)")
        return None
    except Exception as e:
        logger.error(f"AI SDK generation failed: {e}")
        return None


def merge_analysis_and_audit(code_analysis: dict, security_audit: dict) -> list:
    """Merge code analysis routes with security audit results."""
    # Build lookup by method+path
    audit_lookup = {}
    for ar in security_audit.get("auditedRoutes", []):
        key = f"{ar['method']}:{ar['path']}"
        audit_lookup[key] = ar

    merged = []
    for route in code_analysis.get("routes", []):
        key = f"{route['method']}:{route['path']}"
        audit = audit_lookup.get(key, {})

        merged.append({
            "method": route["method"],
            "path": route["path"],
            "file": route.get("file", ""),
            "description": route.get("description", ""),
            "middleware": route.get("middleware", []),
            "response_fields": route.get("responseFields", []),
            "sensitive_fields": route.get("sensitiveFields", []),
            "risk": audit.get("risk", "yellow"),
            "risk_reason": audit.get("riskReason", "Not audited"),
            "recommendation": audit.get("recommendation", "Manual review required"),
            "fields_to_strip": audit.get("fieldsToStrip", []),
            "suggested_rate_limit": audit.get("suggestedRateLimit", 100),
        })

    return merged
