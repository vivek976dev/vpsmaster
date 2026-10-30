"""
File Manager command module for Server Agent.
Provides robust, sandboxed filesystem operations within authorized website directories.
Guards against directory traversal, symlink attacks, and unrestricted root access.
"""

import os
import shutil
import stat
import zipfile
from datetime import datetime
from typing import Any, Dict, List, Optional
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
from security.validator import validate_safe_path


def list_directory(target_path: str, base_dir: Optional[str] = None) -> Dict[str, Any]:
    """List directory contents with metadata (type, size, permissions, modified)."""
    safe_path = validate_safe_path(target_path, base_dir)

    if not os.path.exists(safe_path):
        raise FileNotFoundError(f"Directory not found: '{target_path}'")

    if not os.path.isdir(safe_path):
        raise NotADirectoryError(f"Path is not a directory: '{target_path}'")

    items = []
    with os.scandir(safe_path) as entries:
        for entry in entries:
            try:
                st = entry.stat(follow_symlinks=False)
                is_dir = entry.is_dir(follow_symlinks=False)
                items.append({
                    "name": entry.name,
                    "path": os.path.join(target_path, entry.name).replace("\\", "/"),
                    "is_dir": is_dir,
                    "size_bytes": st.st_size if not is_dir else 0,
                    "permissions": oct(stat.S_IMODE(st.st_mode))[2:],
                    "modified": datetime.fromtimestamp(st.st_mtime).isoformat(),
                    "extension": os.path.splitext(entry.name)[1].lower() if not is_dir else None
                })
            except (PermissionError, FileNotFoundError):
                continue

    # Sort directories first, then alphabetical
    items.sort(key=lambda x: (not x["is_dir"], x["name"].lower()))

    return {
        "current_path": target_path.replace("\\", "/"),
        "absolute_path": safe_path.replace("\\", "/"),
        "total_items": len(items),
        "items": items
    }


def read_file_content(file_path: str, base_dir: Optional[str] = None) -> Dict[str, Any]:
    """Read contents of a text file."""
    safe_path = validate_safe_path(file_path, base_dir)

    if not os.path.exists(safe_path):
        raise FileNotFoundError(f"File not found: '{file_path}'")

    if os.path.isdir(safe_path):
        raise IsADirectoryError(f"Target is a directory: '{file_path}'")

    # Limit file read size for web editor to 5MB
    file_size = os.path.getsize(safe_path)
    if file_size > 5 * 1024 * 1024:
        raise ValueError(f"File size ({file_size} bytes) exceeds web editor limit of 5MB.")

    with open(safe_path, "r", encoding="utf-8", errors="replace") as f:
        content = f.read()

    return {
        "path": file_path,
        "size_bytes": file_size,
        "content": content
    }


def write_file_content(file_path: str, content: str, base_dir: Optional[str] = None) -> Dict[str, Any]:
    """Write or overwrite content of a text file."""
    safe_path = validate_safe_path(file_path, base_dir)

    parent_dir = os.path.dirname(safe_path)
    os.makedirs(parent_dir, exist_ok=True)

    with open(safe_path, "w", encoding="utf-8") as f:
        f.write(content)

    return {
        "success": True,
        "path": file_path,
        "size_bytes": os.path.getsize(safe_path)
    }


def create_item(item_path: str, is_dir: bool = False, base_dir: Optional[str] = None) -> Dict[str, Any]:
    """Create a new file or directory."""
    safe_path = validate_safe_path(item_path, base_dir)

    if os.path.exists(safe_path):
        raise FileExistsError(f"Item already exists at '{item_path}'")

    if is_dir:
        os.makedirs(safe_path, exist_ok=True)
    else:
        parent = os.path.dirname(safe_path)
        os.makedirs(parent, exist_ok=True)
        with open(safe_path, "w", encoding="utf-8") as f:
            f.write("")

    return {"success": True, "path": item_path, "is_dir": is_dir}


def rename_item(old_path: str, new_path: str, base_dir: Optional[str] = None) -> Dict[str, Any]:
    """Rename or move a file/directory."""
    safe_old = validate_safe_path(old_path, base_dir)
    safe_new = validate_safe_path(new_path, base_dir)

    if not os.path.exists(safe_old):
        raise FileNotFoundError(f"Source not found: '{old_path}'")

    if os.path.exists(safe_new):
        raise FileExistsError(f"Target already exists: '{new_path}'")

    shutil.move(safe_old, safe_new)
    return {"success": True, "old_path": old_path, "new_path": new_path}


def copy_item(source_path: str, destination_path: str, base_dir: Optional[str] = None) -> Dict[str, Any]:
    """Copy a file or directory."""
    safe_src = validate_safe_path(source_path, base_dir)
    safe_dest = validate_safe_path(destination_path, base_dir)

    if not os.path.exists(safe_src):
        raise FileNotFoundError(f"Source not found: '{source_path}'")

    if os.path.isdir(safe_src):
        shutil.copytree(safe_src, safe_dest)
    else:
        shutil.copy2(safe_src, safe_dest)

    return {"success": True, "source": source_path, "destination": destination_path}


def delete_item(item_path: str, base_dir: Optional[str] = None) -> Dict[str, Any]:
    """Delete a file or directory."""
    safe_path = validate_safe_path(item_path, base_dir)

    if not os.path.exists(safe_path):
        raise FileNotFoundError(f"Item not found: '{item_path}'")

    if os.path.isdir(safe_path):
        shutil.rmtree(safe_path)
    else:
        os.remove(safe_path)

    return {"success": True, "path": item_path}


def set_permissions(item_path: str, mode: str, base_dir: Optional[str] = None) -> Dict[str, Any]:
    """Set chmod octal permissions (e.g. '0755', '0644')."""
    safe_path = validate_safe_path(item_path, base_dir)
    octal_mode = int(mode, 8)
    os.chmod(safe_path, octal_mode)
    return {"success": True, "path": item_path, "permissions": mode}


def compress_to_zip(source_paths: List[str], zip_dest: str, base_dir: Optional[str] = None) -> Dict[str, Any]:
    """Compress multiple files or directories into a ZIP archive."""
    safe_dest = validate_safe_path(zip_dest, base_dir)

    with zipfile.ZipFile(safe_dest, "w", zipfile.ZIP_DEFLATED) as zf:
        for p in source_paths:
            safe_p = validate_safe_path(p, base_dir)
            if os.path.isdir(safe_p):
                for root, _, files in os.walk(safe_p):
                    for file in files:
                        abs_file = os.path.join(root, file)
                        rel_path = os.path.relpath(abs_file, os.path.dirname(safe_p))
                        zf.write(abs_file, rel_path)
            else:
                zf.write(safe_p, os.path.basename(safe_p))

    return {"success": True, "archive_path": zip_dest, "size_bytes": os.path.getsize(safe_dest)}


def extract_zip(zip_path: str, extract_dest: str, base_dir: Optional[str] = None) -> Dict[str, Any]:
    """Extract a ZIP archive within authorized boundary."""
    safe_zip = validate_safe_path(zip_path, base_dir)
    safe_dest = validate_safe_path(extract_dest, base_dir)

    os.makedirs(safe_dest, exist_ok=True)

    with zipfile.ZipFile(safe_zip, "r") as zf:
        # Zip slip protection
        for member in zf.namelist():
            target_file = os.path.join(safe_dest, member)
            validate_safe_path(target_file, safe_dest)

        zf.extractall(safe_dest)

    return {"success": True, "extracted_to": extract_dest}
