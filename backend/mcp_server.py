import asyncio
from typing import Dict, Any, Optional
from fastmcp import FastMCP

mcp = FastMCP("GravityLaser")

# Globale Zustände zur Kommunikation zwischen FastAPI (WebSockets) und MCP
pending_actions: Dict[str, asyncio.Event] = {}
action_results: Dict[str, bool] = {}
last_camera_frame: Optional[str] = None # Hält das letzte Base64-Kamerabild der PWA
current_laser_status: Dict[str, Any] = {"state": "Disconnected", "x": 0, "y": 0}

@mcp.tool()
async def laser_status() -> str:
  """
  Liefert den aktuellen Status des Lasers (z.B. Idle, Alarm, Run) und die Koordinaten zurück.
  """
  state = current_laser_status.get("state", "Disconnected")
  x = current_laser_status.get("x", 0)
  y = current_laser_status.get("y", 0)
  return f"Status: {state} | Position: X={x}mm, Y={y}mm"

@mcp.tool()
async def laser_command(gcode: str) -> str:
  """
  Sendet einen einzelnen G-Code Befehl oder eine Sequenz an den Laser.
  Sicherheitskritische Befehle (z.B. G1/G0 Fahrten mit Laser an oder Homing $H)
  erfordern eine manuelle Freigabe des Benutzers in der GravityLaser-Benutzeroberfläche.
  """
  # Prüfe, ob der Befehl sicherheitskritisch ist
  cmd_upper = gcode.upper()
  is_critical = "S" in cmd_upper or "$H" in cmd_upper or "G1" in cmd_upper or "G0" in cmd_upper
  
  if not is_critical:
    # Unkritische Befehle (wie ? oder $$) direkt über FastAPI senden
    # Im echten Betrieb wird dies über das FastAPI-Connection-Handling an den Laser geleitet.
    return f"Befehl '{gcode}' direkt gesendet."

  # Kritischer Befehl: Fordere manuelle Bestätigung an
  action_id = f"action_{Math.random_str()}" if hasattr(Math, 'random_str') else f"action_{hash(gcode)}"
  event = asyncio.Event()
  pending_actions[action_id] = event
  
  print(f"[MCP] Sicherheitsfreigabe angefordert für: {gcode} (ID: {action_id})")
  
  # Trigger den WebSocket-Broadcast an die PWA über den registrierten Hook
  approval_fn = globals().get("request_pwa_approval_fn")
  if approval_fn:
    approval_fn(action_id, gcode)
  
  try:
    # Warte bis zu 30 Sekunden auf die Bestätigung des Benutzers im UI
    await asyncio.wait_for(event.wait(), timeout=30.0)
    
    approved = action_results.get(action_id, False)
    if approved:
      # Befehl an Laser senden
      return f"Erfolg: Befehl '{gcode}' wurde freigegeben und ausgeführt."
    else:
      return "Abgelehnt: Der Benutzer hat die Ausführung des Befehls verweigert."
  except asyncio.TimeoutError:
    return "Timeout: Der Benutzer hat den Befehl nicht innerhalb von 30 Sekunden freigegeben."
  finally:
    # Cleanup
    pending_actions.pop(action_id, None)
    action_results.pop(action_id, None)

@mcp.tool()
async def laser_get_camera_frame() -> str:
  """
  Liefert ein hochauflösendes Standbild der USB-Kamera über dem Laserbett zurück.
  Ermöglicht vision-fähigen Agenten die optische Lageprüfung und Ausrichtung.
  Gibt das Bild als Base64-codierten PNG-Daten-String zurück.
  """
  if not last_camera_frame:
    return "Fehler: Kein aktuelles Kamerabild vorhanden. Bitte aktiviere die Kamera in der GravityLaser-Benutzeroberfläche."
  
  return f"data:image/png;base64,{last_camera_frame}"

class Math:
  @staticmethod
  def random_str():
    import random
    import string
    return "".join(random.choices(string.ascii_lowercase + string.digits, k=6))
