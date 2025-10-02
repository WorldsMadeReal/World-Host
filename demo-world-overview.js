// Demo World Overview - What gets created during seeding
// This shows the exact entities and structure that would be created

const DEMO_WORLD_STRUCTURE = {
  layers: {
    overworld: {
      id: 'overworld',
      name: 'Overworld', 
      chunkSize: 32,
      gravity: -9.81,
      spawnPoint: { x: 0, y: 2, z: 0 },
      theme: 'grassland',
      skyColor: '#87CEEB'
    },
    nether: {
      id: 'nether',
      name: 'Nether',
      chunkSize: 16, 
      gravity: -19.62, // Double gravity!
      spawnPoint: { x: 0, y: 10, z: 0 },
      theme: 'hellscape',
      skyColor: '#8B0000'
    }
  },

  archetypes: {
    'demo-player': {
      name: 'Demo Player',
      maxSpeed: 8,
      shape: 'box (0.6x1.8x0.6)',
      inventory: 20,
      durability: 100
    },
    'stone-wall': {
      name: 'Stone Wall', 
      solid: true,
      color: '#696969',
      durability: 100
    },
    'movable-crate': {
      name: 'Movable Crate',
      portable: true,
      weight: 10,
      inventory: 5,
      color: '#8B4513'
    },
    'heavy-anvil': {
      name: 'Heavy Anvil',
      portable: false, // Too heavy!
      weight: 100,
      color: '#2F4F4F'
    },
    'nether-portal': {
      name: 'Nether Portal',
      entrance: true,
      targetLayer: 'nether',
      targetPosition: { x: 0, y: 5, z: 0 }
    }
  },

  entities: {
    players: [
      {
        id: 'alice',
        name: 'Alice',
        position: { x: 2, y: 0, z: 2 },
        color: '#FF6B6B', // Red
        layer: 'overworld'
      },
      {
        id: 'bob', 
        name: 'Bob',
        position: { x: 4, y: 0, z: 4 },
        color: '#4ECDC4', // Blue
        layer: 'overworld'
      },
      {
        id: 'charlie',
        name: 'Charlie', 
        position: { x: 6, y: 0, z: 6 },
        color: '#45B7D1', // Green
        layer: 'overworld'
      }
    ],

    landscape: [
      // Stone walls forming corridors
      { type: 'stone-wall', position: { x: -10, y: 0, z: 0 } },
      { type: 'stone-wall', position: { x: -10, y: 0, z: 2 } },
      { type: 'stone-wall', position: { x: -10, y: 0, z: 4 } },
      { type: 'stone-wall', position: { x: -8, y: 0, z: 0 } },
      { type: 'stone-wall', position: { x: -6, y: 0, z: 0 } },
      // ... 15 more walls creating maze-like corridors
    ],

    objects: [
      {
        type: 'movable-crate',
        position: { x: 1, y: 0, z: 1 },
        portable: true,
        weight: 10
      },
      {
        type: 'movable-crate', 
        position: { x: 3, y: 0, z: 1 },
        portable: true,
        weight: 10
      },
      {
        type: 'movable-crate',
        position: { x: 5, y: 0, z: 1 }, 
        portable: true,
        weight: 10
      },
      {
        type: 'heavy-anvil',
        position: { x: 7, y: 0, z: 1 },
        portable: false, // Cannot be picked up!
        weight: 100
      }
    ],

    structures: [
      {
        type: 'nether-portal',
        position: { x: 8, y: 0, z: 8 },
        enabled: true,
        targetLayer: 'nether',
        targetPosition: { x: 0, y: 5, z: 0 }
      }
    ]
  },

  // What the acceptance tests would verify
  testScenarios: {
    serverStartup: {
      test: 'Can start server, create layers/archetypes, spawn entities',
      verification: [
        'Server starts on port 8080',
        '2 layers created (overworld + nether)',
        '5+ archetypes defined',
        '15+ entities spawned',
        'HTTP endpoints respond'
      ]
    },

    chunkSubscription: {
      test: 'Client can subscribe to chunks and receive snapshot then deltas', 
      verification: [
        'WebSocket connection established',
        'subscribe_chunks message works',
        'chunk_snapshot received with entities',
        'entity_update deltas broadcast on changes'
      ]
    },

    movementCollision: {
      test: 'Movement blocked by walls; allowed through door/entrance',
      verification: [
        'Player can move in open space',
        'Movement blocked by stone walls (solid: true)',
        'Portal entrance allows passage when enabled'
      ]
    },

    teleportation: {
      test: 'Teleport between layers via entrance contract',
      verification: [
        'Nether portal has entrance contract',
        'Player at (8,0,8) can use portal',
        'Teleports to nether layer at (0,5,0)',
        'Layer properties change (gravity, theme)'
      ]
    },

    inventory: {
      test: 'Inventory/portable semantics exist as simple flags (no UI)',
      verification: [
        'Crates have canPickup: true',
        'Anvil has canPickup: false', 
        'Players have inventory capacity',
        'Weight affects portability'
      ]
    },

    durability: {
      test: 'Durability reaching 0 despawns entity and broadcasts',
      verification: [
        'All entities have durability contracts',
        'applyDamage() reduces health',
        'health <= 0 triggers auto-despawn',
        'entity_despawn event broadcast to clients'
      ]
    },

    quality: {
      test: 'Code passes lint/tests; CI green',
      verification: [
        'pnpm test passes all unit tests',
        'pnpm lint shows no errors',
        'TypeScript compilation succeeds',
        'CI pipeline runs successfully'
      ]
    }
  }
};

// What you'd see when running the live test
console.log('🎮 WorldHost Demo World Structure');
console.log('================================');
console.log('');

console.log('🗺️ Layers:');
Object.values(DEMO_WORLD_STRUCTURE.layers).forEach(layer => {
  console.log(`  • ${layer.name}: ${layer.theme}, gravity ${layer.gravity}`);
});

console.log('');
console.log('🏗️ Archetypes:');
Object.entries(DEMO_WORLD_STRUCTURE.archetypes).forEach(([id, archetype]) => {
  console.log(`  • ${archetype.name} (${id})`);
});

console.log('');
console.log('👥 Players:');
DEMO_WORLD_STRUCTURE.entities.players.forEach(player => {
  console.log(`  • ${player.name} at (${player.position.x}, ${player.position.y}, ${player.position.z})`);
});

console.log('');
console.log('📦 Objects:');
DEMO_WORLD_STRUCTURE.entities.objects.forEach(obj => {
  const portable = obj.portable ? '✅ Portable' : '❌ Not Portable';
  console.log(`  • ${obj.type} - ${portable} (weight: ${obj.weight})`);
});

console.log('');
console.log('🚪 Structures:');
DEMO_WORLD_STRUCTURE.entities.structures.forEach(structure => {
  console.log(`  • ${structure.type} → ${structure.targetLayer}`);
});

console.log('');
console.log('🧪 Test Scenarios:');
Object.entries(DEMO_WORLD_STRUCTURE.testScenarios).forEach(([key, scenario]) => {
  console.log(`  ${key}: ${scenario.test}`);
});

console.log('');
console.log('✅ All acceptance criteria would be verified in live test!');

export default DEMO_WORLD_STRUCTURE;
