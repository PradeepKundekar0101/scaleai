#!/usr/bin/env python3
"""
Backend API Testing for Scalable Platform
Tests all auth and project endpoints with proper error handling
"""

import requests
import sys
import json
from datetime import datetime
from typing import Dict, Any, Optional

class ScalableAPITester:
    def __init__(self, base_url: str = "https://core-auth-launch.preview.emergentagent.com"):
        self.base_url = base_url
        self.session = requests.Session()
        self.session.headers.update({'Content-Type': 'application/json'})
        self.token = None
        self.user_id = None
        self.tests_run = 0
        self.tests_passed = 0
        self.test_results = []

    def log_test(self, name: str, success: bool, details: str = "", response_data: Any = None):
        """Log test result"""
        self.tests_run += 1
        if success:
            self.tests_passed += 1
            print(f"✅ {name}")
        else:
            print(f"❌ {name} - {details}")
        
        self.test_results.append({
            "test": name,
            "success": success,
            "details": details,
            "response_data": response_data
        })

    def make_request(self, method: str, endpoint: str, data: Optional[Dict] = None, 
                    expected_status: int = 200, use_auth: bool = False, timeout: int = 30) -> tuple[bool, Any]:
        """Make HTTP request and validate response"""
        url = f"{self.base_url}/api/{endpoint}"
        headers = {}
        
        if use_auth and self.token:
            headers['Authorization'] = f'Bearer {self.token}'
        
        try:
            if method == 'GET':
                response = self.session.get(url, headers=headers, timeout=timeout)
            elif method == 'POST':
                response = self.session.post(url, json=data, headers=headers, timeout=timeout)
            elif method == 'DELETE':
                response = self.session.delete(url, headers=headers, timeout=timeout)
            else:
                return False, f"Unsupported method: {method}"

            success = response.status_code == expected_status
            response_data = None
            
            try:
                response_data = response.json()
            except:
                response_data = response.text

            if not success:
                return False, f"Expected {expected_status}, got {response.status_code}. Response: {response_data}"
            
            return True, response_data

        except Exception as e:
            return False, f"Request failed: {str(e)}"

    def test_auth_register(self):
        """Test user registration"""
        test_email = f"test_{datetime.now().strftime('%H%M%S')}@example.com"
        data = {
            "name": "Test User",
            "email": test_email,
            "password": "Test1234!"
        }
        
        success, response = self.make_request('POST', 'auth/register', data, 200)
        
        if success and isinstance(response, dict):
            if 'token' in response and 'id' in response:
                self.token = response['token']
                self.user_id = response['id']
                self.log_test("POST /api/auth/register", True, f"User created with ID: {self.user_id}")
                return True
            else:
                self.log_test("POST /api/auth/register", False, "Missing token or id in response")
                return False
        else:
            self.log_test("POST /api/auth/register", False, str(response))
            return False

    def test_auth_login(self):
        """Test user login with admin credentials"""
        data = {
            "email": "admin@scalable.dev",
            "password": "Admin123!"
        }
        
        success, response = self.make_request('POST', 'auth/login', data, 200)
        
        if success and isinstance(response, dict):
            if 'token' in response and 'id' in response:
                self.token = response['token']
                self.user_id = response['id']
                self.log_test("POST /api/auth/login", True, f"Admin login successful")
                return True
            else:
                self.log_test("POST /api/auth/login", False, "Missing token or id in response")
                return False
        else:
            self.log_test("POST /api/auth/login", False, str(response))
            return False

    def test_auth_me(self):
        """Test getting current user info"""
        success, response = self.make_request('GET', 'auth/me', use_auth=True)
        
        if success and isinstance(response, dict):
            if 'id' in response and 'email' in response:
                self.log_test("GET /api/auth/me", True, f"User info retrieved: {response.get('email')}")
                return True
            else:
                self.log_test("GET /api/auth/me", False, "Missing user fields in response")
                return False
        else:
            self.log_test("GET /api/auth/me", False, str(response))
            return False

    def test_auth_logout(self):
        """Test user logout"""
        success, response = self.make_request('POST', 'auth/logout', use_auth=True)
        
        if success:
            self.log_test("POST /api/auth/logout", True, "Logout successful")
            return True
        else:
            self.log_test("POST /api/auth/logout", False, str(response))
            return False

    def test_projects_create(self):
        """Test project creation"""
        data = {
            "name": f"Test Project {datetime.now().strftime('%H%M%S')}",
            "repoUrl": "https://github.com/test/repo"
        }
        
        success, response = self.make_request('POST', 'projects', data, 200, use_auth=True)
        
        if success and isinstance(response, dict):
            if 'id' in response and 'name' in response:
                self.project_id = response['id']
                self.log_test("POST /api/projects", True, f"Project created with ID: {self.project_id}")
                return True
            else:
                self.log_test("POST /api/projects", False, "Missing project fields in response")
                return False
        else:
            self.log_test("POST /api/projects", False, str(response))
            return False

    def test_projects_list(self):
        """Test listing projects"""
        success, response = self.make_request('GET', 'projects', use_auth=True)
        
        if success and isinstance(response, list):
            self.log_test("GET /api/projects", True, f"Retrieved {len(response)} projects")
            return True
        else:
            self.log_test("GET /api/projects", False, str(response))
            return False

    def test_projects_get_single(self):
        """Test getting single project"""
        if not hasattr(self, 'project_id'):
            self.log_test("GET /api/projects/:id", False, "No project ID available")
            return False
            
        success, response = self.make_request('GET', f'projects/{self.project_id}', use_auth=True)
        
        if success and isinstance(response, dict):
            if 'id' in response and response['id'] == self.project_id:
                self.log_test("GET /api/projects/:id", True, f"Project retrieved: {response.get('name')}")
                return True
            else:
                self.log_test("GET /api/projects/:id", False, "Project ID mismatch")
                return False
        else:
            self.log_test("GET /api/projects/:id", False, str(response))
            return False

    def test_project_scan(self):
        """Test project scanning endpoint"""
        if not hasattr(self, 'project_id'):
            self.log_test("POST /api/projects/:id/scan", False, "No project ID available")
            return False

        # Test scanning with timeout for AI processing (60 seconds)
        print(f"⏳ Starting scan for project {self.project_id} (may take up to 60 seconds)...")
        success, response = self.make_request('POST', f'projects/{self.project_id}/scan', 
                                            expected_status=200, use_auth=True, timeout=70)
        
        if success and isinstance(response, dict):
            required_fields = ['routeCount', 'breakdown', 'projectId']
            if all(field in response for field in required_fields):
                breakdown = response.get('breakdown', {})
                route_count = response.get('routeCount', 0)
                
                # Validate breakdown structure
                if isinstance(breakdown, dict) and 'green' in breakdown and 'yellow' in breakdown and 'red' in breakdown:
                    total_breakdown = breakdown['green'] + breakdown['yellow'] + breakdown['red']
                    if total_breakdown == route_count:
                        self.log_test("POST /api/projects/:id/scan", True, 
                                    f"Scan completed: {route_count} routes found (G:{breakdown['green']}, Y:{breakdown['yellow']}, R:{breakdown['red']})")
                        return True
                    else:
                        self.log_test("POST /api/projects/:id/scan", False, 
                                    f"Route count mismatch: {route_count} vs breakdown total {total_breakdown}")
                        return False
                else:
                    self.log_test("POST /api/projects/:id/scan", False, "Invalid breakdown structure")
                    return False
            else:
                missing = [f for f in required_fields if f not in response]
                self.log_test("POST /api/projects/:id/scan", False, f"Missing fields: {missing}")
                return False
        else:
            self.log_test("POST /api/projects/:id/scan", False, str(response))
            return False

    def test_project_routes(self):
        """Test getting discovered routes"""
        if not hasattr(self, 'project_id'):
            self.log_test("GET /api/projects/:id/routes", False, "No project ID available")
            return False

        success, response = self.make_request('GET', f'projects/{self.project_id}/routes', 
                                            expected_status=200, use_auth=True)
        
        if success and isinstance(response, list):
            if len(response) > 0:
                # Validate route structure
                route = response[0]
                required_fields = ['method', 'path', 'risk', 'description']
                if all(field in route for field in required_fields):
                    # Check risk ordering (green first, then yellow, then red)
                    risks = [r.get('risk', 'unknown') for r in response]
                    risk_order = {'green': 0, 'yellow': 1, 'red': 2}
                    is_sorted = all(risk_order.get(risks[i], 3) <= risk_order.get(risks[i+1], 3) 
                                  for i in range(len(risks)-1))
                    
                    if is_sorted:
                        self.log_test("GET /api/projects/:id/routes", True, 
                                    f"Retrieved {len(response)} routes, properly sorted by risk")
                        return True
                    else:
                        self.log_test("GET /api/projects/:id/routes", False, "Routes not sorted by risk level")
                        return False
                else:
                    missing = [f for f in required_fields if f not in route]
                    self.log_test("GET /api/projects/:id/routes", False, f"Route missing fields: {missing}")
                    return False
            else:
                self.log_test("GET /api/projects/:id/routes", True, "No routes found (empty project)")
                return True
        else:
            self.log_test("GET /api/projects/:id/routes", False, str(response))
            return False

    def test_project_status_transitions(self):
        """Test that project status changes during scan"""
        if not hasattr(self, 'project_id'):
            self.log_test("Project status transitions", False, "No project ID available")
            return False

        # Get initial project status
        success, initial_project = self.make_request('GET', f'projects/{self.project_id}', use_auth=True)
        if not success:
            self.log_test("Project status transitions", False, "Could not get initial project status")
            return False

        initial_status = initial_project.get('status', 'unknown')
        
        # After scan, status should be 'configuring'
        success, final_project = self.make_request('GET', f'projects/{self.project_id}', use_auth=True)
        if success:
            final_status = final_project.get('status', 'unknown')
            if final_status == 'configuring':
                self.log_test("Project status transitions", True, 
                            f"Status changed from '{initial_status}' to '{final_status}'")
                return True
            else:
                self.log_test("Project status transitions", False, 
                            f"Expected 'configuring', got '{final_status}'")
                return False
        else:
            self.log_test("Project status transitions", False, "Could not get final project status")
            return False

    def test_demo_fallback(self):
        """Test demo fallback with QuickBite repo"""
        # Create a project with QuickBite demo repo URL
        data = {
            "name": f"QuickBite Demo {datetime.now().strftime('%H%M%S')}",
            "repoUrl": "https://github.com/PradeepKundekar0101/quickbite-api"
        }
        
        success, response = self.make_request('POST', 'projects', data, 200, use_auth=True)
        
        if success and isinstance(response, dict) and 'id' in response:
            demo_project_id = response['id']
            
            # Scan the demo project
            print(f"⏳ Scanning QuickBite demo project (may take up to 60 seconds)...")
            success, scan_response = self.make_request('POST', f'projects/{demo_project_id}/scan', 
                                                     expected_status=200, use_auth=True, timeout=70)
            
            if success and isinstance(scan_response, dict):
                route_count = scan_response.get('routeCount', 0)
                if route_count > 0:
                    self.log_test("Demo fallback scan", True, 
                                f"QuickBite demo scan found {route_count} routes")
                    return True
                else:
                    self.log_test("Demo fallback scan", False, "Demo scan returned 0 routes")
                    return False
            else:
                self.log_test("Demo fallback scan", False, str(scan_response))
                return False
        else:
            self.log_test("Demo fallback scan", False, "Could not create demo project")
            return False

    def test_project_enhanced_get(self):
        """Test enhanced GET /api/projects/:id with Phase 3 fields"""
        if not hasattr(self, 'project_id'):
            self.log_test("Enhanced GET /api/projects/:id", False, "No project ID available")
            return False
            
        success, response = self.make_request('GET', f'projects/{self.project_id}', use_auth=True)
        
        if success and isinstance(response, dict):
            # Check for Phase 3 enhanced fields
            required_fields = ['routeBreakdown', 'discoveredRouteCount', 'exposedEndpointCount', 'connectionTested']
            missing_fields = [f for f in required_fields if f not in response]
            
            if not missing_fields:
                breakdown = response.get('routeBreakdown', {})
                if isinstance(breakdown, dict) and all(k in breakdown for k in ['green', 'yellow', 'red']):
                    self.log_test("Enhanced GET /api/projects/:id", True, 
                                f"Enhanced fields present: breakdown={breakdown}, discovered={response['discoveredRouteCount']}, exposed={response['exposedEndpointCount']}, connected={response['connectionTested']}")
                    return True
                else:
                    self.log_test("Enhanced GET /api/projects/:id", False, "Invalid routeBreakdown structure")
                    return False
            else:
                self.log_test("Enhanced GET /api/projects/:id", False, f"Missing Phase 3 fields: {missing_fields}")
                return False
        else:
            self.log_test("Enhanced GET /api/projects/:id", False, str(response))
            return False

    def test_project_test_connection(self):
        """Test POST /api/projects/:id/test-connection with mock fallback"""
        if not hasattr(self, 'project_id'):
            self.log_test("POST /api/projects/:id/test-connection", False, "No project ID available")
            return False

        # Test with localhost URL (should trigger mock mode)
        test_data = {
            "targetBackendUrl": "http://localhost:3000",
            "loginEndpoint": "/api/auth/login",
            "serviceAccountEmail": "test@example.com",
            "serviceAccountPassword": "testpass123"
        }
        
        success, response = self.make_request('POST', f'projects/{self.project_id}/test-connection', 
                                            test_data, expected_status=200, use_auth=True)
        
        if success and isinstance(response, dict):
            required_fields = ['success', 'tokenValidFor', 'testResult', 'mock']
            missing_fields = [f for f in required_fields if f not in response]
            
            if not missing_fields:
                if response.get('success') and response.get('mock'):
                    self.log_test("POST /api/projects/:id/test-connection", True, 
                                f"Mock connection successful: {response.get('testResult')}")
                    return True
                else:
                    self.log_test("POST /api/projects/:id/test-connection", False, 
                                f"Expected mock success, got: success={response.get('success')}, mock={response.get('mock')}")
                    return False
            else:
                self.log_test("POST /api/projects/:id/test-connection", False, f"Missing fields: {missing_fields}")
                return False
        else:
            self.log_test("POST /api/projects/:id/test-connection", False, str(response))
            return False

    def test_project_endpoints_save(self):
        """Test POST /api/projects/:id/endpoints - saves selected endpoints"""
        if not hasattr(self, 'project_id'):
            self.log_test("POST /api/projects/:id/endpoints", False, "No project ID available")
            return False

        # First get some routes to work with
        success, routes = self.make_request('GET', f'projects/{self.project_id}/routes', use_auth=True)
        if not success or not isinstance(routes, list) or len(routes) == 0:
            self.log_test("POST /api/projects/:id/endpoints", False, "No routes available for testing")
            return False

        # Select first green route if available, otherwise first route
        green_routes = [r for r in routes if r.get('risk') == 'green']
        test_route = green_routes[0] if green_routes else routes[0]
        
        endpoints_data = {
            "endpoints": [
                {
                    "method": test_route.get('method', 'GET'),
                    "path": test_route.get('path', '/test'),
                    "description": test_route.get('description', 'Test endpoint'),
                    "fieldsToStrip": test_route.get('fields_to_strip', []),
                    "rateLimit": 100
                }
            ]
        }
        
        success, response = self.make_request('POST', f'projects/{self.project_id}/endpoints', 
                                            endpoints_data, expected_status=200, use_auth=True)
        
        if success and isinstance(response, dict):
            if 'count' in response and 'endpoints' in response:
                count = response.get('count', 0)
                endpoints = response.get('endpoints', [])
                
                if count == 1 and len(endpoints) == 1:
                    endpoint = endpoints[0]
                    if endpoint.get('method') == test_route.get('method') and endpoint.get('path') == test_route.get('path'):
                        self.log_test("POST /api/projects/:id/endpoints", True, 
                                    f"Endpoint saved successfully: {endpoint.get('method')} {endpoint.get('path')}")
                        return True
                    else:
                        self.log_test("POST /api/projects/:id/endpoints", False, "Endpoint data mismatch")
                        return False
                else:
                    self.log_test("POST /api/projects/:id/endpoints", False, f"Expected 1 endpoint, got {count}")
                    return False
            else:
                self.log_test("POST /api/projects/:id/endpoints", False, "Missing count or endpoints in response")
                return False
        else:
            self.log_test("POST /api/projects/:id/endpoints", False, str(response))
            return False

    def test_github_oauth_stubs(self):
        """Test GitHub OAuth stub endpoints"""
        endpoints = [
            ('GET', 'auth/github'),
            ('GET', 'auth/github/callback')
        ]
        
        all_passed = True
        for method, endpoint in endpoints:
            success, response = self.make_request(method, endpoint, expected_status=501)
            if success:
                self.log_test(f"{method} /api/{endpoint}", True, "GitHub OAuth stub returns 501")
            else:
                self.log_test(f"{method} /api/{endpoint}", False, str(response))
                all_passed = False
        
        return all_passed

    def test_unauthorized_access(self):
        """Test that protected endpoints require authentication"""
        # Create a new session without cookies or tokens
        old_session = self.session
        old_token = self.token
        
        # Create fresh session without cookies
        self.session = requests.Session()
        self.session.headers.update({'Content-Type': 'application/json'})
        self.token = None
        
        protected_endpoints = [
            ('GET', 'auth/me'),
            ('GET', 'projects'),
            ('POST', 'projects')
        ]
        
        all_passed = True
        for method, endpoint in protected_endpoints:
            success, response = self.make_request(method, endpoint, expected_status=401)
            if success:
                self.log_test(f"Unauthorized {method} /api/{endpoint}", True, "Returns 401 as expected")
            else:
                self.log_test(f"Unauthorized {method} /api/{endpoint}", False, str(response))
                all_passed = False
        
        # Restore original session and token
        self.session = old_session
        self.token = old_token
        return all_passed

    def run_all_tests(self):
        """Run all API tests"""
        print("🚀 Starting Scalable API Tests - Phase 3")
        print(f"Testing against: {self.base_url}")
        print("=" * 50)
        
        # Test registration first
        if not self.test_auth_register():
            print("❌ Registration failed, trying with admin login...")
            if not self.test_auth_login():
                print("❌ Both registration and login failed. Stopping tests.")
                return False
        
        # Test authenticated endpoints
        self.test_auth_me()
        self.test_projects_create()
        self.test_projects_list()
        self.test_projects_get_single()
        
        # Test Phase 2 scan functionality
        print("\n🔍 Testing Phase 2 Scan Features...")
        self.test_project_scan()
        self.test_project_routes()
        self.test_project_status_transitions()
        
        # Test Phase 3 new features
        print("\n⚡ Testing Phase 3 Endpoint Configuration Features...")
        self.test_project_enhanced_get()
        self.test_project_test_connection()
        self.test_project_endpoints_save()
        
        # Test demo fallback
        self.test_demo_fallback()
        
        # Test logout
        self.test_auth_logout()
        
        # Test admin login for remaining tests
        self.test_auth_login()
        
        # Test unauthorized access
        self.test_unauthorized_access()
        
        # Test GitHub OAuth stubs
        self.test_github_oauth_stubs()
        
        print("\n" + "=" * 50)
        print(f"📊 Test Results: {self.tests_passed}/{self.tests_run} passed")
        
        if self.tests_passed == self.tests_run:
            print("🎉 All tests passed!")
            return True
        else:
            print("⚠️  Some tests failed. Check details above.")
            return False

def main():
    tester = ScalableAPITester()
    success = tester.run_all_tests()
    
    # Save detailed results
    with open('/app/backend_test_results.json', 'w') as f:
        json.dump({
            'timestamp': datetime.now().isoformat(),
            'total_tests': tester.tests_run,
            'passed_tests': tester.tests_passed,
            'success_rate': f"{(tester.tests_passed/tester.tests_run*100):.1f}%" if tester.tests_run > 0 else "0%",
            'results': tester.test_results
        }, f, indent=2)
    
    return 0 if success else 1

if __name__ == "__main__":
    sys.exit(main())