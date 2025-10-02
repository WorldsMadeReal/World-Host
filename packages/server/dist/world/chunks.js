import { ChunkUtils } from '@worldhost/shared';
import { keyFromPos, layerRegistry } from './space.js';
/**
 * Manages chunk loading, unloading, and entity tracking
 */
export class ChunkManager {
    chunks = new Map();
    ecsWorld;
    loadedChunks = new Set();
    cleanupInterval;
    devEvents;
    // Configuration
    maxLoadedChunks = 1000;
    chunkUnloadDelay = 60000; // 1 minute
    // Hard cap for retained chunk metadata to avoid unbounded growth
    maxRetainedChunks = 20000;
    constructor(ecsWorld, devEvents) {
        this.ecsWorld = ecsWorld;
        this.devEvents = devEvents;
        this.startCleanupTimer();
    }
    /**
     * Get chunk key from world position with layer-specific chunk size
     */
    keyFromPos(layerId, position, size) {
        return keyFromPos(layerId, position, size);
    }
    /**
     * Get or create chunk data
     */
    getChunk(chunkKey) {
        const keyStr = ChunkUtils.toString(chunkKey);
        let chunk = this.chunks.get(keyStr);
        if (!chunk) {
            chunk = {
                key: chunkKey,
                entities: new Set(),
                loaded: false,
                lastAccessed: Date.now(),
                subscriptions: new Map(),
                lastModified: Date.now(),
                version: 1,
            };
            this.chunks.set(keyStr, chunk);
        }
        else {
            chunk.lastAccessed = Date.now();
        }
        return chunk;
    }
    /**
     * Load a chunk (generate entities if needed)
     */
    loadChunk(chunkKey) {
        const chunk = this.getChunk(chunkKey);
        if (!chunk.loaded) {
            this.generateChunkContent(chunk);
            chunk.loaded = true;
            this.loadedChunks.add(ChunkUtils.toString(chunkKey));
            console.log(`📦 Loaded chunk: ${ChunkUtils.toString(chunkKey)}`);
        }
        return chunk;
    }
    /**
     * Unload a chunk (remove from memory but keep entities in ECS)
     */
    unloadChunk(chunkKey) {
        const keyStr = ChunkUtils.toString(chunkKey);
        const chunk = this.chunks.get(keyStr);
        if (!chunk || !chunk.loaded) {
            return false;
        }
        // Mark as unloaded but keep the chunk data
        chunk.loaded = false;
        this.loadedChunks.delete(keyStr);
        console.log(`📤 Unloaded chunk: ${keyStr}`);
        return true;
    }
    /**
     * Add an entity to a chunk
     */
    addEntityToChunk(entityId, chunkKey) {
        const chunk = this.getChunk(chunkKey);
        const wasEmpty = chunk.entities.size === 0;
        chunk.entities.add(entityId);
        this.markChunkModified(chunk);
        // Emit delta update to subscribers
        this.emitDelta(chunk, {
            type: 'entity_add',
            entityId,
            contracts: undefined,
            timestamp: Date.now(),
        });
    }
    /**
     * Remove an entity from a chunk
     */
    removeEntityFromChunk(entityId, chunkKey) {
        const keyStr = ChunkUtils.toString(chunkKey);
        const chunk = this.chunks.get(keyStr);
        if (chunk && chunk.entities.has(entityId)) {
            chunk.entities.delete(entityId);
            this.markChunkModified(chunk);
            // Emit delta update to subscribers
            this.emitDelta(chunk, {
                type: 'entity_remove',
                entityId,
                contracts: undefined,
                timestamp: Date.now(),
            });
        }
    }
    /**
     * Move an entity from one chunk to another
     */
    moveEntityBetweenChunks(entityId, fromChunk, toChunk) {
        this.removeEntityFromChunk(entityId, fromChunk);
        this.addEntityToChunk(entityId, toChunk);
    }
    /**
     * Get all entities in a chunk
     */
    getEntitiesInChunk(chunkKey) {
        const chunk = this.getChunk(chunkKey);
        return Array.from(chunk.entities);
    }
    /**
     * Get all loaded chunks
     */
    getLoadedChunks() {
        return Array.from(this.loadedChunks).map(keyStr => {
            const key = ChunkUtils.fromString(keyStr);
            if (!key)
                throw new Error(`Invalid chunk key: ${keyStr}`);
            return key;
        });
    }
    /**
     * Check if a chunk is loaded
     */
    isChunkLoaded(chunkKey) {
        return this.loadedChunks.has(ChunkUtils.toString(chunkKey));
    }
    /**
     * Subscribe a WebSocket to chunk updates
     */
    subscribe(ws, chunkKey, playerId) {
        const chunk = this.getChunk(chunkKey);
        const subscription = {
            ws,
            playerId,
            lastUpdate: Date.now(),
        };
        chunk.subscriptions.set(ws, subscription);
        // Send initial snapshot
        this.emitSnapshot(chunk, ws);
        console.log(`📡 Subscribed ${playerId || 'anonymous'} to chunk ${ChunkUtils.toString(chunkKey)}`);
    }
    /**
     * Unsubscribe a WebSocket from chunk updates
     */
    unsubscribe(ws, chunkKey) {
        const keyStr = ChunkUtils.toString(chunkKey);
        const chunk = this.chunks.get(keyStr);
        if (chunk) {
            const subscription = chunk.subscriptions.get(ws);
            chunk.subscriptions.delete(ws);
            if (subscription?.playerId) {
                console.log(`📡 Unsubscribed ${subscription.playerId} from chunk ${keyStr}`);
            }
        }
    }
    /**
     * Unsubscribe a WebSocket from all chunks
     */
    unsubscribeFromAll(ws) {
        for (const chunk of this.chunks.values()) {
            chunk.subscriptions.delete(ws);
        }
    }
    /**
     * Emit a complete chunk snapshot to a specific WebSocket
     */
    emitSnapshot(chunk, ws) {
        if (ws.readyState !== ws.OPEN)
            return;
        const entities = [];
        for (const entityId of chunk.entities) {
            const contracts = this.ecsWorld.getContracts(entityId);
            entities.push({ id: entityId, contracts });
        }
        const message = {
            type: 'chunk_data',
            chunkKey: chunk.key,
            entities,
            version: chunk.version,
            timestamp: Date.now(),
        };
        ws.send(JSON.stringify(message));
    }
    /**
     * Emit delta updates to all subscribers of a chunk
     */
    emitDelta(chunk, delta) {
        if (chunk.subscriptions.size === 0)
            return;
        const message = {
            type: 'chunk_delta',
            chunkKey: chunk.key,
            delta,
            version: chunk.version,
        };
        const messageStr = JSON.stringify(message);
        for (const [ws, subscription] of chunk.subscriptions) {
            if (ws.readyState === ws.OPEN) {
                ws.send(messageStr);
                subscription.lastUpdate = Date.now();
            }
        }
    }
    /**
     * Mark a chunk as modified and increment version
     */
    markChunkModified(chunk) {
        chunk.lastModified = Date.now();
        chunk.version++;
    }
    /**
     * Initialize solid grid for static collision data
     */
    initializeSolidGrid(chunk, resolution = 16) {
        const size = resolution * resolution * resolution;
        chunk.solidGrid = {
            width: resolution,
            height: resolution,
            depth: resolution,
            data: new Uint8Array(size),
        };
        // Notify dev visualizer about terrain grid initialization
        const keyStr = ChunkUtils.toString(chunk.key);
        this.devEvents?.publish({
            type: 'terrain_chunk',
            payload: {
                key: keyStr,
                grid: chunk.solidGrid,
            }
        });
    }
    /**
     * Set solid state at grid position
     */
    setSolid(chunk, x, y, z, solid) {
        if (!chunk.solidGrid)
            return;
        const { width, height, depth } = chunk.solidGrid;
        if (x < 0 || x >= width || y < 0 || y >= height || z < 0 || z >= depth)
            return;
        const index = x + y * width + z * width * height;
        chunk.solidGrid.data[index] = solid ? 1 : 0;
        this.markChunkModified(chunk);
        // Throttle-free lightweight event (single cell change)
        this.devEvents?.publish({
            type: 'terrain_cell',
            payload: {
                key: ChunkUtils.toString(chunk.key), x, y, z, solid
            }
        });
    }
    /**
     * Check if grid position is solid
     */
    isSolid(chunk, x, y, z) {
        if (!chunk.solidGrid)
            return false;
        const { width, height, depth } = chunk.solidGrid;
        if (x < 0 || x >= width || y < 0 || y >= height || z < 0 || z >= depth)
            return false;
        const index = x + y * width + z * width * height;
        return chunk.solidGrid.data[index] === 1;
    }
    /**
     * Generate content for a chunk (enhanced implementation)
     */
    generateChunkContent(chunk) {
        const { cx, cy, cz, layerId } = chunk.key;
        const layer = layerRegistry.getLayer(layerId);
        const chunkSize = layer?.chunkSize || 32;
        // Initialize solid grid for static collision
        this.initializeSolidGrid(chunk);
        // Only generate content in chunks at ground level (cy = 0)
        if (cy !== 0)
            return;
        // Generate a simple block every 4 chunks
        if (cx % 4 === 0 && cz % 4 === 0) {
            const entityId = `generated-block-${layerId}-${cx}-${cz}`;
            // Check if entity already exists
            if (this.ecsWorld.hasEntity(entityId))
                return;
            const worldPos = {
                x: cx * chunkSize + chunkSize / 2,
                y: 0,
                z: cz * chunkSize + chunkSize / 2,
            };
            this.ecsWorld.createEntity(entityId, [
                { type: 'identity', id: entityId, name: `Generated Block (${cx}, ${cz})`, description: 'A procedurally generated block' },
                { type: 'mobility', position: worldPos },
                { type: 'shape', bounds: { min: { x: -0.5, y: -0.5, z: -0.5 }, max: { x: 0.5, y: 0.5, z: 0.5 } }, geometry: 'box' },
                { type: 'visual', color: '#8B4513', visible: true },
                { type: 'solidity', solid: true },
            ]);
            chunk.entities.add(entityId);
            this.markChunkModified(chunk);
            // Set solid grid data for the block
            const gridRes = chunk.solidGrid?.width || 16;
            const gridX = Math.floor(gridRes / 2);
            const gridY = Math.floor(gridRes / 2);
            const gridZ = Math.floor(gridRes / 2);
            this.setSolid(chunk, gridX, gridY, gridZ, true);
        }
    }
    /**
     * Start the cleanup timer for unloading old chunks
     */
    startCleanupTimer() {
        this.cleanupInterval = setInterval(() => {
            this.cleanupOldChunks();
            this.cleanupInactiveSubscriptions();
        }, 30000);
        // Do not keep the event loop alive solely for this interval
        // This reduces the risk of tests or short-lived scripts hanging
        this.cleanupInterval.unref?.();
    }
    /**
     * Dispose timers to prevent leaks when managers are short-lived (tests, scripts)
     */
    dispose() {
        if (this.cleanupInterval) {
            clearInterval(this.cleanupInterval);
            this.cleanupInterval = undefined;
        }
    }
    /**
     * Unload chunks that haven't been accessed recently
     */
    cleanupOldChunks() {
        const now = Date.now();
        // 1) If over the loaded limit, unload the stalest loaded chunks
        if (this.loadedChunks.size > this.maxLoadedChunks) {
            const loadedEntries = [];
            for (const keyStr of this.loadedChunks) {
                const chunk = this.chunks.get(keyStr);
                if (chunk)
                    loadedEntries.push({ keyStr, lastAccessed: chunk.lastAccessed, key: chunk.key });
            }
            loadedEntries.sort((a, b) => a.lastAccessed - b.lastAccessed);
            const toUnload = this.loadedChunks.size - this.maxLoadedChunks + 100;
            const actualUnloadCount = Math.max(0, Math.min(toUnload, loadedEntries.length));
            for (let i = 0; i < actualUnloadCount; i++) {
                this.unloadChunk(loadedEntries[i].key);
            }
            if (actualUnloadCount > 0) {
                console.log(`🧹 Cleaned up ${actualUnloadCount} old chunks`);
            }
        }
        // 2) Evict fully inactive chunk metadata to cap memory usage
        // We remove chunks that are: not loaded, have no entities, no subscriptions, and are old
        if (this.chunks.size > this.maxRetainedChunks) {
            const candidates = [];
            for (const [keyStr, chunk] of this.chunks) {
                if (!chunk.loaded && chunk.entities.size === 0 && chunk.subscriptions.size === 0 && (now - chunk.lastAccessed) > this.chunkUnloadDelay * 2) {
                    candidates.push({ keyStr, lastAccessed: chunk.lastAccessed });
                }
            }
            candidates.sort((a, b) => a.lastAccessed - b.lastAccessed);
            const toDelete = this.chunks.size - this.maxRetainedChunks + 500; // free some headroom
            const actualDeleteCount = Math.max(0, Math.min(toDelete, candidates.length));
            for (let i = 0; i < actualDeleteCount; i++) {
                this.chunks.delete(candidates[i].keyStr);
            }
            if (actualDeleteCount > 0) {
                console.log(`🧽 Evicted ${actualDeleteCount} inactive chunks`);
            }
        }
    }
    /**
     * Get statistics about chunk usage
     */
    getStats() {
        let entitiesInChunks = 0;
        let totalSubscriptions = 0;
        for (const chunk of this.chunks.values()) {
            entitiesInChunks += chunk.entities.size;
            totalSubscriptions += chunk.subscriptions.size;
        }
        const averageEntitiesPerChunk = this.chunks.size > 0
            ? entitiesInChunks / this.chunks.size
            : 0;
        return {
            totalChunks: this.chunks.size,
            loadedChunks: this.loadedChunks.size,
            entitiesInChunks,
            totalSubscriptions,
            averageEntitiesPerChunk,
        };
    }
    /**
     * Get chunks that have active subscriptions
     */
    getActiveChunks() {
        const activeChunks = [];
        for (const chunk of this.chunks.values()) {
            if (chunk.subscriptions.size > 0) {
                activeChunks.push(chunk.key);
            }
        }
        return activeChunks;
    }
    /**
     * Expose loaded chunk grids for dev tooling
     */
    getLoadedChunkGrids() {
        const results = [];
        for (const keyStr of this.loadedChunks) {
            const chunk = this.chunks.get(keyStr);
            if (chunk && chunk.solidGrid) {
                results.push({ key: keyStr, grid: chunk.solidGrid });
            }
        }
        return results;
    }
    /**
     * Cleanup inactive subscriptions (closed WebSockets)
     */
    cleanupInactiveSubscriptions() {
        let cleanedCount = 0;
        for (const chunk of this.chunks.values()) {
            const toRemove = [];
            for (const [ws] of chunk.subscriptions) {
                if (ws.readyState !== ws.OPEN) {
                    toRemove.push(ws);
                }
            }
            for (const ws of toRemove) {
                chunk.subscriptions.delete(ws);
                cleanedCount++;
            }
        }
        if (cleanedCount > 0) {
            console.log(`🧹 Cleaned up ${cleanedCount} inactive chunk subscriptions`);
        }
    }
}
//# sourceMappingURL=chunks.js.map