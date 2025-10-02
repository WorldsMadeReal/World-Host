import { createHttpServer } from './http.js';
import { setupEnhancedWebSocketServer } from './ws-enhanced.js';
import { createECSWorld } from './world/ecs.js';
import { WorldState } from './world/state.js';
import { ChunkManager } from './world/chunks.js';
import { BasicMovementSystem } from './world/systems/movement.js';
import { BasicDurabilitySystem } from './world/systems/durability.js';
import { gameLoopDuration, gameLoopLag, systemUpdateDuration, updateECSMetrics, updateChunkMetrics } from './metrics.js';
import { TARGET_FPS, TICK_RATE_DISABLED, METRICS_ENABLED, OPEN_VISUALIZER } from './config.js';
import { DevEventHub } from './dev/events.js';
import open from 'open';
import { ChunkUtils } from '@worldhost/shared';
export function createApp() {
    // Initialize ECS world and systems
    const ecsWorld = createECSWorld();
    const devEvents = new DevEventHub();
    // Expose to global for modules that cannot import context
    globalThis.__DEV_EVENTS__ = devEvents;
    const chunkManager = new ChunkManager(ecsWorld, devEvents);
    const movementSystem = new BasicMovementSystem(ecsWorld, chunkManager);
    const durabilitySystem = new BasicDurabilitySystem(ecsWorld);
    // Initialize world state
    const worldState = new WorldState(ecsWorld);
    // Ensure at least one default layer exists so a blank server is valid
    worldState.createLayer({
        id: 'default',
        name: 'Default',
        description: 'Blank layer',
        chunkSize: 32,
        gravity: -9.81,
        spawnPoint: { x: 0, y: 2, z: 0 },
        properties: {}
    });
    const context = {
        worldState,
        chunkManager,
        movementSystem,
        durabilitySystem,
        devEvents,
    };
    // Create Fastify HTTP server
    const fastify = createHttpServer(context);
    // Setup enhanced WebSocket server using the underlying Node.js server
    const wsServer = setupEnhancedWebSocketServer(fastify.server, context);
    // Preload a small radius of chunks around origin for visualizer (ground level)
    try {
        const radius = 2;
        for (let cx = -radius; cx <= radius; cx++) {
            for (let cz = -radius; cz <= radius; cz++) {
                const key = ChunkUtils.create('default', cx, 0, cz);
                chunkManager.loadChunk(key);
            }
        }
    }
    catch { }
    // Start game loop
    startGameLoop(context);
    return { fastify, wsServer, context };
}
export async function start(port = 8080) {
    const { fastify } = createApp();
    let currentPort = port;
    for (let attempt = 0; attempt < 10; attempt++) {
        try {
            await fastify.listen({ port: currentPort });
            console.log(`🚀 WorldHost server running on port ${currentPort}`);
            console.log(`📡 WebSocket endpoint: ws://localhost:${currentPort}/ws`);
            console.log(`🌐 HTTP API: http://localhost:${currentPort}`);
            console.log(`📊 Stats: http://localhost:${currentPort}/stats`);
            console.log(`💚 Health: http://localhost:${currentPort}/health`);
            // Auto-open visualizer in default browser (dev convenience)
            if (OPEN_VISUALIZER) {
                try {
                    await open(`http://localhost:${currentPort}/visualizer`);
                }
                catch (e) {
                    console.warn('Failed to open visualizer automatically:', e instanceof Error ? e.message : e);
                }
            }
            return;
        }
        catch (error) {
            if (error && (error.code === 'EADDRINUSE' || String(error.message || '').includes('EADDRINUSE'))) {
                const nextPort = currentPort + 1;
                console.warn(`⚠️  Port ${currentPort} is in use. Retrying on ${nextPort}...`);
                currentPort = nextPort;
                continue;
            }
            console.error('❌ Failed to start server:', error);
            throw error;
        }
    }
    throw new Error(`Unable to bind server after multiple attempts starting at port ${port}`);
}
function startGameLoop(context) {
    if (TICK_RATE_DISABLED) {
        console.log('🎮 Game loop disabled (event-driven mode)');
        return;
    }
    let lastTime = Date.now();
    const targetFrameTime = 1000 / TARGET_FPS; // Target time per frame in ms
    const gameLoop = () => {
        const loopStartTime = Date.now();
        const currentTime = loopStartTime;
        const deltaTime = (currentTime - lastTime) / 1000; // Convert to seconds
        lastTime = currentTime;
        // Update systems with metrics
        try {
            if (METRICS_ENABLED) {
                // Update movement system with timing
                const movementStart = Date.now();
                context.movementSystem.update(deltaTime);
                const movementDuration = (Date.now() - movementStart) / 1000;
                systemUpdateDuration.labels('movement').observe(movementDuration);
                // Update durability system with timing
                const durabilityStart = Date.now();
                context.durabilitySystem.update(deltaTime);
                const durabilityDuration = (Date.now() - durabilityStart) / 1000;
                systemUpdateDuration.labels('durability').observe(durabilityDuration);
                // Update metrics
                updateECSMetrics(context.worldState.getECSWorld().getStats());
                updateChunkMetrics(context.chunkManager.getStats());
            }
            else {
                // Normal updates without metrics overhead
                context.movementSystem.update(deltaTime);
                context.durabilitySystem.update(deltaTime);
            }
        }
        catch (error) {
            console.error('Game loop error:', error);
            if (METRICS_ENABLED) {
                // Import synchronously to avoid async issues in game loop
                import('./metrics.js').then(({ errors }) => {
                    errors.labels('game_loop_error', 'system_update').inc();
                }).catch(metricsError => {
                    console.error('Failed to record error metric:', metricsError);
                });
            }
        }
        // Calculate loop timing
        const loopEndTime = Date.now();
        const loopDuration = loopEndTime - loopStartTime;
        const lag = Math.max(0, loopDuration - targetFrameTime);
        if (METRICS_ENABLED) {
            gameLoopDuration.observe(loopDuration / 1000);
            gameLoopLag.observe(lag / 1000);
        }
        // Schedule next update with lag compensation
        const nextFrameDelay = Math.max(1, targetFrameTime - loopDuration);
        setTimeout(gameLoop, nextFrameDelay);
    };
    // Start the game loop
    console.log(`🎮 Starting game loop (${TARGET_FPS} FPS target)...`);
    gameLoop();
}
//# sourceMappingURL=app.js.map