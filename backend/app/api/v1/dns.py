"""
Domain and DNS Zone Management API Endpoints.
CRUD operations on domains, DNS records (A, AAAA, CNAME, MX, TXT, NS, CAA), and zone export.
"""

from typing import List
from fastapi import APIRouter, Depends, HTTPException, Request, Response
from sqlalchemy.orm import Session, joinedload

from app.core.database import get_db
from app.middleware.auth import get_current_user, record_audit_log
from app.models.domain import Domain, DNSRecord
from app.models.user import User
from app.schemas.all_schemas import DomainCreate, DomainOut, DNSRecordCreate, DNSRecordOut

router = APIRouter(prefix="/dns", tags=["Domain & DNS Management"])


@router.get("/domains", response_model=List[DomainOut])
def list_domains(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """List all managed domains and their DNS records."""
    return db.query(Domain).options(joinedload(Domain.dns_records)).all()


@router.post("/domains", response_model=DomainOut)
def create_domain(
    req: DomainCreate,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Add a new domain and initialize standard DNS zone records."""
    clean_name = req.domain_name.lower().strip()

    existing = db.query(Domain).filter(Domain.domain_name == clean_name).first()
    if existing:
        raise HTTPException(status_code=400, detail=f"Domain '{clean_name}' already exists.")

    domain = Domain(
        domain_name=clean_name,
        website_id=req.website_id,
        owner_id=current_user.id
    )
    db.add(domain)
    db.commit()
    db.refresh(domain)

    default_records = [
        DNSRecord(domain_id=domain.id, record_type="A", host="@", value="198.51.100.1", ttl=3600),
        DNSRecord(domain_id=domain.id, record_type="CNAME", host="www", value=f"{clean_name}.", ttl=3600),
        DNSRecord(domain_id=domain.id, record_type="MX", host="@", value=f"mail.{clean_name}.", ttl=3600, priority=10),
        DNSRecord(domain_id=domain.id, record_type="TXT", host="@", value=f"v=spf1 mx a ~all", ttl=3600),
    ]
    db.add_all(default_records)
    db.commit()

    loaded_domain = db.query(Domain).options(joinedload(Domain.dns_records)).filter(Domain.id == domain.id).first()

    client_ip = request.client.host if request.client else "unknown"
    record_audit_log(db, current_user, "DOMAIN_CREATE", clean_name, client_ip)

    return loaded_domain


@router.get("/domains/{domain_id}", response_model=DomainOut)
def get_domain(
    domain_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get domain and all its records."""
    domain = db.query(Domain).options(joinedload(Domain.dns_records)).filter(Domain.id == domain_id).first()
    if not domain:
        raise HTTPException(status_code=404, detail="Domain not found.")
    return domain


@router.post("/domains/{domain_id}/records", response_model=DNSRecordOut)
def add_dns_record(
    domain_id: int,
    req: DNSRecordCreate,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Add a DNS record (A, AAAA, CNAME, MX, TXT, NS, CAA) to a domain."""
    domain = db.query(Domain).filter(Domain.id == domain_id).first()
    if not domain:
        raise HTTPException(status_code=404, detail="Domain not found.")

    record = DNSRecord(
        domain_id=domain_id,
        record_type=req.record_type.upper(),
        host=req.host.strip(),
        value=req.value.strip(),
        ttl=req.ttl,
        priority=req.priority
    )
    db.add(record)
    db.commit()
    db.refresh(record)

    client_ip = request.client.host if request.client else "unknown"
    record_audit_log(db, current_user, "DNS_RECORD_ADD", f"{req.record_type} for {domain.domain_name}", client_ip)

    return record


@router.delete("/records/{record_id}")
def delete_dns_record(
    record_id: int,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Delete a DNS record."""
    record = db.query(DNSRecord).filter(DNSRecord.id == record_id).first()
    if not record:
        raise HTTPException(status_code=404, detail="DNS Record not found.")

    db.delete(record)
    db.commit()

    client_ip = request.client.host if request.client else "unknown"
    record_audit_log(db, current_user, "DNS_RECORD_DELETE", f"Record #{record_id}", client_ip)

    return {"success": True, "record_id": record_id}


@router.get("/domains/{domain_id}/export")
def export_zone_file(
    domain_id: int,
    db: Session = Depends(get_db)
):
    """Generate RFC 1035 compliant BIND zone text file."""
    domain = db.query(Domain).options(joinedload(Domain.dns_records)).filter(Domain.id == domain_id).first()
    if not domain:
        raise HTTPException(status_code=404, detail="Domain not found.")

    zone_lines = [
        f"; VPSMaster Zone File for {domain.domain_name}",
        f"$ORIGIN {domain.domain_name}.",
        f"$TTL 3600",
        f"@  IN  SOA  ns1.{domain.domain_name}. hostmaster.{domain.domain_name}. (",
        f"        2026103001 ; serial",
        f"        7200       ; refresh",
        f"        3600       ; retry",
        f"        1209600    ; expire",
        f"        3600 )     ; minimum",
        ""
    ]

    for r in domain.dns_records:
        p_str = f"{r.priority} " if r.priority is not None else ""
        zone_lines.append(f"{r.host:<15} {r.ttl:<6} IN  {r.record_type:<6} {p_str}{r.value}")

    zone_text = "\n".join(zone_lines)
    return Response(
        content=zone_text,
        media_type="text/plain",
        headers={"Content-Disposition": f"attachment; filename={domain.domain_name}.zone"}
    )
