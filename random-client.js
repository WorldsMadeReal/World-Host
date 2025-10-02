#!/usr/bin/env node

// Simple random-walk client that connects to the WorldHost server
// and wanders around the world indefinitely.

import WebSocket from 'ws';

const WS_URL = process.env.WS_URL || 'ws://localhost:8080/ws';

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

class RandomWalkClient {
  constructor(options = {}) {
    this.url = options.url || WS_URL;
    this.ws = null;
    this.clientId = null;
    this.playerId = null;
    this.connected = false;
    this.messageHandlers = new Map();
    this.moveIntervalMs = options.moveIntervalMs ?? 1000;
    this.viewRadius = options.viewRadius ?? 128;
    this.layerId = options.layerId || 'default';
    this.currentPos = { x: 0, y: 2, z: 0 };
  }

  async start() {
    await this.connect();
    await this.initializeSession();
    await this.wanderLoop();
  }

  connect() {
    return new Promise((resolve, reject) => {
      console.log(`🔗 Connecting to ${this.url} ...`);
      this.ws = new WebSocket(this.url);

      this.ws.on('open', () => {
        this.connected = true;
        // hello not strictly required for enhanced server (it sends hello_ok first),
        // but we can send it for completeness.
        this.send({ type: 'hello', clientVersion: '1.0.0' });
      });

      this.ws.on('message', (data) => {
        try {
          const message = JSON.parse(data.toString());
          this.handleMessage(message);
        } catch (err) {
          console.error('Failed to parse message:', err);
        }
      });

      this.ws.on('error', (err) => {
        if (!this.connected) reject(err);
        console.error('WebSocket error:', err.message);
      });

      this.ws.on('close', (code, reason) => {
        this.connected = false;
        console.log('🔌 Disconnected:', code, reason?.toString?.() || '');
      });

      // Resolve on hello_ok
      this.onMessage('hello_ok', (msg) => {
        this.clientId = msg.clientId;
        console.log(`✅ Connected. Client ID: ${this.clientId}`);
        resolve();
      });
    });
  }

  async initializeSession() {
    // Request login to create a player entity
    this.send({ type: 'login', layerId: this.layerId, playerName: `Wanderer-${(this.clientId || '').slice(-4)}` });

    // Wait for login_ok
    await new Promise((resolve) => {
      this.onMessage('login_ok', (msg) => {
        this.playerId = msg.playerId;
        resolve();
      });
    });

    // Set view radius so server auto-manages chunk subscriptions as we move
    this.send({ type: 'set_view', radius: this.viewRadius });

    // Also explicitly subscribe to the origin chunk at start for immediate data
    this.send({ type: 'subscribe_chunks', chunkKeys: [{ layerId: this.layerId, cx: 0, cy: 0, cz: 0 }] });

    // Log some feedback
    this.onMessage('chunk_snapshot', (msg) => {
      console.log(`📦 Snapshot: ${msg.entities.length} entities in (${msg.chunkKey.cx},${msg.chunkKey.cy},${msg.chunkKey.cz})`);
    });

    this.onMessage('entity_update', (msg) => {
      if (msg.entityId === this.playerId) {
        const pos = (msg.contracts.find((c) => c.type === 'mobility') || {}).position;
        if (pos) {
          this.currentPos = pos;
          console.log(`🚶 Position update: (${pos.x.toFixed(2)}, ${pos.y.toFixed(2)}, ${pos.z.toFixed(2)})`);
        }
      }
    });

    this.onMessage('move_result', (msg) => {
      if (msg.success && msg.position) {
        this.currentPos = msg.position;
      } else if (!msg.success) {
        console.log('⛔ Move blocked:', msg.reason);
      }
    });
  }

  async wanderLoop() {
    // Take larger absolute steps using move want positions
    const minStep = Number(process.env.STEP_MIN || 8);
    const maxStep = Number(process.env.STEP_MAX || 32);
    while (this.connected) {
      const step = Math.max(minStep, Math.min(maxStep, Math.random() * (maxStep - minStep) + minStep));
      const angle = Math.random() * Math.PI * 2;
      const dx = Math.cos(angle) * step;
      const dz = Math.sin(angle) * step;
      const want = { x: this.currentPos.x + dx, y: this.currentPos.y, z: this.currentPos.z + dz };
      this.send({ type: 'move', want });
      await delay(this.moveIntervalMs);
    }
  }

  send(message) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
    }
  }

  onMessage(type, handler) {
    if (!this.messageHandlers.has(type)) this.messageHandlers.set(type, []);
    this.messageHandlers.get(type).push(handler);
  }

  handleMessage(message) {
    const list = this.messageHandlers.get(message.type);
    if (list) for (const h of list) {
      try { h(message); } catch (e) { console.error('Handler error:', e); }
    }
  }
}

// Entrypoint
(async () => {
  const client = new RandomWalkClient({
    url: WS_URL,
    moveIntervalMs: Number(process.env.MOVE_INTERVAL_MS || 1000),
    viewRadius: Number(process.env.VIEW_RADIUS || 64),
    layerId: process.env.LAYER_ID || 'default'
  });
  await client.start();
})();


