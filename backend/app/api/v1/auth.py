"""
Authentication API Endpoints.
Handles login, token refresh, 2FA setup, and user profile management.
"""

from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import (
    create_access_token,
    create_refresh_token,
    decode_token,
    generate_totp_secret,
    get_password_hash,
    get_totp_qr_base64,
    verify_password,
    verify_totp_code
)
from app.middleware.auth import get_current_user, record_audit_log
from app.models.user import User
from app.schemas.all_schemas import TokenResponse, TwoFactorSetupResponse, TwoFactorVerify, UserLogin, UserOut

router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.post("/login", response_model=TokenResponse)
def login(req: UserLogin, request: Request, db: Session = Depends(get_db)):
    """Authenticate user with username/email and password. Verifies 2FA if enabled."""
    identifier = req.username_or_email.strip()

    user = db.query(User).filter((User.username == identifier) | (User.email == identifier)).first()

    if not user or not verify_password(req.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username/email or password."
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Your account has been suspended. Please contact administrator."
        )

    # 2FA Verification check
    if user.is_totp_enabled:
        if not req.totp_code:
            return TokenResponse(
                access_token="",
                refresh_token="",
                user={"id": user.id, "username": user.username, "email": user.email, "role": user.role},
                requires_2fa=True
            )
        if not verify_totp_code(user.totp_secret, req.totp_code):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid two-factor authentication code."
            )

    # Update last login
    user.last_login = datetime.now(timezone.utc)
    db.commit()

    # Generate tokens
    access_token = create_access_token(subject=user.id, role=user.role)
    refresh_token = create_refresh_token(subject=user.id)

    client_ip = request.client.host if request.client else "unknown"
    try:
        record_audit_log(db, user, "LOGIN_SUCCESS", "auth", client_ip)
    except Exception:
        pass

    return TokenResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        user={
            "id": user.id,
            "username": user.username,
            "email": user.email,
            "role": user.role,
            "is_totp_enabled": user.is_totp_enabled
        },
        requires_2fa=False
    )


@router.post("/refresh")
def refresh_token_endpoint(refresh_token: str, db: Session = Depends(get_db)):
    """Issue a new access token using a valid refresh token."""
    payload = decode_token(refresh_token)
    user_id = payload.get("sub")
    token_type = payload.get("type")

    if not user_id or token_type != "refresh":
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid refresh token.")

    user = db.query(User).filter(User.id == int(user_id)).first()

    if not user or not user.is_active:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User inactive or removed.")

    new_access_token = create_access_token(subject=user.id, role=user.role)
    return {"access_token": new_access_token, "token_type": "bearer"}


@router.get("/me", response_model=UserOut)
def get_my_profile(current_user: User = Depends(get_current_user)):
    """Return currently authenticated user profile."""
    return current_user


@router.post("/2fa/setup", response_model=TwoFactorSetupResponse)
def setup_two_factor(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Generate new TOTP secret and QR code for user setup."""
    secret = generate_totp_secret()
    qr_code = get_totp_qr_base64(secret, current_user.username)

    # Temporarily store secret
    current_user.totp_secret = secret
    db.commit()

    return TwoFactorSetupResponse(secret=secret, qr_code_base64=qr_code)


@router.post("/2fa/enable")
def enable_two_factor(
    req: TwoFactorVerify,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Verify code and permanently enable 2FA on the account."""
    if not current_user.totp_secret:
        raise HTTPException(status_code=400, detail="2FA setup must be initiated first.")

    if not verify_totp_code(current_user.totp_secret, req.totp_code):
        raise HTTPException(status_code=400, detail="Invalid verification code.")

    current_user.is_totp_enabled = True
    db.commit()

    return {"success": True, "message": "Two-factor authentication successfully enabled."}


@router.post("/2fa/disable")
def disable_two_factor(
    req: TwoFactorVerify,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Disable 2FA after verifying code."""
    if not current_user.is_totp_enabled:
        return {"success": True, "message": "2FA is already disabled."}

    if not verify_totp_code(current_user.totp_secret, req.totp_code):
        raise HTTPException(status_code=400, detail="Invalid verification code.")

    current_user.is_totp_enabled = False
    current_user.totp_secret = None
    db.commit()

    return {"success": True, "message": "Two-factor authentication disabled."}
