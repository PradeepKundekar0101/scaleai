"""
AI agents for code analysis and security auditing.
Uses Anthropic Python SDK to call Claude directly.
Falls back to hardcoded demo results on failure.
"""
import os
import json
import re
import logging
import asyncio

from demo_scan_results import DEMO_CODE_ANALYSIS, DEMO_SECURITY_AUDIT

logger = logging.getLogger(__name__)

try:
    import anthropic
    _HAS_ANTHROPIC = True
except ImportError:
    _HAS_ANTHROPIC = False
    logger.warning("anthropic package not installed — AI features will use demo fallback")

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


MODEL = "claude-sonnet-4-20250514"


def _get_anthropic_client() -> "anthropic.AsyncAnthropic":
    if not _HAS_ANTHROPIC:
        raise ImportError("anthropic package is not installed")
    api_key = os.environ.get("ANTHROPIC_API_KEY", "")
    if not api_key:
        raise ValueError("ANTHROPIC_API_KEY not set")
    return anthropic.AsyncAnthropic(api_key=api_key, timeout=60.0, max_retries=1)


async def call_claude(system_prompt: str, user_message: str) -> dict:
    """Call Claude via Anthropic SDK. Returns parsed JSON."""
    client = _get_anthropic_client()
    try:
        response = await client.messages.create(
            model=MODEL,
            max_tokens=4096,
            system=system_prompt,
            messages=[{"role": "user", "content": user_message}],
        )
        text = response.content[0].text
        return extract_json(text)
    except Exception as e:
        logger.error(f"Claude API failed: {e}")
        raise


async def call_claude_text(system_prompt: str, user_message: str) -> str:
    """Call Claude via Anthropic SDK. Returns raw text."""
    client = _get_anthropic_client()
    try:
        response = await client.messages.create(
            model=MODEL,
            max_tokens=4096,
            system=system_prompt,
            messages=[{"role": "user", "content": user_message}],
        )
        return response.content[0].text
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

SDK_DOCS_GENERATOR_PROMPT = """You are a technical documentation writer. Generate comprehensive SDK usage documentation in Markdown format.

The documentation should include:

1. **Installation** - npm/yarn install command with the package name
2. **Quick Start** - Initialize the client with API key
3. **Authentication** - How to get and use API keys
4. **Usage Examples** - For each major resource/endpoint group, provide:
   - List all items
   - Get single item by ID
   - Create new item
   - Update item
   - Delete item (if applicable)
5. **Error Handling** - How to catch and handle SDK errors
6. **TypeScript Support** - Mention type safety and autocomplete
7. **Rate Limits** - Explain rate limiting headers
8. **Support** - Link to API documentation

Use the actual endpoint paths and methods provided. Make examples realistic and actionable.
Package name format: @scalableai/{projectSlug}
Gateway URL: {gatewayBaseUrl}

Return ONLY Markdown. No code blocks around the entire response, just the markdown content itself."""


async def generate_openapi_spec_ai(project_name: str, gateway_url: str, endpoints: list) -> dict:
    """Generate OpenAPI 3.0 spec using Claude AI with hard timeout."""
    ep_json = json.dumps(endpoints)
    prompt = OPENAPI_SCHEMA_DESIGNER_PROMPT.replace("{projectName}", project_name).replace("{gatewayBaseUrl}", gateway_url)
    user_msg = (
        f'Generate a complete OpenAPI 3.0 specification for the "{project_name}" API.\n'
        f"Gateway Base URL: {gateway_url}\n"
        f"Endpoints:\n{ep_json}\n"
        f"Remember: Fields listed in fieldsToStrip are REMOVED from responses automatically."
    )
    try:
        spec = await asyncio.wait_for(call_claude(prompt, user_msg), timeout=40)
        if "openapi" in spec and "paths" in spec:
            logger.info(f"AI generated OpenAPI spec with {len(spec.get('paths', {}))} paths")
            return spec
        logger.warning("AI OpenAPI response missing required keys")
        return None
    except asyncio.TimeoutError:
        logger.warning("AI OpenAPI generation timed out (40s)")
        return None
    except Exception as e:
        logger.error(f"AI OpenAPI generation failed: {e}")
        return None


async def generate_sdk_ai(project_name: str, gateway_url: str, endpoints: list) -> str:
    """Generate TypeScript SDK using Claude AI with hard timeout."""
    ep_json = json.dumps(endpoints)
    prompt = SDK_GENERATOR_PROMPT.replace("{gatewayBaseUrl}", gateway_url)
    slug = project_name.lower().replace(' ', '-')
    user_msg = (
        f'Generate a complete TypeScript SDK for the "{project_name}" API.\n'
        f"Gateway Base URL: {gateway_url}\n"
        f"Package: @scalableai/{slug}\n"
        f"Endpoints:\n{ep_json}\n"
        f"Create typed interfaces for all request/response objects."
    )
    try:
        sdk = await asyncio.wait_for(call_claude_text(prompt, user_msg), timeout=40)
        sdk = sdk.strip()
        if len(sdk) > 100 and ("class" in sdk or "export" in sdk):
            logger.info(f"AI generated SDK ({len(sdk)} chars)")
            return sdk
        logger.warning("AI SDK response too short or missing expected keywords")
        return None
    except asyncio.TimeoutError:
        logger.warning("AI SDK generation timed out (40s)")
        return None
    except Exception as e:
        logger.error(f"AI SDK generation failed: {e}")
        return None



async def generate_sdk_docs_ai(project_name: str, project_slug: str, gateway_url: str, endpoints: list) -> str:
    """Generate SDK usage documentation using Claude AI with hard timeout."""
    ep_json = json.dumps(endpoints)
    prompt = SDK_DOCS_GENERATOR_PROMPT.replace("{projectSlug}", project_slug).replace("{gatewayBaseUrl}", gateway_url)
    user_msg = (
        f'Generate comprehensive SDK usage documentation for the "{project_name}" API.\n'
        f"Package: @scalableai/{project_slug}\n"
        f"Gateway URL: {gateway_url}\n"
        f"Endpoints:\n{ep_json}\n"
        f"Provide clear installation instructions, authentication setup, and usage examples for all endpoint groups."
    )
    try:
        docs = await asyncio.wait_for(call_claude_text(prompt, user_msg), timeout=40)
        docs = docs.strip()
        if len(docs) > 100 and ("##" in docs or "npm install" in docs):
            logger.info(f"AI generated SDK docs ({len(docs)} chars)")
            return docs
        logger.warning("AI SDK docs response too short or missing expected keywords")
        return None
    except asyncio.TimeoutError:
        logger.warning("AI SDK docs generation timed out (40s)")
        return None
    except Exception as e:
        logger.error(f"AI SDK docs generation failed: {e}")
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
