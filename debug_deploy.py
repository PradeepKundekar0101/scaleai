#!/usr/bin/env python3
"""
Debug deploy failure
"""

import asyncio
import aiohttp
import json

BACKEND_URL = "https://keen-cerf-6.preview.emergentagent.com"
API_BASE = f"{BACKEND_URL}/api"

async def debug_deploy():
    async with aiohttp.ClientSession() as session:
        # Login
        async with session.post(
            f"{API_BASE}/auth/login",
            json={"email": "admin@scalable.dev", "password": "Admin123!"}
        ) as resp:
            data = await resp.json()
            token = data.get("token")
        
        headers = {"Authorization": f"Bearer {token}"}
        
        # Get projects
        async with session.get(f"{API_BASE}/projects", headers=headers) as resp:
            projects = await resp.json()
            
        # Find a configuring project
        for project in projects:
            if project.get("status") == "configuring":
                project_id = project["id"]
                print(f"Testing deploy for project {project_id}")
                
                # Check if it has endpoints
                async with session.get(f"{API_BASE}/projects/{project_id}", headers=headers) as resp:
                    project_details = await resp.json()
                    print(f"Project status: {project_details.get('status')}")
                    print(f"Endpoint count: {project_details.get('endpointCount')}")
                    print(f"Exposed endpoint count: {project_details.get('exposedEndpointCount')}")
                
                # Try deploy
                async with session.post(f"{API_BASE}/projects/{project_id}/deploy", headers=headers) as resp:
                    print(f"Deploy response status: {resp.status}")
                    response_text = await resp.text()
                    print(f"Deploy response: {response_text}")
                break

if __name__ == "__main__":
    asyncio.run(debug_deploy())