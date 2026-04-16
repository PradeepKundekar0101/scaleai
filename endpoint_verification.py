#!/usr/bin/env python3
"""
Quick verification of specific endpoints mentioned in review request
"""

import asyncio
import aiohttp
import json

BACKEND_URL = "https://keen-cerf-6.preview.emergentagent.com"
API_BASE = f"{BACKEND_URL}/api"

async def test_specific_endpoints():
    """Test the specific endpoints mentioned in the review request"""
    
    async with aiohttp.ClientSession() as session:
        print("🔍 Testing specific endpoints from review request...")
        
        # 1. Login
        print("\n1. Testing POST /api/auth/login")
        async with session.post(
            f"{API_BASE}/auth/login",
            json={"email": "admin@scalable.dev", "password": "Admin123!"}
        ) as resp:
            if resp.status == 200:
                data = await resp.json()
                token = data.get("token")
                print(f"✅ Login successful, got token: {token[:20]}...")
            else:
                print(f"❌ Login failed: {resp.status}")
                return
        
        headers = {"Authorization": f"Bearer {token}"}
        
        # 2. Create project
        print("\n2. Testing POST /api/projects")
        async with session.post(
            f"{API_BASE}/projects",
            json={"name": "TestProject", "repoUrl": "https://github.com/test/repo"},
            headers=headers
        ) as resp:
            if resp.status == 200:
                project = await resp.json()
                project_id = project.get("id")
                print(f"✅ Project created: {project_id}")
            else:
                print(f"❌ Project creation failed: {resp.status}")
                return
        
        # 3. Scan codebase
        print(f"\n3. Testing POST /api/projects/{project_id}/scan")
        async with session.post(
            f"{API_BASE}/projects/{project_id}/scan",
            headers=headers
        ) as resp:
            if resp.status == 200:
                scan_result = await resp.json()
                print(f"✅ Scan completed: {scan_result.get('routeCount')} routes found")
            else:
                print(f"❌ Scan failed: {resp.status}")
                return
        
        # 4. Get routes and create endpoints
        print(f"\n4. Testing POST /api/projects/{project_id}/endpoints")
        async with session.get(
            f"{API_BASE}/projects/{project_id}/routes",
            headers=headers
        ) as resp:
            routes = await resp.json()
        
        # Select first route for endpoint
        if routes:
            endpoint_data = {
                "endpoints": [{
                    "method": routes[0]["method"],
                    "path": routes[0]["path"],
                    "description": routes[0].get("description", "Test endpoint"),
                    "fieldsToStrip": [],
                    "rateLimit": 100
                }]
            }
            
            async with session.post(
                f"{API_BASE}/projects/{project_id}/endpoints",
                json=endpoint_data,
                headers=headers
            ) as resp:
                if resp.status == 200:
                    endpoints = await resp.json()
                    print(f"✅ Endpoints created: {endpoints.get('count')} endpoints")
                else:
                    print(f"❌ Endpoint creation failed: {resp.status}")
                    return
        
        # 5. Test connection
        print(f"\n5. Testing POST /api/projects/{project_id}/test-connection")
        async with session.post(
            f"{API_BASE}/projects/{project_id}/test-connection",
            json={
                "targetBackendUrl": "http://localhost:3001",
                "loginEndpoint": "/api/auth/login",
                "serviceAccountEmail": "test@example.com",
                "serviceAccountPassword": "testpass123"
            },
            headers=headers
        ) as resp:
            if resp.status == 200:
                connection = await resp.json()
                print(f"✅ Connection test: {connection.get('success')} (mock: {connection.get('mock')})")
            else:
                print(f"❌ Connection test failed: {resp.status}")
                return
        
        # 6. Deploy
        print(f"\n6. Testing POST /api/projects/{project_id}/deploy")
        async with session.post(
            f"{API_BASE}/projects/{project_id}/deploy",
            headers=headers
        ) as resp:
            if resp.status == 200:
                deploy = await resp.json()
                print(f"✅ Deploy started: {deploy.get('status')}")
            else:
                print(f"❌ Deploy failed: {resp.status}")
                return
        
        # 7. Poll deploy status
        print(f"\n7. Testing GET /api/projects/{project_id}/deploy-status")
        for i in range(10):
            async with session.get(
                f"{API_BASE}/projects/{project_id}/deploy-status",
                headers=headers
            ) as resp:
                if resp.status == 200:
                    status = await resp.json()
                    current_status = status.get("status")
                    step = status.get("deployStep", "")
                    print(f"  Poll {i+1}: {current_status} - {step}")
                    
                    if current_status == "live":
                        print("✅ Deploy completed successfully!")
                        
                        # 8. Verify final state
                        print(f"\n8. Verifying final project state")
                        async with session.get(
                            f"{API_BASE}/projects/{project_id}",
                            headers=headers
                        ) as resp:
                            if resp.status == 200:
                                final_project = await resp.json()
                                has_spec = bool(final_project.get("openApiSpec"))
                                has_sdk = bool(final_project.get("sdkCode"))
                                print(f"✅ Final verification: openApiSpec={has_spec}, sdkCode={has_sdk}")
                                
                                if status.get("npmPackage"):
                                    print(f"✅ NPM package: {status.get('npmPackage')}@{status.get('npmVersion')}")
                                
                                return True
                            else:
                                print(f"❌ Final verification failed: {resp.status}")
                                return False
                        break
                    elif current_status == "failed":
                        print(f"❌ Deploy failed: {status.get('error')}")
                        return False
                    else:
                        await asyncio.sleep(2)
                else:
                    print(f"❌ Status check failed: {resp.status}")
                    return False
        
        print("❌ Deploy polling timed out")
        return False

if __name__ == "__main__":
    asyncio.run(test_specific_endpoints())