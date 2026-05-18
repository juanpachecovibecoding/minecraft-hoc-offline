#!/usr/bin/env node
/**
 * download-assets.js
 * Descarga TODOS los assets de studio.code.org necesarios para el funcionamiento
 * 100% offline de los 4 juegos de Minecraft HOC.
 *
 * Uso: node download-assets.js
 */

'use strict';

const https = require('https');
const http  = require('http');
const fs    = require('fs');
const path  = require('path');

const SITE_DIR = path.join(__dirname, 'site');
const HTML_DIR = path.join(__dirname, 'html-raw');
const BASE_URL = 'https://studio.code.org';

let downloaded = 0, skipped = 0, failed = 0;

// ── Download helper ───────────────────────────────────────────────────────────
function download(urlPath, retries = 2) {
  const localPath = path.join(SITE_DIR, urlPath.split('?')[0]);
  if (fs.existsSync(localPath)) { skipped++; return Promise.resolve(); }

  return new Promise((resolve) => {
    fs.mkdirSync(path.dirname(localPath), { recursive: true });
    const fullUrl = BASE_URL + urlPath;
    const client = fullUrl.startsWith('https') ? https : http;
    const req = client.get(fullUrl, {
      headers: { 'User-Agent': 'Mozilla/5.0', 'Accept-Encoding': 'identity' }
    }, (res) => {
      if ([301,302,303,307,308].includes(res.statusCode) && res.headers.location) {
        return download(res.headers.location.replace(BASE_URL, ''), retries).then(resolve);
      }
      if (res.statusCode !== 200) {
        console.log(`  ✗ ${res.statusCode} ${urlPath}`);
        failed++;
        return resolve();
      }
      const chunks = [];
      res.on('data', c => chunks.push(c));
      res.on('end', () => {
        fs.writeFileSync(localPath, Buffer.concat(chunks));
        console.log(`  ✓ ${urlPath}`);
        downloaded++;
        resolve();
      });
    });
    req.on('error', (e) => {
      if (retries > 0) return download(urlPath, retries - 1).then(resolve);
      console.log(`  ✗ ERR ${urlPath}: ${e.message}`);
      failed++;
      resolve();
    });
    req.setTimeout(20000, () => { req.destroy(); });
  });
}

// ── Extract asset URLs from HTML files ───────────────────────────────────────
function extractUrlsFromHtml() {
  const urls = new Set();
  const games = ['mc','minecraft','aquatic','hero'];
  const patterns = [
    /(?:src|href)=["'](\/(?:assets|blockly|images)[^\s"'?#]*)/g,
    /"(?:url|src|href|scriptUrl|assetUrl)":"(\/(?:assets|blockly|images)[^"?#]*)"/g,
    /\\"(?:url|src|href)\\":\\"(\/(?:assets|blockly|images)[^"?#]*)\\"/g,
  ];

  games.forEach(game => {
    for (let i = 1; i <= 14; i++) {
      const f = path.join(HTML_DIR, game, `${i}.html`);
      if (!fs.existsSync(f)) continue;
      const html = fs.readFileSync(f, 'utf8');
      patterns.forEach(re => {
        re.lastIndex = 0;
        let m;
        while ((m = re.exec(html)) !== null) urls.add(m[1]);
      });
    }
  });
  return [...urls];
}

// ── Known game assets (textures, sounds, sprites) ────────────────────────────
// These are loaded dynamically by the Phaser/Craft engine at runtime.
// Collected by monitoring network requests during gameplay.
const KNOWN_GAME_ASSETS = [
  // Craft game textures & sprites (Aventurero + Diseñador)
  '/blockly/media/1x1.gif',
  '/blockly/media/connection-type.svg',

  // Craft game sounds
  '/craft/sounds/walking/gravel1.mp3',
  '/craft/sounds/walking/gravel2.mp3',
  '/craft/sounds/walking/grass1.mp3',
  '/craft/sounds/walking/grass2.mp3',
  '/craft/sounds/walking/stone1.mp3',
  '/craft/sounds/walking/stone2.mp3',
  '/craft/sounds/dig/wood1.mp3',
  '/craft/sounds/dig/wood2.mp3',
  '/craft/sounds/dig/stone1.mp3',
  '/craft/sounds/dig/stone2.mp3',
  '/craft/sounds/dig/grass1.mp3',
  '/craft/sounds/dig/grass2.mp3',
  '/craft/sounds/place/stone1.mp3',
  '/craft/sounds/place/stone2.mp3',
  '/craft/sounds/place/wood1.mp3',
  '/craft/sounds/entity/cow/hurt1.mp3',
  '/craft/sounds/entity/sheep/hurt1.mp3',
  '/craft/sounds/entity/chicken/hurt1.mp3',
  '/craft/sounds/entity/pig/hurt1.mp3',
  '/craft/sounds/random/click.mp3',
  '/craft/sounds/random/pop.mp3',
  '/craft/sounds/music/game-musik.mp3',

  // Craft spritesheets
  '/craft/img/Sliced_blocks.png',
  '/craft/img/steve_walk.png',
  '/craft/img/steve_still.png',
  '/craft/img/alex_walk.png',
  '/craft/img/alex_still.png',
  '/craft/img/char_selection.png',

  // Blockly media
  '/blockly/media/sprites.png',
  '/blockly/media/sprites.svg',

  // Aquatic game assets
  '/craft/img/aquatic/background.png',
  '/craft/img/aquatic/sprites.png',

  // Hero game assets
  '/craft/img/hero/background.png',
  '/craft/img/hero/sprites.png',
];

// ── Main ──────────────────────────────────────────────────────────────────────
async function main() {
  console.log('\n🎮 Minecraft HOC — Descarga masiva de assets\n');
  console.log('📂 Destino:', SITE_DIR);
  console.log('🌐 Fuente: studio.code.org\n');

  // 1. Extract from HTML files
  const htmlUrls = extractUrlsFromHtml();
  console.log(`📄 URLs extraídas de HTML: ${htmlUrls.length}`);

  // 2. Combine all
  const allUrls = [...new Set([...htmlUrls, ...KNOWN_GAME_ASSETS])];
  console.log(`📦 Total a descargar: ${allUrls.length}\n`);

  // 3. Download sequentially (be respectful to server)
  for (const u of allUrls) {
    await download(u);
    await new Promise(r => setTimeout(r, 80)); // 80ms between requests
  }

  console.log(`\n✅ Completado:`);
  console.log(`   Descargados: ${downloaded}`);
  console.log(`   Ya existían: ${skipped}`);
  console.log(`   Errores:     ${failed}`);
  console.log(`\n💾 Todos los assets están en site/ y se servirán offline.`);
  console.log('🔒 El proyecto ya no depende de studio.code.org para estos archivos.\n');
}

main().catch(console.error);
