'use strict';

const http  = require('http');
const https = require('https');
const fs    = require('fs');
const path  = require('path');
const url   = require('url');

const PORT     = process.argv[2] || 3000;
const SITE_DIR = path.join(__dirname, 'site');
const HTML_DIR = path.join(__dirname, 'html-raw');

// ── MIME types ────────────────────────────────────────────────────────────────
const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css' : 'text/css',
  '.js'  : 'application/javascript',
  '.json': 'application/json',
  '.png' : 'image/png',
  '.jpg' : 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif' : 'image/gif',
  '.svg' : 'image/svg+xml',
  '.ico' : 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2':'font/woff2',
  '.ttf' : 'font/ttf',
  '.mp4' : 'video/mp4',
  '.webm': 'video/webm',
  '.webp': 'image/webp',
};

// ── Games config ──────────────────────────────────────────────────────────────
const GAMES = {
  mc:        { name: 'Aventurero de Minecraft',  levels: 14, emoji: '⛏️'  },
  minecraft: { name: 'Diseñador de Minecraft',   levels: 12, emoji: '🏗️'  },
  aquatic:   { name: 'Voyage Aquatic',           levels: 12, emoji: '🐠'  },
  hero:      { name: 'El Viaje del Héroe',       levels: 12, emoji: '🦸'  },
};

// ── Helpers ───────────────────────────────────────────────────────────────────
function serveFile(res, filePath) {
  const ext  = path.extname(filePath).toLowerCase();
  const mime = MIME[ext] || 'application/octet-stream';
  try {
    const data = fs.readFileSync(filePath);
    res.writeHead(200, { 'Content-Type': mime, 'Cache-Control': 'public, max-age=3600' });
    res.end(data);
    return true;
  } catch (e) {
    return false;
  }
}

function proxyToCodeOrg(req, res, reqPath) {
  const options = {
    hostname: 'studio.code.org',
    path: reqPath,
    method: req.method,
    headers: { 'User-Agent': 'Mozilla/5.0', 'Accept': '*/*' },
  };
  const proxyReq = https.request(options, (proxyRes) => {
    res.writeHead(proxyRes.statusCode, proxyRes.headers);
    proxyRes.pipe(res);
  });
  proxyReq.on('error', () => {
    res.writeHead(502);
    res.end('Asset not available offline');
  });
  proxyReq.end();
}

// ── fixHtml: patch the game HTML for offline use ─────────────────────────────
function fixHtml(html, game, level) {
  const totalLevels = GAMES[game] ? GAMES[game].levels : 14;
  const prevLevel   = level > 1            ? level - 1 : null;
  const nextLevel   = level < totalLevels  ? level + 1 : null;

  // Bottom navigation bar
  const navBar = `
  <div id="offline-nav">
    ${prevLevel
      ? `<a class="onb onb-side" href="/play/${game}/${prevLevel}">◀ Anterior</a>`
      : `<span class="onb onb-side onb-off">◀ Anterior</span>`}
    <a class="onb onb-home" href="/">⌂ Menú</a>
    ${nextLevel
      ? `<a class="onb onb-side onb-next" href="/play/${game}/${nextLevel}">Siguiente ▶</a>`
      : `<span class="onb onb-side onb-off">Siguiente ▶</span>`}
  </div>`;

  // Styles + MutationObserver to hide the "Need help?" panel
  const injection = `
  <style>
    /* ── Hide Code.org default header ── */
    header.header-wrapper,
    .header-wrapper,
    .navbar-static-top.header,
    .navbar-static-top,
    #header-banner,
    header[role="banner"],
    .header_container,
    #learn-header,
    #top-header,
    nav[aria-label] { display: none !important; }
    /* Push content down so our nav doesn't overlap it */
    #level-body, #visualization-column,
    #main-development-column, .full-width-div-wrapper,
    #react-header + *, body > div:first-child { margin-top: 0 !important; }

    /* ── Offline nav bar — fixed to TOP ── */
    #offline-nav {
      position: fixed; top: 0; left: 0; right: 0; z-index: 99999;
      display: flex; justify-content: center; align-items: center; gap: 8px;
      background: rgba(0,0,0,0.92); padding: 7px 12px;
      border-bottom: 2px solid #5D8233;
    }
    .onb {
      font-family: 'Press Start 2P', 'Courier New', monospace;
      font-size: 10px; color: #fff; text-decoration: none;
      background: #2a2a2a; padding: 7px 16px;
      border: 2px solid #5D8233; border-bottom: 3px solid #3d5c1f;
      cursor: pointer; transition: background 0.1s;
    }
    .onb:hover  { background: #5D8233; }
    .onb-home   { border-color: #777; border-bottom-color: #444; }
    .onb-home:hover { background: #444; }
    .onb-off    { opacity: 0.3; pointer-events: none; }
    body        { padding-top: 50px !important; padding-bottom: 0 !important; }

    /* ── Siguiente button — neon pulse ── */
    .onb-next {
      border-color: #39ff14 !important;
      border-bottom-color: #1a8a00 !important;
      color: #39ff14 !important;
      animation: neon-pulse 1.6s ease-in-out infinite;
    }
    .onb-next:hover { background: #1a3a00 !important; color: #fff !important; }
    @keyframes neon-pulse {
      0%,100% { box-shadow: 0 0 4px #39ff14, 0 0 12px #39ff14, 0 0 24px #39ff14; border-color: #39ff14; }
      50%      { box-shadow: 0 0 2px #39ff14, 0 0  5px #39ff14, 0 0  8px #39ff14; border-color: #1fcc00; }
    }

    /* ── Hide "Need help?" sidebar — CSS fallback ── */
    [class*="hintsAndVideos"],[class*="HintsAndVideos"],
    [class*="videoThumbnail"],[class*="VideoWithCallout"],
    [class*="videoWithCallout"],[class*="authoredHints"],
    [class*="AuthoredHints"],[id="authored-hints"],
    [id="hints-and-videos"] { display: none !important; }

    /* ── Hide language/locale selector (small footer) ── */
    #page-small-footer,
    .page-small-footer,
    [data-smallfooter],
    footer.small-footer,
    .small-footer,
    select[name="locale"],
    .locale-selector,
    [class*="smallFooter"],
    [class*="SmallFooter"] { display: none !important; }
  </style>

  <script>
    /* Remove "Need help?" panel + intercept Reiniciar to reload page */
    (function () {
      var SEL = [
        '[class*="hintsAndVideos"]','[class*="HintsAndVideos"]',
        '[class*="videoThumbnail"]','[class*="VideoWithCallout"]',
        '[class*="videoWithCallout"]','[class*="authoredHints"]',
        '[class*="AuthoredHints"]','[id="authored-hints"]',
        '[id="hints-and-videos"]',
      ];
      var RESTART = ['volver a empezar','reiniciar','start over','try again','restart'];

      function patchRestart() {
        document.querySelectorAll('button,[role="button"]').forEach(function(btn) {
          if (btn._rp) return;
          var txt = btn.textContent.trim().toLowerCase();
          if (RESTART.some(function(t){ return txt.indexOf(t) !== -1; })) {
            btn._rp = true;
            btn.addEventListener('click', function(e) {
              e.preventDefault(); e.stopImmediatePropagation();
              window.location.reload();
            }, true);
          }
        });
      }

      var HDR_SEL = [
        'header.header-wrapper',
        '.header-wrapper',
        '.navbar-static-top',
        '#header-banner',
        'header[role="banner"]',
        '.header_container',
        '#learn-header',
        '#top-header',
        '[class*="HeaderBanner"]',
        '[class*="header-banner"]',
        'nav[aria-label]',
        '#page-small-footer',
        '.page-small-footer',
        '[data-smallfooter]',
        '.small-footer',
        '[class*="smallFooter"]',
        '[class*="SmallFooter"]',
      ];

      function hideHelp() {
        // Hide Code.org header
        HDR_SEL.forEach(function(s){
          try { document.querySelectorAll(s).forEach(function(el){
            el.style.setProperty('display','none','important');
          }); } catch(e){}
        });
        // Hide help panels
        SEL.forEach(function(s){
          try { document.querySelectorAll(s).forEach(function(el){
            el.style.setProperty('display','none','important');
          }); } catch(e){}
        });
        document.querySelectorAll('*').forEach(function(el){
          if (el.children.length === 0 && el.textContent &&
              el.textContent.trim().match(/^(Need help|Necesitas ayuda)/i)) {
            var p = el.parentElement;
            for (var i = 0; i < 4 && p; i++) {
              if (p.className && p.className.length > 3) {
                p.style.setProperty('display','none','important'); break;
              }
              p = p.parentElement;
            }
          }
        });
        patchRestart();
      }

      document.addEventListener('DOMContentLoaded', hideHelp);
      var obs = new MutationObserver(hideHelp);
      obs.observe(document.documentElement, { childList: true, subtree: true });
      [300, 800, 1500, 3000].forEach(function(t){ setTimeout(hideHelp, t); });
    })();

    /* Disable intro autoplay video */
    (function () {
      var _origParse = JSON.parse;
      JSON.parse = function(s) {
        var r = _origParse.apply(this, arguments);
        if (r && r.autoplayVideo !== undefined) r.autoplayVideo = null;
        return r;
      };
      Object.defineProperty(window, 'appOptions', {
        set: function(v) {
          if (v && v.autoplayVideo) v.autoplayVideo = null;
          Object.defineProperty(window, 'appOptions', { value: v, writable: true });
        },
        configurable: true,
      });
    })();

    /* ── OFFLINE API INTERCEPTOR ──────────────────────────────────────────
       Redirects all XHR / fetch calls to studio.code.org so they hit
       our local server instead. This is what makes the congratulations
       dialog appear and allows the game to restart properly.
    ──────────────────────────────────────────────────────────────────── */
    (function () {
      var LOCAL = location.protocol + '//' + location.host;
      var REMOTE = 'https://studio.code.org';

      /* --- XMLHttpRequest patch --- */
      var _xhrOpen = XMLHttpRequest.prototype.open;
      XMLHttpRequest.prototype.open = function (method, url) {
        if (typeof url === 'string' && url.indexOf(REMOTE) === 0) {
          url = LOCAL + url.slice(REMOTE.length);
        }
        return _xhrOpen.apply(this, [method, url].concat(
          Array.prototype.slice.call(arguments, 2)
        ));
      };

      /* --- fetch patch --- */
      if (typeof window.fetch === 'function') {
        var _origFetch = window.fetch;
        window.fetch = function (resource, options) {
          if (typeof resource === 'string' && resource.indexOf(REMOTE) === 0) {
            resource = LOCAL + resource.slice(REMOTE.length);
          }
          return _origFetch.call(this, resource, options);
        };
      }
    })();
  </script>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link href="https://fonts.googleapis.com/css2?family=Press+Start+2P&display=swap" rel="stylesheet">`;

  return html
    // Remove analytics / tracking pixels
    .replace(/<img[^>]+api\/hour\/begin[^>]+>/g, '')
    .replace(/<img[^>]+api\/hour\/finish[^>]+>/g, '')
    // Remove 3rd-party tracking scripts
    .replace(/<script[^>]+onetrust[^>]*><\/script>/g, '')
    .replace(/<script[^>]+googletagmanager[^>]*><\/script>/g, '')
    .replace(/<script[^>]+_google_analytics[^>]*><\/script>/g, '')
    // Inject our styles + scripts right before </title>
    .replace('</title>', `</title>\n${injection}`)
    // Append nav bar at end of body
    + navBar;
}

// ── Landing menu ──────────────────────────────────────────────────────────────
function buildMenu() {
  const accents = {
    mc:        { border:'#5D8233', glow:'rgba(93,130,51,0.6)',   btn1:'#5D8233', btn2:'#3d5c1f', badge:'#7cb342' },
    minecraft: { border:'#E65100', glow:'rgba(230,81,0,0.6)',    btn1:'#E65100', btn2:'#bf360c', badge:'#ff7043' },
    aquatic:   { border:'#0277BD', glow:'rgba(2,119,189,0.6)',   btn1:'#0277BD', btn2:'#01579b', badge:'#29b6f6' },
    hero:      { border:'#6A1B9A', glow:'rgba(106,27,154,0.6)',  btn1:'#6A1B9A', btn2:'#4a148c', badge:'#ab47bc' },
  };
  const imgs = {
    mc:'/images/mc_aventurero.png', minecraft:'/images/mc_designer.png',
    aquatic:'/images/mc_aquatic.png', hero:'/images/mc_hero.png',
  };

  const cards = Object.entries(GAMES).map(([id, g]) => {
    const a = accents[id];
    return `
    <div class="game-card" id="card-${id}" onclick="location.href='/play/${id}/1'"
         style="--bc:${a.border};--gc:${a.glow};">
      <div class="card-img-wrap">
        <img src="${imgs[id]}" alt="${g.name}" class="card-img" loading="lazy">
        <div class="card-badge" style="background:${a.badge}">${g.levels} niveles</div>
      </div>
      <div class="card-body">
        <div class="card-title">${g.name}</div>
        <button class="play-btn" style="--b1:${a.btn1};--b2:${a.btn2}">
          <span>▶</span> JUGAR
        </button>
      </div>
    </div>`;
  }).join('');

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1.0">
  <title>Minecraft · Hora del Código</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link href="https://fonts.googleapis.com/css2?family=Press+Start+2P&family=VT323:wght@400&display=swap" rel="stylesheet">
  <style>
    *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
    body{font-family:'VT323',monospace;background:#0a0e1a;min-height:100vh;display:flex;flex-direction:column;align-items:center;overflow-x:hidden}

    /* Starfield background */
    .stars{position:fixed;inset:0;pointer-events:none;z-index:0;
      background:radial-gradient(ellipse at 20% 30%,rgba(93,130,51,.08) 0%,transparent 60%),
                 radial-gradient(ellipse at 80% 70%,rgba(2,119,189,.08) 0%,transparent 60%),
                 linear-gradient(180deg,#050812 0%,#0d1526 60%,#0a1f0a 100%)}
    .stars::before,.stars::after{content:'';position:absolute;inset:0;
      background-image:
        radial-gradient(1px 1px at 10% 15%,#fff 0%,transparent 100%),
        radial-gradient(1px 1px at 25% 40%,rgba(255,255,255,.7) 0%,transparent 100%),
        radial-gradient(1px 1px at 40%  8%,#fff 0%,transparent 100%),
        radial-gradient(1px 1px at 55% 25%,rgba(255,255,255,.5) 0%,transparent 100%),
        radial-gradient(1px 1px at 70% 50%,#fff 0%,transparent 100%),
        radial-gradient(1px 1px at 85% 12%,rgba(255,255,255,.8) 0%,transparent 100%),
        radial-gradient(2px 2px at 30% 85%,rgba(255,255,200,.8) 0%,transparent 100%),
        radial-gradient(2px 2px at 72% 18%,rgba(255,255,200,.9) 0%,transparent 100%);
      animation:twinkle 4s ease-in-out infinite alternate}
    .stars::after{animation-delay:-2s}
    @keyframes twinkle{0%{opacity:.6}100%{opacity:1}}

    .wrap{position:relative;z-index:1;width:100%;max-width:1200px;padding:40px 20px 0;display:flex;flex-direction:column;align-items:center}

    /* Header */
    .hdr{text-align:center;margin-bottom:48px}
    .logo-box{display:inline-block;background:#1a3a1a;border:4px solid #5D8233;border-bottom:6px solid #3d5c1f;border-right:6px solid #3d5c1f;padding:14px 28px;margin-bottom:20px}
    .logo-txt{font-family:'Press Start 2P',monospace;font-size:clamp(14px,2.5vw,22px);color:#fff;text-shadow:3px 3px 0 #3d5c1f,-1px -1px 0 #000;line-height:1.6;letter-spacing:1px}
    .logo-txt span{color:#7cb342}
    .sub{font-size:22px;color:#8bc34a;letter-spacing:2px;margin-top:8px}

    /* Grid */
    .grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:28px;width:100%}

    /* Card */
    .game-card{background:#111820;border:3px solid var(--bc,#555);border-bottom-width:5px;border-right-width:5px;cursor:pointer;transition:transform .15s,box-shadow .15s;position:relative;overflow:hidden}
    .game-card::before{content:'';position:absolute;inset:0;background:linear-gradient(135deg,rgba(255,255,255,.04) 0%,transparent 50%);pointer-events:none}
    .game-card:hover{transform:translate(-3px,-3px);box-shadow:6px 6px 0 var(--bc),6px 6px 30px var(--gc)}
    .game-card:active{transform:translate(0,0);box-shadow:2px 2px 0 var(--bc)}
    .card-img-wrap{position:relative;width:100%;aspect-ratio:1;overflow:hidden}
    .card-img{width:100%;height:100%;object-fit:cover;display:block;transition:transform .3s;image-rendering:pixelated}
    .game-card:hover .card-img{transform:scale(1.05)}
    .card-badge{position:absolute;top:10px;right:10px;font-family:'Press Start 2P',monospace;font-size:8px;color:#fff;padding:5px 8px;border:2px solid rgba(255,255,255,.3);border-bottom-width:3px;border-right-width:3px;text-shadow:1px 1px 0 #000}
    .card-body{padding:16px 18px 18px;border-top:3px solid var(--bc);background:linear-gradient(180deg,#161e2a 0%,#0e1520 100%)}
    .card-title{font-family:'Press Start 2P',monospace;font-size:clamp(8px,1.1vw,11px);color:#e8e8e8;line-height:1.7;margin-bottom:14px;min-height:40px}
    .play-btn{width:100%;font-family:'Press Start 2P',monospace;font-size:10px;color:#fff;background:linear-gradient(180deg,var(--b1) 0%,var(--b2) 100%);border:none;border-bottom:4px solid rgba(0,0,0,.4);border-right:4px solid rgba(0,0,0,.3);border-top:2px solid rgba(255,255,255,.2);border-left:2px solid rgba(255,255,255,.15);padding:12px 10px;cursor:pointer;letter-spacing:2px;text-shadow:1px 1px 0 rgba(0,0,0,.5);transition:filter .1s,transform .1s;display:flex;align-items:center;justify-content:center;gap:8px}
    .play-btn:hover{filter:brightness(1.2)}
    .play-btn:active{transform:translateY(2px);border-bottom-width:2px}

    /* Ground strip footer */
    .ground{width:100%;margin-top:48px}
    .grass{height:24px;background:repeating-linear-gradient(90deg,#5D8233 0,#5D8233 16px,#4a6e26 16px,#4a6e26 32px,#6b9e3a 32px,#6b9e3a 48px,#527a2a 48px,#527a2a 64px)}
    .dirt{height:32px;background:repeating-linear-gradient(90deg,#8B6143 0,#8B6143 16px,#7a5235 16px,#7a5235 32px,#9c7050 32px,#9c7050 48px,#6b4423 48px,#6b4423 64px);border-top:3px solid #3d2b12}
    .foot{background:#1a0f08;text-align:center;padding:12px;font-family:'Press Start 2P',monospace;font-size:7px;color:#5D4037;letter-spacing:1px}

    @media(max-width:600px){.logo-txt{font-size:12px}.grid{grid-template-columns:1fr 1fr;gap:16px}.card-title{font-size:7px}.play-btn{font-size:8px}}
  </style>
</head>
<body>
  <div class="stars"></div>
  <div class="wrap">
    <header class="hdr">
      <div class="logo-box">
        <div class="logo-txt">⛏ MINECRAFT<br><span>HORA DEL CÓDIGO</span></div>
      </div>
      <p class="sub">▸ ELIGE UN MUNDO PARA COMENZAR ◂</p>
    </header>
    <main class="grid">${cards}</main>
  </div>
  <div class="ground">
    <div class="grass"></div>
    <div class="dirt"></div>
    <div class="foot">CODE.ORG · USO EDUCATIVO SIN CONEXIÓN · ${new Date().getFullYear()}</div>
  </div>
</body>
</html>`;
}

// ── Request handler ───────────────────────────────────────────────────────────
const server = http.createServer((req, res) => {
  const reqPath = url.parse(req.url).pathname;
  console.log(`${new Date().toISOString().slice(11,19)} ${req.method} ${reqPath}`);

  // Root → menu
  if (reqPath === '/' || reqPath === '/index.html') {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    return res.end(buildMenu());
  }

  // /play/:game/:level → serve patched game HTML
  const playMatch = reqPath.match(/^\/play\/(\w+)\/(\d+)$/);
  if (playMatch) {
    const [, game, levelStr] = playMatch;
    const level = parseInt(levelStr, 10);
    if (!GAMES[game]) { res.writeHead(404); return res.end('Game not found'); }
    const htmlFile = path.join(HTML_DIR, game, `${levelStr}.html`);
    try {
      let html = fs.readFileSync(htmlFile, 'utf8');
      html = fixHtml(html, game, level);
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' });
      return res.end(html);
    } catch (e) {
      res.writeHead(302, { Location: '/' }); return res.end();
    }
  }

  // Serve locally-cached static assets
  if (serveFile(res, path.join(SITE_DIR, reqPath))) return;
  if (serveFile(res, path.join(SITE_DIR, reqPath, 'index.html'))) return;

  // Helper: quick JSON response
  function jsonOk(obj) {
    const body = JSON.stringify(obj);
    res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
    res.end(body);
  }

  // OPTIONS preflight
  if (req.method === 'OPTIONS') {
    res.writeHead(204, { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET,POST,OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type,X-Requested-With' });
    return res.end();
  }

  // POST /milestone/... → return success so the congratulations dialog appears
  if (req.method === 'POST' && reqPath.startsWith('/milestone/')) {
    console.log(`  ✓ milestone: ${reqPath}`);
    req.resume(); // drain body
    return jsonOk({
      redirect: null,
      new_level_completed: null,
      puzzle_ratings_enabled: false,
      share_url: null,
      phone_share_url: null,
    });
  }

  // GET /courses/:game/units/1/lessons/1/levels/:level
  // → redirect to our /play/:game/:level so the next level loads properly
  const coursesMatch = reqPath.match(/^\/courses\/([\w-]+)\/units\/\d+\/lessons\/\d+\/levels\/(\d+)/);
  if (coursesMatch) {
    const [, cGame, cLevel] = coursesMatch;
    const gameKey = Object.keys(GAMES).find(k => k === cGame) || cGame;
    console.log(`  ↪ courses redirect → /play/${gameKey}/${cLevel}`);
    res.writeHead(302, { Location: `/play/${gameKey}/${cLevel}` });
    return res.end();
  }

  // API stubs — silent JSON responses for endpoints the game pings
  if (reqPath === '/api/v1/users/current')          return jsonOk({ id: null, is_signed_in: false });
  if (reqPath.startsWith('/api/user_progress/'))    return jsonOk({});
  if (reqPath.startsWith('/api/user_app_options/')) return jsonOk({});
  if (reqPath.startsWith('/api/example_solutions/'))return jsonOk([]);
  if (reqPath.includes('/get_rubric'))              return jsonOk({});
  if (reqPath.includes('/hidden_lessons'))          return jsonOk({ hidden: [] });
  if (reqPath.startsWith('/puzzle_ratings'))        return jsonOk({ status: 'ok' });
  if (reqPath.includes('hint_view_requests'))       return jsonOk([]);
  if (reqPath.startsWith('/dashboardapi/'))         return jsonOk({});
  if (reqPath.startsWith('/user_preference/'))      return jsonOk({});

  // Proxy everything else to studio.code.org (JS bundles, images, fonts…)
  console.log(`  → proxy: ${reqPath}`);
  proxyToCodeOrg(req, res, reqPath);
});

server.listen(PORT, () => {
  console.log(`\n🎮 Minecraft Hora del Código — Servidor Offline`);
  console.log(`   URL: http://localhost:${PORT}\n`);
  Object.entries(GAMES).forEach(([id, g]) =>
    console.log(`   ${g.emoji}  ${g.name} → http://localhost:${PORT}/play/${id}/1`)
  );
  console.log('');
});
