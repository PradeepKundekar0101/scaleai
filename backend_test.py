#!/usr/bin/env python3
"""
Backend API Testing for Scalable Platform Deploy Flow
Tests the complete deploy flow and polling endpoints.
"""

import asyncio
import aiohttp
import json
import time
import os
import sys
from typing import Dict, Any, Optional

# Backend URL from frontend .env
BACKEND_URL = "https://705243a1-cd8c-43be-b4d2-0ab1497d63f7.preview.emergentagent.com"
API_BASE = f"{BACKEND_URL}/api"

# Test credentials
ADMIN_EMAIL = "admin@scalable.dev"
ADMIN_PASSWORD = "Admin123!"

class TestResult:
    def __init__(self):
        self.passed = 0
        self.failed = 0
        self.errors = []
        
    def success(self, test_name: str):
        print(f"✅ {test_name}")
        self.passed += 1
        
    def failure(self, test_name: str, error: str):
        print(f"❌ {test_name}: {error}")
        self.failed += 1
        self.errors.append(f"{test_name}: {error}")
        
    def summary(self):
        total = self.passed + self.failed
        print(f"\n📊 Test Summary: {self.passed}/{total} passed")
        if self.errors:
            print("\n🔍 Failures:")
            for error in self.errors:
                print(f"  - {error}")
        return self.failed == 0

class ScalableAPITester:
    def __init__(self):
        self.session = None
        self.auth_token = None
        self.project_id = None
        self.result = TestResult()
        
    async def __aenter__(self):
        self.session = aiohttp.ClientSession(
            timeout=aiohttp.ClientTimeout(total=60),
            headers={"Content-Type": "application/json"}
        )
        return self
        
    async def __aexit__(self, exc_type, exc_val, exc_tb):
        if self.session:
            await self.session.close()
            
    async def make_request(self, method: str, endpoint: str, data: Optional[Dict] = None, 
                          auth: bool = True) -> Dict[str, Any]:
        """Make HTTP request to API"""
        url = f"{API_BASE}{endpoint}"
        headers = {}
        
        if auth and self.auth_token:
            headers["Authorization"] = f"Bearer {self.auth_token}"
            
        try:
            async with self.session.request(
                method, url, json=data, headers=headers
            ) as response:
                response_text = await response.text()
                
                if response.content_type == 'application/json':
                    response_data = await response.json()
                else:
                    response_data = {"text": response_text}
                    
                return {
                    "status": response.status,
                    "data": response_data,
                    "headers": dict(response.headers)
                }
        except Exception as e:
            return {
                "status": 0,
                "data": {"error": str(e)},
                "headers": {}
            }
    
    async def test_auth_login(self):
        """Test 1: Login with admin credentials"""
        response = await self.make_request(
            "POST", "/auth/login",
            {"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD},
            auth=False
        )
        
        if response["status"] == 200 and "token" in response["data"]:
            self.auth_token = response["data"]["token"]
            self.result.success("Auth login")
            return True
        else:
            self.result.failure("Auth login", f"Status {response['status']}: {response['data']}")
            return False
    
    async def test_create_project(self):
        """Test 2: Create a test project"""
        project_data = {
            "name": "TestDeployProject",
            "repoUrl": "https://github.com/test/scalable-demo"
        }
        
        response = await self.make_request("POST", "/projects", project_data)
        
        if response["status"] == 200 and "id" in response["data"]:
            self.project_id = response["data"]["id"]
            self.result.success("Create project")
            return True
        else:
            self.result.failure("Create project", f"Status {response['status']}: {response['data']}")
            return False
    
    async def test_scan_codebase(self):
        """Test 3: Scan project codebase"""
        if not self.project_id:
            self.result.failure("Scan codebase", "No project ID available")
            return False
            
        response = await self.make_request("POST", f"/projects/{self.project_id}/scan")
        
        if response["status"] == 200 and "routeCount" in response["data"]:
            route_count = response["data"]["routeCount"]
            self.result.success(f"Scan codebase (found {route_count} routes)")
            return True
        else:
            self.result.failure("Scan codebase", f"Status {response['status']}: {response['data']}")
            return False
    
    async def test_get_routes(self):
        """Test 4: Get discovered routes"""
        if not self.project_id:
            self.result.failure("Get routes", "No project ID available")
            return False
            
        response = await self.make_request("GET", f"/projects/{self.project_id}/routes")
        
        if response["status"] == 200 and isinstance(response["data"], list):
            routes = response["data"]
            self.result.success(f"Get routes (found {len(routes)} routes)")
            return routes
        else:
            self.result.failure("Get routes", f"Status {response['status']}: {response['data']}")
            return []
    
    async def test_create_endpoints(self, routes):
        """Test 5: Create endpoints from discovered routes"""
        if not self.project_id:
            self.result.failure("Create endpoints", "No project ID available")
            return False
            
        if not routes:
            self.result.failure("Create endpoints", "No routes available")
            return False
        
        # Select first 3 green/yellow routes for testing
        selected_endpoints = []
        for route in routes[:3]:
            if route.get("risk") in ["green", "yellow"]:
                selected_endpoints.append({
                    "method": route["method"],
                    "path": route["path"],
                    "description": route.get("description", "Test endpoint"),
                    "fieldsToStrip": route.get("fields_to_strip", []),
                    "rateLimit": 100
                })
        
        if not selected_endpoints:
            self.result.failure("Create endpoints", "No suitable routes found")
            return False
        
        endpoint_data = {"endpoints": selected_endpoints}
        response = await self.make_request("POST", f"/projects/{self.project_id}/endpoints", endpoint_data)
        
        if response["status"] == 200 and "count" in response["data"]:
            count = response["data"]["count"]
            self.result.success(f"Create endpoints ({count} endpoints)")
            return True
        else:
            self.result.failure("Create endpoints", f"Status {response['status']}: {response['data']}")
            return False
    
    async def test_connection(self):
        """Test 6: Test connection with mock backend"""
        if not self.project_id:
            self.result.failure("Test connection", "No project ID available")
            return False
            
        connection_data = {
            "targetBackendUrl": "http://localhost:3001",  # Will trigger mock mode
            "loginEndpoint": "/api/auth/login",
            "serviceAccountEmail": "test@example.com",
            "serviceAccountPassword": "testpass123"
        }
        
        response = await self.make_request("POST", f"/projects/{self.project_id}/test-connection", connection_data)
        
        if response["status"] == 200 and response["data"].get("success"):
            mock_status = "MOCK" if response["data"].get("mock") else "REAL"
            self.result.success(f"Test connection ({mock_status})")
            return True
        else:
            self.result.failure("Test connection", f"Status {response['status']}: {response['data']}")
            return False
    
    async def test_deploy_start(self):
        """Test 7: Start deploy (should return immediately)"""
        if not self.project_id:
            self.result.failure("Deploy start", "No project ID available")
            return False
            
        start_time = time.time()
        response = await self.make_request("POST", f"/projects/{self.project_id}/deploy")
        end_time = time.time()
        
        # Deploy should return immediately (< 5 seconds)
        response_time = end_time - start_time
        
        if response["status"] == 200 and response["data"].get("status") == "deploying":
            if response_time < 5:
                self.result.success(f"Deploy start (returned in {response_time:.1f}s)")
                return True
            else:
                self.result.failure("Deploy start", f"Too slow: {response_time:.1f}s (should be < 5s)")
                return False
        else:
            self.result.failure("Deploy start", f"Status {response['status']}: {response['data']}")
            return False
    
    async def test_deploy_polling(self):
        """Test 8: Poll deploy status until completion"""
        if not self.project_id:
            self.result.failure("Deploy polling", "No project ID available")
            return False
            
        max_polls = 60  # 2 minutes max
        poll_interval = 2  # 2 seconds
        
        for poll_count in range(max_polls):
            response = await self.make_request("GET", f"/projects/{self.project_id}/deploy-status")
            
            if response["status"] != 200:
                self.result.failure("Deploy polling", f"Status {response['status']}: {response['data']}")
                return False
            
            status = response["data"].get("status")
            deploy_step = response["data"].get("deployStep", "")
            
            print(f"  Poll {poll_count + 1}: {status} - {deploy_step}")
            
            if status == "live":
                self.result.success(f"Deploy polling (completed in {poll_count + 1} polls)")
                return response["data"]
            elif status == "failed":
                error = response["data"].get("error", "Unknown error")
                self.result.failure("Deploy polling", f"Deploy failed: {error}")
                return False
            elif status == "deploying":
                # Continue polling
                await asyncio.sleep(poll_interval)
                continue
            else:
                self.result.failure("Deploy polling", f"Unexpected status: {status}")
                return False
        
        self.result.failure("Deploy polling", f"Timeout after {max_polls} polls")
        return False
    
    async def test_final_project_state(self, deploy_result):
        """Test 9: Verify final project state after deploy"""
        if not self.project_id:
            self.result.failure("Final project state", "No project ID available")
            return False
            
        response = await self.make_request("GET", f"/projects/{self.project_id}")
        
        if response["status"] != 200:
            self.result.failure("Final project state", f"Status {response['status']}: {response['data']}")
            return False
        
        project = response["data"]
        
        # Check required fields
        required_fields = ["openApiSpec", "sdkCode"]
        missing_fields = []
        
        for field in required_fields:
            if not project.get(field):
                missing_fields.append(field)
        
        # Check deploy result fields
        if deploy_result:
            deploy_fields = ["gatewayUrl", "npmPackage", "apiKey"]
            for field in deploy_fields:
                if not deploy_result.get(field):
                    missing_fields.append(f"deploy.{field}")
        
        if missing_fields:
            self.result.failure("Final project state", f"Missing fields: {', '.join(missing_fields)}")
            return False
        else:
            npm_package = deploy_result.get("npmPackage", "N/A")
            self.result.success(f"Final project state (npm: {npm_package})")
            return True
    
    async def test_npm_package_info(self, deploy_result):
        """Test 10: Verify NPM package information"""
        if not deploy_result:
            self.result.failure("NPM package info", "No deploy result available")
            return False
            
        npm_package = deploy_result.get("npmPackage")
        npm_version = deploy_result.get("npmVersion")
        npm_published = deploy_result.get("npmPublished", False)
        
        if npm_package and npm_version:
            status = "PUBLISHED" if npm_published else "MOCKED"
            self.result.success(f"NPM package info ({npm_package}@{npm_version} - {status})")
            return True
        else:
            self.result.failure("NPM package info", "Missing npm package details")
            return False
    
    async def run_all_tests(self):
        """Run the complete test suite"""
        print("🚀 Starting Scalable Platform Deploy Flow Tests")
        print(f"Backend URL: {BACKEND_URL}")
        print("=" * 60)
        
        # Test 1: Authentication
        if not await self.test_auth_login():
            print("❌ Authentication failed - stopping tests")
            return self.result.summary()
        
        # Test 2: Create project
        if not await self.test_create_project():
            print("❌ Project creation failed - stopping tests")
            return self.result.summary()
        
        # Test 3: Scan codebase
        if not await self.test_scan_codebase():
            print("❌ Codebase scan failed - stopping tests")
            return self.result.summary()
        
        # Test 4: Get routes
        routes = await self.test_get_routes()
        
        # Test 5: Create endpoints
        if not await self.test_create_endpoints(routes):
            print("❌ Endpoint creation failed - stopping tests")
            return self.result.summary()
        
        # Test 6: Test connection
        if not await self.test_connection():
            print("❌ Connection test failed - stopping tests")
            return self.result.summary()
        
        # Test 7: Start deploy
        if not await self.test_deploy_start():
            print("❌ Deploy start failed - stopping tests")
            return self.result.summary()
        
        # Test 8: Poll deploy status
        deploy_result = await self.test_deploy_polling()
        if not deploy_result:
            print("❌ Deploy polling failed - stopping tests")
            return self.result.summary()
        
        # Test 9: Verify final project state
        await self.test_final_project_state(deploy_result)
        
        # Test 10: NPM package info
        await self.test_npm_package_info(deploy_result)
        
        print("=" * 60)
        return self.result.summary()

async def main():
    """Main test runner"""
    async with ScalableAPITester() as tester:
        success = await tester.run_all_tests()
        sys.exit(0 if success else 1)

if __name__ == "__main__":
    asyncio.run(main())