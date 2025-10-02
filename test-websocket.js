// WebSocket client test for enhanced protocol
// Run with: node test-websocket.js (after starting the server)

import WebSocket from 'ws';

const WS_URL = 'ws://localhost:8080/ws';

class WorldHostClient {
  constructor() {
    this.ws = null;
    this.clientId = null;
    this.playerId = null;
    this.messageHandlers = new Map();
    this.connected = false;
  }

  connect() {
    return new Promise((resolve, reject) => {
      console.log('🔗 Connecting to WorldHost server...');
      
      this.ws = new WebSocket(WS_URL);
      
      this.ws.on('open', () => {
        console.log('✅ Connected to server');
        this.connected = true;
        
        // Send hello message
        this.send({
          type: 'hello',
          clientVersion: '1.0.0'
        });
      });
      
      this.ws.on('message', (data) => {
        try {
          const message = JSON.parse(data.toString());
          this.handleMessage(message);
        } catch (error) {
          console.error('Failed to parse message:', error);
        }
      });
      
      this.ws.on('close', () => {
        console.log('🔌 Disconnected from server');
        this.connected = false;
      });
      
      this.ws.on('error', (error) => {
        console.error('WebSocket error:', error);
        reject(error);
      });
      
      // Resolve when we get hello_ok
      this.onMessage('hello_ok', (message) => {
        this.clientId = message.clientId;
        console.log(`🎉 Received client ID: ${this.clientId}`);
        resolve();
      });
    });
  }

  send(message) {
    if (this.connected && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
      console.log('📤 Sent:', message.type);
    }
  }

  onMessage(type, handler) {
    if (!this.messageHandlers.has(type)) {
      this.messageHandlers.set(type, []);
    }
    this.messageHandlers.get(type).push(handler);
  }

  handleMessage(message) {
    console.log('📥 Received:', message.type, message);
    
    const handlers = this.messageHandlers.get(message.type);
    if (handlers) {
      for (const handler of handlers) {
        try {
          handler(message);
        } catch (error) {
          console.error(`Error in ${message.type} handler:`, error);
        }
      }
    }
  }

  subscribeToChunk(chunkKey) {
    this.send({
      type: 'subscribe_chunks',
      chunkKeys: [chunkKey]
    });
  }

  move(position) {
    this.send({
      type: 'move',
      want: position
    });
  }

  addContract(entityId, contract) {
    this.send({
      type: 'add_contract',
      entityId,
      contract
    });
  }

  removeContract(entityId, contractType) {
    this.send({
      type: 'remove_contract',
      entityId,
      contractType
    });
  }

  interact(action, targetId, data) {
    this.send({
      type: 'interact',
      action,
      targetId,
      data
    });
  }

  close() {
    if (this.ws) {
      this.ws.close();
    }
  }
}

async function testEnhancedProtocol() {
  const client = new WorldHostClient();
  
  try {
    // Connect to server
    await client.connect();
    
    // Set up message handlers
    client.onMessage('move_result', (message) => {
      if (message.success) {
        console.log(`✅ Move successful to:`, message.position);
      } else {
        console.log(`❌ Move failed:`, message.reason);
      }
    });
    
    client.onMessage('chunk_snapshot', (message) => {
      console.log(`📦 Chunk snapshot: ${message.entities.length} entities in chunk ${message.chunkKey.cx},${message.chunkKey.cy},${message.chunkKey.cz}`);
    });
    
    client.onMessage('entity_update', (message) => {
      console.log(`🔄 Entity update: ${message.entityId} has ${message.contracts.length} contracts`);
    });
    
    client.onMessage('entity_spawn', (message) => {
      console.log(`🐣 Entity spawned: ${message.entityId}`);
    });
    
    client.onMessage('entity_despawn', (message) => {
      console.log(`💀 Entity despawned: ${message.entityId}`);
    });
    
    // Wait a moment for connection to stabilize
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // Test 1: Subscribe to a chunk
    console.log('\n🧪 Test 1: Subscribing to chunk...');
    client.subscribeToChunk({
      layerId: 'default',
      cx: 0,
      cy: 0,
      cz: 0
    });
    
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Test 2: Move player
    console.log('\n🧪 Test 2: Moving player...');
    client.move({ x: 5, y: 1, z: 5 });
    
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Test 3: Move player again
    console.log('\n🧪 Test 3: Moving player to another location...');
    client.move({ x: -3, y: 2, z: 8 });
    
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Test 4: Add a contract (this will fail since we can only modify our own player)
    console.log('\n🧪 Test 4: Adding visual contract...');
    if (client.playerId) {
      client.addContract(client.playerId, {
        type: 'visual',
        visible: true,
        color: '#FF00FF'
      });
    } else {
      console.log('No player ID available yet, skipping contract test');
    }
    
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Test 5: Interact with something
    console.log('\n🧪 Test 5: Testing interaction...');
    client.interact('wave', null, { message: 'Hello world!' });
    
    await new Promise(resolve => setTimeout(resolve, 500));
    
    console.log('\n🎉 WebSocket protocol test completed!');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    client.close();
  }
}

// Run the test
testEnhancedProtocol();
