import { createApp } from '../src/app.js';
import type { WorldState } from '../src/world/state.js';
import type { LayerConfig } from '../src/world/space.js';
import { createBlockContracts, createItemContracts, createDoorContracts } from '../src/world/contracts.js';

export async function seedDemoWorld() {
  console.log('🌱 Seeding demo world...');
  
  const { context } = createApp();
  const worldState = context.worldState;
  
  // Create layers
  await createLayers(worldState);
  
  // Create archetypes
  await createArchetypes(worldState);
  
  // Create landscape with walls and corridors
  await createLandscape(worldState);
  
  // Create structures with entrances
  await createStructures(worldState);
  
  // Spawn players and objects
  await spawnEntities(worldState);
  
  console.log('✅ Demo world seeded successfully!');
  return context;
}

async function createLayers(worldState: WorldState) {
  console.log('🗺️ Creating layers...');
  
  // Create overworld layer
  const overworld = worldState.createLayer({
    id: 'overworld',
    name: 'Overworld',
    description: 'The main world layer with grass and trees',
    chunkSize: 32,
    gravity: -9.81,
    spawnPoint: { x: 0, y: 2, z: 0 },
    properties: {
      theme: 'grassland',
      skyColor: '#87CEEB',
      ambientLight: 0.8,
    },
  });
  
  // Create nether layer
  const nether = worldState.createLayer({
    id: 'nether',
    name: 'Nether',
    description: 'A dangerous underworld dimension',
    chunkSize: 16,
    gravity: -19.62, // Double gravity
    spawnPoint: { x: 0, y: 10, z: 0 },
    boundaries: {
      min: { x: -100, y: 0, z: -100 },
      max: { x: 100, y: 50, z: 100 },
    },
    properties: {
      theme: 'hellscape',
      skyColor: '#8B0000',
      ambientLight: 0.3,
      fogDensity: 0.1,
    },
  });
  
  console.log(`  ✅ Created layer: ${overworld.name}`);
  console.log(`  ✅ Created layer: ${nether.name}`);
}

async function createArchetypes(worldState: WorldState) {
  console.log('🏗️ Creating archetypes...');
  
  // Enhanced player archetype
  worldState.defineArchetype({
    id: 'demo-player',
    name: 'Demo Player',
    description: 'A player character for the demo world',
    contracts: [
      {
        type: 'identity',
        id: '',
        name: 'Player',
        description: 'A demo player character',
      },
      {
        type: 'mobility',
        position: { x: 0, y: 2, z: 0 },
        maxSpeed: 8,
        acceleration: 15,
      },
      {
        type: 'shape',
        bounds: {
          min: { x: -0.3, y: -0.9, z: -0.3 },
          max: { x: 0.3, y: 0.9, z: 0.3 },
        },
        geometry: 'box',
      },
      {
        type: 'visual',
        visible: true,
        color: '#00AA00',
        material: 'player',
      },
      {
        type: 'durability',
        health: 100,
        maxHealth: 100,
        armor: 5,
      },
      {
        type: 'inventory',
        items: [],
        capacity: 20,
      },
    ],
    tags: ['player', 'character', 'demo'],
    created: Date.now(),
  });
  
  // Landscape wall archetype
  worldState.defineArchetype({
    id: 'landscape-wall',
    name: 'Landscape Wall',
    description: 'Solid wall forming corridors and boundaries',
    contracts: [
      {
        type: 'identity',
        id: '',
        name: 'Wall',
        description: 'A solid landscape wall',
      },
      {
        type: 'mobility',
        position: { x: 0, y: 0, z: 0 },
      },
      {
        type: 'shape',
        bounds: {
          min: { x: -0.5, y: -0.5, z: -0.5 },
          max: { x: 0.5, y: 2.5, z: 0.5 },
        },
        geometry: 'box',
      },
      {
        type: 'visual',
        visible: true,
        color: '#696969',
        material: 'stone',
      },
      {
        type: 'solidity',
        solid: true,
        collisionLayers: ['landscape'],
      },
      {
        type: 'durability',
        health: 1000,
        maxHealth: 1000,
        armor: 50,
      },
    ],
    tags: ['landscape', 'wall', 'solid', 'structure'],
    created: Date.now(),
  });
  
  // Portal structure archetype
  worldState.defineArchetype({
    id: 'nether-portal',
    name: 'Nether Portal',
    description: 'A portal structure leading to the nether',
    contracts: [
      {
        type: 'identity',
        id: '',
        name: 'Nether Portal',
        description: 'A mystical portal to the nether realm',
      },
      {
        type: 'mobility',
        position: { x: 0, y: 0, z: 0 },
      },
      {
        type: 'shape',
        bounds: {
          min: { x: -1, y: -0.1, z: -0.1 },
          max: { x: 1, y: 3, z: 0.1 },
        },
        geometry: 'box',
      },
      {
        type: 'visual',
        visible: true,
        color: '#8A2BE2',
        material: 'portal',
      },
      {
        type: 'entrance',
        targetLayerId: 'nether',
        targetPosition: { x: 0, y: 10, z: 0 },
        enabled: true,
      },
      {
        type: 'durability',
        health: 50,
        maxHealth: 50,
      },
    ],
    tags: ['structure', 'portal', 'entrance', 'nether'],
    created: Date.now(),
  });
  
  // Movable crate archetype
  worldState.defineArchetype({
    id: 'movable-crate',
    name: 'Movable Crate',
    description: 'A wooden crate that can be picked up and moved',
    contracts: [
      {
        type: 'identity',
        id: '',
        name: 'Wooden Crate',
        description: 'A sturdy wooden storage crate',
      },
      {
        type: 'mobility',
        position: { x: 0, y: 0, z: 0 },
      },
      {
        type: 'shape',
        bounds: {
          min: { x: -0.4, y: -0.4, z: -0.4 },
          max: { x: 0.4, y: 0.4, z: 0.4 },
        },
        geometry: 'box',
      },
      {
        type: 'visual',
        visible: true,
        color: '#8B4513',
        material: 'wood',
      },
      {
        type: 'portable',
        canPickup: true,
        weight: 10,
      },
      {
        type: 'inventory',
        items: [],
        capacity: 5,
      },
      {
        type: 'durability',
        health: 25,
        maxHealth: 25,
      },
    ],
    tags: ['object', 'portable', 'container'],
    created: Date.now(),
  });
  
  // Heavy anvil archetype (not portable)
  worldState.defineArchetype({
    id: 'heavy-anvil',
    name: 'Heavy Anvil',
    description: 'A massive iron anvil that cannot be moved easily',
    contracts: [
      {
        type: 'identity',
        id: '',
        name: 'Iron Anvil',
        description: 'A heavy blacksmithing anvil',
      },
      {
        type: 'mobility',
        position: { x: 0, y: 0, z: 0 },
      },
      {
        type: 'shape',
        bounds: {
          min: { x: -0.6, y: -0.3, z: -0.3 },
          max: { x: 0.6, y: 0.3, z: 0.3 },
        },
        geometry: 'box',
      },
      {
        type: 'visual',
        visible: true,
        color: '#36454F',
        material: 'metal',
      },
      {
        type: 'solidity',
        solid: true,
      },
      {
        type: 'durability',
        health: 200,
        maxHealth: 200,
        armor: 30,
      },
    ],
    tags: ['object', 'heavy', 'tool', 'immovable'],
    created: Date.now(),
  });
  
  console.log('  ✅ Created 5 demo archetypes');
}

async function createLandscape(worldState: WorldState) {
  console.log('🏔️ Creating landscape with walls and corridors...');
  
  let wallCount = 0;
  
  // Create a corridor system in the overworld
  // Vertical walls forming a corridor from (0,0,0) to (20,0,0)
  for (let x = -1; x <= 21; x++) {
    for (let z of [-3, 3]) {
      if (x === -1 || x === 21 || (x >= 0 && x <= 20)) {
        const wallId = worldState.spawn('landscape-wall', 'overworld', { x, y: 0, z });
        wallCount++;
      }
    }
  }
  
  // Create walls at the ends of the corridor (with gaps for passage)
  for (let z = -2; z <= 2; z++) {
    if (z !== 0) { // Leave a gap in the middle for passage
      worldState.spawn('landscape-wall', 'overworld', { x: -1, y: 0, z });
      worldState.spawn('landscape-wall', 'overworld', { x: 21, y: 0, z });
      wallCount += 2;
    }
  }
  
  // Add some scattered walls in the nether
  for (let i = 0; i < 10; i++) {
    const x = Math.floor(Math.random() * 40) - 20;
    const z = Math.floor(Math.random() * 40) - 20;
    const y = Math.floor(Math.random() * 3);
    
    worldState.spawn('landscape-wall', 'nether', { x, y, z });
    wallCount++;
  }
  
  console.log(`  ✅ Created ${wallCount} landscape walls forming corridors`);
}

async function createStructures(worldState: WorldState) {
  console.log('🏗️ Creating structures with entrances...');
  
  // Create nether portal at the end of the corridor
  const portalId = worldState.spawn('nether-portal', 'overworld', { x: 20, y: 1, z: 0 });
  
  // Create a return portal in the nether
  const returnPortalId = worldState.spawn('nether-portal', 'nether', { x: 0, y: 10, z: 0 }, [
    {
      type: 'entrance',
      targetLayerId: 'overworld',
      targetPosition: { x: 19, y: 2, z: 0 },
      enabled: true,
    },
    {
      type: 'visual',
      visible: true,
      color: '#00CED1',
      material: 'portal',
    },
  ]);
  
  console.log(`  ✅ Created nether portal: ${portalId}`);
  console.log(`  ✅ Created return portal: ${returnPortalId}`);
}

async function spawnEntities(worldState: WorldState) {
  console.log('👥 Spawning players and objects...');
  
  // Spawn 3 demo players
  const player1 = worldState.spawn('demo-player', 'overworld', { x: 2, y: 2, z: 0 }, [
    {
      type: 'identity',
      name: 'Alice',
      description: 'The first demo player',
    },
    {
      type: 'visual',
      color: '#FF6B6B',
    },
  ]);
  
  const player2 = worldState.spawn('demo-player', 'overworld', { x: 4, y: 2, z: 1 }, [
    {
      type: 'identity',
      name: 'Bob',
      description: 'The second demo player',
    },
    {
      type: 'visual',
      color: '#4ECDC4',
    },
  ]);
  
  const player3 = worldState.spawn('demo-player', 'overworld', { x: 6, y: 2, z: -1 }, [
    {
      type: 'identity',
      name: 'Charlie',
      description: 'The third demo player',
    },
    {
      type: 'visual',
      color: '#45B7D1',
    },
  ]);
  
  // Spawn movable objects
  const crate1 = worldState.spawn('movable-crate', 'overworld', { x: 8, y: 1, z: 0 });
  const crate2 = worldState.spawn('movable-crate', 'overworld', { x: 10, y: 1, z: 1 });
  
  // Spawn non-movable object
  const anvil = worldState.spawn('heavy-anvil', 'overworld', { x: 12, y: 1, z: 0 });
  
  // Add some items in the nether
  const netherCrate = worldState.spawn('movable-crate', 'nether', { x: 3, y: 11, z: 3 }, [
    {
      type: 'visual',
      color: '#8B0000', // Dark red for nether theme
    },
  ]);
  
  console.log(`  ✅ Spawned 3 demo players: ${player1}, ${player2}, ${player3}`);
  console.log(`  ✅ Spawned 3 movable crates: ${crate1}, ${crate2}, ${netherCrate}`);
  console.log(`  ✅ Spawned 1 heavy anvil: ${anvil}`);
}

// Run seed if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  seedDemoWorld()
    .then(() => {
      console.log('🎉 Demo world seeding completed!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Failed to seed demo world:', error);
      process.exit(1);
    });
}
