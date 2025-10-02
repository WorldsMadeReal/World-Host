import type { ChunkKey, EntityId, LayerId, Vec3 } from '@worldhost/shared';
import type { ECSWorld } from './ecs.js';
import type { WebSocket } from 'ws';
export interface SolidGrid {
    width: number;
    height: number;
    depth: number;
    data: Uint8Array;
}
export interface ChunkSubscription {
    ws: WebSocket;
    playerId?: EntityId;
    lastUpdate: number;
}
export interface ChunkData {
    key: ChunkKey;
    entities: Set<EntityId>;
    loaded: boolean;
    lastAccessed: number;
    solidGrid?: SolidGrid;
    subscriptions: Map<WebSocket, ChunkSubscription>;
    lastModified: number;
    version: number;
}
/**
 * Manages chunk loading, unloading, and entity tracking
 */
export declare class ChunkManager {
    private chunks;
    private ecsWorld;
    private loadedChunks;
    private cleanupInterval?;
    private devEvents?;
    private readonly maxLoadedChunks;
    private readonly chunkUnloadDelay;
    private readonly maxRetainedChunks;
    constructor(ecsWorld: ECSWorld, devEvents?: {
        publish: (ev: {
            type: string;
            payload?: any;
            ts?: number;
        }) => void;
    });
    /**
     * Get chunk key from world position with layer-specific chunk size
     */
    keyFromPos(layerId: LayerId, position: Vec3, size?: number): ChunkKey;
    /**
     * Get or create chunk data
     */
    getChunk(chunkKey: ChunkKey): ChunkData;
    /**
     * Load a chunk (generate entities if needed)
     */
    loadChunk(chunkKey: ChunkKey): ChunkData;
    /**
     * Unload a chunk (remove from memory but keep entities in ECS)
     */
    unloadChunk(chunkKey: ChunkKey): boolean;
    /**
     * Add an entity to a chunk
     */
    addEntityToChunk(entityId: EntityId, chunkKey: ChunkKey): void;
    /**
     * Remove an entity from a chunk
     */
    removeEntityFromChunk(entityId: EntityId, chunkKey: ChunkKey): void;
    /**
     * Move an entity from one chunk to another
     */
    moveEntityBetweenChunks(entityId: EntityId, fromChunk: ChunkKey, toChunk: ChunkKey): void;
    /**
     * Get all entities in a chunk
     */
    getEntitiesInChunk(chunkKey: ChunkKey): EntityId[];
    /**
     * Get all loaded chunks
     */
    getLoadedChunks(): ChunkKey[];
    /**
     * Check if a chunk is loaded
     */
    isChunkLoaded(chunkKey: ChunkKey): boolean;
    /**
     * Subscribe a WebSocket to chunk updates
     */
    subscribe(ws: WebSocket, chunkKey: ChunkKey, playerId?: EntityId): void;
    /**
     * Unsubscribe a WebSocket from chunk updates
     */
    unsubscribe(ws: WebSocket, chunkKey: ChunkKey): void;
    /**
     * Unsubscribe a WebSocket from all chunks
     */
    unsubscribeFromAll(ws: WebSocket): void;
    /**
     * Emit a complete chunk snapshot to a specific WebSocket
     */
    emitSnapshot(chunk: ChunkData, ws: WebSocket): void;
    /**
     * Emit delta updates to all subscribers of a chunk
     */
    emitDelta(chunk: ChunkData, delta: {
        type: 'entity_add' | 'entity_remove' | 'entity_update';
        entityId: EntityId;
        contracts?: any[];
        timestamp: number;
    }): void;
    /**
     * Mark a chunk as modified and increment version
     */
    private markChunkModified;
    /**
     * Initialize solid grid for static collision data
     */
    initializeSolidGrid(chunk: ChunkData, resolution?: number): void;
    /**
     * Set solid state at grid position
     */
    setSolid(chunk: ChunkData, x: number, y: number, z: number, solid: boolean): void;
    /**
     * Check if grid position is solid
     */
    isSolid(chunk: ChunkData, x: number, y: number, z: number): boolean;
    /**
     * Generate content for a chunk (enhanced implementation)
     */
    private generateChunkContent;
    /**
     * Start the cleanup timer for unloading old chunks
     */
    private startCleanupTimer;
    /**
     * Dispose timers to prevent leaks when managers are short-lived (tests, scripts)
     */
    dispose(): void;
    /**
     * Unload chunks that haven't been accessed recently
     */
    private cleanupOldChunks;
    /**
     * Get statistics about chunk usage
     */
    getStats(): {
        totalChunks: number;
        loadedChunks: number;
        entitiesInChunks: number;
        totalSubscriptions: number;
        averageEntitiesPerChunk: number;
    };
    /**
     * Get chunks that have active subscriptions
     */
    getActiveChunks(): ChunkKey[];
    /**
     * Expose loaded chunk grids for dev tooling
     */
    getLoadedChunkGrids(): Array<{
        key: string;
        grid: SolidGrid;
    }>;
    /**
     * Cleanup inactive subscriptions (closed WebSockets)
     */
    cleanupInactiveSubscriptions(): void;
}
//# sourceMappingURL=chunks.d.ts.map