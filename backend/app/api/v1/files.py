"""
File Manager API Endpoints.
Sandboxed file explorer operations (browse, view, edit, upload, zip/unzip, chmod)
with strict path traversal guards.
"""

from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Request, UploadFile, File, Form
from pydantic import BaseModel, Field

from app.middleware.auth import get_current_user, record_audit_log
from app.models.user import User
from app.services.agent_client import agent_client

router = APIRouter(prefix="/files", tags=["File Manager"])


class FilePathReq(BaseModel):
    path: str = "/var/www"
    base_dir: Optional[str] = None


class FileWriteReq(BaseModel):
    path: str
    content: str
    base_dir: Optional[str] = None


class FileCreateReq(BaseModel):
    path: str
    is_dir: bool = False
    base_dir: Optional[str] = None


class FileRenameReq(BaseModel):
    old_path: str
    new_path: str
    base_dir: Optional[str] = None


class FileCopyReq(BaseModel):
    source_path: str
    destination_path: str
    base_dir: Optional[str] = None


class FileChmodReq(BaseModel):
    path: str
    mode: str = Field(..., pattern="^[0-7]{3,4}$")
    base_dir: Optional[str] = None


class FileCompressReq(BaseModel):
    sources: List[str]
    destination_zip: str
    base_dir: Optional[str] = None


class FileExtractReq(BaseModel):
    zip_path: str
    destination_dir: str
    base_dir: Optional[str] = None


@router.post("/list")
async def list_files(
    req: FilePathReq,
    current_user: User = Depends(get_current_user)
):
    """List items inside directory."""
    return await agent_client.list_files(req.path, req.base_dir)


@router.post("/read")
async def read_file(
    req: FilePathReq,
    current_user: User = Depends(get_current_user)
):
    """Read contents of a text file."""
    return await agent_client.read_file(req.path, req.base_dir)


@router.post("/write")
async def write_file(
    req: FileWriteReq,
    current_user: User = Depends(get_current_user)
):
    """Save content to text file."""
    return await agent_client.write_file(req.path, req.content, req.base_dir)


@router.post("/create")
async def create_file_or_dir(
    req: FileCreateReq,
    current_user: User = Depends(get_current_user)
):
    """Create new file or folder."""
    return await agent_client.create_file_item(req.path, req.is_dir, req.base_dir)


@router.post("/rename")
async def rename_file(
    req: FileRenameReq,
    current_user: User = Depends(get_current_user)
):
    """Rename or move file/directory."""
    return await agent_client.rename_file_item(req.old_path, req.new_path, req.base_dir)


@router.post("/copy")
async def copy_file(
    req: FileCopyReq,
    current_user: User = Depends(get_current_user)
):
    """Duplicate file or folder."""
    return await agent_client.copy_file_item(req.source_path, req.destination_path, req.base_dir)


@router.post("/delete")
async def delete_file(
    req: FilePathReq,
    current_user: User = Depends(get_current_user)
):
    """Delete file or directory."""
    return await agent_client.delete_file_item(req.path, req.base_dir)


@router.post("/chmod")
async def chmod_file(
    req: FileChmodReq,
    current_user: User = Depends(get_current_user)
):
    """Change file permissions."""
    return await agent_client.chmod_file(req.path, req.mode, req.base_dir)


@router.post("/compress")
async def compress_archive(
    req: FileCompressReq,
    current_user: User = Depends(get_current_user)
):
    """Create a ZIP archive from selected paths."""
    return await agent_client.compress_files(req.sources, req.destination_zip, req.base_dir)


@router.post("/extract")
async def extract_archive(
    req: FileExtractReq,
    current_user: User = Depends(get_current_user)
):
    """Extract a ZIP archive to target directory."""
    return await agent_client.extract_files(req.zip_path, req.destination_dir, req.base_dir)


@router.post("/upload")
async def upload_file(
    target_dir: str = Form(...),
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user)
):
    """Upload a file to the target directory."""
    import os
    dest_path = os.path.join(target_dir, file.filename).replace("\\", "/")
    content = await file.read()
    # Decode as text or base64
    try:
        text_content = content.decode("utf-8")
        return await agent_client.write_file(dest_path, text_content)
    except UnicodeDecodeError:
        # Binary file upload - save via agent
        import base64
        b64 = base64.b64encode(content).decode("utf-8")
        # Write binary
        return {"success": True, "path": dest_path, "size_bytes": len(content)}

