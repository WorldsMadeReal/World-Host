import { describe, it, expect, beforeEach } from 'vitest';
import { createECSWorld } from '../src/world/ecs.js';
import type { ECSWorld } from '../src/world/ecs.js';
import type { Entrance, Mobility, Shape, Identity } from '@worldhost/shared';

describe('Entrance System', () => {
  let ecsWorld: ECSWorld;

  beforeEach(() => {
    ecsWorld = createECSWorld();
  });

  describe('Entrance Contract', () => {
    it('should create entities with entrance contracts', () => {
      const doorId = 'test-door';
      const entrance: Entrance = {
        type: 'entrance',
        targetLayerId: 'nether',
        targetPosition: { x: 10, y: 5, z: 10 },
        enabled: true,
      };

      ecsWorld.createEntity(doorId, [
        {
          type: 'identity',
          id: doorId,
          name: 'Test Door',
        } satisfies Identity,
        {
          type: 'mobility',
          position: { x: 0, y: 0, z: 0 },
        } satisfies Mobility,
        {
          type: 'shape',
          bounds: {
            min: { x: -0.5, y: -0.1, z: -0.1 },
            max: { x: 0.5, y: 2, z: 0.1 },
          },
          geometry: 'box',
        } satisfies Shape,
        entrance,
      ]);

      const retrievedEntrance = ecsWorld.getContract<Entrance>(doorId, 'entrance');
      expect(retrievedEntrance).toBeDefined();
      expect(retrievedEntrance?.targetLayerId).toBe('nether');
      expect(retrievedEntrance?.targetPosition).toEqual({ x: 10, y: 5, z: 10 });
      expect(retrievedEntrance?.enabled).toBe(true);
    });

    it('should allow enabling and disabling entrances', () => {
      const doorId = 'toggle-door';
      const entrance: Entrance = {
        type: 'entrance',
        targetLayerId: 'overworld',
        targetPosition: { x: 0, y: 0, z: 0 },
        enabled: true,
      };

      ecsWorld.createEntity(doorId, [
        {
          type: 'identity',
          id: doorId,
          name: 'Toggle Door',
        } satisfies Identity,
        entrance,
      ]);

      // Check initial state
      let currentEntrance = ecsWorld.getContract<Entrance>(doorId, 'entrance');
      expect(currentEntrance?.enabled).toBe(true);

      // Disable the entrance
      const disabledEntrance: Entrance = {
        ...entrance,
        enabled: false,
      };
      ecsWorld.addContract(doorId, disabledEntrance);

      // Verify it's disabled
      currentEntrance = ecsWorld.getContract<Entrance>(doorId, 'entrance');
      expect(currentEntrance?.enabled).toBe(false);

      // Re-enable the entrance
      const enabledEntrance: Entrance = {
        ...entrance,
        enabled: true,
      };
      ecsWorld.addContract(doorId, enabledEntrance);

      // Verify it's enabled again
      currentEntrance = ecsWorld.getContract<Entrance>(doorId, 'entrance');
      expect(currentEntrance?.enabled).toBe(true);
    });

    it('should handle multiple entrances on the same entity', () => {
      const multiDoorId = 'multi-door';

      // Create entity with identity first
      ecsWorld.createEntity(multiDoorId, [
        {
          type: 'identity',
          id: multiDoorId,
          name: 'Multi Door',
        } satisfies Identity,
      ]);

      // Add first entrance
      const entrance1: Entrance = {
        type: 'entrance',
        targetLayerId: 'overworld',
        targetPosition: { x: 0, y: 0, z: 0 },
        enabled: true,
      };
      ecsWorld.addContract(multiDoorId, entrance1);

      // Try to add second entrance (should replace the first due to ECS contract limits)
      const entrance2: Entrance = {
        type: 'entrance',
        targetLayerId: 'nether',
        targetPosition: { x: 100, y: 10, z: 100 },
        enabled: false,
      };
      ecsWorld.addContract(multiDoorId, entrance2);

      // Should have the second entrance (replaced the first)
      const currentEntrance = ecsWorld.getContract<Entrance>(multiDoorId, 'entrance');
      expect(currentEntrance?.targetLayerId).toBe('nether');
      expect(currentEntrance?.enabled).toBe(false);
    });
  });

  describe('Entrance Queries', () => {
    beforeEach(() => {
      // Create several entities with entrances
      const doors = [
        {
          id: 'door1',
          targetLayer: 'overworld',
          enabled: true,
        },
        {
          id: 'door2', 
          targetLayer: 'nether',
          enabled: true,
        },
        {
          id: 'door3',
          targetLayer: 'overworld',
          enabled: false,
        },
        {
          id: 'door4',
          targetLayer: 'end',
          enabled: true,
        },
      ];

      doors.forEach(door => {
        ecsWorld.createEntity(door.id, [
          {
            type: 'identity',
            id: door.id,
            name: `Door ${door.id}`,
          } satisfies Identity,
          {
            type: 'entrance',
            targetLayerId: door.targetLayer,
            targetPosition: { x: 0, y: 0, z: 0 },
            enabled: door.enabled,
          } satisfies Entrance,
        ]);
      });
    });

    it('should find all entities with entrance contracts', () => {
      const entitiesWithEntrances = ecsWorld.getEntitiesWithContract('entrance');
      expect(entitiesWithEntrances).toHaveLength(4);
      expect(entitiesWithEntrances).toContain('door1');
      expect(entitiesWithEntrances).toContain('door2');
      expect(entitiesWithEntrances).toContain('door3');
      expect(entitiesWithEntrances).toContain('door4');
    });

    it('should filter entrances by enabled state', () => {
      const allEntrances = ecsWorld.getEntitiesWithContract('entrance');
      const enabledEntrances = allEntrances.filter(entityId => {
        const entrance = ecsWorld.getContract<Entrance>(entityId, 'entrance');
        return entrance?.enabled === true;
      });

      expect(enabledEntrances).toHaveLength(3);
      expect(enabledEntrances).toContain('door1');
      expect(enabledEntrances).toContain('door2');
      expect(enabledEntrances).toContain('door4');
      expect(enabledEntrances).not.toContain('door3'); // disabled
    });

    it('should filter entrances by target layer', () => {
      const allEntrances = ecsWorld.getEntitiesWithContract('entrance');
      const overworldEntrances = allEntrances.filter(entityId => {
        const entrance = ecsWorld.getContract<Entrance>(entityId, 'entrance');
        return entrance?.targetLayerId === 'overworld';
      });

      expect(overworldEntrances).toHaveLength(2);
      expect(overworldEntrances).toContain('door1');
      expect(overworldEntrances).toContain('door3');
    });

    it('should find enabled entrances to specific layer', () => {
      const allEntrances = ecsWorld.getEntitiesWithContract('entrance');
      const enabledOverworldEntrances = allEntrances.filter(entityId => {
        const entrance = ecsWorld.getContract<Entrance>(entityId, 'entrance');
        return entrance?.targetLayerId === 'overworld' && entrance?.enabled === true;
      });

      expect(enabledOverworldEntrances).toHaveLength(1);
      expect(enabledOverworldEntrances).toContain('door1');
      expect(enabledOverworldEntrances).not.toContain('door3'); // disabled
    });
  });

  describe('Entrance Interaction Logic', () => {
    it('should simulate doorway passage when entrance is open', () => {
      const doorId = 'passage-door';
      const playerId = 'test-player';

      // Create door
      ecsWorld.createEntity(doorId, [
        {
          type: 'identity',
          id: doorId,
          name: 'Passage Door',
        } satisfies Identity,
        {
          type: 'mobility',
          position: { x: 10, y: 0, z: 0 },
        } satisfies Mobility,
        {
          type: 'shape',
          bounds: {
            min: { x: -0.1, y: -0.1, z: -1 },
            max: { x: 0.1, y: 2, z: 1 },
          },
          geometry: 'box',
        } satisfies Shape,
        {
          type: 'entrance',
          targetLayerId: 'destination',
          targetPosition: { x: 100, y: 5, z: 100 },
          enabled: true, // Door is open
        } satisfies Entrance,
      ]);

      // Create player
      ecsWorld.createEntity(playerId, [
        {
          type: 'identity',
          id: playerId,
          name: 'Test Player',
        } satisfies Identity,
        {
          type: 'mobility',
          position: { x: 9, y: 0, z: 0 }, // Near the door
        } satisfies Mobility,
        {
          type: 'shape',
          bounds: {
            min: { x: -0.3, y: -0.9, z: -0.3 },
            max: { x: 0.3, y: 0.9, z: 0.3 },
          },
          geometry: 'box',
        } satisfies Shape,
      ]);

      // Simulate checking if player can pass through door
      const door = ecsWorld.getContract<Entrance>(doorId, 'entrance');
      const player = ecsWorld.getContract<Mobility>(playerId, 'mobility');

      expect(door).toBeDefined();
      expect(player).toBeDefined();
      expect(door?.enabled).toBe(true);

      // In a real implementation, this would trigger teleportation
      // Here we just verify the entrance is accessible
      if (door?.enabled) {
        // Simulate teleportation by updating player position
        const updatedPlayer: Mobility = {
          ...player!,
          position: door.targetPosition,
        };
        ecsWorld.addContract(playerId, updatedPlayer);

        // Verify teleportation
        const teleportedPlayer = ecsWorld.getContract<Mobility>(playerId, 'mobility');
        expect(teleportedPlayer?.position).toEqual({ x: 100, y: 5, z: 100 });
      }
    });

    it('should block passage when entrance is closed', () => {
      const doorId = 'closed-door';
      const playerId = 'blocked-player';

      // Create closed door
      ecsWorld.createEntity(doorId, [
        {
          type: 'identity',
          id: doorId,
          name: 'Closed Door',
        } satisfies Identity,
        {
          type: 'entrance',
          targetLayerId: 'destination',
          targetPosition: { x: 100, y: 5, z: 100 },
          enabled: false, // Door is closed
        } satisfies Entrance,
      ]);

      // Create player
      ecsWorld.createEntity(playerId, [
        {
          type: 'identity',
          id: playerId,
          name: 'Blocked Player',
        } satisfies Identity,
        {
          type: 'mobility',
          position: { x: 9, y: 0, z: 0 },
        } satisfies Mobility,
      ]);

      const door = ecsWorld.getContract<Entrance>(doorId, 'entrance');
      const originalPlayer = ecsWorld.getContract<Mobility>(playerId, 'mobility');

      expect(door?.enabled).toBe(false);

      // Simulate attempting to use closed door (should not teleport)
      if (!door?.enabled) {
        // Player position should remain unchanged
        const unchangedPlayer = ecsWorld.getContract<Mobility>(playerId, 'mobility');
        expect(unchangedPlayer?.position).toEqual(originalPlayer?.position);
      }
    });
  });
});
