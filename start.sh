#!/bin/bash

# Exit immediately if a command exits with a non-zero status
set -e

# Clear screen
clear || true
echo "====================================================="
echo "        🚀 GRAVITY LASER START-SCRIPT 🚀             "
echo "====================================================="
echo ""

# Get absolute path of script directory
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"

# Check if uv is installed
if ! command -v uv &> /dev/null; then
    echo "❌ Fehler: 'uv' ist nicht installiert."
    echo "Bitte installieren Sie es zuerst: curl -LsSf https://astral.sh/uv/install.sh | sh"
    exit 1
fi

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    echo "❌ Fehler: 'npm' ist nicht installiert."
    echo "Bitte installieren Sie Node.js und npm."
    exit 1
fi

# Trap Ctrl+C to clean up background processes
cleanup() {
    echo ""
    echo "====================================================="
    echo "        🛑 BEENDEN DER DIENSTE... 🛑                 "
    echo "====================================================="
    if [ -n "$BACKEND_PID" ]; then
        echo "Beende Backend (PID $BACKEND_PID)..."
        kill "$BACKEND_PID" 2>/dev/null || true
    fi
    if [ -n "$FRONTEND_PID" ]; then
        echo "Beende Frontend (PID $FRONTEND_PID)..."
        kill "$FRONTEND_PID" 2>/dev/null || true
    fi
    echo "Dienste gestoppt. Auf Wiedersehen!"
    exit 0
}
trap cleanup SIGINT SIGTERM

echo "1. Starte Backend (FastAPI)..."
cd "$SCRIPT_DIR/backend"
# Run backend with uv in the background
uv run main.py &
BACKEND_PID=$!

echo "2. Starte Frontend (Vite)..."
cd "$SCRIPT_DIR/frontend"
# Run frontend with npm in the background
npm run dev &
FRONTEND_PID=$!

echo ""
echo "====================================================="
echo "   BEIDE DIENSTE LAUFEN JETZT ERFOLGREICH!           "
echo "   - Frontend (Webapp): http://localhost:5173"
echo "   - Backend (API):     http://localhost:8000"
echo "====================================================="
echo "Drücken Sie [Ctrl+C], um die Server zu beenden."
echo ""

# Wait for background processes to keep shell alive
wait
