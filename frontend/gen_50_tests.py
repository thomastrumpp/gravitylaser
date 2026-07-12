import os
import re

dashboard_path = "/home/thomas/.gemini/antigravity/brain/7c4b2ab1-093f-4cec-89d3-741de6f79048/requirements_dashboard.md"
walkthrough_path = "/home/thomas/.gemini/antigravity/brain/7c4b2ab1-093f-4cec-89d3-741de6f79048/walkthrough.md"
test_cases_dir = "/home/thomas/.gemini/antigravity/brain/7c4b2ab1-093f-4cec-89d3-741de6f79048/test_cases"
frontend_dir = "/home/thomas/Antigravity_Projects/TTS10/frontend"

reqs_svg = [
    "SVG-Upload-Button existiert in Toolbar",
    "Upload akzeptiert nur .svg Dateien",
    "Dateidialog öffnet sich beim Klick",
    "Fehlermeldung bei nicht-SVG Dateien",
    "FabricJS lädt SVG String ohne Fehler",
    "SVG Gruppen werden als fabric.Group geladen",
    "SVG Pfade werden als fabric.Path geladen",
    "SVG Farben werden ignoriert",
    "SVG übernimmt aktive Ebenenfarbe als Stroke",
    "SVG Fill wird auf transparent gesetzt",
    "SVG Stroke-Width wird auf 2 gesetzt",
    "SVG wird in der Mitte des Canvas platziert",
    "SVG OriginX wird auf 'center' gesetzt",
    "SVG OriginY wird auf 'center' gesetzt",
    "SVG Gruppe erhält rekursiv die Layer-ID",
    "SVG Pfad erhält die Layer-ID im 'data' Feld",
    "Importiertes Objekt wird automatisch selektiert",
    "Canvas aktualisiert sich nach Import",
    "Konsolen-Log bei erfolgreichem Import",
    "Fehler-Log bei korruptem SVG",
    "GcodeGenerator verarbeitet fabric.Path",
    "Path-Flattening unterstützt 'M' (MoveTo)",
    "Path-Flattening unterstützt 'L' (LineTo)",
    "Path-Flattening unterstützt 'Z' (ClosePath)",
    "Flattening ignoriert ungültige Commands"
]

reqs_sim = [
    "Simulieren-Button existiert im Control Panel",
    "Simulieren-Button ist orange gestylt",
    "Klick auf Simulate generiert G-Code im Hintergrund",
    "Warnung wenn keine Objekte auf Canvas",
    "Laser-Punkt wird auf Canvas erzeugt",
    "Laser-Punkt hat Radius 3",
    "Laser-Punkt ist nicht selektierbar (selectable=false)",
    "Laser-Punkt ignoriert Events (evented=false)",
    "Laser-Punkt Startposition ist (0,0)",
    "Console loggt Start der Simulation",
    "G0 Eilgang bewegt Punkt transparent",
    "G1 Brenngang färbt Punkt in Ebenenfarbe",
    "Laser-Punkt wirft Glow-Schatten",
    "Schattenstärke skaliert mit S-Wert (Power)",
    "M4 schaltet Laser virtuell ein",
    "M5 schaltet Laser virtuell aus",
    "G-Code wird zeilenweise geparst",
    "Regex extrahiert X und Y Zielkoordinaten",
    "Regex extrahiert F Vorschubwert",
    "Animation nutzt requestAnimationFrame",
    "Animationsgeschwindigkeit basiert auf Vorschub",
    "SimulationSpeedMultiplier kürzt Dauer auf 1/5",
    "Laser-Punkt wird nach Simulation gelöscht",
    "Console loggt Ende der Simulation",
    "Simulation lässt sich stoppen/pausieren"
]

# Generate Markdown files
for i, title in enumerate(reqs_svg):
    idx = i + 1
    tc_id = f"TC-U-07.{idx:02d}"
    content = f"# Testfall {tc_id}\n\n**Anforderung:** {title}\n**Typ:** Frontend E2E / SVG\n\n## Automatisierungs-Link\n[tests/e2e/{tc_id}.spec.ts](file://{frontend_dir}/tests/e2e/{tc_id}.spec.ts)"
    with open(os.path.join(test_cases_dir, f"{tc_id}.md"), "w") as f:
        f.write(content)

for i, title in enumerate(reqs_sim):
    idx = i + 1
    tc_id = f"TC-U-08.{idx:02d}"
    content = f"# Testfall {tc_id}\n\n**Anforderung:** {title}\n**Typ:** Frontend E2E / Simulator\n\n## Automatisierungs-Link\n[tests/e2e/{tc_id}.spec.ts](file://{frontend_dir}/tests/e2e/{tc_id}.spec.ts)"
    with open(os.path.join(test_cases_dir, f"{tc_id}.md"), "w") as f:
        f.write(content)

# Update walkthrough
with open(walkthrough_path, "r") as f:
    wt = f.read()

table_svg = "\n## U-07: SVG Import & Flattening\n| Sub-ID | Detail-Anforderung | Test-ID | Testfall-Link | Test-Skript | Status |\n|---|---|---|---|---|---|\n"
for i, title in enumerate(reqs_svg):
    idx = i + 1
    tc_id = f"TC-U-07.{idx:02d}"
    sub_id = f"U-07.{idx:02d}"
    table_svg += f"| **{sub_id}** | {title} | **{tc_id}** | [Definition](file://{test_cases_dir}/{tc_id}.md) | [tests/e2e/{tc_id}.spec.ts](file://{frontend_dir}/tests/e2e/{tc_id}.spec.ts) | 🟡 Not Run |\n"

table_sim = "\n## U-08: G-Code Simulation\n| Sub-ID | Detail-Anforderung | Test-ID | Testfall-Link | Test-Skript | Status |\n|---|---|---|---|---|---|\n"
for i, title in enumerate(reqs_sim):
    idx = i + 1
    tc_id = f"TC-U-08.{idx:02d}"
    sub_id = f"U-08.{idx:02d}"
    table_sim += f"| **{sub_id}** | {title} | **{tc_id}** | [Definition](file://{test_cases_dir}/{tc_id}.md) | [tests/e2e/{tc_id}.spec.ts](file://{frontend_dir}/tests/e2e/{tc_id}.spec.ts) | 🟡 Not Run |\n"

wt += table_svg + table_sim

with open(walkthrough_path, "w") as f:
    f.write(wt)

print("50 requirements generated and walkthrough updated.")
