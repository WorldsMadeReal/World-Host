import { describe, it, expect } from 'vitest';
import { 
  worldToChunk, 
  chunkToWorld, 
  keyFromPos, 
  getIntersectingChunks,
  getNeighboringChunks,
  layerRegistry 
} from '../src/world/space.js';
import { ChunkUtils } from '@worldhost/shared';

describe('Chunk Math', () => {
  describe('worldToChunk', () => {
    it('should convert world positions to chunk coordinates', () => {
      // Default chunk size (32)
      expect(worldToChunk({ x: 0, y: 0, z: 0 })).toEqual({ cx: 0, cy: 0, cz: 0 });
      expect(worldToChunk({ x: 31, y: 255, z: 31 })).toEqual({ cx: 0, cy: 0, cz: 0 });
      expect(worldToChunk({ x: 32, y: 256, z: 32 })).toEqual({ cx: 1, cy: 1, cz: 1 });
      expect(worldToChunk({ x: -1, y: -1, z: -1 })).toEqual({ cx: -1, cy: -1, cz: -1 });
      
      // Custom chunk size
      expect(worldToChunk({ x: 15, y: 0, z: 15 }, 16)).toEqual({ cx: 0, cy: 0, cz: 0 });
      expect(worldToChunk({ x: 16, y: 0, z: 16 }, 16)).toEqual({ cx: 1, cy: 0, cz: 1 });
    });

    it('should handle negative coordinates correctly', () => {
      expect(worldToChunk({ x: -32, y: -256, z: -32 })).toEqual({ cx: -1, cy: -1, cz: -1 });
      expect(worldToChunk({ x: -33, y: -257, z: -33 })).toEqual({ cx: -2, cy: -2, cz: -2 });
    });
  });

  describe('chunkToWorld', () => {
    it('should convert chunk coordinates to world positions', () => {
      // Default chunk size (32)
      expect(chunkToWorld(0, 0, 0)).toEqual({ x: 0, y: 0, z: 0 });
      expect(chunkToWorld(1, 1, 1)).toEqual({ x: 32, y: 256, z: 32 });
      expect(chunkToWorld(-1, -1, -1)).toEqual({ x: -32, y: -256, z: -32 });
      
      // Custom chunk size
      expect(chunkToWorld(1, 0, 1, 16)).toEqual({ x: 16, y: 0, z: 16 });
    });
  });

  describe('keyFromPos', () => {
    it('should generate chunk keys from world positions', () => {
      const key1 = keyFromPos('default', { x: 0, y: 0, z: 0 });
      expect(key1).toEqual({ layerId: 'default', cx: 0, cy: 0, cz: 0 });

      const key2 = keyFromPos('test-layer', { x: 50, y: 300, z: 75 });
      expect(key2).toEqual({ layerId: 'test-layer', cx: 1, cy: 1, cz: 2 });
    });

    it('should use layer-specific chunk sizes', () => {
      // Create a test layer with custom chunk size
      layerRegistry.createLayer({
        name: 'Small Chunks',
        chunkSize: 8,
        gravity: -9.81,
        spawnPoint: { x: 0, y: 0, z: 0 },
        properties: {},
      });

      const layers = layerRegistry.getAllLayers();
      const smallChunkLayer = layers.find(l => l.name === 'Small Chunks');
      
      if (smallChunkLayer) {
        const key = keyFromPos(smallChunkLayer.id, { x: 15, y: 0, z: 15 });
        expect(key.cx).toBe(1); // 15 / 8 = 1.875, floor = 1
        expect(key.cz).toBe(1);
      }
    });
  });

  describe('getIntersectingChunks', () => {
    it('should find chunks that an AABB intersects', () => {
      const bounds = {
        min: { x: -5, y: 0, z: -5 },
        max: { x: 5, y: 10, z: 5 }
      };

      const chunks = getIntersectingChunks('test', bounds);
      
      // Should only intersect the origin chunk (0,0,0)
      expect(chunks).toHaveLength(1);
      expect(chunks[0]).toEqual({ layerId: 'test', cx: 0, cy: 0, cz: 0 });
    });

    it('should find multiple chunks for large AABB', () => {
      const bounds = {
        min: { x: 0, y: 0, z: 0 },
        max: { x: 64, y: 10, z: 64 }
      };

      const chunks = getIntersectingChunks('test', bounds);
      
      // Should intersect 4 chunks: (0,0,0), (1,0,0), (0,0,1), (1,0,1)
      expect(chunks).toHaveLength(4);
      expect(chunks).toContainEqual({ layerId: 'test', cx: 0, cy: 0, cz: 0 });
      expect(chunks).toContainEqual({ layerId: 'test', cx: 1, cy: 0, cz: 0 });
      expect(chunks).toContainEqual({ layerId: 'test', cx: 0, cy: 0, cz: 1 });
      expect(chunks).toContainEqual({ layerId: 'test', cx: 1, cy: 0, cz: 1 });
    });
  });

  describe('getNeighboringChunks', () => {
    it('should get neighboring chunks with radius 1', () => {
      const centerChunk = { layerId: 'test', cx: 0, cy: 0, cz: 0 };
      const neighbors = getNeighboringChunks(centerChunk, 1);
      
      // Should have 3x3x3 = 27 chunks (including center)
      expect(neighbors).toHaveLength(27);
      expect(neighbors).toContainEqual({ layerId: 'test', cx: 0, cy: 0, cz: 0 }); // center
      expect(neighbors).toContainEqual({ layerId: 'test', cx: -1, cy: -1, cz: -1 }); // corner
      expect(neighbors).toContainEqual({ layerId: 'test', cx: 1, cy: 1, cz: 1 }); // opposite corner
    });

    it('should get only center chunk with radius 0', () => {
      const centerChunk = { layerId: 'test', cx: 5, cy: 2, cz: -3 };
      const neighbors = getNeighboringChunks(centerChunk, 0);
      
      expect(neighbors).toHaveLength(1);
      expect(neighbors[0]).toEqual(centerChunk);
    });
  });

  describe('ChunkUtils', () => {
    it('should convert chunk keys to strings and back', () => {
      const key = { layerId: 'test-layer', cx: -5, cy: 10, cz: 3 };
      const keyStr = ChunkUtils.toString(key);
      const parsedKey = ChunkUtils.fromString(keyStr);
      
      expect(parsedKey).toEqual(key);
    });

    it('should handle invalid chunk key strings', () => {
      expect(ChunkUtils.fromString('invalid')).toBeNull();
      expect(ChunkUtils.fromString('layer:invalid,coords')).toBeNull();
      expect(ChunkUtils.fromString('')).toBeNull();
    });

    it('should compare chunk keys correctly', () => {
      const key1 = { layerId: 'test', cx: 1, cy: 2, cz: 3 };
      const key2 = { layerId: 'test', cx: 1, cy: 2, cz: 3 };
      const key3 = { layerId: 'test', cx: 1, cy: 2, cz: 4 };
      const key4 = { layerId: 'other', cx: 1, cy: 2, cz: 3 };
      
      expect(ChunkUtils.equals(key1, key2)).toBe(true);
      expect(ChunkUtils.equals(key1, key3)).toBe(false);
      expect(ChunkUtils.equals(key1, key4)).toBe(false);
    });
  });
});
