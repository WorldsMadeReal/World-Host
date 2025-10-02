# WorldHost

A real-time multiplayer world server with Entity-Component-System architecture, spatial partitioning, and WebSocket-based communication.

> **Quick Start**: `pnpm install && pnpm dev` → Server runs on http://localhost:8080

---

## 🏗️ Architecture

- **Monorepo**: Managed with pnpm workspaces
- **TypeScript**: Strict type checking with Node 20 target
- **ECS**: Entity-Component-System for flexible game logic
- **WebSockets**: Real-time communication between client and server
- **Spatial System**: Chunk-based world management with collision detection

## 📦 Packages

### `packages/shared`
Core types, schemas, and utilities shared between client and server:
- Entity and contract type definitions
- WebSocket message schemas
- Geometric utilities (Vec3, AABB, ChunkKey)
- Type guards and validation helpers

### `packages/server`
Node.js server implementation:
- HTTP server with health and stats endpoints
- WebSocket server for real-time communication
- ECS world management
- Movement and physics systems
- Durability and damage systems
- Spatial indexing and chunk management

## 🚀 Getting Started

### Prerequisites
- Node.js 20+
- pnpm 9+

### Installation
```bash
# Install dependencies
pnpm install

# Build all packages
pnpm build

# Start development server
pnpm dev
```

### Development Scripts
```bash
# Run linting
pnpm lint

# Fix linting issues
pnpm lint:fix

# Run tests
pnpm test

# Type checking
pnpm typecheck

# Clean build artifacts
pnpm clean
```

## 🌐 Server Endpoints

### HTTP Endpoints
- `GET /` - Server information and available endpoints
- `GET /health` - Health check with basic stats
- `GET /stats` - Detailed world and ECS statistics

#### World Management
- `POST /world/layers` - Create new layer
- `GET /world/layers` - List all layers with entity counts
- `POST /world/archetypes` - Define new entity archetype
- `GET /world/archetypes` - List all defined archetypes
- `POST /spawn` - Spawn entity from archetype
- `POST /save` - Save world state to JSON file
- `POST /load` - Load world state from JSON file

### WebSocket Endpoint
- `WS /ws` - Real-time world communication with chunk subscriptions

## 📡 WebSocket API

### Client → Server Messages
```typescript
// Join a world layer
{ type: 'join', layerId: string, playerName?: string }

// Move an entity
{ type: 'move', entityId: string, position: Vec3, velocity?: Vec3 }

// Interact with entities
{ type: 'interact', entityId: string, targetId?: string, action: string }

// Send chat message
{ type: 'chat', message: string }
```

### Server → Client Messages
```typescript
// Welcome message with player ID
{ type: 'welcome', playerId: string, layerId: string }

// Entity updates
{ type: 'entity_update', entityId: string, contracts: Contract[], removed?: boolean }

// Chunk data
{ type: 'chunk_data', chunkKey: ChunkKey, entities: EntityData[] }

// Chat messages
{ type: 'chat', playerId: string, playerName: string, message: string, timestamp: number }

// Error messages
{ type: 'error', code: string, message: string }
```

## 🔧 ECS System

### Core Contracts
- **Identity**: Entity identification and metadata
- **Mobility**: Position, velocity, and movement constraints
- **Shape**: Collision bounds and geometry
- **Visual**: Rendering properties (color, texture, visibility)
- **Solidity**: Collision detection properties
- **Entrance**: Portal/door functionality
- **Portable**: Pickup/drop mechanics
- **Inventory**: Item storage
- **Durability**: Health and damage system
- **ContractLimit**: Enforce limits on contract types per entity

### Systems
- **Movement System**: 
  - `attemptMove()` with swept-AABB collision detection
  - Physics simulation with gravity and friction
  - Collision against static chunk grids and dynamic entities
- **Durability System**: 
  - `applyDamage()` utility with automatic entity destruction
  - Default durability for all entities with Identity contracts
  - Comprehensive damage/heal event tracking
- **Contract Validation**: Zod schema validation and limit enforcement
- **Chunk Management**: 
  - Spatial partitioning with WebSocket subscriptions
  - Static solid grids for collision data
  - Real-time delta updates to subscribed clients
- **Game Loop**: 60 FPS update cycle for all systems

## 🗺️ World Structure

### Spatial Organization
- **Layers**: Independent world spaces with configurable properties
  - Custom chunk sizes, gravity, spawn points
  - Boundaries and layer-specific properties
- **Chunks**: Configurable size regions (default 32x256x32) for spatial partitioning
  - Static solid grids for collision data
  - Dynamic entity tracking
  - WebSocket subscription system for real-time updates
- **Entities**: Objects with validated contracts that define behavior
- **Archetypes**: Reusable entity templates for consistent spawning

### Coordinate System
- **World Coordinates**: Floating-point positions in 3D space
- **Chunk Coordinates**: Integer grid coordinates for spatial indexing
- **Layer-Specific**: Each layer can have different chunk sizes

## 🛠️ Development

### Adding New Contract Types
1. Define the contract interface in `packages/shared/src/index.ts`
2. Add to the `AnyContract` union type
3. Create Zod schema in `packages/server/src/world/contracts.ts`
4. Add factory functions and set default limits
5. Update contract registry initialization

### Adding New Systems
1. Create a new file in `packages/server/src/world/systems/`
2. Implement the system interface with `update(deltaTime)` method
3. Register with the world state in `packages/server/src/world/state.ts`

### Creating Archetypes
```javascript
// Define via API
POST /world/archetypes
{
  "name": "Magic Sword",
  "description": "A legendary weapon",
  "contracts": [
    {
      "type": "identity",
      "id": "",
      "name": "Magic Sword"
    },
    {
      "type": "portable",
      "canPickup": true,
      "weight": 2.5
    }
  ],
  "tags": ["weapon", "magic", "legendary"]
}

// Spawn instances
POST /spawn
{
  "archetypeId": "magic-sword-id",
  "layerId": "default",
  "position": { "x": 0, "y": 1, "z": 0 }
}
```

### Testing the API
Run the included test scripts:
```bash
# Start the server
pnpm dev

# In another terminal, test HTTP API
node test-api.js

# Test WebSocket protocol
node test-websocket.js
```

### Enhanced WebSocket Protocol
The server now supports an enhanced WebSocket protocol with the following features:

#### Client → Server Messages
```javascript
// Hello handshake
{ type: 'hello', clientVersion: '1.0.0' }

// Subscribe to chunk updates
{ type: 'subscribe_chunks', chunkKeys: [{ layerId: 'default', cx: 0, cy: 0, cz: 0 }] }

// Move player
{ type: 'move', want: { x: 10, y: 5, z: 10 } }

// Add contract to entity
{ type: 'add_contract', entityId: 'player-123', contract: { type: 'visual', visible: true, color: '#FF0000' } }

// Remove contract from entity
{ type: 'remove_contract', entityId: 'player-123', contractType: 'visual' }

// Interact with world
{ type: 'interact', action: 'pickup', targetId: 'item-456', data: {} }
```

#### Server → Client Messages
```javascript
// Hello response with client ID
{ type: 'hello_ok', clientId: 'client-abc123', serverId: 'server-def456', serverVersion: '1.0.0' }

// Chunk snapshot (sent on subscription)
{ type: 'chunk_snapshot', chunkKey: {...}, entities: [...], version: 1 }

// Real-time entity updates
{ type: 'entity_update', entityId: 'player-123', contracts: [...], chunkKey: {...} }
{ type: 'entity_spawn', entityId: 'item-789', contracts: [...], chunkKey: {...} }
{ type: 'entity_despawn', entityId: 'block-456', chunkKey: {...} }

// Movement results
{ type: 'move_result', success: true, position: { x: 10, y: 5, z: 10 } }
```

#### Example Client Usage
```javascript
import WebSocket from 'ws';

const ws = new WebSocket('ws://localhost:3000/ws');
let clientId = null;

ws.onopen = () => {
  // Send hello
  ws.send(JSON.stringify({ type: 'hello', clientVersion: '1.0.0' }));
};

ws.onmessage = (event) => {
  const message = JSON.parse(event.data);
  
  if (message.type === 'hello_ok') {
    clientId = message.clientId;
    
    // Subscribe to chunks around spawn
    ws.send(JSON.stringify({
      type: 'subscribe_chunks',
      chunkKeys: [{ layerId: 'default', cx: 0, cy: 0, cz: 0 }]
    }));
    
    // Move player
    ws.send(JSON.stringify({
      type: 'move',
      want: { x: 5, y: 1, z: 5 }
    }));
  }
  
  if (message.type === 'chunk_snapshot') {
    console.log(`Received chunk with ${message.entities.length} entities`);
  }
  
  if (message.type === 'move_result') {
    console.log(`Move ${message.success ? 'successful' : 'failed'}: ${JSON.stringify(message.position)}`);
  }
};
```

## 📈 Performance Features

- **Swept-AABB Collision**: Efficient continuous collision detection
- **Spatial Hashing**: Fast entity proximity queries with chunk-based indexing
- **Chunk Subscriptions**: Only send updates for chunks clients care about
- **Static Solid Grids**: Pre-computed collision data for static world geometry
- **Delta Updates**: Minimal network traffic with change-only broadcasts
- **Connection Pooling**: Efficient WebSocket connection handling
- **Game Loop**: Optimized 60 FPS update cycle with error handling

## 🔍 Monitoring

The server provides built-in monitoring through:
- Health check endpoint (`/health`)
- Detailed statistics endpoint (`/stats`)
- Console logging for major events
- WebSocket connection tracking

## 📝 License

This project is private and proprietary.
