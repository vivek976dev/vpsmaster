"""
Cron Job Management API Endpoints.
Scheduled automated tasks with user-friendly presets and manual run triggers.
"""

from typing import List
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.middleware.auth import get_current_user, record_audit_log
from app.models.cron import CronJobModel
from app.models.user import User
from app.schemas.all_schemas import CronCreate, CronOut
from app.services.agent_client import agent_client

router = APIRouter(prefix="/cron", tags=["Cron Job Management"])


@router.get("", response_model=List[CronOut])
def list_cron_jobs(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """List scheduled cron jobs."""
    jobs = db.query(CronJobModel).order_by(CronJobModel.created_at.desc()).all()

    if not jobs:
        defaults = [
            CronJobModel(
                title="Automated Daily Backup",
                command="/usr/local/bin/vpsmaster-backup --auto",
                schedule="0 2 * * *",
                is_active=True,
                user_id=current_user.id
            ),
            CronJobModel(
                title="Certbot SSL Auto-Renew",
                command="certbot renew --quiet",
                schedule="0 0 * * 0",
                is_active=True,
                user_id=current_user.id
            )
        ]
        db.add_all(defaults)
        db.commit()
        for j in defaults:
            db.refresh(j)
        return defaults

    return jobs


@router.post("", response_model=CronOut)
async def create_cron_job(
    req: CronCreate,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create a new cron task."""
    job = CronJobModel(
        title=req.title,
        command=req.command,
        schedule=req.schedule,
        is_active=req.is_active,
        user_id=current_user.id
    )
    db.add(job)
    db.commit()
    db.refresh(job)

    all_jobs = db.query(CronJobModel).filter(CronJobModel.is_active == True).all()
    agent_jobs = [{"schedule": j.schedule, "command": j.command} for j in all_jobs]
    try:
        await agent_client.save_cron_jobs(agent_jobs)
    except Exception:
        pass

    client_ip = request.client.host if request.client else "unknown"
    record_audit_log(db, current_user, "CRON_JOB_CREATE", req.title, client_ip)

    return job


@router.post("/{job_id}/toggle")
def toggle_cron_job(
    job_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Enable or disable a cron task."""
    job = db.query(CronJobModel).filter(CronJobModel.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Cron job not found.")

    job.is_active = not job.is_active
    db.commit()

    return {"success": True, "id": job.id, "is_active": job.is_active}


@router.post("/{job_id}/run")
async def run_cron_job_now(
    job_id: int,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Execute a cron task immediately and record execution timestamp."""
    job = db.query(CronJobModel).filter(CronJobModel.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Cron job not found.")

    res = await agent_client.execute_terminal("cron_exec", job.command)
    job.last_run = datetime.now(timezone.utc)
    db.commit()

    client_ip = request.client.host if request.client else "unknown"
    record_audit_log(db, current_user, "CRON_JOB_EXECUTE_MANUAL", job.title, client_ip)

    return {"success": True, "output": res.get("stdout") or res.get("stderr"), "exit_code": res.get("exit_code")}


@router.delete("/{job_id}")
def delete_cron_job(
    job_id: int,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Delete a cron job."""
    job = db.query(CronJobModel).filter(CronJobModel.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Cron job not found.")

    db.delete(job)
    db.commit()

    client_ip = request.client.host if request.client else "unknown"
    record_audit_log(db, current_user, "CRON_JOB_DELETE", job.title, client_ip)

    return {"success": True, "id": job_id}
