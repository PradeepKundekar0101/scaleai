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
                    expected_status: int = 200, use_auth: bool = False) -> tuple[bool, Any]:
        """Make HTTP request and validate response"""
        url = f"{self.base_url}/api/{endpoint}"
        headers = {}
        
        if use_auth and self.token:
            headers['Authorization'] = f'Bearer {self.token}'
        
        try:
            if method == 'GET':
                response = self.session.get(url, headers=headers)
            elif method == 'POST':
                response = self.session.post(url, json=data, headers=headers)
            elif method == 'DELETE':
                response = self.session.delete(url, headers=headers)
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

    def test_stub_routes(self):
        """Test stub routes that should return 501"""
        if not hasattr(self, 'project_id'):
            self.log_test("Stub routes", False, "No project ID available")
            return False

        stub_endpoints = [
            ('POST', f'projects/{self.project_id}/scan'),
            ('GET', f'projects/{self.project_id}/routes')
        ]
        
        all_passed = True
        for method, endpoint in stub_endpoints:
            success, response = self.make_request(method, endpoint, expected_status=501, use_auth=True)
            if success:
                self.log_test(f"{method} /api/{endpoint}", True, "Returns 501 as expected")
            else:
                self.log_test(f"{method} /api/{endpoint}", False, str(response))
                all_passed = False
        
        return all_passed

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
        print("🚀 Starting Scalable API Tests")
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
        self.test_stub_routes()
        
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