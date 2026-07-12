import json
import os

reqs = {
    'U-01': {'title': 'Dark Mode UI', 'subs': [
        'Primärer Hintergrund muss Hex #0a0d14 entsprechen',
        'Sekundärer Panel-Hintergrund muss sich durch leichten Kontrast abheben',
        'Textfarbe muss für hohen Kontrast (mind. AAA Standard) hellgrau/weiß sein',
        'Akzentfarbe für aktive Elemente muss Cyan (#00f0ff) sein',
        'Hover-Effekte müssen eine 0.2s Transition aufweisen',
        'Keine hellen Blend-Effekte (Flash) beim Laden der Seite',
        'Eingabefelder (Inputs) müssen einen dunklen Hintergrund mit hellem Rand haben',
        'Fehlermeldungen müssen in gut sichtbarem Rot (Dark-Mode tauglich) erscheinen',
        'Erfolgsmeldungen müssen in gut sichtbarem Grün erscheinen',
        'Scrollbars müssen custom gestylt sein, um zum Dark Mode zu passen'
    ]},
    'U-02': {'title': '3-Spalten Layout', 'subs': [
        'Layout muss CSS Grid verwenden',
        'Linke Spalte (Werkzeuge) muss eine feste Breite (z.B. 60px) haben',
        'Mittlere Spalte (Canvas) muss dynamisch mitwachsen (flex-grow)',
        'Rechte Spalte (Settings) muss eine feste Breite (z.B. 320px) haben',
        'Unterer Bereich muss die Statusleiste über die volle Breite spannen',
        'Responsivität: Bei Fenstergrößen < 1024px muss die rechte Spalte einklappbar sein',
        'Zwischen Spalten muss ein sichtbarer Trennstrich (1px border) sein',
        'Die Top-Nav muss über allen drei Spalten durchgängig verlaufen',
        'Overflow in der rechten Spalte muss scrollbar (Y-Achse) sein',
        'Canvas-Bereich darf nicht scrollen (overflow: hidden)'
    ]},
    'U-03': {'title': 'Mehrsprachigkeit (i18n)', 'subs': [
        'UI muss DE und EN unterstützen',
        'Standardsprache muss aus dem Browser-Locale ausgelesen werden',
        'Manuelles Umschalten muss ohne Neuladen der Seite sofort (reaktiv) wirksam sein',
        'Gewählte Sprache muss im LocalStorage persistiert werden',
        'Alle UI-Texte müssen in separaten JSON-Dateien (locales/) liegen',
        'Platzhalter in Eingabefeldern müssen übersetzt sein',
        'Tooltips und Title-Attribute müssen übersetzt sein',
        'Fehlermeldungen der G-Code Konsole müssen übersetzt werden',
        'Alerts und Modals müssen die Übersetzungstabelle nutzen',
        'Fallback-Sprache muss EN sein, falls ein Key fehlt'
    ]},
    'U-04': {'title': 'Not-Aus Button', 'subs': [
        'Button muss immer in der Top-Nav sichtbar sein',
        'Farbe muss leuchtend Rot sein',
        'Button muss ein Warn-Icon (🚨) enthalten',
        'Klick muss einen sofortigen G-Code Stream Abbruch auslösen',
        'Klick muss den Echtzeit-Befehl Ctrl+X (0x18) an GRBL senden',
        'ESC-Taste muss global an denselben Auslöser gebunden sein',
        'Auslösen muss ein visuelles Feedback (z.B. Alert) geben',
        'Status der Maschine muss im UI sofort auf Alarm oder Halt wechseln',
        'Falls Backend Tuya nutzt, muss die Steckdose (Air Assist) abgeschaltet werden',
        'Nach Not-Aus muss ein manueller Unlock ($X) Button im UI erscheinen'
    ]},
    'U-05': {'title': 'Offline-Fähigkeit', 'subs': [
        'Manifest.json muss korrekte Icons für alle Auflösungen enthalten',
        'Service Worker muss statische Assets (JS, CSS) lokal cachen',
        'App muss Installable auf ChromeOS sein',
        'Start-URL muss auf / gesetzt sein',
        'Display-Modus muss standalone sein (keine Adressleiste)',
        'Ohne Internetverbindung muss die App erfolgreich laden',
        'WebSerial muss offline weiterhin funktionieren',
        'G-Code Generierung (Fabric.js) muss offline verfügbar sein',
        'Warnung anzeigen, wenn Cloud-Sync (GDrive) offline nicht geht',
        'Updates des Service Workers müssen den User benachrichtigen'
    ]},
    'U-06': {'title': 'Maschineneinstellungen & Arbeitsfläche', 'subs': [
        'Modal für Maschineneinstellungen muss existieren',
        'Eingabefeld für X-Dimension (Breite in mm) muss validiert werden',
        'Eingabefeld für Y-Dimension (Höhe in mm) muss validiert werden',
        'Nullpunkt (Origin) muss aus 4 Ecken oder Center wählbar sein',
        'Werte müssen im settingsStore gespeichert werden',
        'Werte müssen im LocalStorage persistiert werden',
        'Canvas-Gitter muss sich sofort an geänderte Dimensionen anpassen',
        'Canvas-Rendern muss X/Y Werte zum Berechnen des Maßstabs nutzen',
        'Verhindern, dass Vektor-Objekte außerhalb dieser Bounds generiert werden',
        'Warnung beim Start, wenn Objekte außerhalb der definierten Fläche liegen'
    ]},
    'T-01': {'title': 'TypeScript Architektur', 'subs': [
        'Strict-Mode muss in tsconfig.json aktiviert sein',
        'Keine impliziten any Typen erlaubt',
        'Keine ungenutzten Variablen erlaubt (noUnusedLocals)',
        'React-Komponenten müssen explizit typisierte Props haben',
        'Store-Zustände müssen Interfaces verwenden',
        'Vite Build muss bei Typ-Fehlern fehlschlagen',
        'GRBL Status muss über ein exaktes Interface gemappt sein',
        'Importe von Typen müssen als import type deklariert sein',
        'Fabric.js Canvas-Objekte müssen typisiert extrahiert werden',
        'Keine ts-ignore Kommentare ohne dokumentierten Grund'
    ]},
    'S-02': {'title': 'Backend TCP/WS Bridge', 'subs': [
        'Backend muss FastAPI verwenden',
        'WebSocket Route für Bridge muss unter /ws/wifi-bridge laufen',
        'Muss asynchrone asyncio Sockets für TCP verwenden',
        'Muss Verbindungsabbrüche des Lasers erkennen und WS schließen',
        'Muss Verbindungsabbrüche des Browsers erkennen und TCP schließen',
        'Eingehende WS Text-Nachrichten müssen als UTF-8 Bytes an TCP gehen',
        'Eingehende TCP Bytes müssen als UTF-8 Text an WS gehen',
        'Gleichzeitige Lese/Schreib-Operationen müssen nicht-blockierend sein',
        'Fehler beim Verbindungsaufbau müssen HTTP/WS Fehlercodes werfen',
        'IP und Port (23) müssen als Query-Parameter anpassbar sein'
    ]}
}

os.makedirs('/home/thomas/.gemini/antigravity/brain/7c4b2ab1-093f-4cec-89d3-741de6f79048/test_cases', exist_ok=True)

for req_id, data in reqs.items():
    for i, sub in enumerate(data['subs'], 1):
        sub_id = f"{req_id}.{i:02d}"
        tc_id = f"TC-{sub_id}"
        file_path = f"/home/thomas/.gemini/antigravity/brain/7c4b2ab1-093f-4cec-89d3-741de6f79048/test_cases/{tc_id}.md"
        
        folder = "e2e" if "U-" in req_id else "unit"
        ext = "spec" if "U-" in req_id else "test"
        
        content = f"""# Testfall: {tc_id}

**Anforderung**: {sub_id}
**Titel**: {sub}

## Test-Schritte
1. Initialisiere die Systemumgebung (Frontend/Backend).
2. Führe die Aktion aus, die diese Anforderung triggert.
3. Analysiere das Ergebnis gemäß der Spezifikation.

## Erwartetes Ergebnis
Die Bedingung '{sub}' ist vollständig erfüllt.

## Automatisierungs-Link
Das automatisierte Testskript für diesen Fall wird hinterlegt unter: `tests/{folder}/{tc_id}.{ext}.ts`
"""
        with open(file_path, 'w') as f:
            f.write(content)

print(f"Erfolgreich {sum(len(v['subs']) for v in reqs.values())} Testfall-Dateien generiert.")
