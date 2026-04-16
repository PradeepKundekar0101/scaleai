#!/usr/bin/env python3
"""
Critical Fixes Testing - Deploy Performance & API Keys CRUD
Testing specific fixes mentioned in review request
"""

import requests
import time
import json
import sys
from datetime import datetime

class CriticalFixesTester:
    def __init__(self, base_url="https://core-auth-launch.preview.emergentagent.com"):
        self.base_url = base_url.rstrip("/")
        self.token = None
        self.tests_run = 0
        self.tests_passed = 0
        
        # Test credentials from review request
        self.admin_email = "admin@scalable.dev"
        self.admin_password = "Admin123!"
        self.test_project_id = "69e0bca1404bcfa7b3d90bbb"  # fast-deploy-test
        self.test_api_key = "sk_live_56032c95c49dab2bbdf6b7ee589654077f034b90c013199c"

    def log(self, message):
        print(f"[{datetime.now().strftime('%H:%M:%S')}] {message}")

    def run_test(self, name, method, endpoint, expected_status, data=None, headers=None, timeout=30):
        """Run a single API test with timing"""
        url = f"{self.base_url}/api/{endpoint.lstrip('/')}"
        test_headers = {'Content-Type': 'application/json'}
        
        if self.token:
            test_headers['Authorization'] = f'Bearer {self.token}'
        if headers:
            test_headers.update(headers)

        self.tests_run += 1
        self.log(f"🔍 Testing {name}...")
        
        start_time = time.time()
        try:
            response = requests.request(method, url, json=data, headers=test_headers, timeout=timeout)
            elapsed = time.time() - start_time
            success = response.status_code == expected_status
            
            if success:
                self.tests_passed += 1
                self.log(f"✅ {name} - Status: {response.status_code} ({elapsed:.2f}s)")
            else:
                self.log(f"❌ {name} - Expected {expected_status}, got {response.status_code} ({elapsed:.2f}s)")
                if response.text:
                    self.log(f"   Response: {response.text[:200]}")

            return success, response.json() if response.text and response.status_code < 500 else {}, elapsed

        except requests.exceptions.Timeout:
            elapsed = time.time() - start_time
            self.log(f"❌ {name} - TIMEOUT after {elapsed:.2f}s")
            return False, {}, elapsed
        except Exception as e:
            elapsed = time.time() - start_time
            self.log(f"❌ {name} - Error: {str(e)} ({elapsed:.2f}s)")
            return False, {}, elapsed

    def test_login(self):
        """Test admin login"""
        success, response, _ = self.run_test(
            "Admin Login",
            "POST",
            "auth/login",
            200,
            data={"email": self.admin_email, "password": self.admin_password}
        )
        if success and 'token' in response:
            self.token = response['token']
            return True
        return False

    def test_deploy_performance(self):
        """CRITICAL FIX: Test deploy endpoint completes in <5 seconds"""
        self.log("\n🚀 CRITICAL FIX TEST: Deploy Performance (<5 seconds)")
        
        if not self.token:
            self.log("❌ No auth token for deploy test")
            return False
            
        success, response, elapsed = self.run_test(
            "Deploy Performance Test",
            "POST",
            f"projects/{self.test_project_id}/deploy",
            200,
            timeout=10
        )
        
        if success:
            # Check response structure
            required_fields = ['status', 'gatewayUrl', 'apiKey', 'endpointsExposed', 'fieldsFiltered']
            missing_fields = [f for f in required_fields if f not in response]
            
            if missing_fields:
                self.log(f"❌ Deploy response missing fields: {missing_fields}")
                return False
                
            if elapsed < 5.0:
                self.log(f"✅ Deploy completed in {elapsed:.2f}s (target: <5s)")
                self.log(f"✅ Response includes: {', '.join(required_fields)}")
                return True
            else:
                self.log(f"❌ Deploy took {elapsed:.2f}s (target: <5s)")
                return False
        return False

    def test_api_keys_crud(self):
        """CRITICAL FIX: Test API keys CRUD endpoints"""
        self.log("\n🔑 CRITICAL FIX TEST: API Keys CRUD")
        
        if not self.token:
            self.log("❌ No auth token for API keys test")
            return False

        # Test GET /api/projects/:id/keys
        success, response, _ = self.run_test(
            "GET /api/projects/:id/keys",
            "GET",
            f"projects/{self.test_project_id}/keys",
            200
        )
        if not success:
            return False
            
        # Verify response structure
        if isinstance(response, list):
            for key in response:
                required_fields = ['keyPrefix', 'name', 'isActive', 'rateLimit', 'createdAt']
                missing = [f for f in required_fields if f not in key]
                if missing:
                    self.log(f"❌ Key missing fields: {missing}")
                    return False
            self.log(f"✅ Found {len(response)} API keys with correct structure")
        else:
            self.log("❌ Keys list response is not an array")
            return False

        # Test POST /api/projects/:id/keys
        success, response, _ = self.run_test(
            "POST /api/projects/:id/keys",
            "POST",
            f"projects/{self.test_project_id}/keys",
            200,
            data={"name": "Test Key", "rateLimit": 50}
        )
        if not success:
            return False
            
        # Verify response includes full raw key
        if 'apiKey' not in response:
            self.log("❌ Create key response missing 'apiKey' field")
            return False
            
        created_key_id = None
        if 'keyPrefix' in response:
            self.log(f"✅ API key created: {response['keyPrefix']}...")
            
            # Get updated list to find the key ID
            success, keys_list, _ = self.run_test(
                "GET keys after creation",
                "GET",
                f"projects/{self.test_project_id}/keys",
                200
            )
            if success and isinstance(keys_list, list):
                for key in keys_list:
                    if key.get('name') == 'Test Key':
                        created_key_id = key.get('id')
                        break

        # Test DELETE /api/keys/:keyId
        if created_key_id:
            success, response, _ = self.run_test(
                "DELETE /api/keys/:keyId",
                "DELETE",
                f"keys/{created_key_id}",
                200
            )
            if success:
                self.log("✅ API key revoked (isActive=false)")
                return True
        else:
            self.log("❌ Could not find created key ID for deletion test")
            
        return False

    def test_gateway_validation(self):
        """CRITICAL FIX: Test gateway validation steps"""
        self.log("\n🌐 CRITICAL FIX TEST: Gateway Validation")
        
        gateway_base = f"{self.base_url}/api/gateway/fast-deploy-test"
        
        # Test 1: No X-API-Key returns 401
        self.log("Testing gateway without X-API-Key...")
        try:
            response = requests.get(f"{gateway_base}/api/products", timeout=10)
            if response.status_code == 401:
                self.tests_passed += 1
                self.log("✅ Gateway returns 401 without X-API-Key")
            else:
                self.log(f"❌ Expected 401, got {response.status_code}")
        except Exception as e:
            self.log(f"❌ Gateway test failed: {e}")
        self.tests_run += 1

        # Test 2: Invalid key returns 403
        self.log("Testing gateway with invalid X-API-Key...")
        try:
            response = requests.get(
                f"{gateway_base}/api/products",
                headers={"X-API-Key": "sk_invalid_key"},
                timeout=10
            )
            if response.status_code == 403:
                self.tests_passed += 1
                self.log("✅ Gateway returns 403 with invalid X-API-Key")
            else:
                self.log(f"❌ Expected 403, got {response.status_code}")
        except Exception as e:
            self.log(f"❌ Gateway invalid key test failed: {e}")
        self.tests_run += 1

        # Test 3: Valid key returns 502 (backend unreachable - expected)
        self.log("Testing gateway with valid X-API-Key...")
        try:
            response = requests.get(
                f"{gateway_base}/api/products",
                headers={"X-API-Key": self.test_api_key},
                timeout=10
            )
            
            # Check required headers
            has_powered_by = response.headers.get("X-Powered-By") == "Scalable"
            has_rate_limit = any(h.startswith("X-RateLimit-") for h in response.headers)
            
            if response.status_code == 502 and has_powered_by and has_rate_limit:
                self.tests_passed += 1
                self.log("✅ Gateway returns 502 (expected) with X-Powered-By: Scalable and X-RateLimit-* headers")
            else:
                self.log(f"❌ Expected 502 with headers, got {response.status_code}")
                self.log(f"   X-Powered-By: {response.headers.get('X-Powered-By')}")
                rate_headers = [h for h in response.headers if h.startswith('X-RateLimit-')]
                self.log(f"   Rate limit headers: {rate_headers}")
        except Exception as e:
            self.log(f"❌ Gateway valid key test failed: {e}")
        self.tests_run += 1

        # Test 4: Non-exposed endpoint returns 404
        self.log("Testing gateway with non-exposed endpoint...")
        try:
            response = requests.get(
                f"{gateway_base}/api/admin/stats",
                headers={"X-API-Key": self.test_api_key},
                timeout=10
            )
            if response.status_code == 404:
                self.tests_passed += 1
                self.log("✅ Gateway returns 404 for non-exposed endpoint")
            else:
                self.log(f"❌ Expected 404, got {response.status_code}")
        except Exception as e:
            self.log(f"❌ Gateway non-exposed endpoint test failed: {e}")
        self.tests_run += 1

    def run_critical_tests(self):
        """Run all critical fix tests"""
        self.log("🚀 CRITICAL FIXES TESTING")
        self.log(f"Testing against: {self.base_url}")
        self.log("=" * 60)
        
        # Login first
        if not self.test_login():
            self.log("❌ Authentication failed, stopping tests")
            return False

        # Test critical fixes
        deploy_ok = self.test_deploy_performance()
        keys_ok = self.test_api_keys_crud()
        self.test_gateway_validation()

        # Summary
        self.log("\n" + "=" * 60)
        self.log(f"📊 CRITICAL FIXES TEST RESULTS: {self.tests_passed}/{self.tests_run} passed")
        success_rate = (self.tests_passed / self.tests_run * 100) if self.tests_run > 0 else 0
        self.log(f"Success Rate: {success_rate:.1f}%")
        
        if deploy_ok and keys_ok:
            self.log("✅ All critical fixes verified!")
            return True
        else:
            self.log("❌ Some critical fixes need attention")
            return False

def main():
    tester = CriticalFixesTester()
    success = tester.run_critical_tests()
    return 0 if success else 1

if __name__ == "__main__":
    sys.exit(main())