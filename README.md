# ⛏️ Minecraft Hora del Código — Servidor Offline

Servidor educativo offline que aloja los 4 juegos de **Minecraft Hour of Code** de Code.org.  
Diseñado para aulas sin internet o con conectividad limitada.

## 🎮 Juegos incluidos

| Juego | Niveles |
|---|---|
| ⛏️ Aventurero de Minecraft | 14 |
| 🏗️ Diseñador de Minecraft | 12 |
| 🐠 Voyage Aquatic | 12 |
| 🦸 El Viaje del Héroe | 12 |

Los juegos están en **Español (LATAM)** por defecto.

---

## 🚀 Instalación rápida

### Requisitos
- [Node.js](https://nodejs.org) v14 o superior
- Acceso a internet **solo en el primer deployment** (para assets dinámicos)

### 1. Clonar el repositorio
```bash
git clone https://github.com/TU_USUARIO/minecraft-hoc-offline.git
cd minecraft-hoc-offline
```

### 2. Iniciar el servidor
```bash
node server.js 3000
```

Abre el navegador en `http://localhost:3000`

---

## 🏫 Deployment en servidor escolar (Ubuntu / Debian)

### Opción A — PM2 (recomendado, proceso persiste tras reinicios)

```bash
# Instalar PM2 globalmente
npm install -g pm2

# Iniciar el servidor
pm2 start server.js --name minecraft-hoc -- 3000

# Que arranque automáticamente al reiniciar el servidor
pm2 startup
pm2 save
```

**Comandos útiles de PM2:**
```bash
pm2 status          # ver estado
pm2 logs minecraft-hoc  # ver logs en vivo
pm2 restart minecraft-hoc
pm2 stop minecraft-hoc
```

### Opción B — systemd (servicio del sistema)

Crear el archivo `/etc/systemd/system/minecraft-hoc.service`:

```ini
[Unit]
Description=Minecraft Hour of Code - Servidor Offline
After=network.target

[Service]
Type=simple
User=TU_USUARIO
WorkingDirectory=/ruta/al/proyecto
ExecStart=/usr/bin/node server.js 3000
Restart=on-failure
RestartSec=5

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl daemon-reload
sudo systemctl enable minecraft-hoc
sudo systemctl start minecraft-hoc
sudo systemctl status minecraft-hoc
```

---

## 📁 Estructura del proyecto

```
minecraft-hoc-offline/
├── server.js          # Servidor Node.js (único archivo de lógica)
├── package.json
├── html-raw/          # HTMLs de los juegos descargados (es-MX)
│   ├── mc/            # 1.html … 14.html
│   ├── minecraft/     # 1.html … 12.html
│   ├── aquatic/       # 1.html … 12.html
│   └── hero/          # 1.html … 12.html
└── site/              # Assets estáticos cacheados
    ├── assets/        # JS/CSS del motor del juego
    ├── blockly/       # Motor de bloques
    └── images/        # Imágenes del menú
```

---

## 🔧 Cambiar el puerto

```bash
node server.js 8080   # Cambia 8080 por el puerto que quieras
```

Con PM2:
```bash
pm2 start server.js --name minecraft-hoc -- 8080
```

---

## 🌐 Acceso desde la red local

Si el servidor está en `192.168.1.100` y escucha en el puerto `3000`,  
los alumnos acceden desde sus dispositivos con:

```
http://192.168.1.100:3000
```

Asegúrate de que el firewall permita ese puerto:
```bash
sudo ufw allow 3000/tcp
```

---

## 📝 Notas

- Los assets de los juegos (JS, imágenes del juego) se sirven desde `site/` si están cacheados, o se obtienen de `studio.code.org` si hay internet disponible.
- Los HTMLs en `html-raw/` fueron descargados con `locale=es_mx` y contienen el juego completo en español.
- El servidor intercepta automáticamente las llamadas de API del juego para que funcione sin autenticación.

---

*Contenido educativo original de [code.org](https://code.org) — Minecraft es marca de Mojang/Microsoft.*
