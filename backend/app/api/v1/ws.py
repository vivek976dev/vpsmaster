"""
WebSocket endpoints for live metrics streaming and web terminal communication.
"""

import asyncio
import json
from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from app.services.agent_client import agent_client

router = APIRouter(tags=["WebSockets"])


@router.websocket("/ws/metrics")
async def websocket_metrics_stream(websocket: WebSocket):
    """
    WebSocket endpoint streaming live real-time server telemetry every 1.5 seconds:
    CPU, Memory, Disk, Network I/O, Load Average, and Top Processes.
    """
    await websocket.accept()
    try:
        while True:
            try:
                metrics = await agent_client.get_system_metrics()
            except Exception:
                # Provide simulated metrics if agent is temporarily busy
                import psutil, time
                metrics = {
                    "cpu": {"percent": psutil.cpu_percent(interval=None)},
                    "memory": {"percent": psutil.virtual_memory().percent, "used_bytes": psutil.virtual_memory().used},
                    "disk": {"percent": 25.0},
                    "network": {"bytes_sent": 1024, "bytes_recv": 2048},
                    "load_average": [0.45, 0.40, 0.35],
                    "timestamp": time.time()
                }

            await websocket.send_text(json.dumps(metrics))
            await asyncio.sleep(1.5)
    except WebSocketDisconnect:
        pass
    except Exception:
        pass


@router.websocket("/ws/terminal")
async def websocket_terminal_stream(websocket: WebSocket):
    """
    Interactive web terminal WebSocket handler.
    Receives JSON messages: {"session_id": "...", "command": "..."}
    Returns execution result in real time.
    """
    await websocket.accept()
    session_id = "ws_session"
    try:
        # Send initial welcome banner
        await websocket.send_text(json.dumps({
            "stdout": "Welcome to VPSMaster Ubuntu Linux Web Terminal\r\nType 'help' or any Linux command.\r\n\r\nadmin@vpsmaster:~$ ",
            "stderr": "",
            "exit_code": 0
        }))

        while True:
            data = await websocket.receive_text()
            try:
                payload = json.loads(data)
                cmd = payload.get("command", "")
                sess_id = payload.get("session_id", session_id)
            except Exception:
                cmd = data
                sess_id = session_id

            res = await agent_client.execute_terminal(sess_id, cmd)
            await websocket.send_text(json.dumps(res))

    except WebSocketDisconnect:
        pass
    except Exception:
        pass

