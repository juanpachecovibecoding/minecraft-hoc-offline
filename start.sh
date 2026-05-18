#!/bin/bash
# start.sh — Inicia el servidor Minecraft HOC
# Uso: ./start.sh [PUERTO]   (default: 3000)

PORT=${1:-3000}

echo "🎮 Iniciando Minecraft Hora del Código en http://localhost:$PORT"
node "$(dirname "$0")/server.js" "$PORT"
