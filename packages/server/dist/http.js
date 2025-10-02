import Fastify from 'fastify';
import { z } from 'zod';
import { Vec3Schema, AnyContractOverrideSchema, AnyContractSchema } from './world/contracts.js';
import { register as metricsRegister, httpRequests, httpDuration } from './metrics.js';
import { METRICS_ENABLED } from './config.js';
// Request schemas
const CreateLayerSchema = z.object({
    name: z.string(),
    description: z.string().optional(),
    chunkSize: z.number().positive().optional(),
    gravity: z.number().optional(),
    spawnPoint: Vec3Schema.optional(),
    boundaries: z.object({
        min: Vec3Schema,
        max: Vec3Schema,
    }).optional(),
    properties: z.record(z.any()).optional(),
});
const DefineArchetypeSchema = z.object({
    id: z.string().optional(),
    name: z.string(),
    description: z.string().optional(),
    contracts: z.array(AnyContractSchema),
    tags: z.array(z.string()).optional(),
});
const SpawnSchema = z.object({
    archetypeId: z.string(),
    layerId: z.string(),
    position: Vec3Schema,
    overrides: z.array(AnyContractOverrideSchema).optional(),
});
const SaveLoadSchema = z.object({
    filename: z.string().optional(),
});
export function createHttpServer(context) {
    const fastify = Fastify({ logger: false });
    // CORS plugin
    fastify.register(async function (fastify) {
        fastify.addHook('onRequest', async (request, reply) => {
            reply.header('Access-Control-Allow-Origin', '*');
            reply.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
            reply.header('Access-Control-Allow-Headers', 'Content-Type');
        });
        fastify.options('/*', async (request, reply) => {
            reply.send();
        });
    });
    // Metrics tracking plugin
    if (METRICS_ENABLED) {
        fastify.register(async function (fastify) {
            fastify.addHook('onRequest', async (request, reply) => {
                request.startTime = Date.now();
            });
            fastify.addHook('onResponse', async (request, reply) => {
                const start = request.startTime;
                if (start) {
                    const duration = (Date.now() - start) / 1000;
                    const route = request.routeOptions?.url || request.url;
                    httpRequests.labels(request.method, route, String(reply.statusCode)).inc();
                    httpDuration.labels(request.method, route).observe(duration);
                }
            });
        });
    }
    // Root endpoint
    fastify.get('/', async (request, reply) => {
        const stats = context.worldState.getStats();
        return {
            name: 'WorldHost Server',
            version: '1.0.0',
            status: 'running',
            uptime: process.uptime(),
            stats,
            endpoints: {
                'GET /': 'Server information',
                'GET /health': 'Health check',
                'GET /stats': 'Detailed statistics',
                'POST /world/layers': 'Create new layer',
                'GET /world/layers': 'List all layers',
                'POST /world/archetypes': 'Define new archetype',
                'GET /world/archetypes': 'List all archetypes',
                'POST /spawn': 'Spawn entity from archetype',
                'POST /save': 'Save world to file',
                'POST /load': 'Load world from file',
                'WS /ws': 'WebSocket connection',
            },
        };
    });
    // Developer visualizer HTML (self-contained)
    fastify.get('/visualizer', async (request, reply) => {
        reply.header('Content-Type', 'text/html');
        return `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>WorldHost Visualizer</title>
  <style>
    html, body { margin:0; padding:0; height:100%; overflow:hidden; font-family: system-ui, sans-serif; background:#0b0f14; color:#dbe5f0; }
    .layout { display:grid; grid-template-columns: 2fr 1fr; grid-template-rows: 48px 1fr; height:100vh; }
    header { grid-column: 1 / 3; padding:10px 14px; border-bottom:1px solid #1e2630; display:flex; gap:12px; align-items:center; min-height:48px; }
    header h1 { font-size:16px; margin:0; font-weight:600; }
    header .pill { padding:4px 8px; border-radius:999px; background:#132031; color:#9fd0ff; font-size:12px; }
    #view { position:relative; background:#0e131a; border-right:1px solid #1e2630; display:flex; align-items:flex-start; justify-content:center; overflow:hidden; padding:24px 8px 8px; }
    :root { --canvas-size: min(80vmin, 720px); }
    canvas { width:var(--canvas-size); height:var(--canvas-size); display:block; image-rendering: pixelated; border:1px solid #1e2630; border-radius:8px; background:#0b0f14; margin-top:4px; }
    .stage { position:relative; display:flex; flex-direction:column; align-items:center; }
    #sidebar { display:flex; flex-direction:column; gap:10px; height:100%; overflow:hidden; }
    .panel { border-bottom:1px solid #1e2630; padding:10px; }
    .panel h2 { font-size:13px; margin:0 0 6px 0; color:#a8b3c2; font-weight:600; }
    #search { display:flex; gap:8px; }
    #search input { flex:1; padding:6px 8px; background:#0b111a; color:#dbe5f0; border:1px solid #1e2630; border-radius:6px; }
    #search button { padding:6px 10px; background:#18324a; color:#cbe4ff; border:1px solid #1e2630; border-radius:6px; cursor:pointer; }
    #logs { height:100%; overflow:auto; font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; font-size:12px; }
    .log { padding:4px 6px; border-bottom:1px dashed #19222e; white-space:pre-wrap; word-break:break-word; }
    .log .ts { color:#70869e; }
    .log .type { color:#9fd0ff; }
    #legend { display:flex; gap:10px; flex-wrap:wrap; }
    .swatch { display:inline-flex; align-items:center; gap:6px; padding:2px 6px; background:#0b111a; border:1px solid #1e2630; border-radius:6px; }
    .swatch i { display:inline-block; width:12px; height:12px; border-radius:3px; }
    #tooltip { position:absolute; top:0; left:0; transform:translate(-9999px,-9999px); pointer-events:none; background:#0b111a; color:#dbe5f0; border:1px solid #1e2630; border-radius:6px; padding:6px 8px; font-size:12px; box-shadow:0 4px 10px rgba(0,0,0,0.4); max-width:280px; z-index:10; }
    #tooltip h3 { margin:0 0 4px 0; font-size:13px; color:#cfe6ff; }
    #tooltip .muted { color:#7b8a99; }
    #settings { display:flex; justify-content:center; gap:10px; align-items:center; margin-bottom:8px; }
    #nav { position:absolute; bottom:12px; right:12px; display:grid; grid-template-columns: 40px 40px 40px; grid-template-rows: 40px 40px 40px; gap:6px; align-items:center; justify-items:center; }
    #nav button { width:40px; height:40px; background:#132031; color:#cfe6ff; border:1px solid #1e2630; border-radius:6px; cursor:pointer; }
    #zoom { position:absolute; right:12px; bottom: calc(12px + 40px*3 + 6px*2 + 10px); display:flex; gap:6px; }
    #zoom button { width:40px; height:32px; background:#132031; color:#cfe6ff; border:1px solid #1e2630; border-radius:6px; cursor:pointer; }
  </style>
  <script>
    const colors = {
      player: '#4fd2ff',
      block: '#8B4513',
      item: '#FFD700',
      default: '#9aa7b4'
    };
    const state = { entities: new Map(), terrain: new Map(), center: { cx: 0, cz: 0 }, radius: 11, screen: [], zoom: 1 };
    async function loadTerrain() {
      // Scale requested radius by zoom: zoom < 1 (zoomed out) -> bigger radius, zoom > 1 -> smaller
      const zoom = state.zoom || 1;
      const scaled = Math.round(state.radius * (1 / zoom));
      const radius = Math.max(1, scaled);
      const res = await fetch('/dev/terrain/load', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ cx: state.center.cx, cz: state.center.cz, radius }) });
      const json = await res.json();
      for (const c of json.chunks || []) { state.terrain.set(c.key, c.grid); }
    }
    function draw() {
      const canvas = document.getElementById('canvas');
      const ctx = canvas.getContext('2d');
      const dpr = window.devicePixelRatio || 1;
      const w = canvas.clientWidth * dpr;
      const h = canvas.clientHeight * dpr;
      if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; }
      ctx.clearRect(0,0,w,h);
      // draw grid
      ctx.strokeStyle = 'rgba(80,100,130,0.25)';
      const spacing = 64 * dpr * (state.zoom || 1);
      for (let gx=0; gx<w; gx+=spacing) { ctx.beginPath(); ctx.moveTo(gx,0); ctx.lineTo(gx,h); ctx.stroke(); }
      for (let gz=0; gz<h; gz+=spacing) { ctx.beginPath(); ctx.moveTo(0,gz); ctx.lineTo(w,gz); ctx.stroke(); }
      // heatmap background per-chunk relative to selected center
      const chunkPixel = 64 * dpr * (state.zoom || 1);
      const offsetX = Math.floor(w / 2) - chunkPixel / 2;
      const offsetY = Math.floor(h / 2) - chunkPixel / 2;
      for (const [key, grid] of state.terrain) {
        const m = /^(.*?):(-?\d+),(-?\d+),(-?\d+)$/.exec(key);
        if (!m) continue;
        const cx = parseInt(m[2],10); const cz = parseInt(m[4],10);
        const dx = cx - state.center.cx; const dz = cz - state.center.cz;
        const px = offsetX + dx * chunkPixel; const pz = offsetY + dz * chunkPixel;
        const { width, height, depth, data } = grid;
        const cell = Math.max(2, Math.floor(chunkPixel / Math.max(width, depth)));
        for (let z=0; z<depth; z++) {
          for (let x=0; x<width; x++) {
            let count = 0;
            for (let y=0; y<height; y++) {
              const idx = x + y*width + z*width*height;
              if (data[idx]) count++;
            }
            const t = Math.min(1, count / height);
            if (t>0) {
              const r = Math.floor(30 + 200*t);
              const g = Math.floor(50 + 50*t);
              const b = Math.floor(80 + 10*t);
              ctx.fillStyle = 'rgba(' + r + ',' + g + ',' + b + ',' + (0.15 + 0.35*t) + ')';
              ctx.fillRect(px + x*cell, pz + z*cell, cell, cell);
            }
          }
        }
        ctx.strokeStyle = 'rgba(150,170,190,0.25)';
        ctx.strokeRect(px, pz, chunkPixel, chunkPixel);
      }
      // entities as circles relative to center
      const points = [];
      for (const [id, e] of state.entities) {
        const pos = e.mobility?.position || {x:0,y:0,z:0};
        const pxPerUnit = (chunkPixel / 32);
        const x = (pos.x - state.center.cx*32) * pxPerUnit + w/2;
        const z = (pos.z - state.center.cz*32) * pxPerUnit + h/2;
        const visual = e.visual;
        const c = visual?.color || colors[e.kind] || colors.default;
        ctx.fillStyle = c;
        const r = Math.max(2*(window.devicePixelRatio||1), 4*(window.devicePixelRatio||1)*(state.zoom || 1));
        ctx.beginPath(); ctx.arc(x, z, r, 0, Math.PI*2); ctx.fill();
        points.push({ id, x, y: z, r, color: c });
      }
      state.screen = points;
      requestAnimationFrame(draw);
    }
    function log(ev) {
      const el = document.getElementById('logs');
      const row = document.createElement('div');
      row.className = 'log';
      const ts = new Date(ev.ts||Date.now()).toLocaleTimeString();
      row.innerHTML = '<span class="ts">[' + ts + ']</span> <span class="type">' + ev.type + '</span> ' + JSON.stringify(ev.payload);
      el.prepend(row);
    }
    function getEntityLabel(entity) {
      const id = entity.id || 'unknown';
      const name = entity.identity?.name || id;
      const kind = entity.kind || (entity.identity?.name || 'entity');
      const pos = entity.mobility?.position;
      const posStr = pos ? '(' + pos.x.toFixed(2) + ', ' + pos.y.toFixed(2) + ', ' + pos.z.toFixed(2) + ')' : '(n/a)';
      return { title: name, lines: [ 'id: ' + id, 'type: ' + kind, 'pos: ' + posStr ] };
    }
    function findHit(px, py) {
      // Hit test nearest point within radius*1.5
      let best = null; let bestD = Infinity;
      for (const p of state.screen) {
        const dx = px - p.x; const dy = py - p.y; const d2 = dx*dx + dy*dy;
        const r = p.r * 1.75;
        if (d2 <= r*r && d2 < bestD) { best = p; bestD = d2; }
      }
      return best;
    }
    async function start() {
      draw();
      await loadTerrain();
      const es = new EventSource('/dev/events');
      es.onmessage = (m) => {
        try {
          const ev = JSON.parse(m.data);
          log(ev);
          if (ev.type === 'entity_snapshot' || ev.type === 'entity_update') {
            const { id, contracts, kind } = ev.payload;
            const obj = { kind };
            for (const c of contracts || []) { obj[c.type] = c; }
            state.entities.set(id, obj);
          }
          if (ev.type === 'entity_despawn') {
            state.entities.delete(ev.payload.id);
          }
          if (ev.type === 'terrain_chunk') {
            state.terrain.set(ev.payload.key, ev.payload.grid);
          }
        } catch {}
      };
      try { await fetch('/stats'); } catch {}
      const input = document.getElementById('searchInput');
      input.addEventListener('input', () => {
        const q = input.value.trim().toLowerCase();
        for (const row of document.querySelectorAll('.log')) {
          row.style.display = row.textContent.toLowerCase().includes(q) ? '' : 'none';
        }
      });
    }
    // Wire controls after DOM ready
    function updateInputs() {
      document.getElementById('cxInput').value = state.center.cx;
      document.getElementById('czInput').value = state.center.cz;
    }
    async function applyView() {
      state.center.cx = parseInt(document.getElementById('cxInput').value, 10) || 0;
      state.center.cz = parseInt(document.getElementById('czInput').value, 10) || 0;
      state.terrain.clear();
      await loadTerrain();
    }
    window.addEventListener('load', async () => {
      await start();
      const btnJump = document.getElementById('applyJump');
      const btnN = document.getElementById('navN');
      const btnS = document.getElementById('navS');
      const btnW = document.getElementById('navW');
      const btnE = document.getElementById('navE');
      const btnC = document.getElementById('navC');
      if (btnJump) btnJump.addEventListener('click', applyView);
      if (btnN) btnN.addEventListener('click', async () => { state.center.cz -= 1; updateInputs(); await applyView(); });
      if (btnS) btnS.addEventListener('click', async () => { state.center.cz += 1; updateInputs(); await applyView(); });
      if (btnW) btnW.addEventListener('click', async () => { state.center.cx -= 1; updateInputs(); await applyView(); });
      if (btnE) btnE.addEventListener('click', async () => { state.center.cx += 1; updateInputs(); await applyView(); });
      if (btnC) btnC.addEventListener('click', async () => { state.center = { cx: 0, cz: 0 }; updateInputs(); await applyView(); });
      const btnZoomIn = document.getElementById('zoomIn');
      const btnZoomOut = document.getElementById('zoomOut');
      const clampZoom = (z) => Math.max(0.5, Math.min(4, z));
      if (btnZoomIn) btnZoomIn.addEventListener('click', () => { state.zoom = clampZoom((state.zoom || 1) + 0.25); });
      if (btnZoomOut) btnZoomOut.addEventListener('click', () => { state.zoom = clampZoom((state.zoom || 1) - 0.25); });
      updateInputs();
      // Tooltip wiring
      const canvas = document.getElementById('canvas');
      const tooltip = document.getElementById('tooltip');
      function hideTip() { tooltip.style.transform = 'translate(-9999px,-9999px)'; }
      function showTip(html, x, y) {
        tooltip.innerHTML = html;
        const viewRect = document.getElementById('view').getBoundingClientRect();
        const tipRect = tooltip.getBoundingClientRect();
        let left = x + 12; let top = y + 12;
        if (left + tipRect.width > viewRect.width - 8) left = Math.max(8, x - tipRect.width - 12);
        if (top + tipRect.height > viewRect.height - 8) top = Math.max(8, y - tipRect.height - 12);
        tooltip.style.transform = 'translate(' + left + 'px,' + top + 'px)';
      }
      canvas.addEventListener('mousemove', (ev) => {
        const rect = canvas.getBoundingClientRect();
        const dpr = window.devicePixelRatio || 1;
        const x = (ev.clientX - rect.left) * dpr;
        const y = (ev.clientY - rect.top) * dpr;
        const hit = findHit(x, y);
        if (!hit) { hideTip(); return; }
        const entity = state.entities.get(hit.id) || {};
        const info = getEntityLabel({ id: hit.id, ...entity });
        const html = '<h3>' + info.title + '</h3>' + info.lines.map(l => '<div class="muted">' + l + '</div>').join('');
        // position relative to #view container
        const viewRect = document.getElementById('view').getBoundingClientRect();
        showTip(html, ev.clientX - viewRect.left, ev.clientY - viewRect.top);
      });
      canvas.addEventListener('mouseleave', hideTip);
    });
  </script>
</head>
<body>
  <div class="layout">
    <header>
      <h1>WorldHost Visualizer</h1>
      <div class="pill">Realtime</div>
      <div class="pill">SSE</div>
    </header>
    <div id="view">
      <div class="stage">
        <div id="settings">
          <label>Chunk X <input id="cxInput" type="number" value="0" /></label>
          <label>Chunk Z <input id="czInput" type="number" value="0" /></label>
          <button id="applyJump">Jump</button>
        </div>
        <canvas id="canvas"></canvas>
        <div id="zoom"><button id="zoomOut">-</button><button id="zoomIn">+</button></div>
        <div id="nav">
          <div></div><button id="navN">↑</button><div></div>
          <button id="navW">←</button><button id="navC">•</button><button id="navE">→</button>
          <div></div><button id="navS">↓</button><div></div>
        </div>
      </div>
      <div id="tooltip"></div>
    </div>
    <div id="sidebar">
      <div class="panel">
        <h2>Search Commands/Events</h2>
        <div id="search"><input id="searchInput" placeholder="Filter logs..." /><button onclick="document.getElementById('searchInput').value='';document.getElementById('searchInput').dispatchEvent(new Event('input'))">Clear</button></div>
      </div>
      <div class="panel" style="flex:1; min-height:0;">
        <h2>Output</h2>
        <div id="logs"></div>
      </div>
      <div class="panel">
        <h2>Legend</h2>
        <div id="legend">
          <span class="swatch"><i style="background:#4fd2ff"></i> Player</span>
          <span class="swatch"><i style="background:#8B4513"></i> Block</span>
          <span class="swatch"><i style="background:#FFD700"></i> Item</span>
          <span class="swatch"><i style="background:#9aa7b4"></i> Other</span>
        </div>
      </div>
    </div>
  </div>
</body>
</html>`;
    });
    // SSE stream of dev events
    fastify.get('/dev/events', async (request, reply) => {
        reply.raw.writeHead(200, {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            Connection: 'keep-alive',
            'Access-Control-Allow-Origin': '*'
        });
        const send = (ev) => {
            reply.raw.write(`data: ${JSON.stringify(ev)}\n\n`);
        };
        // send recent
        for (const ev of context.devEvents.getRecent())
            send(ev);
        const unsubscribe = context.devEvents.subscribe(send);
        request.raw.on('close', () => {
            unsubscribe();
        });
        return reply; // keep open
    });
    // Terrain API: loaded chunks with solid grids for initial snapshot
    fastify.get('/dev/terrain/active', async (request, reply) => {
        const items = context.chunkManager.getLoadedChunkGrids();
        return { chunks: items.map((i) => ({ key: i.key, grid: i.grid })) };
    });
    // Terrain API: load chunks around a center (cx,cz) with radius, return grids
    fastify.post('/dev/terrain/load', async (request, reply) => {
        try {
            const body = (request.body || {});
            const cx = Number(body.cx ?? 0);
            const cz = Number(body.cz ?? 0);
            // Allow larger radius so zoomed-out views can load more chunks
            const radius = Math.max(0, Math.min(16, Number(body.radius ?? 2)));
            const layerId = String(body.layerId ?? 'default');
            for (let x = cx - radius; x <= cx + radius; x++) {
                for (let z = cz - radius; z <= cz + radius; z++) {
                    context.chunkManager.loadChunk({ layerId, cx: x, cy: 0, cz: z });
                }
            }
            const items = context.chunkManager.getLoadedChunkGrids();
            const filtered = items.filter(i => {
                const m = /^(.*?):(-?\d+),(-?\d+),(-?\d+)$/.exec(i.key);
                if (!m)
                    return false;
                const kcx = parseInt(m[2], 10);
                const kcz = parseInt(m[4], 10);
                return Math.abs(kcx - cx) <= radius && Math.abs(kcz - cz) <= radius;
            });
            return { chunks: filtered.map(i => ({ key: i.key, grid: i.grid })) };
        }
        catch (err) {
            reply.code(400);
            return { error: 'failed_to_load', message: err instanceof Error ? err.message : 'unknown' };
        }
    });
    // Health check
    fastify.get('/health', async (request, reply) => {
        const stats = context.worldState.getStats();
        return {
            status: 'healthy',
            timestamp: new Date().toISOString(),
            uptime: process.uptime(),
            memory: process.memoryUsage(),
            entityCount: stats.totalEntities,
            playerCount: stats.playerCount,
        };
    });
    // Detailed statistics
    fastify.get('/stats', async (request, reply) => {
        const worldStats = context.worldState.getStats();
        const ecsStats = context.worldState.getECSWorld().getStats();
        return {
            world: worldStats,
            ecs: ecsStats,
            timestamp: new Date().toISOString(),
            uptime: process.uptime(),
            memory: process.memoryUsage(),
        };
    });
    // World management endpoints
    // Create layer
    fastify.post('/world/layers', async (request, reply) => {
        try {
            const parsed = CreateLayerSchema.safeParse(request.body);
            if (!parsed.success) {
                reply.code(400);
                return { success: false, error: parsed.error.message };
            }
            const layerConfig = context.worldState.createLayer(parsed.data);
            reply.code(201);
            return {
                success: true,
                layer: layerConfig,
            };
        }
        catch (error) {
            reply.code(400);
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error',
            };
        }
    });
    // List layers
    fastify.get('/world/layers', async (request, reply) => {
        const layers = context.worldState.getAllLayers();
        return {
            success: true,
            layers,
        };
    });
    // Define archetype
    fastify.post('/world/archetypes', async (request, reply) => {
        try {
            const parsed = DefineArchetypeSchema.safeParse(request.body);
            if (!parsed.success) {
                reply.code(400);
                return { success: false, error: parsed.error.message };
            }
            const body = parsed.data;
            const archetype = {
                id: body.id || `archetype-${Date.now()}`,
                name: body.name,
                description: body.description,
                contracts: body.contracts,
                tags: body.tags || [],
                created: Date.now(),
            };
            context.worldState.defineArchetype(archetype);
            reply.code(201);
            return {
                success: true,
                archetype,
            };
        }
        catch (error) {
            reply.code(400);
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error',
            };
        }
    });
    // List archetypes
    fastify.get('/world/archetypes', async (request, reply) => {
        const archetypes = context.worldState.getAllArchetypes();
        return {
            success: true,
            archetypes,
        };
    });
    // Spawn entity
    fastify.post('/spawn', async (request, reply) => {
        try {
            const parsed = SpawnSchema.safeParse(request.body);
            if (!parsed.success) {
                reply.code(400);
                return { success: false, error: parsed.error.message };
            }
            const body = parsed.data;
            const entityId = context.worldState.spawn(body.archetypeId, body.layerId, body.position, body.overrides);
            reply.code(201);
            return {
                success: true,
                entityId,
                archetype: body.archetypeId,
                layer: body.layerId,
                position: body.position,
            };
        }
        catch (error) {
            reply.code(400);
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error',
            };
        }
    });
    // Save world
    fastify.post('/save', async (request, reply) => {
        try {
            const parsed = SaveLoadSchema.safeParse(request.body);
            if (!parsed.success) {
                reply.code(400);
                return { success: false, error: parsed.error.message };
            }
            const body = parsed.data;
            await context.worldState.saveWorld(body.filename);
            return {
                success: true,
                filename: body.filename || 'world.json',
                timestamp: new Date().toISOString(),
            };
        }
        catch (error) {
            reply.code(500);
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error',
            };
        }
    });
    // Load world
    fastify.post('/load', async (request, reply) => {
        try {
            const parsed = SaveLoadSchema.safeParse(request.body);
            if (!parsed.success) {
                reply.code(400);
                return { success: false, error: parsed.error.message };
            }
            const body = parsed.data;
            await context.worldState.loadWorld(body.filename);
            return {
                success: true,
                filename: body.filename || 'world.json',
                timestamp: new Date().toISOString(),
                stats: context.worldState.getStats(),
            };
        }
        catch (error) {
            reply.code(500);
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error',
            };
        }
    });
    // Prometheus metrics endpoint (optional)
    if (METRICS_ENABLED) {
        fastify.get('/metrics', async (request, reply) => {
            try {
                const metrics = await metricsRegister.metrics();
                reply.header('Content-Type', metricsRegister.contentType);
                return metrics;
            }
            catch (error) {
                reply.code(500);
                return {
                    error: 'Failed to collect metrics',
                    message: error instanceof Error ? error.message : 'Unknown error',
                };
            }
        });
    }
    // Error handler
    fastify.setErrorHandler((error, request, reply) => {
        console.error('HTTP Error:', error);
        reply.code(500).send({
            success: false,
            error: 'Internal server error',
        });
    });
    // Return the Fastify instance so callers can await readiness and call listen()
    return fastify;
}
// Legacy HTTP handling functions removed - now using Fastify
//# sourceMappingURL=http.js.map