#!/usr/bin/env python3
"""
Simple endpoint verification focusing on deploy flow
"""

import asyncio
import aiohttp
import json

BACKEND_URL = "https://705243a1-cd8c-43be-b4d2-0ab1497d63f7.preview.emergentagent.com"
API_BASE = f"{BACKEND_URL}/api"

async def test_key_endpoints():
    async with aiohttp.ClientSession(timeout=aiohttp.ClientTimeout(total=120)) as session:
        print("🔍 Testing key deploy flow endpoints...")
        
        # 1. Login
        print("\n1. POST /api/auth/login")
        async with session.post(
            f"{API_BASE}/auth/login",
            json={"email": "admin@scalable.dev", "password": "Admin123!"}
        ) as resp:
            if resp.status == 200:
                data = await resp.json()
                token = data.get("token")
                print(f"✅ Login successful")
            else:
                print(f"❌ Login failed: {resp.status}")
                return
        
        headers = {"Authorization": f"Bearer {token}"}
        
        # 2. Create project
        print("\n2. POST /api/projects")
        async with session.post(
            f"{API_BASE}/projects",
            json={"name": "QuickTest", "repoUrl": "https://github.com/test/repo"},
            headers=headers
        ) as resp:
            if resp.status == 200:
                project = await resp.json()
                project_id = project.get("id")
                print(f"✅ Project created: {project_id}")
            else:
                print(f"❌ Project creation failed: {resp.status}")
                return
        
        # 3. Check if we can get existing projects with scan data
        print("\n3. GET /api/projects (checking for existing scanned projects)")
        async with session.get(f"{API_BASE}/projects", headers=headers) as resp:
            if resp.status == 200:
                projects = await resp.json()
                scanned_project = None
                for p in projects:
                    if p.get("status") in ["configuring", "live"] and p.get("endpointCount", 0) > 0:
                        scanned_project = p
                        break
                
                if scanned_project:
                    project_id = scanned_project["id"]
                    print(f"✅ Found scanned project: {project_id} (status: {scanned_project['status']})")
                else:
                    print("ℹ️ No pre-scanned projects found, will use new project")
        
        # 4. Test deploy endpoints directly if project is ready
        if scanned_project and scanned_project.get("status") == "configuring":
            print(f"\n4. POST /api/projects/{project_id}/deploy")
            async with session.post(
                f"{API_BASE}/projects/{project_id}/deploy",
                headers=headers
            ) as resp:
                if resp.status == 200:
                    deploy = await resp.json()
                    print(f"✅ Deploy started: {deploy.get('status')}")
                    
                    # 5. Poll deploy status
                    print(f"\n5. GET /api/projects/{project_id}/deploy-status")
                    for i in range(30):
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
                                    print("✅ Deploy completed!")
                                    print(f"✅ Gateway URL: {status.get('gatewayUrl')}")
                                    print(f"✅ NPM Package: {status.get('npmPackage')}@{status.get('npmVersion')}")
                                    print(f"✅ API Key: {status.get('apiKey', 'N/A')[:20]}...")
                                    return True
                                elif current_status == "failed":
                                    print(f"❌ Deploy failed: {status.get('error')}")
                                    return False
                                else:
                                    await asyncio.sleep(2)
                            else:
                                print(f"❌ Status check failed: {resp.status}")
                                return False
                else:
                    print(f"❌ Deploy failed: {resp.status}")
        else:
            print("ℹ️ No ready project found for deploy testing")
        
        # Test basic endpoint availability
        print(f"\n6. Testing endpoint availability")
        endpoints_to_test = [
            f"/projects/{project_id}/scan",
            f"/projects/{project_id}/routes", 
            f"/projects/{project_id}/endpoints",
            f"/projects/{project_id}/test-connection",
            f"/projects/{project_id}/deploy",
            f"/projects/{project_id}/deploy-status"
        ]
        
        for endpoint in endpoints_to_test:
            async with session.get(f"{API_BASE}{endpoint}", headers=headers) as resp:
                if resp.status in [200, 400, 422]:  # 400/422 are expected for some endpoints without data
                    print(f"✅ {endpoint} - accessible")
                else:
                    print(f"❌ {endpoint} - status {resp.status}")

if __name__ == "__main__":
    asyncio.run(test_key_endpoints())