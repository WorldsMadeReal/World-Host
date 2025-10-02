// Test script for WorldHost API endpoints
// Run with: node test-api.js (after starting the server)

const BASE_URL = 'http://localhost:8080';

async function testAPI() {
  console.log('🧪 Testing WorldHost API endpoints...\n');

  try {
    // 1. Get server info
    console.log('1. Server Info:');
    const info = await fetch(`${BASE_URL}/`).then(r => r.json());
    console.log(`   Status: ${info.status}`);
    console.log(`   Entities: ${info.stats.totalEntities}`);
    console.log(`   Players: ${info.stats.playerCount}\n`);

    // 2. Create a new layer
    console.log('2. Creating new layer...');
    const layerResponse = await fetch(`${BASE_URL}/world/layers`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Test Layer',
        description: 'A test layer for API testing',
        chunkSize: 64,
        gravity: -9.81,
        spawnPoint: { x: 10, y: 5, z: 10 },
        properties: { theme: 'forest', difficulty: 'easy' }
      })
    }).then(r => r.json());
    
    if (layerResponse.success) {
      console.log(`   ✅ Created layer: ${layerResponse.layer.name} (${layerResponse.layer.id})\n`);
    } else {
      console.log(`   ❌ Failed: ${layerResponse.error}\n`);
    }

    // 3. Define a custom archetype
    console.log('3. Defining custom archetype...');
    const archetypeResponse = await fetch(`${BASE_URL}/world/archetypes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Magic Crystal',
        description: 'A glowing magical crystal',
        contracts: [
          {
            type: 'identity',
            id: '',
            name: 'Magic Crystal',
            description: 'A mysterious glowing crystal'
          },
          {
            type: 'mobility',
            position: { x: 0, y: 0, z: 0 }
          },
          {
            type: 'shape',
            bounds: {
              min: { x: -0.25, y: -0.25, z: -0.25 },
              max: { x: 0.25, y: 0.25, z: 0.25 }
            },
            geometry: 'sphere'
          },
          {
            type: 'visual',
            visible: true,
            color: '#00FFFF'
          },
          {
            type: 'portable',
            canPickup: true,
            weight: 0.5
          }
        ],
        tags: ['magic', 'collectible', 'rare']
      })
    }).then(r => r.json());
    
    if (archetypeResponse.success) {
      console.log(`   ✅ Created archetype: ${archetypeResponse.archetype.name} (${archetypeResponse.archetype.id})\n`);
    } else {
      console.log(`   ❌ Failed: ${archetypeResponse.error}\n`);
    }

    // 4. Spawn entities
    console.log('4. Spawning entities...');
    
    // Spawn a block
    const blockSpawn = await fetch(`${BASE_URL}/spawn`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        archetypeId: 'block',
        layerId: 'default',
        position: { x: 5, y: 0, z: 5 }
      })
    }).then(r => r.json());
    
    if (blockSpawn.success) {
      console.log(`   ✅ Spawned block: ${blockSpawn.entityId}`);
    }

    // Spawn magic crystal (if archetype was created)
    if (archetypeResponse.success) {
      const crystalSpawn = await fetch(`${BASE_URL}/spawn`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          archetypeId: archetypeResponse.archetype.id,
          layerId: 'default',
          position: { x: 0, y: 2, z: 0 },
          overrides: [
            {
              type: 'visual',
              color: '#FF00FF' // Override to purple
            }
          ]
        })
      }).then(r => r.json());
      
      if (crystalSpawn.success) {
        console.log(`   ✅ Spawned crystal: ${crystalSpawn.entityId}`);
      }
    }
    
    console.log('');

    // 5. Get updated stats
    console.log('5. Updated Statistics:');
    const stats = await fetch(`${BASE_URL}/stats`).then(r => r.json());
    console.log(`   Total Entities: ${stats.world.totalEntities}`);
    console.log(`   Archetypes: ${stats.world.archetypeCount}`);
    console.log(`   Layers: ${stats.world.layerCount}`);
    console.log(`   Entities by Layer:`, stats.world.entitiesByLayer);
    console.log('');

    // 6. Save world
    console.log('6. Saving world...');
    const saveResponse = await fetch(`${BASE_URL}/save`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        filename: 'test-world.json'
      })
    }).then(r => r.json());
    
    if (saveResponse.success) {
      console.log(`   ✅ World saved to: ${saveResponse.filename}\n`);
    } else {
      console.log(`   ❌ Save failed: ${saveResponse.error}\n`);
    }

    console.log('🎉 API test completed successfully!');

  } catch (error) {
    console.error('❌ API test failed:', error.message);
  }
}

// Run the test
testAPI();
