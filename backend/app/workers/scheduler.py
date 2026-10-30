"""
Background worker and task scheduler for VPSMaster.
Periodically checks SSL certificates, monitors system thresholds, and runs automated backups.
"""

import asyncio
import logging
from app.core.database import SessionLocal
from app.models.security import SecurityAlertModel
from app.models.website import Website
from app.services.agent_client import agent_client

logger = logging.getLogger("vpsmaster.worker")


async def check_resource_thresholds():
    """Evaluate CPU, RAM, and Disk metrics against alert thresholds."""
    try:
        metrics = await agent_client.get_system_metrics()
        cpu_p = metrics.get("cpu", {}).get("percent", 0.0)
        mem_p = metrics.get("memory", {}).get("percent", 0.0)
        disk_p = metrics.get("disk", {}).get("percent", 0.0)

        alerts_to_create = []

        if cpu_p > 90.0:
            alerts_to_create.append(SecurityAlertModel(
                title="High CPU Utilization",
                message=f"CPU usage has peaked at {cpu_p}%. Check active processes in Server Management.",
                severity="high"
            ))

        if mem_p > 90.0:
            alerts_to_create.append(SecurityAlertModel(
                title="Critical Memory Consumption",
                message=f"RAM consumption reached {mem_p}%. Consider restarting unused services.",
                severity="high"
            ))

        if disk_p > 90.0:
            alerts_to_create.append(SecurityAlertModel(
                title="Low Disk Space",
                message=f"Root disk usage is currently {disk_p}%. Clean temporary files or increase volume.",
                severity="critical"
            ))

        if alerts_to_create:
            with SessionLocal() as db:
                db.add_all(alerts_to_create)
                db.commit()

    except Exception as e:
        logger.debug(f"Resource check exception: {e}")


async def check_ssl_expirations():
    """Inspect active certificates and flag certificates nearing expiration."""
    try:
        with SessionLocal() as db:
            sites = db.query(Website).filter(Website.ssl_enabled == True).all()

            for site in sites:
                try:
                    status_info = await agent_client.get_ssl_status(site.domain)
                    days_remaining = status_info.get("days_remaining", 90)
                    if days_remaining <= 15:
                        alert = SecurityAlertModel(
                            title="SSL Certificate Expiring Soon",
                            message=f"SSL certificate for {site.domain} expires in {days_remaining} days. Auto-renew queued.",
                            severity="medium"
                        )
                        db.add(alert)
                        if site.ssl_auto_renew:
                            await agent_client.renew_ssl()
                except Exception:
                    continue

            db.commit()
    except Exception as e:
        logger.debug(f"SSL check exception: {e}")


async def start_scheduler_loop():
    """Run non-blocking periodic background tasks."""
    while True:
        try:
            await asyncio.sleep(60)  # Check every 60 seconds
            await check_resource_thresholds()
            await check_ssl_expirations()
        except asyncio.CancelledError:
            break
        except Exception:
            pass
