"""
Interactive Terminal session manager for Server Agent.
Provides controlled command execution, terminal emulation, session tracking, and audit logging.
"""

import os
import subprocess
import time
from typing import Any, Dict, List, Optional


class TerminalSession:
    """Manages an active terminal session with session timeout and audit trails."""

    def __init__(self, session_id: str, user: str = "admin"):
        self.session_id = session_id
        self.user = user
        self.created_at = time.time()
        self.last_active = time.time()
        self.cwd = os.path.expanduser("~") if os.path.exists(os.path.expanduser("~")) else "/"
        self.history: List[Dict[str, Any]] = []

    def execute_command(self, cmd_line: str) -> Dict[str, Any]:
        """Execute a command in this session with audit logging."""
        self.last_active = time.time()
        cmd_clean = cmd_line.strip()
        if not cmd_clean:
            return {"stdout": "", "stderr": "", "exit_code": 0, "cwd": self.cwd}

        start_time = time.time()

        # Handle 'cd' internally
        if cmd_clean.startswith("cd ") or cmd_clean == "cd":
            target = cmd_clean[3:].strip() if cmd_clean.startswith("cd ") else os.path.expanduser("~")
            new_path = os.path.abspath(os.path.join(self.cwd, target))
            if os.path.isdir(new_path):
                self.cwd = new_path
                res = {"stdout": "", "stderr": "", "exit_code": 0, "cwd": self.cwd}
            else:
                res = {"stdout": "", "stderr": f"bash: cd: {target}: No such file or directory\n", "exit_code": 1, "cwd": self.cwd}
        else:
            try:
                # Execute using subshell
                shell_executable = "/bin/bash" if os.path.exists("/bin/bash") else None
                proc = subprocess.run(
                    cmd_clean,
                    shell=True,
                    cwd=self.cwd,
                    capture_output=True,
                    text=True,
                    timeout=20,
                    executable=shell_executable
                )
                res = {
                    "stdout": proc.stdout,
                    "stderr": proc.stderr,
                    "exit_code": proc.returncode,
                    "cwd": self.cwd
                }
            except subprocess.TimeoutExpired:
                res = {"stdout": "", "stderr": "Command execution timed out (20s limit).\n", "exit_code": 124, "cwd": self.cwd}
            except Exception as e:
                res = {"stdout": "", "stderr": f"Execution error: {str(e)}\n", "exit_code": 1, "cwd": self.cwd}

        self.history.append({
            "command": cmd_clean,
            "timestamp": start_time,
            "duration": round(time.time() - start_time, 3),
            "exit_code": res["exit_code"]
        })

        return res


ACTIVE_SESSIONS: Dict[str, TerminalSession] = {}


def get_or_create_session(session_id: str, user: str = "admin") -> TerminalSession:
    """Retrieve existing session or instantiate a new one."""
    if session_id not in ACTIVE_SESSIONS:
        ACTIVE_SESSIONS[session_id] = TerminalSession(session_id, user)
    return ACTIVE_SESSIONS[session_id]


def close_session(session_id: str) -> bool:
    """Terminate terminal session."""
    if session_id in ACTIVE_SESSIONS:
        del ACTIVE_SESSIONS[session_id]
        return True
    return False

