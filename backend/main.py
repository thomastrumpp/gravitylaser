import asyncio
import socket
import os
from typing import List, Dict
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, Query, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from pydantic import BaseModel
from zeroconf import Zeroconf, ServiceBrowser, ServiceListener

# Importiere MCP-Modul zur Datenübergabe
import mcp_server

app = FastAPI(title="GravityLaser Backend API", version="1.0.0")

# CORS-Lösung zur reibungslosen Browser-Kommunikation
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Liste aktiver PWA-Aktions-WebSockets
pwa_action_sockets: List[WebSocket] = []

class CameraFramePayload(BaseModel):
    image: str # Base64 codierter PNG-String

class LaserStatusPayload(BaseModel):
    state: str
    x: float
    y: float

class ActionResolvePayload(BaseModel):
    action_id: str
    approved: bool

# mDNS Listener zur Entdeckung von FluidNC / GRBL Geräten
class LaserDiscoveryListener(ServiceListener):
    def __init__(self):
        self.found_devices: List[Dict[str, str]] = []

    def update_service(self, zc: Zeroconf, type_: str, name: str) -> None:
        pass

    def remove_service(self, zc: Zeroconf, type_: str, name: str) -> None:
        pass

    def add_service(self, zc: Zeroconf, type_: str, name: str) -> None:
        info = zc.get_service_info(type_, name)
        if info:
            ips = [socket.inet_ntoa(addr) for addr in info.addresses]
            if ips:
                self.found_devices.append({
                    "name": name.split(".")[0],
                    "ip": ips[0],
                    "port": str(info.port),
                    "type": "FluidNC/mDNS"
                })

@app.get("/api/discover")
async def discover_lasers():
    """
    Führt einen mDNS-Scan und einen schnellen IP-Scan im lokalen Subnetz durch
    """
    devices = []
    zeroconf = Zeroconf()
    listener = LaserDiscoveryListener()
    _browser = ServiceBrowser(zeroconf, "_http._tcp.local.", listener)
    
    await asyncio.sleep(2.0)
    zeroconf.close()
    
    devices.extend(listener.found_devices)

    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(("8.8.8.8", 80))
        local_ip = s.getsockname()[0]
        s.close()
        
        ip_parts = local_ip.split(".")
        if len(ip_parts) == 4:
            subnet = ".".join(ip_parts[:3])
            tasks = [check_ip_port(f"{subnet}.{i}", 23) for i in range(1, 51)]
            results = await asyncio.gather(*tasks)
            
            for ip, open_ in results:
                if open_ and not any(d["ip"] == ip for d in devices):
                    devices.append({
                        "name": f"TwoTrees-Laser ({ip})",
                        "ip": ip,
                        "port": "23",
                        "type": "MKS-TCP"
                    })
    except Exception as e:
        print(f"IP-Scan Fehler: {e}")

    return {"status": "success", "devices": devices}

async def check_ip_port(ip: str, port: int, timeout: float = 0.5) -> (str, bool):
    try:
        conn = asyncio.open_connection(ip, port)
        reader, writer = await asyncio.wait_for(conn, timeout=timeout)
        writer.close()
        await writer.wait_closed()
        return ip, True
    except Exception:
        return ip, False

@app.websocket("/ws/wifi-bridge")
async def websocket_wifi_bridge(websocket: WebSocket, target: str = Query(...), port: int = Query(23)):
    """
    Ermöglicht dem Browser eine WebSocket-Verbindung, die transparent
    als TCP-Socket an den Laser (Port 23 bei MKS) weitergeleitet wird.
    """
    await websocket.accept()
    print(f"WebSocket-zu-TCP Brücke gestartet: Browser -> Backend -> {target}:{port}")

    try:
        reader, writer = await asyncio.open_connection(target, port)
        print(f"TCP-Verbindung zu {target}:{port} erfolgreich aufgebaut!")
    except Exception as e:
        print(f"TCP-Verbindungsfehler zu {target}:{port}: {e}")
        await websocket.close(code=1011, reason="Laser über TCP nicht erreichbar.")
        return

    async def bridge_ws_to_tcp():
        try:
            while True:
                data = await websocket.receive_text()
                writer.write(data.encode('utf-8'))
                await writer.drain()
        except WebSocketDisconnect:
            print("Browser hat WebSocket-Verbindung getrennt.")
        except Exception as e:
            print(f"Brückenfehler WS -> TCP: {e}")
        finally:
            writer.close()
            try:
                await writer.wait_closed()
            except Exception:
                pass

    async def bridge_tcp_to_ws():
        try:
            while True:
                data = await reader.read(1024)
                if not data:
                    print("Laser hat TCP-Verbindung geschlossen.")
                    break
                await websocket.send_text(data.decode('utf-8', errors='ignore'))
        except Exception as e:
            print(f"Brückenfehler TCP -> WS: {e}")
        finally:
            await websocket.close()

    await asyncio.gather(bridge_ws_to_tcp(), bridge_tcp_to_ws())
    print("WebSocket-zu-TCP Brücke beendet.")


# --- API-Endpunkte für die MCP-Server Kommunikation ---

@app.post("/api/mcp/camera-frame")
async def update_camera_frame(payload: CameraFramePayload):
    """
    Empfängt den aktuellen Kamera-Frame aus der PWA (Base64)
    und stellt ihn dem MCP-Server (Vision) zur Verfügung.
    """
    # Entferne evtl. Daten-URL Header
    image_data = payload.image
    if "," in image_data:
        image_data = image_data.split(",")[1]
    
    mcp_server.last_camera_frame = image_data
    return {"status": "success", "message": "Camera frame updated."}

@app.post("/api/mcp/status")
async def update_laser_status(payload: LaserStatusPayload):
    """
    Aktualisiert die Koordinaten und den Zustand des Lasers,
    damit der MCP-Server präzise Auskunft geben kann.
    """
    mcp_server.current_laser_status = {
        "state": payload.state,
        "x": payload.x,
        "y": payload.y
    }
    return {"status": "success"}

@app.websocket("/ws/mcp-actions")
async def websocket_mcp_actions(websocket: WebSocket):
    """
    WebSocket, über den die PWA über sicherheitskritische Befehle
    informiert wird, die ein KI-Agent ausführen möchte.
    """
    await websocket.accept()
    pwa_action_sockets.append(websocket)
    print("PWA für MCP-Sicherheitsfreigaben registriert.")
    
    try:
        # Halte Verbindung offen und lausche auf Heartbeats
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        print("PWA-Verbindung für Freigaben getrennt.")
    finally:
        pwa_action_sockets.remove(websocket)

@app.post("/api/mcp/action-resolve")
async def resolve_mcp_action(payload: ActionResolvePayload):
    """
    Wird von der PWA aufgerufen, wenn der Benutzer im UI auf
    'Zustimmen' oder 'Ablehnen' für eine KI-Aktion klickt.
    """
    action_id = payload.action_id
    approved = payload.approved
    
    if action_id in mcp_server.pending_actions:
        mcp_server.action_results[action_id] = approved
        mcp_server.pending_actions[action_id].set() # Löst den Event-Wait im MCP-Tool aus
        return {"status": "success"}
    
    raise HTTPException(status_code=404, detail="Action ID nicht gefunden oder abgelaufen.")

# Funktion, um eine Freigabe-Aufforderung an das UI zu senden
# (Wird vom MCP-Befehlstool getriggert)
def request_pwa_approval(action_id: str, gcode: str):
    import json
    payload = json.dumps({
        "type": "action_request",
        "action_id": action_id,
        "gcode": gcode
    })
    
    # Broadcast an alle angemeldeten UI-Tabs
    for ws in pwa_action_sockets:
        asyncio.create_task(ws.send_text(payload))

# Hook in mcp_server einbauen, um approval auszulösen
mcp_server.request_pwa_approval_fn = request_pwa_approval


# --- Statische Auslieferung der Vite PWA (Frontend) ---
FRONTEND_DIST = os.path.join(os.path.dirname(os.path.dirname(__file__)), "frontend", "dist")

if os.path.exists(FRONTEND_DIST):
    # Mount assets folder explicitly to avoid root conflicts
    app.mount("/assets", StaticFiles(directory=os.path.join(FRONTEND_DIST, "assets")), name="assets")
    
    # Static files like manifest.json, favicon.ico etc.
    @app.get("/{file_path:path}")
    async def serve_static(file_path: str):
        full_path = os.path.join(FRONTEND_DIST, file_path)
        if os.path.isfile(full_path):
            return FileResponse(full_path)
        # SPA Fallback
        return FileResponse(os.path.join(FRONTEND_DIST, "index.html"))
        
    @app.get("/")
    async def serve_index():
        return FileResponse(os.path.join(FRONTEND_DIST, "index.html"))
else:
    print(f"WARNUNG: Frontend Dist-Ordner nicht gefunden unter {FRONTEND_DIST}. Baue das Frontend mit 'npm run build'.")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
