import { describe, it, expect, beforeEach } from 'vitest';
import { createECSWorld } from '../src/world/ecs.js';
import { ChunkManager } from '../src/world/chunks.js';
import { BasicMovementSystem } from '../src/world/systems/movement.js';
import type { ECSWorld } from '../src/world/ecs.js';
import type { Vec3, Mobility, Shape, Solidity } from '@worldhost/shared';

describe('Collision System', () => {
  let ecsWorld: ECSWorld;
  let chunkManager: ChunkManager;
  let movementSystem: BasicMovementSystem;

  beforeEach(() => {
    ecsWorld = createECSWorld();
    chunkManager = new ChunkManager(ecsWorld);
    movementSystem = new BasicMovementSystem(ecsWorld, chunkManager);
  });

  describe('Basic Collision Detection', () => {
    it('should allow movement in empty space', () => {
      // Create a mobile entity
      const entityId = 'test-entity';
      ecsWorld.createEntity(entityId, [
        {
          type: 'mobility',
          position: { x: 0, y: 0, z: 0 },
          maxSpeed: 5,
        } satisfies Mobility,
        {
          type: 'shape',
          bounds: {
            min: { x: -0.5, y: -0.5, z: -0.5 },
            max: { x: 0.5, y: 0.5, z: 0.5 },
          },
          geometry: 'box',
        } satisfies Shape,
      ]);

      // Attempt to move to an empty location
      const result = movementSystem.attemptMove(entityId, { x: 5, y: 0, z: 0 }, 0.1);
      
      expect(result.ok).toBe(true);
      expect(result.position.x).toBeCloseTo(0.5); // Limited by maxSpeed * deltaTime
      expect(result.position.y).toBe(0);
      expect(result.position.z).toBe(0);
    });

    it('should block movement into solid entities', () => {
      // Create a mobile entity
      const mobileId = 'mobile-entity';
      ecsWorld.createEntity(mobileId, [
        {
          type: 'mobility',
          position: { x: 0, y: 0, z: 0 },
          maxSpeed: 10,
        } satisfies Mobility,
        {
          type: 'shape',
          bounds: {
            min: { x: -0.5, y: -0.5, z: -0.5 },
            max: { x: 0.5, y: 0.5, z: 0.5 },
          },
          geometry: 'box',
        } satisfies Shape,
      ]);

      // Create a solid obstacle
      const obstacleId = 'obstacle';
      ecsWorld.createEntity(obstacleId, [
        {
          type: 'mobility',
          position: { x: 2, y: 0, z: 0 },
        } satisfies Mobility,
        {
          type: 'shape',
          bounds: {
            min: { x: -0.5, y: -0.5, z: -0.5 },
            max: { x: 0.5, y: 0.5, z: 0.5 },
          },
          geometry: 'box',
        } satisfies Shape,
        {
          type: 'solidity',
          solid: true,
        } satisfies Solidity,
      ]);

      // Attempt to move into the obstacle
      const result = movementSystem.attemptMove(mobileId, { x: 3, y: 0, z: 0 }, 0.5);
      
      expect(result.ok).toBe(false);
      expect(result.blockedReason).toContain('entity');
      expect(result.position.x).toBeLessThan(2); // Should be stopped before collision
    });

    it('should allow movement around non-solid entities', () => {
      // Create a mobile entity
      const mobileId = 'mobile-entity';
      ecsWorld.createEntity(mobileId, [
        {
          type: 'mobility',
          position: { x: 0, y: 0, z: 0 },
          maxSpeed: 5,
        } satisfies Mobility,
        {
          type: 'shape',
          bounds: {
            min: { x: -0.25, y: -0.25, z: -0.25 },
            max: { x: 0.25, y: 0.25, z: 0.25 },
          },
          geometry: 'box',
        } satisfies Shape,
      ]);

      // Create a non-solid entity
      const nonSolidId = 'non-solid';
      ecsWorld.createEntity(nonSolidId, [
        {
          type: 'mobility',
          position: { x: 2, y: 0, z: 0 },
        } satisfies Mobility,
        {
          type: 'shape',
          bounds: {
            min: { x: -0.25, y: -0.25, z: -0.25 },
            max: { x: 0.25, y: 0.25, z: 0.25 },
          },
          geometry: 'box',
        } satisfies Shape,
        {
          type: 'solidity',
          solid: false, // Not solid
        } satisfies Solidity,
      ]);

      // Attempt to move through the non-solid entity
      const result = movementSystem.attemptMove(mobileId, { x: 3, y: 0, z: 0 }, 1.0);
      
      expect(result.ok).toBe(true);
      expect(result.position.x).toBeGreaterThan(2); // Should pass through
    });
  });

  describe('Movement Speed Limits', () => {
    it('should respect maxSpeed limits', () => {
      const entityId = 'speed-test';
      ecsWorld.createEntity(entityId, [
        {
          type: 'mobility',
          position: { x: 0, y: 0, z: 0 },
          maxSpeed: 2, // Very slow
        } satisfies Mobility,
        {
          type: 'shape',
          bounds: {
            min: { x: -0.1, y: -0.1, z: -0.1 },
            max: { x: 0.1, y: 0.1, z: 0.1 },
          },
          geometry: 'box',
        } satisfies Shape,
      ]);

      // Try to move a long distance in a short time
      const result = movementSystem.attemptMove(entityId, { x: 100, y: 0, z: 0 }, 0.1);
      
      expect(result.ok).toBe(true);
      expect(result.position.x).toBeCloseTo(0.2); // maxSpeed * deltaTime = 2 * 0.1
      expect(result.position.x).toBeLessThan(1); // Much less than requested distance
    });

    it('should handle zero deltaTime gracefully', () => {
      const entityId = 'zero-time-test';
      ecsWorld.createEntity(entityId, [
        {
          type: 'mobility',
          position: { x: 0, y: 0, z: 0 },
          maxSpeed: 5,
        } satisfies Mobility,
        {
          type: 'shape',
          bounds: {
            min: { x: -0.1, y: -0.1, z: -0.1 },
            max: { x: 0.1, y: 0.1, z: 0.1 },
          },
          geometry: 'box',
        } satisfies Shape,
      ]);

      const result = movementSystem.attemptMove(entityId, { x: 5, y: 0, z: 0 }, 0);
      
      expect(result.ok).toBe(true);
      expect(result.position.x).toBe(0); // No movement with zero time
    });
  });

  describe('Entity Requirements', () => {
    it('should fail for entities without mobility', () => {
      const entityId = 'no-mobility';
      ecsWorld.createEntity(entityId, [
        {
          type: 'shape',
          bounds: {
            min: { x: -0.5, y: -0.5, z: -0.5 },
            max: { x: 0.5, y: 0.5, z: 0.5 },
          },
          geometry: 'box',
        } satisfies Shape,
      ]);

      const result = movementSystem.attemptMove(entityId, { x: 1, y: 0, z: 0 }, 0.1);
      
      expect(result.ok).toBe(false);
      expect(result.blockedReason).toContain('mobility');
    });

    it('should fail for entities without shape', () => {
      const entityId = 'no-shape';
      ecsWorld.createEntity(entityId, [
        {
          type: 'mobility',
          position: { x: 0, y: 0, z: 0 },
          maxSpeed: 5,
        } satisfies Mobility,
      ]);

      const result = movementSystem.attemptMove(entityId, { x: 1, y: 0, z: 0 }, 0.1);
      
      expect(result.ok).toBe(false);
      expect(result.blockedReason).toContain('shape');
    });
  });

  describe('Collision Response', () => {
    it('should provide collision normal for blocked movement', () => {
      // Create mobile entity
      const mobileId = 'mobile';
      ecsWorld.createEntity(mobileId, [
        {
          type: 'mobility',
          position: { x: 0, y: 0, z: 0 },
          maxSpeed: 10,
        } satisfies Mobility,
        {
          type: 'shape',
          bounds: {
            min: { x: -0.25, y: -0.25, z: -0.25 },
            max: { x: 0.25, y: 0.25, z: 0.25 },
          },
          geometry: 'box',
        } satisfies Shape,
      ]);

      // Create wall
      const wallId = 'wall';
      ecsWorld.createEntity(wallId, [
        {
          type: 'mobility',
          position: { x: 1, y: 0, z: 0 },
        } satisfies Mobility,
        {
          type: 'shape',
          bounds: {
            min: { x: -0.25, y: -0.25, z: -0.25 },
            max: { x: 0.25, y: 0.25, z: 0.25 },
          },
          geometry: 'box',
        } satisfies Shape,
        {
          type: 'solidity',
          solid: true,
        } satisfies Solidity,
      ]);

      const result = movementSystem.attemptMove(mobileId, { x: 2, y: 0, z: 0 }, 0.5);
      
      expect(result.ok).toBe(false);
      expect(result.collisionNormal).toBeDefined();
      if (result.collisionNormal) {
        // Normal should point away from the wall (negative X direction)
        expect(result.collisionNormal.x).toBeLessThan(0);
      }
    });
  });

  describe('Legacy checkCollision method', () => {
    it('should work as a simple collision check', () => {
      const entityId = 'test-entity';
      ecsWorld.createEntity(entityId, [
        {
          type: 'mobility',
          position: { x: 0, y: 0, z: 0 },
        } satisfies Mobility,
        {
          type: 'shape',
          bounds: {
            min: { x: -0.5, y: -0.5, z: -0.5 },
            max: { x: 0.5, y: 0.5, z: 0.5 },
          },
          geometry: 'box',
        } satisfies Shape,
      ]);

      // Check collision at current position (should be false)
      expect(movementSystem.checkCollision(entityId, { x: 0, y: 0, z: 0 })).toBe(false);
      
      // Check collision at a nearby empty position (should be false)
      expect(movementSystem.checkCollision(entityId, { x: 2, y: 0, z: 0 })).toBe(false);
    });
  });
});
