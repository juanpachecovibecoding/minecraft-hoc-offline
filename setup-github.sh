#!/bin/bash
# Instalar GitHub CLI y hacer push a GitHub con OAuth
# Ejecutar este script con: bash setup-github.sh

set -e

echo "📦 Instalando GitHub CLI..."
curl -fsSL https://cli.github.com/packages/githubcli-archive-keyring.gpg \
  | sudo dd of=/usr/share/keyrings/githubcli-archive-keyring.gpg

echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/githubcli-archive-keyring.gpg] \
https://cli.github.com/packages stable main" \
  | sudo tee /etc/apt/sources.list.d/github-cli.list

sudo apt update -qq
sudo apt install gh -y

echo ""
echo "✅ GitHub CLI instalado: $(gh --version | head -1)"
echo ""
echo "🔐 Iniciando sesión en GitHub (se abrirá el navegador)..."
gh auth login --web

echo ""
echo "📁 Creando repositorio y subiendo el proyecto..."
cd "$(dirname "$0")"

# Crear repo en GitHub y subir
gh repo create minecraft-hoc-offline \
  --public \
  --description "Minecraft Hour of Code - 4 juegos offline para uso educativo en español" \
  --source=. \
  --remote=origin \
  --push

echo ""
echo "✅ ¡Listo! Repositorio subido a GitHub."
gh repo view --web
