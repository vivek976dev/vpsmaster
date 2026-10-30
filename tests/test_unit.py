"""
Direct Python Unit Tests for VPSMaster Backend Functions and Models.
Executes business logic, models, authentication, and database queries directly.
"""

import os
os.environ["TESTING"] = "1"
import sys
import unittest
from pathlib import Path

backend_path = str(Path(__file__).resolve().parent.parent / "backend")
agent_path = str(Path(__file__).resolve().parent.parent / "server-agent")
sys.path.insert(0, backend_path)
sys.path.insert(0, agent_path)

from app.core.database import SessionLocal
from app.core.config import settings
from app.core.security import verify_password, get_password_hash, create_access_token, decode_token, UserRole
from app.main import seed_initial_data, health
from app.models import User, Website, Domain, DatabaseModel, FirewallRuleModel, CronJobModel
from app.schemas.all_schemas import UserLogin, WebsiteCreate, DomainCreate, DatabaseCreate, CronCreate
from app.api.v1 import auth, websites, dns, databases, security, cron, settings as settings_api


class DummyRequest:
    def __init__(self, ip="127.0.0.1"):
        self.client = type("Client", (), {"host": ip})


class TestVPSMasterDirect(unittest.TestCase):

    @classmethod
    def setUpClass(cls):
        seed_initial_data()
        cls.db = SessionLocal()

    @classmethod
    def tearDownClass(cls):
        cls.db.close()

    def test_01_health_function(self):
        h = health()
        self.assertEqual(h["status"], "healthy")
        self.assertEqual(h["service"], "vpsmaster-backend")

    def test_02_super_admin_seed_and_auth(self):
        admin = self.db.query(User).filter(User.username == settings.DEFAULT_ADMIN_USERNAME).first()
        self.assertIsNotNone(admin)
        self.assertTrue(verify_password(settings.DEFAULT_ADMIN_PASSWORD, admin.hashed_password))

        # Test login API function
        login_req = UserLogin(
            username_or_email=settings.DEFAULT_ADMIN_USERNAME,
            password=settings.DEFAULT_ADMIN_PASSWORD
        )
        token_resp = auth.login(req=login_req, request=DummyRequest(), db=self.db)
        self.assertTrue(token_resp.access_token)
        self.assertEqual(token_resp.user["role"], UserRole.SUPER_ADMIN.value)

        # Verify JWT token payload
        payload = decode_token(token_resp.access_token)
        self.assertEqual(payload["role"], UserRole.SUPER_ADMIN.value)
        self.assertEqual(payload["sub"], str(admin.id))

    def test_03_website_management(self):
        admin = self.db.query(User).filter(User.username == "admin").first()
        sites = websites.list_websites(current_user=admin, db=self.db)
        self.assertIsInstance(sites, list)
        self.assertGreaterEqual(len(sites), 1)
        self.assertEqual(sites[0].domain, "example.com")

    def test_04_dns_management(self):
        admin = self.db.query(User).filter(User.username == "admin").first()
        domains = dns.list_domains(current_user=admin, db=self.db)
        self.assertGreaterEqual(len(domains), 1)
        self.assertEqual(domains[0].domain_name, "example.com")
        self.assertGreaterEqual(len(domains[0].dns_records), 1)

    def test_05_database_and_firewall(self):
        admin = self.db.query(User).filter(User.username == "admin").first()
        dbs = databases.list_databases(current_user=admin, db=self.db)
        self.assertGreaterEqual(len(dbs), 1)
        self.assertEqual(dbs[0].name, "wp_example")

        rules = self.db.query(FirewallRuleModel).all()
        self.assertGreaterEqual(len(rules), 1)

        jobs = cron.list_cron_jobs(current_user=admin, db=self.db)
        self.assertGreaterEqual(len(jobs), 1)

        panel_settings = settings_api.get_settings(db=self.db)
        self.assertIn("panel_name", panel_settings)

    def test_06_security_validator_and_safe_paths(self):
        from security.validator import validate_domain, validate_database_name, validate_safe_path
        # Valid domain
        self.assertEqual(validate_domain("my-site.org"), "my-site.org")
        with self.assertRaises(ValueError):
            validate_domain("invalid_domain; rm -rf /")

        # Valid database name
        self.assertEqual(validate_database_name("my_db_2026"), "my_db_2026")
        with self.assertRaises(ValueError):
            validate_database_name("db; DROP TABLE users;")

        # Safe path traversal protection
        test_base = Path(__file__).resolve().parent
        safe_path = validate_safe_path(str(Path(__file__).resolve()), base_dir=str(test_base))
        self.assertTrue(os.path.exists(safe_path))

        with self.assertRaises(ValueError):
            validate_safe_path("../../Windows/System32", base_dir=str(test_base))

    def test_07_agent_token_auth(self):
        from security.token_auth import verify_agent_token
        from fastapi import HTTPException
        valid_secret = settings.AGENT_SECRET
        self.assertTrue(verify_agent_token(valid_secret))
        with self.assertRaises(HTTPException):
            verify_agent_token("invalid-token-1234")

    def test_08_ai_assistant_and_deployments(self):
        from app.api.v1.ai import LogAnalysisRequest
        from app.api.v1.deployments import REMOTE_NODES, OneClickDeployRequest

        # Test AI log analyzer request validation
        req = LogAnalysisRequest(log_text="nginx error: 502 Bad Gateway while connecting to upstream", source="nginx")
        self.assertEqual(req.source, "nginx")

        # Test one-click deploy schema
        deploy_req = OneClickDeployRequest(app_type="wordpress", domain="blog.example.com", php_version="8.3")
        self.assertEqual(deploy_req.app_type, "wordpress")
        self.assertEqual(deploy_req.domain, "blog.example.com")

        # Test multi-server nodes initial registry
        self.assertGreaterEqual(len(REMOTE_NODES), 1)
        self.assertEqual(REMOTE_NODES[0]["role"], "main")


if __name__ == "__main__":
    unittest.main()
