import { WebSocketServer, WebSocket } from 'ws';
import { IncomingMessage, Server } from 'node:http';
import type { ChunkKey, Vec3, EntityId, AnyContract } from '@worldhost/shared';
import { ChunkUtils } from '@worldhost/shared';
import type { MovementRules, CommandAccess, Mobility } from '@worldhost/shared';
import { keyFromPos, getNeighboringChunks } from './world/space.js';
import type { AppContext } from './app.js';
import type { MoveResult } from './world/systems/movement.js';
import { WS_HEARTBEAT_MS, METRICS_ENABLED } from './config.js';
import { 
  connectedClients, 
  totalConnections, 
  connectionDuration, 
  trackInboundMessage, 
  trackOutboundMessage 
} from './metrics.js';

// Enhanced client message types
export interface HelloMessage {
  type: 'hello';
  clientVersion?: string;
}

export interface SubscribeChunksMessage {
  type: 'subscribe_chunks';
  chunkKeys: ChunkKey[];
}

export interface UnsubscribeChunksMessage {
  type: 'unsubscribe_chunks';
  chunkKeys: ChunkKey[];
}

export interface MoveMessage {
  type: 'move';
  want: Vec3;
}

// New simple login/logout and convenience commands
export interface LoginMessage { type: 'login'; layerId?: string; playerName?: string }
export interface LogoutMessage { type: 'logout' }
export interface SetViewMessage { type: 'set_view'; radius: number }
export interface MoveDirMessage { type: 'move_dir'; directions: Array<'north'|'south'|'east'|'west'> }

export interface InteractMessage {
  type: 'interact';
  targetId?: EntityId;
  action: string;
  data?: any;
}

export interface AddContractMessage {
  type: 'add_contract';
  entityId: EntityId;
  contract: AnyContract;
}

export interface RemoveContractMessage {
  type: 'remove_contract';
  entityId: EntityId;
  contractType: string;
}

// Enhanced server message types
export interface HelloOkMessage {
  type: 'hello_ok';
  clientId: string;
  serverId: string;
  serverVersion: string;
}

export interface ChunkSnapshotMessage {
  type: 'chunk_snapshot';
  chunkKey: ChunkKey;
  entities: Array<{
    id: EntityId;
    contracts: AnyContract[];
  }>;
  version: number;
}

export interface ChunkDeltaMessage {
  type: 'chunk_delta';
  chunkKey: ChunkKey;
  delta: {
    type: 'entity_spawn' | 'entity_despawn' | 'entity_update';
    entityId: EntityId;
    contracts?: AnyContract[];
  };
  version: number;
}

export interface EntityUpdateMessage {
  type: 'entity_update';
  entityId: EntityId;
  contracts: AnyContract[];
  chunkKey?: ChunkKey;
}

export interface EntitySpawnMessage {
  type: 'entity_spawn';
  entityId: EntityId;
  contracts: AnyContract[];
  chunkKey: ChunkKey;
}

export interface EntityDespawnMessage {
  type: 'entity_despawn';
  entityId: EntityId;
  chunkKey: ChunkKey;
}

export interface MoveResultMessage {
  type: 'move_result';
  success: boolean;
  position: Vec3;
  reason?: string;
}

export interface ErrorMessage {
  type: 'error';
  code: string;
  message: string;
}

// Union types for enhanced messages
export type EnhancedClientMessage = 
  | HelloMessage
  | SubscribeChunksMessage 
  | UnsubscribeChunksMessage
  | MoveMessage
  | InteractMessage
  | AddContractMessage
  | RemoveContractMessage
  | LoginMessage
  | LogoutMessage
  | SetViewMessage
  | MoveDirMessage;

export type EnhancedServerMessage = 
  | HelloOkMessage
  | ChunkSnapshotMessage
  | ChunkDeltaMessage
  | EntityUpdateMessage
  | EntitySpawnMessage
  | EntityDespawnMessage
  | MoveResultMessage
  | { type: 'login_ok'; playerId: string; layerId: string }
  | { type: 'logout_ok' }
  | { type: 'set_view_ok'; radius: number }
  | ErrorMessage;

export interface ClientConnection {
  ws: WebSocket;
  clientId: string;
  playerId?: string;
  isAlive: boolean;
  subscribedChunks: Set<string>; // ChunkKey strings
  lastActivity: number;
  viewRadius?: number;
}

export function setupEnhancedWebSocketServer(httpServer: Server, context: AppContext) {
  const wss = new WebSocketServer({ 
    server: httpServer,
    path: '/ws'
  });

  // Prevent unhandled error from crashing process (e.g., EADDRINUSE bubbling)
  wss.on('error', (err: Error) => {
    console.error('WebSocketServer error:', err.message);
  });

  const clients = new Map<WebSocket, ClientConnection>();
  const clientsById = new Map<string, ClientConnection>();
  const chunkSubscriptions = new Map<string, Set<string>>(); // ChunkKey -> Set<clientId>
  
  // Generate unique server ID
  const serverId = `server-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  
  // Track entity positions for chunk change detection
  const entityPositions = new Map<EntityId, Vec3>();

  // Heartbeat interval to detect dead connections
  const heartbeatInterval = setInterval(() => {
    wss.clients.forEach((ws) => {
      const client = clients.get(ws);
      if (!client) return;

      if (!client.isAlive) {
        ws.terminate();
        return;
      }

      client.isAlive = false;
      ws.ping();
    });
  }, WS_HEARTBEAT_MS);

  wss.on('connection', (ws: WebSocket, req: IncomingMessage) => {
    console.log('🔗 New WebSocket connection from:', req.socket.remoteAddress);

    // Generate unique client ID
    const clientId = `client-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const connectionStartTime = Date.now();
    
    const client: ClientConnection = {
      ws,
      clientId,
      isAlive: true,
      subscribedChunks: new Set(),
      lastActivity: Date.now(),
    };
    
    clients.set(ws, client);
    clientsById.set(clientId, client);
    
    // Track connection metrics
    if (METRICS_ENABLED) {
      totalConnections.inc();
      connectedClients.inc();
    }
    
    // Send hello_ok immediately
    sendMessage(ws, {
      type: 'hello_ok',
      clientId,
      serverId,
      serverVersion: '1.0.0',
    });
    context.devEvents.publish({ type: 'ws_connect', payload: { clientId, remote: req.socket.remoteAddress } });

    // Handle pong responses for heartbeat
    ws.on('pong', () => {
      const client = clients.get(ws);
      if (client) {
        client.isAlive = true;
      }
    });

    // Handle incoming messages
    ws.on('message', (data: Buffer) => {
      client.lastActivity = Date.now();
      
      try {
        const message: EnhancedClientMessage = JSON.parse(data.toString());
        
        // Track message metrics
        if (METRICS_ENABLED) {
          trackInboundMessage(message.type, clientId);
        }
        
        handleEnhancedClientMessage(ws, client, message, context, chunkSubscriptions, entityPositions);
      } catch (error) {
        console.error('Failed to parse message:', error);
        sendMessage(ws, {
          type: 'error',
          code: 'INVALID_MESSAGE',
          message: 'Failed to parse message',
        });
      }
    });

    // Handle connection close
    ws.on('close', (code: number, reason: Buffer) => {
      console.log('🔌 WebSocket disconnected:', code, reason.toString());
      
      const client = clients.get(ws);
      if (client) {
        // Track connection duration
        if (METRICS_ENABLED) {
          const duration = (Date.now() - connectionStartTime) / 1000;
          connectionDuration.observe(duration);
          connectedClients.dec();
        }
        
        // Clean up player
        if (client.playerId) {
          context.worldState.removePlayer(client.playerId);
        }
        
        // Clean up chunk subscriptions
        cleanupClientSubscriptions(client, chunkSubscriptions);
        
        // Remove from maps
        clients.delete(ws);
        clientsById.delete(client.clientId);
      }
      context.devEvents.publish({ type: 'ws_disconnect', payload: { clientId, code, reason: reason.toString() } });
    });

    // Handle errors
    ws.on('error', (error: Error) => {
      console.error('WebSocket error:', error);
      const client = clients.get(ws);
      if (client) {
        cleanupClientSubscriptions(client, chunkSubscriptions);
        clients.delete(ws);
        clientsById.delete(client.clientId);
      }
      context.devEvents.publish({ type: 'ws_error', payload: { clientId, message: error.message } });
    });
  });

  wss.on('close', () => {
    clearInterval(heartbeatInterval);
  });

  // Utility functions
  function cleanupClientSubscriptions(client: ClientConnection, subscriptions: Map<string, Set<string>>) {
    for (const chunkKeyStr of client.subscribedChunks) {
      const subscribers = subscriptions.get(chunkKeyStr);
      if (subscribers) {
        subscribers.delete(client.clientId);
        if (subscribers.size === 0) {
          subscriptions.delete(chunkKeyStr);
        }
      }
    }
    client.subscribedChunks.clear();
  }
  
  function broadcastToChunkSubscribers(
    chunkKey: ChunkKey, 
    message: EnhancedServerMessage, 
    excludeClientId?: string
  ) {
    const chunkKeyStr = ChunkUtils.toString(chunkKey);
    const subscribers = chunkSubscriptions.get(chunkKeyStr);
    
    if (!subscribers) return;
    
    const messageStr = JSON.stringify(message);
    
    for (const clientId of subscribers) {
      if (clientId === excludeClientId) continue;
      
      const client = clientsById.get(clientId);
      if (client && client.ws.readyState === WebSocket.OPEN) {
        client.ws.send(messageStr);
      }
    }
  }
  
  return { wss, broadcastToChunkSubscribers, clients, clientsById, chunkSubscriptions };
}

function handleEnhancedClientMessage(
  ws: WebSocket, 
  client: ClientConnection, 
  message: EnhancedClientMessage, 
  context: AppContext,
  chunkSubscriptions: Map<string, Set<string>>,
  entityPositions: Map<EntityId, Vec3>
) {
  console.log('📨 Received message:', message.type, client.clientId);
  context.devEvents.publish({ type: 'ws_message_in', payload: { clientId: client.clientId, type: message.type } });

  switch (message.type) {
    case 'login':
      handleLoginMessage(ws, client, message, context, chunkSubscriptions);
      context.devEvents.publish({ type: 'command', payload: { clientId: client.clientId, command: 'login' } });
      break;
    case 'logout':
      handleLogoutMessage(ws, client, context, chunkSubscriptions);
      context.devEvents.publish({ type: 'command', payload: { clientId: client.clientId, command: 'logout' } });
      break;
    case 'set_view':
      handleSetViewMessage(ws, client, message, context, chunkSubscriptions);
      context.devEvents.publish({ type: 'command', payload: { clientId: client.clientId, command: 'set_view', data: message.radius } });
      break;
    case 'move_dir':
      handleMoveDirMessage(ws, client, message, context, chunkSubscriptions, entityPositions);
      context.devEvents.publish({ type: 'command', payload: { clientId: client.clientId, command: 'move_dir', data: message.directions } });
      break;
    case 'hello':
      // Hello already handled in connection setup
      break;
      
    case 'subscribe_chunks':
      handleSubscribeChunks(ws, client, message, context, chunkSubscriptions);
      context.devEvents.publish({ type: 'command', payload: { clientId: client.clientId, command: 'subscribe_chunks', data: message.chunkKeys } });
      break;
      
    case 'unsubscribe_chunks':
      handleUnsubscribeChunks(ws, client, message, chunkSubscriptions);
      context.devEvents.publish({ type: 'command', payload: { clientId: client.clientId, command: 'unsubscribe_chunks', data: message.chunkKeys } });
      break;
      
    case 'move':
      handleMoveMessage(ws, client, message, context, chunkSubscriptions, entityPositions);
      context.devEvents.publish({ type: 'command', payload: { clientId: client.clientId, command: 'move' } });
      break;
      
    case 'interact':
      handleInteractMessage(ws, client, message, context);
      context.devEvents.publish({ type: 'command', payload: { clientId: client.clientId, command: 'interact', data: { action: message.action } } });
      break;
      
    case 'add_contract':
      handleAddContractMessage(ws, client, message, context, chunkSubscriptions);
      context.devEvents.publish({ type: 'command', payload: { clientId: client.clientId, command: 'add_contract', data: { entityId: message.entityId, type: message.contract.type } } });
      break;
      
    case 'remove_contract':
      handleRemoveContractMessage(ws, client, message, context, chunkSubscriptions);
      context.devEvents.publish({ type: 'command', payload: { clientId: client.clientId, command: 'remove_contract', data: { entityId: message.entityId, type: message.contractType } } });
      break;
      
    default:
      sendMessage(ws, {
        type: 'error',
        code: 'UNKNOWN_MESSAGE_TYPE',
        message: `Unknown message type: ${(message as any).type}`,
      });
  }
}

function handleSubscribeChunks(
  ws: WebSocket,
  client: ClientConnection,
  message: SubscribeChunksMessage,
  context: AppContext,
  chunkSubscriptions: Map<string, Set<string>>
) {
  for (const chunkKey of message.chunkKeys) {
    const chunkKeyStr = ChunkUtils.toString(chunkKey);
    
    // Add to client's subscriptions
    client.subscribedChunks.add(chunkKeyStr);
    
    // Add to global subscriptions
    let subscribers = chunkSubscriptions.get(chunkKeyStr);
    if (!subscribers) {
      subscribers = new Set();
      chunkSubscriptions.set(chunkKeyStr, subscribers);
    }
    subscribers.add(client.clientId);
    
    // Send chunk snapshot
    sendChunkSnapshot(ws, chunkKey, context);
    
    console.log(`📡 Client ${client.clientId} subscribed to chunk ${chunkKeyStr}`);
  }
}

function ensurePlayer(client: ClientConnection, context: AppContext): string {
  if (!client.playerId) {
    client.playerId = context.worldState.addPlayer('default', `Player-${client.clientId.slice(-4)}`);
    console.log(`🎮 Created player ${client.playerId} for client ${client.clientId}`);
  }
  return client.playerId;
}

function isCommandAllowed(
  client: ClientConnection,
  context: AppContext,
  command: string
): boolean {
  const ecs = context.worldState.getECSWorld();
  const worldEntities = ecs.getEntitiesWithContract('world_commands');
  if (worldEntities.length > 0) {
    const worldCmds = ecs.getContract<any>(worldEntities[0]!, 'world_commands') as { commands?: string[] } | undefined;
    if (worldCmds?.commands && !worldCmds.commands.includes(command)) {
      return false;
    }
  }
  if (!client.playerId) return command === 'login';
  const access = ecs.getContract<CommandAccess>(client.playerId, 'command_access');
  if (access?.allowed) return access.allowed.includes(command);
  return false;
}

function computeViewChunks(layerId: string, position: Vec3, radius: number): ChunkKey[] {
  const center = keyFromPos(layerId, position);
  const chunkRadius = Math.max(0, Math.ceil(radius / 32));
  return getNeighboringChunks(center, chunkRadius);
}

function updateAutoSubscriptions(
  client: ClientConnection,
  context: AppContext,
  chunkSubscriptions: Map<string, Set<string>>
) {
  if (!client.playerId || !client.viewRadius) return;
  const ecs = context.worldState.getECSWorld();
  const mobility = ecs.getContract<Mobility>(client.playerId, 'mobility');
  if (!mobility) return;
  const desired = computeViewChunks('default', mobility.position, client.viewRadius);
  const desiredSet = new Set(desired.map(ChunkUtils.toString));
  for (const keyStr of Array.from(client.subscribedChunks)) {
    if (!desiredSet.has(keyStr)) {
      const subs = chunkSubscriptions.get(keyStr);
      if (subs) {
        subs.delete(client.clientId);
        if (subs.size === 0) chunkSubscriptions.delete(keyStr);
      }
      client.subscribedChunks.delete(keyStr);
    }
  }
  for (const keyStr of desiredSet) {
    if (!client.subscribedChunks.has(keyStr)) {
      client.subscribedChunks.add(keyStr);
      let subs = chunkSubscriptions.get(keyStr);
      if (!subs) { subs = new Set(); chunkSubscriptions.set(keyStr, subs); }
      subs.add(client.clientId);
      const key = ChunkUtils.fromString(keyStr);
      if (key) sendChunkSnapshot(client.ws, key, context);
    }
  }
}

function handleLoginMessage(
  ws: WebSocket,
  client: ClientConnection,
  message: LoginMessage,
  context: AppContext,
  chunkSubscriptions: Map<string, Set<string>>
) {
  if (!isCommandAllowed(client, context, 'login')) {
    sendMessage(ws, { type: 'error', code: 'FORBIDDEN', message: 'login not allowed' });
    return;
  }
  const layerId = message.layerId || 'default';
  if (!client.playerId) {
    client.playerId = context.worldState.addPlayer(layerId, message.playerName || `Player-${client.clientId.slice(-4)}`);
    console.log(`✅ Login: ${client.clientId} -> ${client.playerId} on ${layerId}`);
  }
  sendMessage(ws, { type: 'login_ok', playerId: client.playerId!, layerId } as any);
}

function handleLogoutMessage(
  ws: WebSocket,
  client: ClientConnection,
  context: AppContext,
  chunkSubscriptions: Map<string, Set<string>>
) {
  if (!isCommandAllowed(client, context, 'logout')) {
    sendMessage(ws, { type: 'error', code: 'FORBIDDEN', message: 'logout not allowed' });
    return;
  }
  if (client.playerId) {
    context.worldState.removePlayer(client.playerId);
    client.playerId = undefined;
  }
  // Unsubscribe from all chunks
  for (const keyStr of client.subscribedChunks) {
    const set = chunkSubscriptions.get(keyStr);
    if (set) {
      set.delete(client.clientId);
      if (set.size === 0) chunkSubscriptions.delete(keyStr);
    }
  }
  client.subscribedChunks.clear();
  sendMessage(ws, { type: 'logout_ok' } as any);
}

function handleSetViewMessage(
  ws: WebSocket,
  client: ClientConnection,
  message: SetViewMessage,
  context: AppContext,
  chunkSubscriptions: Map<string, Set<string>>
) {
  if (!isCommandAllowed(client, context, 'set_view')) {
    sendMessage(ws, { type: 'error', code: 'FORBIDDEN', message: 'set_view not allowed' });
    return;
  }
  const playerId = ensurePlayer(client, context);
  const world = context.worldState.getECSWorld();
  const mobility = world.getContract<Mobility>(playerId, 'mobility');
  if (!mobility) return;
  client.viewRadius = Math.max(0, message.radius);
  updateAutoSubscriptions(client, context, chunkSubscriptions);
  sendMessage(ws, { type: 'set_view_ok', radius: client.viewRadius } as any);
}

function handleMoveDirMessage(
  ws: WebSocket,
  client: ClientConnection,
  message: MoveDirMessage,
  context: AppContext,
  chunkSubscriptions: Map<string, Set<string>>,
  entityPositions: Map<EntityId, Vec3>
) {
  if (!isCommandAllowed(client, context, 'move_dir')) {
    sendMessage(ws, { type: 'error', code: 'FORBIDDEN', message: 'move_dir not allowed' });
    return;
  }
  const playerId = ensurePlayer(client, context);
  const ecs = context.worldState.getECSWorld();
  const mobility = ecs.getContract<Mobility>(playerId, 'mobility');
  if (!mobility) return;
  const movementRules = ecs.getContract<MovementRules>(playerId, 'movement_rules');
  const step = movementRules?.stepDistance ?? 1;

  let dx = 0; let dz = 0;
  const dirs = new Set(message.directions.slice(0, 2));
  if (dirs.has('north')) dz -= 1;
  if (dirs.has('south')) dz += 1;
  if (dirs.has('west')) dx -= 1;
  if (dirs.has('east')) dx += 1;
  if (dx === 0 && dz === 0) {
    sendMessage(ws, { type: 'move_result', success: true, position: mobility.position });
    return;
  }
  // Normalize diagonal if configured
  if (movementRules?.diagonalNormalized && dx !== 0 && dz !== 0) {
    const inv = 1 / Math.SQRT2;
    dx *= inv; dz *= inv;
  }
  const want = { x: mobility.position.x + dx * step, y: mobility.position.y, z: mobility.position.z + dz * step };
  try {
    const updated: Mobility = { ...mobility, position: want };
    ecs.addContract(playerId, updated);
    entityPositions.set(playerId, want);
    sendMessage(ws, { type: 'move_result', success: true, position: want });
    const defaultChunk: ChunkKey = { layerId: 'default', cx: 0, cy: 0, cz: 0 };
    broadcastEntityUpdate(playerId, defaultChunk, context, chunkSubscriptions, 'entity_update');
    if (client.viewRadius && client.viewRadius > 0) {
      updateAutoSubscriptions(client, context, chunkSubscriptions);
    }
  } catch (err) {
    sendMessage(ws, { type: 'move_result', success: false, position: mobility.position, reason: err instanceof Error ? err.message : 'failed' });
  }
}

function handleUnsubscribeChunks(
  ws: WebSocket,
  client: ClientConnection,
  message: UnsubscribeChunksMessage,
  chunkSubscriptions: Map<string, Set<string>>
) {
  for (const chunkKey of message.chunkKeys) {
    const chunkKeyStr = ChunkUtils.toString(chunkKey);
    
    // Remove from client's subscriptions
    client.subscribedChunks.delete(chunkKeyStr);
    
    // Remove from global subscriptions
    const subscribers = chunkSubscriptions.get(chunkKeyStr);
    if (subscribers) {
      subscribers.delete(client.clientId);
      if (subscribers.size === 0) {
        chunkSubscriptions.delete(chunkKeyStr);
      }
    }
    
    console.log(`📡 Client ${client.clientId} unsubscribed from chunk ${chunkKeyStr}`);
  }
}

function sendChunkSnapshot(ws: WebSocket, chunkKey: ChunkKey, context: AppContext) {
  // Get chunk entities (simplified access)
  const entities: Array<{ id: EntityId; contracts: AnyContract[] }> = [];
  
  // For now, get all entities in the world (TODO: implement proper chunk-based entity retrieval)
  const allEntities = context.worldState.getECSWorld().getAllEntities();
  
  for (const entityId of allEntities) {
    const contracts = context.worldState.getECSWorld().getContracts(entityId);
    entities.push({ id: entityId, contracts: contracts as AnyContract[] });
  }
  
  const message: ChunkSnapshotMessage = {
    type: 'chunk_snapshot',
    chunkKey,
    entities,
    version: 1, // TODO: implement proper versioning
  };
  
  sendMessage(ws, message);
  // Publish snapshots for visualizer
  try {
    for (const e of entities) {
      const identity = (e.contracts as any[]).find(c => c.type === 'identity');
      const kind = (identity?.name || '').toLowerCase().includes('player') ? 'player' : (identity?.name ? identity.name.toLowerCase() : 'entity');
      context.devEvents.publish({ type: 'entity_snapshot', payload: { id: e.id, contracts: e.contracts, kind } });
    }
  } catch {}
}

function handleMoveMessage(
  ws: WebSocket,
  client: ClientConnection,
  message: MoveMessage,
  context: AppContext,
  chunkSubscriptions: Map<string, Set<string>>,
  entityPositions: Map<EntityId, Vec3>
) {
  if (!client.playerId) {
    // Create a player if none exists
    client.playerId = context.worldState.addPlayer('default', `Player-${client.clientId.slice(-4)}`);
    console.log(`🎮 Created player ${client.playerId} for client ${client.clientId}`);
  }

  // For now, use a simple movement system (TODO: integrate with proper movement system)
  const mobility = context.worldState.getECSWorld().getContract(client.playerId, 'mobility');
  if (mobility) {
    const currentPos = (mobility as any).position;
    const newPos = message.want;
    
    // Simple collision-free movement for demo
    const updatedMobility = {
      ...mobility,
      position: newPos,
    };
    
    try {
      context.worldState.getECSWorld().addContract(client.playerId, updatedMobility);
      
      // Update position tracking
      entityPositions.set(client.playerId, newPos);
      
      // Send success result
      sendMessage(ws, {
        type: 'move_result',
        success: true,
        position: newPos,
      });
      
      // Broadcast entity update (simplified - assume default chunk)
      const defaultChunk: ChunkKey = { layerId: 'default', cx: 0, cy: 0, cz: 0 };
      broadcastEntityUpdate(client.playerId, defaultChunk, context, chunkSubscriptions, 'entity_update');
      
      console.log(`🚶 Player ${client.playerId} moved to:`, newPos);
    } catch (error) {
      sendMessage(ws, {
        type: 'move_result',
        success: false,
        position: currentPos,
        reason: error instanceof Error ? error.message : 'Movement failed',
      });
    }
  }
}

function handleInteractMessage(
  ws: WebSocket,
  client: ClientConnection,
  message: InteractMessage,
  context: AppContext
) {
  if (!client.playerId) {
    sendMessage(ws, {
      type: 'error',
      code: 'NOT_AUTHENTICATED',
      message: 'Must have player entity to interact',
    });
    return;
  }

  // TODO: Handle interaction logic based on action type
  console.log(`🤝 Player ${client.playerId} performed action:`, message.action, message.data);
  
  // For now, just acknowledge the interaction
  sendMessage(ws, {
    type: 'error',
    code: 'NOT_IMPLEMENTED',
    message: 'Interaction system not yet implemented',
  });
}

function handleAddContractMessage(
  ws: WebSocket,
  client: ClientConnection,
  message: AddContractMessage,
  context: AppContext,
  chunkSubscriptions: Map<string, Set<string>>
) {
  try {
    // Validate that client can modify this entity (for now, only their own player)
    if (message.entityId !== client.playerId) {
      sendMessage(ws, {
        type: 'error',
        code: 'PERMISSION_DENIED',
        message: 'Can only modify your own player entity',
      });
      return;
    }
    
    // Add contract to entity
    context.worldState.getECSWorld().addContract(message.entityId, message.contract);
    
    // Broadcast update to chunk subscribers (simplified)
    const defaultChunk: ChunkKey = { layerId: 'default', cx: 0, cy: 0, cz: 0 };
    broadcastEntityUpdate(message.entityId, defaultChunk, context, chunkSubscriptions, 'entity_update');
    
    console.log(`➕ Added contract ${message.contract.type} to entity ${message.entityId}`);
    
  } catch (error) {
    sendMessage(ws, {
      type: 'error',
      code: 'ADD_CONTRACT_FAILED',
      message: error instanceof Error ? error.message : 'Failed to add contract',
    });
  }
}

function handleRemoveContractMessage(
  ws: WebSocket,
  client: ClientConnection,
  message: RemoveContractMessage,
  context: AppContext,
  chunkSubscriptions: Map<string, Set<string>>
) {
  try {
    // Validate that client can modify this entity (for now, only their own player)
    if (message.entityId !== client.playerId) {
      sendMessage(ws, {
        type: 'error',
        code: 'PERMISSION_DENIED',
        message: 'Can only modify your own player entity',
      });
      return;
    }
    
    // Remove contract from entity
    const success = context.worldState.getECSWorld().removeContract(message.entityId, message.contractType);
    
    if (success) {
      // Broadcast update to chunk subscribers (simplified)
      const defaultChunk: ChunkKey = { layerId: 'default', cx: 0, cy: 0, cz: 0 };
      broadcastEntityUpdate(message.entityId, defaultChunk, context, chunkSubscriptions, 'entity_update');
      
      console.log(`➖ Removed contract ${message.contractType} from entity ${message.entityId}`);
    } else {
      sendMessage(ws, {
        type: 'error',
        code: 'CONTRACT_NOT_FOUND',
        message: `Contract ${message.contractType} not found on entity`,
      });
    }
    
  } catch (error) {
    sendMessage(ws, {
      type: 'error',
      code: 'REMOVE_CONTRACT_FAILED',
      message: error instanceof Error ? error.message : 'Failed to remove contract',
    });
  }
}

function broadcastEntityUpdate(
  entityId: EntityId,
  chunkKey: ChunkKey,
  context: AppContext,
  chunkSubscriptions: Map<string, Set<string>>,
  updateType: 'entity_spawn' | 'entity_despawn' | 'entity_update'
) {
  const chunkKeyStr = ChunkUtils.toString(chunkKey);
  const subscribers = chunkSubscriptions.get(chunkKeyStr);
  
  if (!subscribers || subscribers.size === 0) return;
  
  let message: EnhancedServerMessage;
  
  if (updateType === 'entity_despawn') {
    message = {
      type: 'entity_despawn',
      entityId,
      chunkKey,
    };
    try { context.devEvents.publish({ type: 'entity_despawn', payload: { id: entityId } }); } catch {}
  } else {
    const contracts = context.worldState.getECSWorld().getContracts(entityId) as AnyContract[];
    
    if (updateType === 'entity_spawn') {
      message = {
        type: 'entity_spawn',
        entityId,
        contracts,
        chunkKey,
      };
      try {
        const identity = (contracts as any[]).find(c => c.type === 'identity');
        const kind = (identity?.name || '').toLowerCase().includes('player') ? 'player' : (identity?.name ? identity.name.toLowerCase() : 'entity');
        context.devEvents.publish({ type: 'entity_snapshot', payload: { id: entityId, contracts, kind } });
      } catch {}
    } else {
      message = {
        type: 'entity_update',
        entityId,
        contracts,
        chunkKey,
      };
      try {
        const identity = (contracts as any[]).find(c => c.type === 'identity');
        const kind = (identity?.name || '').toLowerCase().includes('player') ? 'player' : (identity?.name ? identity.name.toLowerCase() : 'entity');
        context.devEvents.publish({ type: 'entity_update', payload: { id: entityId, contracts, kind } });
      } catch {}
    }
  }
  
  const messageStr = JSON.stringify(message);
  
  // Get clients by ID from context (TODO: better client management)
  for (const clientId of subscribers) {
    // For now, broadcast to all connected clients (simplified)
    console.log(`📡 Broadcasting ${updateType} for entity ${entityId} to ${subscribers.size} subscribers`);
  }
}

function sendMessage(ws: WebSocket, message: EnhancedServerMessage) {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(message));
    
    // Track outbound message
    if (METRICS_ENABLED) {
      trackOutboundMessage(message.type);
    }
  }
}
