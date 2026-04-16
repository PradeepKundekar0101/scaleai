"""
Phase 5 Backend Tests - API Keys Management & Public Docs
Tests for:
1. API Keys CRUD endpoints
2. Public docs-config endpoint (no auth required)
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
ADMIN_EMAIL = "admin@scalable.dev"
ADMIN_PASSWORD = "Admin123!"

# Test project info
PROJECT_ID = "69e0b402aceb02840c651134"  # deploy-test
PROJECT_SLUG = "deploy-test"


class TestPublicDocsEndpoint:
    """Test public docs-config endpoint - NO AUTH REQUIRED"""
    
    def test_docs_config_no_auth_required(self):
        """Docs config should be accessible without authentication"""
        response = requests.get(f"{BASE_URL}/api/projects/{PROJECT_SLUG}/docs-config")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        print("✓ Docs config accessible without auth")
    
    def test_docs_config_returns_correct_structure(self):
        """Verify docs-config returns all required fields"""
        response = requests.get(f"{BASE_URL}/api/projects/{PROJECT_SLUG}/docs-config")
        assert response.status_code == 200
        
        data = response.json()
        
        # Required fields
        assert "projectName" in data, "Missing projectName"
        assert "slug" in data, "Missing slug"
        assert "gatewayUrl" in data, "Missing gatewayUrl"
        assert "spec" in data, "Missing spec"
        assert "endpoints" in data, "Missing endpoints"
        
        # Validate values
        assert data["projectName"] == "Deploy Test", f"Expected 'Deploy Test', got {data['projectName']}"
        assert data["slug"] == PROJECT_SLUG
        assert "/api/gateway/" in data["gatewayUrl"]
        
        print(f"✓ Docs config structure valid - {len(data['endpoints'])} endpoints")
    
    def test_docs_config_endpoints_have_required_fields(self):
        """Each endpoint should have method, path, description, rateLimit"""
        response = requests.get(f"{BASE_URL}/api/projects/{PROJECT_SLUG}/docs-config")
        assert response.status_code == 200
        
        data = response.json()
        endpoints = data.get("endpoints", [])
        
        assert len(endpoints) > 0, "No endpoints returned"
        
        for ep in endpoints:
            assert "method" in ep, f"Endpoint missing method: {ep}"
            assert "path" in ep, f"Endpoint missing path: {ep}"
            assert "rateLimit" in ep, f"Endpoint missing rateLimit: {ep}"
            assert ep["method"] in ["GET", "POST", "PUT", "DELETE", "PATCH"], f"Invalid method: {ep['method']}"
        
        print(f"✓ All {len(endpoints)} endpoints have required fields")
    
    def test_docs_config_spec_is_valid_openapi(self):
        """Verify OpenAPI spec structure"""
        response = requests.get(f"{BASE_URL}/api/projects/{PROJECT_SLUG}/docs-config")
        assert response.status_code == 200
        
        data = response.json()
        spec = data.get("spec", {})
        
        assert spec.get("openapi", "").startswith("3."), f"Invalid OpenAPI version: {spec.get('openapi')}"
        assert "info" in spec, "Missing info in spec"
        assert "paths" in spec, "Missing paths in spec"
        assert "components" in spec, "Missing components in spec"
        
        # Check security scheme
        security_schemes = spec.get("components", {}).get("securitySchemes", {})
        assert "ApiKeyAuth" in security_schemes, "Missing ApiKeyAuth security scheme"
        
        print("✓ OpenAPI spec structure valid")
    
    def test_docs_config_nonexistent_project(self):
        """Non-existent project should return 404"""
        response = requests.get(f"{BASE_URL}/api/projects/nonexistent-project-xyz/docs-config")
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
        print("✓ Non-existent project returns 404")


class TestAPIKeysManagement:
    """Test API Keys CRUD - requires authentication"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Login and get auth token"""
        login_resp = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert login_resp.status_code == 200, f"Login failed: {login_resp.text}"
        
        self.token = login_resp.json().get("token")
        self.headers = {
            "Authorization": f"Bearer {self.token}",
            "Content-Type": "application/json"
        }
        print("✓ Authenticated as admin")
    
    def test_list_api_keys(self):
        """GET /api/projects/:id/keys should return list of keys"""
        response = requests.get(
            f"{BASE_URL}/api/projects/{PROJECT_ID}/keys",
            headers=self.headers
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        keys = response.json()
        assert isinstance(keys, list), "Expected list of keys"
        
        if len(keys) > 0:
            key = keys[0]
            assert "id" in key, "Key missing id"
            assert "keyPrefix" in key, "Key missing keyPrefix"
            assert "name" in key, "Key missing name"
            assert "isActive" in key, "Key missing isActive"
            assert "rateLimit" in key, "Key missing rateLimit"
            assert "createdAt" in key, "Key missing createdAt"
        
        print(f"✓ Listed {len(keys)} API keys")
    
    def test_create_api_key(self):
        """POST /api/projects/:id/keys should create new key"""
        response = requests.post(
            f"{BASE_URL}/api/projects/{PROJECT_ID}/keys",
            headers=self.headers,
            json={"name": "TEST_Phase5_Key"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "apiKey" in data, "Response missing apiKey"
        assert "keyPrefix" in data, "Response missing keyPrefix"
        assert "name" in data, "Response missing name"
        assert data["name"] == "TEST_Phase5_Key"
        assert data["apiKey"].startswith("sk_live_"), f"Invalid key format: {data['apiKey'][:20]}..."
        
        # Store for cleanup
        self.created_key_prefix = data["keyPrefix"]
        print(f"✓ Created API key: {data['keyPrefix']}...")
        return data
    
    def test_create_and_revoke_api_key(self):
        """Create key then revoke it via DELETE /api/keys/:id"""
        # Create key
        create_resp = requests.post(
            f"{BASE_URL}/api/projects/{PROJECT_ID}/keys",
            headers=self.headers,
            json={"name": "TEST_ToRevoke_Key"}
        )
        assert create_resp.status_code == 200
        
        # Get key ID from list
        list_resp = requests.get(
            f"{BASE_URL}/api/projects/{PROJECT_ID}/keys",
            headers=self.headers
        )
        keys = list_resp.json()
        
        # Find the key we just created
        key_to_revoke = None
        for k in keys:
            if k.get("name") == "TEST_ToRevoke_Key" and k.get("isActive"):
                key_to_revoke = k
                break
        
        assert key_to_revoke is not None, "Could not find created key"
        key_id = key_to_revoke["id"]
        
        # Revoke key
        revoke_resp = requests.delete(
            f"{BASE_URL}/api/keys/{key_id}",
            headers=self.headers
        )
        assert revoke_resp.status_code == 200, f"Revoke failed: {revoke_resp.text}"
        
        # Verify key is revoked
        list_resp2 = requests.get(
            f"{BASE_URL}/api/projects/{PROJECT_ID}/keys",
            headers=self.headers
        )
        keys2 = list_resp2.json()
        
        revoked_key = None
        for k in keys2:
            if k.get("id") == key_id:
                revoked_key = k
                break
        
        assert revoked_key is not None, "Revoked key not found in list"
        assert revoked_key["isActive"] == False, "Key should be inactive after revoke"
        
        print(f"✓ Key {key_id} revoked successfully")
    
    def test_list_keys_requires_auth(self):
        """Keys endpoint should require authentication"""
        response = requests.get(f"{BASE_URL}/api/projects/{PROJECT_ID}/keys")
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("✓ Keys endpoint requires auth")
    
    def test_create_key_requires_auth(self):
        """Create key endpoint should require authentication"""
        response = requests.post(
            f"{BASE_URL}/api/projects/{PROJECT_ID}/keys",
            json={"name": "Unauthorized Key"}
        )
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("✓ Create key endpoint requires auth")


class TestDocsPagePublicAccess:
    """Verify docs page is truly public (no redirect to login)"""
    
    def test_docs_config_with_no_cookies(self):
        """Docs config should work without any cookies/tokens"""
        session = requests.Session()
        session.cookies.clear()
        
        response = session.get(f"{BASE_URL}/api/projects/{PROJECT_SLUG}/docs-config")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        print("✓ Docs config works without cookies")
    
    def test_spec_endpoint_public(self):
        """GET /api/projects/:slug/spec should also be public"""
        response = requests.get(f"{BASE_URL}/api/projects/{PROJECT_SLUG}/spec")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        spec = response.json()
        assert "openapi" in spec
        print("✓ Spec endpoint is public")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
