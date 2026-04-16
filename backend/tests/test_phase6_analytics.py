"""
Phase 6 Backend Tests: Analytics Dashboard API
Tests for:
- GET /api/projects/{id}/analytics endpoint
- Analytics data structure validation
- Empty state handling
- Dashboard project cards with real stats
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
TEST_EMAIL = "admin@scalable.dev"
TEST_PASSWORD = "Admin123!"

# Test project IDs
DEPLOY_TEST_PROJECT_ID = "69e0b402aceb02840c651134"
FAST_DEPLOY_TEST_PROJECT_ID = "69e0bca1404bcfa7b3d90bbb"


@pytest.fixture(scope="module")
def auth_token():
    """Get authentication token for tests"""
    response = requests.post(
        f"{BASE_URL}/api/auth/login",
        json={"email": TEST_EMAIL, "password": TEST_PASSWORD}
    )
    assert response.status_code == 200, f"Login failed: {response.text}"
    return response.json().get("token")


@pytest.fixture(scope="module")
def auth_headers(auth_token):
    """Get headers with auth token"""
    return {"Authorization": f"Bearer {auth_token}"}


class TestAnalyticsEndpoint:
    """Tests for GET /api/projects/{id}/analytics"""
    
    def test_analytics_requires_auth(self):
        """Analytics endpoint should require authentication"""
        response = requests.get(f"{BASE_URL}/api/projects/{DEPLOY_TEST_PROJECT_ID}/analytics")
        assert response.status_code == 401
    
    def test_analytics_returns_correct_structure(self, auth_headers):
        """Analytics should return all required fields"""
        response = requests.get(
            f"{BASE_URL}/api/projects/{DEPLOY_TEST_PROJECT_ID}/analytics",
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        
        # Verify all required fields exist
        required_fields = ["totalCalls", "activeKeys", "avgLatency", "errorRate", 
                          "callsByDay", "callsByEndpoint", "recentRequests"]
        for field in required_fields:
            assert field in data, f"Missing field: {field}"
    
    def test_analytics_total_calls_is_number(self, auth_headers):
        """totalCalls should be a non-negative integer"""
        response = requests.get(
            f"{BASE_URL}/api/projects/{DEPLOY_TEST_PROJECT_ID}/analytics",
            headers=auth_headers
        )
        data = response.json()
        assert isinstance(data["totalCalls"], int)
        assert data["totalCalls"] >= 0
    
    def test_analytics_active_keys_is_number(self, auth_headers):
        """activeKeys should be a non-negative integer"""
        response = requests.get(
            f"{BASE_URL}/api/projects/{DEPLOY_TEST_PROJECT_ID}/analytics",
            headers=auth_headers
        )
        data = response.json()
        assert isinstance(data["activeKeys"], int)
        assert data["activeKeys"] >= 0
    
    def test_analytics_avg_latency_is_number(self, auth_headers):
        """avgLatency should be a non-negative number"""
        response = requests.get(
            f"{BASE_URL}/api/projects/{DEPLOY_TEST_PROJECT_ID}/analytics",
            headers=auth_headers
        )
        data = response.json()
        assert isinstance(data["avgLatency"], (int, float))
        assert data["avgLatency"] >= 0
    
    def test_analytics_error_rate_is_percentage(self, auth_headers):
        """errorRate should be between 0 and 100"""
        response = requests.get(
            f"{BASE_URL}/api/projects/{DEPLOY_TEST_PROJECT_ID}/analytics",
            headers=auth_headers
        )
        data = response.json()
        assert isinstance(data["errorRate"], (int, float))
        assert 0 <= data["errorRate"] <= 100
    
    def test_analytics_calls_by_day_structure(self, auth_headers):
        """callsByDay should be array with date and count"""
        response = requests.get(
            f"{BASE_URL}/api/projects/{DEPLOY_TEST_PROJECT_ID}/analytics",
            headers=auth_headers
        )
        data = response.json()
        assert isinstance(data["callsByDay"], list)
        # Should have 7 days of data
        assert len(data["callsByDay"]) == 7
        for day in data["callsByDay"]:
            assert "date" in day
            assert "count" in day
            assert isinstance(day["count"], int)
    
    def test_analytics_calls_by_endpoint_structure(self, auth_headers):
        """callsByEndpoint should be array with endpoint and count"""
        response = requests.get(
            f"{BASE_URL}/api/projects/{DEPLOY_TEST_PROJECT_ID}/analytics",
            headers=auth_headers
        )
        data = response.json()
        assert isinstance(data["callsByEndpoint"], list)
        for ep in data["callsByEndpoint"]:
            assert "endpoint" in ep
            assert "count" in ep
            assert isinstance(ep["count"], int)
    
    def test_analytics_recent_requests_structure(self, auth_headers):
        """recentRequests should have correct structure"""
        response = requests.get(
            f"{BASE_URL}/api/projects/{DEPLOY_TEST_PROJECT_ID}/analytics",
            headers=auth_headers
        )
        data = response.json()
        assert isinstance(data["recentRequests"], list)
        if len(data["recentRequests"]) > 0:
            req = data["recentRequests"][0]
            required_fields = ["timestamp", "endpoint", "method", "keyName", "statusCode", "latencyMs"]
            for field in required_fields:
                assert field in req, f"Missing field in recentRequests: {field}"
    
    def test_analytics_invalid_project_returns_404(self, auth_headers):
        """Invalid project ID should return 404"""
        response = requests.get(
            f"{BASE_URL}/api/projects/000000000000000000000000/analytics",
            headers=auth_headers
        )
        assert response.status_code == 404


class TestProjectsListWithStats:
    """Tests for GET /api/projects with real usage stats"""
    
    def test_projects_list_returns_stats_for_live_projects(self, auth_headers):
        """Live projects should include totalCalls and avgLatency"""
        response = requests.get(f"{BASE_URL}/api/projects", headers=auth_headers)
        assert response.status_code == 200
        projects = response.json()
        
        # Find a live project
        live_projects = [p for p in projects if p.get("status") == "live"]
        assert len(live_projects) > 0, "No live projects found"
        
        for proj in live_projects:
            assert "totalCalls" in proj, "Live project missing totalCalls"
            assert "avgLatency" in proj, "Live project missing avgLatency"
            assert "exposedEndpointCount" in proj, "Live project missing exposedEndpointCount"
    
    def test_projects_list_stats_are_numbers(self, auth_headers):
        """Stats should be numeric values"""
        response = requests.get(f"{BASE_URL}/api/projects", headers=auth_headers)
        projects = response.json()
        
        live_projects = [p for p in projects if p.get("status") == "live"]
        for proj in live_projects:
            assert isinstance(proj.get("totalCalls", 0), int)
            assert isinstance(proj.get("avgLatency", 0), (int, float))
            assert isinstance(proj.get("exposedEndpointCount", 0), int)


class TestAnalyticsEmptyState:
    """Tests for analytics with no usage data"""
    
    def test_analytics_handles_empty_data_gracefully(self, auth_headers):
        """Analytics should return zeros and empty arrays for projects with no usage"""
        # Create a new project to test empty state
        create_response = requests.post(
            f"{BASE_URL}/api/projects",
            headers=auth_headers,
            json={"name": "TEST_Empty_Analytics", "repoUrl": "https://github.com/test/repo"}
        )
        assert create_response.status_code == 200
        new_project_id = create_response.json()["id"]
        
        try:
            # Get analytics for new project (should have no data)
            response = requests.get(
                f"{BASE_URL}/api/projects/{new_project_id}/analytics",
                headers=auth_headers
            )
            assert response.status_code == 200
            data = response.json()
            
            # Should return zeros, not errors
            assert data["totalCalls"] == 0
            assert data["avgLatency"] == 0
            assert data["errorRate"] == 0.0 or data["errorRate"] == 0
            assert isinstance(data["callsByDay"], list)
            assert isinstance(data["callsByEndpoint"], list)
            assert isinstance(data["recentRequests"], list)
            assert len(data["recentRequests"]) == 0
        finally:
            # Cleanup - we don't have delete endpoint, so just leave it
            pass


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
