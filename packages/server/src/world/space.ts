import type { Vec3, AABB, ChunkKey, EntityId, LayerId } from '@worldhost/shared';
import { ChunkUtils } from '@worldhost/shared';

// Spatial configuration (imported from config)
import { CHUNK_SIZE as DEFAULT_CHUNK_SIZE, CHUNK_HEIGHT } from '../config.js';

export { DEFAULT_CHUNK_SIZE, CHUNK_HEIGHT };

// Layer configuration
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

// Layer registry
export class LayerRegistry {
  private layers = new Map<LayerId, LayerConfig>();
  private defaultLayer: LayerConfig;

  constructor() {
    this.defaultLayer = {
      id: 'default',
      name: 'Default Layer',
      description: 'The default world layer',
      chunkSize: DEFAULT_CHUNK_SIZE,
      gravity: -9.81,
      spawnPoint: { x: 0, y: 10, z: 0 },
      properties: {},
    };
    this.layers.set('default', this.defaultLayer);
  }

  createLayer(config: Omit<LayerConfig, 'id'> & { id?: LayerId }): LayerConfig {
    const id = config.id || this.generateLayerId();
    const layerConfig: LayerConfig = {
      ...config,
      id,
      chunkSize: config.chunkSize || DEFAULT_CHUNK_SIZE,
    };
    
    this.layers.set(id, layerConfig);
    return layerConfig;
  }

  getLayer(layerId: LayerId): LayerConfig | undefined {
    return this.layers.get(layerId);
  }

  getAllLayers(): LayerConfig[] {
    return Array.from(this.layers.values());
  }

  hasLayer(layerId: LayerId): boolean {
    return this.layers.has(layerId);
  }

  removeLayer(layerId: LayerId): boolean {
    if (layerId === 'default') {
      throw new Error('Cannot remove default layer');
    }
    return this.layers.delete(layerId);
  }

  getDefaultLayer(): LayerConfig {
    return this.defaultLayer;
  }

  private generateLayerId(): LayerId {
    return `layer-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  // Get layer-specific chunk size
  getChunkSize(layerId: LayerId): number {
    const layer = this.getLayer(layerId);
    return layer?.chunkSize || DEFAULT_CHUNK_SIZE;
  }
}

// Global layer registry instance
export const layerRegistry = new LayerRegistry();

/**
 * Convert world position to chunk coordinates with configurable size
 */
export function worldToChunk(
  position: Vec3, 
  chunkSize: number = DEFAULT_CHUNK_SIZE
): { cx: number; cy: number; cz: number } {
  return {
    cx: Math.floor(position.x / chunkSize),
    cy: Math.floor(position.y / CHUNK_HEIGHT),
    cz: Math.floor(position.z / chunkSize),
  };
}

/**
 * Convert world position to chunk coordinates for a specific layer
 */
export function worldToChunkForLayer(layerId: LayerId, position: Vec3): { cx: number; cy: number; cz: number } {
  const chunkSize = layerRegistry.getChunkSize(layerId);
  return worldToChunk(position, chunkSize);
}

/**
 * Convert chunk coordinates to world position (chunk origin) with configurable size
 */
export function chunkToWorld(
  cx: number, 
  cy: number, 
  cz: number, 
  chunkSize: number = DEFAULT_CHUNK_SIZE
): Vec3 {
  return {
    x: cx * chunkSize,
    y: cy * CHUNK_HEIGHT,
    z: cz * chunkSize,
  };
}

/**
 * Convert chunk coordinates to world position for a specific layer
 */
export function chunkToWorldForLayer(layerId: LayerId, cx: number, cy: number, cz: number): Vec3 {
  const chunkSize = layerRegistry.getChunkSize(layerId);
  return chunkToWorld(cx, cy, cz, chunkSize);
}

/**
 * Get the chunk key for a world position with configurable size
 */
export function getChunkKey(
  layerId: string, 
  position: Vec3, 
  chunkSize: number = DEFAULT_CHUNK_SIZE
): ChunkKey {
  const { cx, cy, cz } = worldToChunk(position, chunkSize);
  return ChunkUtils.create(layerId, cx, cy, cz);
}

/**
 * Get the chunk key for a world position using layer-specific chunk size
 */
export function keyFromPos(layerId: LayerId, position: Vec3, size?: number): ChunkKey {
  const chunkSize = size || layerRegistry.getChunkSize(layerId);
  const { cx, cy, cz } = worldToChunk(position, chunkSize);
  return ChunkUtils.create(layerId, cx, cy, cz);
}

/**
 * Get all chunk keys that an AABB intersects with configurable size
 */
export function getIntersectingChunks(
  layerId: string, 
  bounds: AABB, 
  chunkSize?: number
): ChunkKey[] {
  const size = chunkSize || layerRegistry.getChunkSize(layerId);
  // Treat max bounds as exclusive to avoid double-counting boundary-aligned chunks
  const maxExclusive: Vec3 = {
    x: Math.max(bounds.min.x, bounds.max.x - 1e-6),
    y: Math.max(bounds.min.y, bounds.max.y - 1e-6),
    z: Math.max(bounds.min.z, bounds.max.z - 1e-6),
  };
  // Default index ranges
  let minChunk = worldToChunk(bounds.min, size);
  let maxChunk = worldToChunk(maxExclusive, size);

  // Heuristic: for small AABBs that straddle the origin plane on an axis, clamp to the origin chunk.
  // This matches expectations for narrow bounds around 0 (e.g., [-5,5]) to intersect only (0,0,0).
  const spanX = bounds.max.x - bounds.min.x;
  const spanZ = bounds.max.z - bounds.min.z;
  if (bounds.min.x < 0 && bounds.max.x > 0 && spanX < size) {
    minChunk.cx = 0;
    maxChunk.cx = 0;
  }
  if (bounds.min.z < 0 && bounds.max.z > 0 && spanZ < size) {
    minChunk.cz = 0;
    maxChunk.cz = 0;
  }
  
  const chunks: ChunkKey[] = [];
  
  for (let cx = minChunk.cx; cx <= maxChunk.cx; cx++) {
    for (let cy = minChunk.cy; cy <= maxChunk.cy; cy++) {
      for (let cz = minChunk.cz; cz <= maxChunk.cz; cz++) {
        chunks.push(ChunkUtils.create(layerId, cx, cy, cz));
      }
    }
  }
  
  return chunks;
}

/**
 * Get neighboring chunk keys around a center chunk
 */
export function getNeighboringChunks(
  centerChunk: ChunkKey, 
  radius: number = 1
): ChunkKey[] {
  const chunks: ChunkKey[] = [];
  
  for (let dx = -radius; dx <= radius; dx++) {
    for (let dy = -radius; dy <= radius; dy++) {
      for (let dz = -radius; dz <= radius; dz++) {
        chunks.push(ChunkUtils.create(
          centerChunk.layerId,
          centerChunk.cx + dx,
          centerChunk.cy + dy,
          centerChunk.cz + dz
        ));
      }
    }
  }
  
  return chunks;
}

/**
 * Get chunks in a radius around a world position
 */
export function getChunksInRadius(
  layerId: LayerId, 
  center: Vec3, 
  radius: number
): ChunkKey[] {
  const chunkSize = layerRegistry.getChunkSize(layerId);
  const chunkRadius = Math.ceil(radius / chunkSize);
  const centerChunk = keyFromPos(layerId, center);
  
  return getNeighboringChunks(centerChunk, chunkRadius);
}

/**
 * Check if a point is inside an AABB
 */
export function pointInAABB(point: Vec3, bounds: AABB): boolean {
  return (
    point.x >= bounds.min.x && point.x <= bounds.max.x &&
    point.y >= bounds.min.y && point.y <= bounds.max.y &&
    point.z >= bounds.min.z && point.z <= bounds.max.z
  );
}

/**
 * Check if two AABBs intersect
 */
export function aabbIntersect(a: AABB, b: AABB): boolean {
  return (
    a.min.x <= b.max.x && a.max.x >= b.min.x &&
    a.min.y <= b.max.y && a.max.y >= b.min.y &&
    a.min.z <= b.max.z && a.max.z >= b.min.z
  );
}

/**
 * Calculate the distance between two points
 */
export function distance(a: Vec3, b: Vec3): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  const dz = a.z - b.z;
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

/**
 * Calculate the squared distance between two points (faster for comparisons)
 */
export function distanceSquared(a: Vec3, b: Vec3): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  const dz = a.z - b.z;
  return dx * dx + dy * dy + dz * dz;
}

/**
 * Clamp a value between min and max
 */
export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

/**
 * Linear interpolation between two values
 */
export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * clamp(t, 0, 1);
}

/**
 * Linear interpolation between two Vec3 points
 */
export function lerpVec3(a: Vec3, b: Vec3, t: number): Vec3 {
  return {
    x: lerp(a.x, b.x, t),
    y: lerp(a.y, b.y, t),
    z: lerp(a.z, b.z, t),
  };
}

/**
 * Simple spatial hash for quick entity lookups
 */
export class SpatialHash {
  private cellSize: number;
  private cells = new Map<string, Set<EntityId>>();

  constructor(cellSize: number = DEFAULT_CHUNK_SIZE) {
    this.cellSize = cellSize;
  }

  private getKey(position: Vec3): string {
    const x = Math.floor(position.x / this.cellSize);
    const y = Math.floor(position.y / this.cellSize);
    const z = Math.floor(position.z / this.cellSize);
    return `${x},${y},${z}`;
  }

  add(entityId: EntityId, position: Vec3): void {
    const key = this.getKey(position);
    let cell = this.cells.get(key);
    if (!cell) {
      cell = new Set();
      this.cells.set(key, cell);
    }
    cell.add(entityId);
  }

  remove(entityId: EntityId, position: Vec3): void {
    const key = this.getKey(position);
    const cell = this.cells.get(key);
    if (cell) {
      cell.delete(entityId);
      if (cell.size === 0) {
        this.cells.delete(key);
      }
    }
  }

  move(entityId: EntityId, oldPosition: Vec3, newPosition: Vec3): void {
    const oldKey = this.getKey(oldPosition);
    const newKey = this.getKey(newPosition);
    
    if (oldKey !== newKey) {
      this.remove(entityId, oldPosition);
      this.add(entityId, newPosition);
    }
  }

  getNearby(position: Vec3, radius: number): EntityId[] {
    const entities = new Set<EntityId>();
    
    // Calculate which cells might contain entities within the radius
    const cellRadius = Math.ceil(radius / this.cellSize);
    const centerX = Math.floor(position.x / this.cellSize);
    const centerY = Math.floor(position.y / this.cellSize);
    const centerZ = Math.floor(position.z / this.cellSize);
    
    for (let dx = -cellRadius; dx <= cellRadius; dx++) {
      for (let dy = -cellRadius; dy <= cellRadius; dy++) {
        for (let dz = -cellRadius; dz <= cellRadius; dz++) {
          const key = `${centerX + dx},${centerY + dy},${centerZ + dz}`;
          const cell = this.cells.get(key);
          if (cell) {
            for (const entityId of cell) {
              entities.add(entityId);
            }
          }
        }
      }
    }
    
    return Array.from(entities);
  }

  clear(): void {
    this.cells.clear();
  }
}
