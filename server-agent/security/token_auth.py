"""
Token authentication middleware for the Server Agent.
Verifies that requests originate from the authorized VPSMaster Control Panel backend.
"""

import hmac
import os
from fastapi import Header, HTTPException, Security, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

AGENT_SECRET = os.getenv("VPSMASTER_AGENT_SECRET", "vpsmaster-internal-agent-secret-key-32chars")
security_bearer = HTTPBearer(auto_error=False)


def verify_agent_token(
    x_agent_secret: str = Header(None, alias="X-Agent-Secret"),
    auth: HTTPAuthorizationCredentials = Security(security_bearer)
) -> bool:
    """
    Validate that incoming requests supply the correct agent secret.
    Accepts either X-Agent-Secret header or Bearer token.
    Uses constant-time comparison to prevent timing attacks.
    """
    token_to_check = x_agent_secret
    if not token_to_check and auth and auth.credentials:
        token_to_check = auth.credentials

    if not token_to_check:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing Server Agent authentication credentials."
        )

    # Constant time comparison
    if not hmac.compare_digest(token_to_check, AGENT_SECRET):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Invalid Server Agent authentication credentials."
        )

    return True

