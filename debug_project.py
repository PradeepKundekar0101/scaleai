#!/usr/bin/env python3
"""
Debug project creation issue
"""

import asyncio
import aiohttp
import json

BACKEND_URL = "https://705243a1-cd8c-43be-b4d2-0ab1497d63f7.preview.emergentagent.com"
API_BASE = f"{BACKEND_URL}/api"

async def debug_project_creation():
    async with aiohttp.ClientSession() as session:
        # Login first
        async with session.post(
            f"{API_BASE}/auth/login",
            json={"email": "admin@scalable.dev", "password": "Admin123!"}
        ) as resp:
            data = await resp.json()
            token = data.get("token")
        
        headers = {"Authorization": f"Bearer {token}"}
        
        # Try project creation with correct field name
        async with session.post(
            f"{API_BASE}/projects",
            json={"name": "TestProject", "repoUrl": "https://github.com/test/repo"},  # Fixed field name
            headers=headers
        ) as resp:
            print(f"Status: {resp.status}")
            response_text = await resp.text()
            print(f"Response: {response_text}")

if __name__ == "__main__":
    asyncio.run(debug_project_creation())