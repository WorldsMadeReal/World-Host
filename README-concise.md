# WorldHost

A real-time multiplayer world server with Entity-Component-System architecture, spatial partitioning, and WebSocket-based communication.

## Quick Start

```bash
# Install dependencies
pnpm install

# Start development server
pnpm dev

# Server runs on http://localhost:8080
# WebSocket endpoint: ws://localhost:8080/ws
```

## Core Features

- **ECS Architecture**: Flexible entity-component system with contract validation
- **Spatial Partitioning**: Chunk-based world organization with real-time subscriptions
- **Collision Detection**: Swept-AABB physics with static and dynamic obstacles
- **Multi-Layer Worlds**: Independent dimensions with configurable properties
- **Real-time Multiplayer**: WebSocket protocol with efficient delta updates

## WebSocket Protocol

### Client Messages
```javascript
// Connect and get client ID
{ type: 'hello', clientVersion: '1.0.0' }

// Subscribe to world chunks
{ type: 'subscribe_chunks', chunkKeys: [{ layerId: 'overworld', cx: 0, cy: 0, cz: 0 }] }

// Move player with collision detection
{ type: 'move', want: { x: 10, y: 5, z: 10 } }

// Modify entity contracts
{ type: 'add_contract', entityId: 'player-123', contract: { type: 'visual', visible: true, color: '#FF0000' } }
{ type: 'remove_contract', entityId: 'player-123', contractType: 'visual' }

// World interactions
{ type: 'interact', action: 'pickup', targetId: 'item-456', data: {} }
```

### Server Messages
```javascript
// Connection established
{ type: 'hello_ok', clientId: 'client-abc', serverId: 'server-def', serverVersion: '1.0.0' }

// World data on subscription
{ type: 'chunk_snapshot', chunkKey: {...}, entities: [...], version: 1 }

// Real-time updates
{ type: 'entity_update', entityId: 'player-123', contracts: [...], chunkKey: {...} }
{ type: 'entity_spawn', entityId: 'item-789', contracts: [...], chunkKey: {...} }
{ type: 'entity_despawn', entityId: 'block-456', chunkKey: {...} }

// Movement feedback
{ type: 'move_result', success: true, position: { x: 10, y: 5, z: 10 }, reason?: 'blocked by wall' }
```

## REST API

### World Management
```bash
# Create new layer
curl -X POST http://localhost:8080/world/layers \
  -H "Content-Type: application/json" \
  -d '{"name": "Nether", "chunkSize": 16, "gravity": -19.62, "spawnPoint": {"x": 0, "y": 10, "z": 0}}'

# Define entity archetype
curl -X POST http://localhost:8080/world/archetypes \
  -H "Content-Type: application/json" \
  -d '{"name": "Magic Sword", "contracts": [{"type": "portable", "canPickup": true, "weight": 2.5}]}'

# Spawn entity from archetype
curl -X POST http://localhost:8080/spawn \
  -H "Content-Type: application/json" \
  -d '{"archetypeId": "magic-sword-123", "layerId": "overworld", "position": {"x": 0, "y": 1, "z": 0}}'

# Save/load world state
curl -X POST http://localhost:8080/save -H "Content-Type: application/json" -d '{"filename": "my-world.json"}'
curl -X POST http://localhost:8080/load -H "Content-Type: application/json" -d '{"filename": "my-world.json"}'
```

### Monitoring
```bash
# Health check
curl http://localhost:8080/health

# Detailed statistics
curl http://localhost:8080/stats
```

## Development

```bash
# Run tests
pnpm test

# Seed demo world
pnpm --filter server seed

# Test API endpoints
node test-api.js

# Test WebSocket protocol
node test-websocket.js

# Build for production
pnpm build
```

## Architecture Overview

### Entity-Component-System
- **Entities**: Unique IDs with associated contracts
- **Contracts**: Data components (Identity, Mobility, Shape, Visual, etc.)
- **Systems**: Logic processors (Movement, Durability, Collision)

### Spatial Organization
- **Layers**: Independent world dimensions with custom properties
- **Chunks**: 32x256x32 regions for spatial partitioning and streaming
- **Static Grids**: Pre-computed collision data for landscape elements
- **Dynamic Tracking**: Real-time entity position updates

### Network Protocol
- **Client IDs**: Unique session identifiers with hello handshake
- **Chunk Subscriptions**: Selective world region streaming
- **Delta Updates**: Minimal bandwidth with change-only broadcasts
- **Contract Validation**: Server-side Zod schema enforcement

## Contract Types

| Contract | Purpose | Properties |
|----------|---------|------------|
| `Identity` | Entity metadata | id, name, description |
| `Mobility` | Position/movement | position, velocity, maxSpeed |
| `Shape` | Collision bounds | bounds (AABB), geometry |
| `Visual` | Rendering data | color, texture, material, visible |
| `Solidity` | Collision behavior | solid, collisionLayers |
| `Entrance` | Portal mechanics | targetLayerId, targetPosition, enabled |
| `Portable` | Pickup/drop | canPickup, weight |
| `Inventory` | Item storage | items[], capacity |
| `Durability` | Health/damage | health, maxHealth, armor |

## Scaling Plan

### Current Architecture (Single Node)
- **Capacity**: ~1000 concurrent players, ~100k entities
- **Performance**: 60 FPS game loop, sub-16ms update cycles
- **Storage**: In-memory ECS with JSON persistence

### Gateway/Shard Upgrade Path
1. **Load Balancer**: Route clients to least-loaded server instances
2. **Shard Coordination**: Distribute layers across multiple server nodes
3. **Cross-Shard Messaging**: Redis pub/sub for inter-server communication
4. **Shared State**: PostgreSQL for persistent world data
5. **Asset Streaming**: CDN for textures, models, and static content

### Binary Protocol Migration
- **Current**: JSON WebSocket messages (~2-10KB per update)
- **Target**: MessagePack or custom binary format (~0.5-2KB per update)
- **Benefits**: 5x bandwidth reduction, 3x parsing performance
- **Migration**: Versioned protocol negotiation during hello handshake

## Production Deployment

```bash
# Docker build
docker build -t worldhost .

# Environment variables
export PORT=8080
export NODE_ENV=production
export DATA_DIR=/var/lib/worldhost

# Start server
pnpm start
```

## License

MIT License - see LICENSE file for details.
