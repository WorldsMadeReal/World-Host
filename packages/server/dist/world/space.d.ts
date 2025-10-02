import type { Vec3, AABB, ChunkKey, EntityId, LayerId } from '@worldhost/shared';
import { CHUNK_SIZE as DEFAULT_CHUNK_SIZE, CHUNK_HEIGHT } from '../config.js';
export { DEFAULT_CHUNK_SIZE, CHUNK_HEIGHT };
export interface LayerConfig {
    id: LayerId;
    name: string;
    description?: string;
    chunkSize: number;
    gravity: number;
    spawnPoint: Vec3;
    boundaries?: AABB;
    properties: Record<string, any>;
}
export declare class LayerRegistry {
    private layers;
    private defaultLayer;
    constructor();
    createLayer(config: Omit<LayerConfig, 'id'> & {
        id?: LayerId;
    }): LayerConfig;
    getLayer(layerId: LayerId): LayerConfig | undefined;
    getAllLayers(): LayerConfig[];
    hasLayer(layerId: LayerId): boolean;
    removeLayer(layerId: LayerId): boolean;
    getDefaultLayer(): LayerConfig;
    private generateLayerId;
    getChunkSize(layerId: LayerId): number;
}
export declare const layerRegistry: LayerRegistry;
/**
 * Convert world position to chunk coordinates with configurable size
 */
export declare function worldToChunk(position: Vec3, chunkSize?: number): {
    cx: number;
    cy: number;
    cz: number;
};
/**
 * Convert world position to chunk coordinates for a specific layer
 */
export declare function worldToChunkForLayer(layerId: LayerId, position: Vec3): {
    cx: number;
    cy: number;
    cz: number;
};
/**
 * Convert chunk coordinates to world position (chunk origin) with configurable size
 */
export declare function chunkToWorld(cx: number, cy: number, cz: number, chunkSize?: number): Vec3;
/**
 * Convert chunk coordinates to world position for a specific layer
 */
export declare function chunkToWorldForLayer(layerId: LayerId, cx: number, cy: number, cz: number): Vec3;
/**
 * Get the chunk key for a world position with configurable size
 */
export declare function getChunkKey(layerId: string, position: Vec3, chunkSize?: number): ChunkKey;
/**
 * Get the chunk key for a world position using layer-specific chunk size
 */
export declare function keyFromPos(layerId: LayerId, position: Vec3, size?: number): ChunkKey;
/**
 * Get all chunk keys that an AABB intersects with configurable size
 */
export declare function getIntersectingChunks(layerId: string, bounds: AABB, chunkSize?: number): ChunkKey[];
/**
 * Get neighboring chunk keys around a center chunk
 */
export declare function getNeighboringChunks(centerChunk: ChunkKey, radius?: number): ChunkKey[];
/**
 * Get chunks in a radius around a world position
 */
export declare function getChunksInRadius(layerId: LayerId, center: Vec3, radius: number): ChunkKey[];
/**
 * Check if a point is inside an AABB
 */
export declare function pointInAABB(point: Vec3, bounds: AABB): boolean;
/**
 * Check if two AABBs intersect
 */
export declare function aabbIntersect(a: AABB, b: AABB): boolean;
/**
 * Calculate the distance between two points
 */
export declare function distance(a: Vec3, b: Vec3): number;
/**
 * Calculate the squared distance between two points (faster for comparisons)
 */
export declare function distanceSquared(a: Vec3, b: Vec3): number;
/**
 * Clamp a value between min and max
 */
export declare function clamp(value: number, min: number, max: number): number;
/**
 * Linear interpolation between two values
 */
export declare function lerp(a: number, b: number, t: number): number;
/**
 * Linear interpolation between two Vec3 points
 */
export declare function lerpVec3(a: Vec3, b: Vec3, t: number): Vec3;
/**
 * Simple spatial hash for quick entity lookups
 */
export declare class SpatialHash {
    private cellSize;
    private cells;
    constructor(cellSize?: number);
    private getKey;
    add(entityId: EntityId, position: Vec3): void;
    remove(entityId: EntityId, position: Vec3): void;
    move(entityId: EntityId, oldPosition: Vec3, newPosition: Vec3): void;
    getNearby(position: Vec3, radius: number): EntityId[];
    clear(): void;
}
//# sourceMappingURL=space.d.ts.map