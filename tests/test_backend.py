"""
Automated Integration and Unit Tests for VPSMaster Backend & Server Agent.
Uses httpx.AsyncClient with ASGITransport for pure in-process testing.
"""

import os
os.environ["TESTING"] = "1"
import sys
import unittest
from pathlib import Path

# Add backend and server-agent to sys.path
backend_path = str(Path(__file__).resolve().parent.parent / "backend")
agent_path = str(Path(__file__).resolve().parent.parent / "server-agent")
sys.path.insert(0, backend_path)
sys.path.insert(0, agent_path)

import httpx
from app.main import app, seed_initial_data
from app.core.config import settings
from app.services.agent_client import agent_client
import agent as agent_module


class TestVPSMasterBackend(unittest.IsolatedAsyncioTestCase):

    async def asyncSetUp(self):
        # 1. Seed initial data
        seed_initial_data()

        # 2. In-process transport for agent
        self.agent_client_test = httpx.AsyncClient(
            transport=httpx.ASGITransport(app=agent_module.app),
            base_url="http://agent-local"
        )

        async def direct_agent_call(method: str, endpoint: str, **kwargs):
            headers = {"X-Agent-Secret": settings.AGENT_SECRET}
            resp = await self.agent_client_test.request(
                method=method,
                url=endpoint,
                headers=headers,
                params=kwargs.get("params"),
                json=kwargs.get("json")
            )
            return resp.json()

        self._orig_request = agent_client._request
        agent_client._request = direct_agent_call

        # 3. In-process transport for backend
        self.client = httpx.AsyncClient(
            transport=httpx.ASGITransport(app=app),
            base_url="http://backend-test"
        )

    async def asyncTearDown(self):
        agent_client._request = self._orig_request
        await self.client.aclose()
        await self.agent_client_test.aclose()

    async def test_01_health_check(self):
        response = await self.client.get("/health")
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data["status"], "healthy")
        self.assertEqual(data["service"], "vpsmaster-backend")

    async def test_02_super_admin_login(self):
        response = await self.client.post("/api/v1/auth/login", json={
            "username_or_email": settings.DEFAULT_ADMIN_USERNAME,
            "password": settings.DEFAULT_ADMIN_PASSWORD
        })
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertIn("access_token", data)
        self.assertIn("user", data)
        self.assertEqual(data["user"]["username"], "admin")
        self.assertEqual(data["user"]["role"], "super_admin")

    async def test_03_authenticated_me_and_dashboard(self):
        login_res = await self.client.post("/api/v1/auth/login", json={
            "username_or_email": settings.DEFAULT_ADMIN_USERNAME,
            "password": settings.DEFAULT_ADMIN_PASSWORD
        })
        token = login_res.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}

        # Test /auth/me
        me_res = await self.client.get("/api/v1/auth/me", headers=headers)
        self.assertEqual(me_res.status_code, 200)
        self.assertEqual(me_res.json()["email"], settings.DEFAULT_ADMIN_EMAIL)

        # Test /dashboard/overview
        dash_res = await self.client.get("/api/v1/dashboard/overview", headers=headers)
        self.assertEqual(dash_res.status_code, 200)
        dash_data = dash_res.json()
        self.assertIn("metrics", dash_data)
        self.assertIn("resource_counts", dash_data)
        self.assertGreaterEqual(dash_data["health_score"], 20)

    async def test_04_websites_and_dns(self):
        login_res = await self.client.post("/api/v1/auth/login", json={
            "username_or_email": settings.DEFAULT_ADMIN_USERNAME,
            "password": settings.DEFAULT_ADMIN_PASSWORD
        })
        token = login_res.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}

        # List websites
        res = await self.client.get("/api/v1/websites", headers=headers)
        self.assertEqual(res.status_code, 200)
        sites = res.json()
        self.assertIsInstance(sites, list)
        self.assertGreaterEqual(len(sites), 1)
        self.assertEqual(sites[0]["domain"], "example.com")

        # List domains
        dom_res = await self.client.get("/api/v1/dns/domains", headers=headers)
        self.assertEqual(dom_res.status_code, 200)
        self.assertGreaterEqual(len(dom_res.json()), 1)

    async def test_05_services_and_databases(self):
        login_res = await self.client.post("/api/v1/auth/login", json={
            "username_or_email": settings.DEFAULT_ADMIN_USERNAME,
            "password": settings.DEFAULT_ADMIN_PASSWORD
        })
        token = login_res.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}

        # List services
        srv_res = await self.client.get("/api/v1/services", headers=headers)
        self.assertEqual(srv_res.status_code, 200)
        self.assertIsInstance(srv_res.json(), list)

        # List DBs
        db_res = await self.client.get("/api/v1/databases", headers=headers)
        self.assertEqual(db_res.status_code, 200)

        # List Firewall
        fw_res = await self.client.get("/api/v1/security/firewall/status", headers=headers)
        self.assertEqual(fw_res.status_code, 200)

        # List Cron Jobs
        cron_res = await self.client.get("/api/v1/cron", headers=headers)
        self.assertEqual(cron_res.status_code, 200)

        # Settings
        set_res = await self.client.get("/api/v1/settings", headers=headers)
        self.assertEqual(set_res.status_code, 200)
        self.assertIn("panel_name", set_res.json())


if __name__ == "__main__":
    unittest.main()
