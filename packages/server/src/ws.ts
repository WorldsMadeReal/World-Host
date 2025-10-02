import { WebSocketServer, WebSocket } from 'ws';
import { IncomingMessage, Server } from 'node:http';
import type { ClientMessage, ServerMessage } from '@worldhost/shared';
import type { AppContext } from './app.js';

export interface ClientConnection {
  ws: WebSocket;
  playerId?: string;
  layerId?: string;
  isAlive: boolean;
}

export function setupWebSocketServer(httpServer: Server, context: AppContext) {
  const wss = new WebSocketServer({ 
    server: httpServer,
    path: '/ws'
  });

  // Prevent unhandled error events on legacy WS server
  wss.on('error', (err: Error) => {
    console.error('WebSocketServer (legacy) error:', err.message);
  });

  const clients = new Map<WebSocket, ClientConnection>();

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
  }, 30000); // 30 seconds

  wss.on('connection', (ws: WebSocket, req: IncomingMessage) => {
    console.log('🔗 New WebSocket connection from:', req.socket.remoteAddress);
    context.devEvents?.publish?.({ type: 'ws_connect_legacy', payload: { remote: req.socket.remoteAddress } });

    const client: ClientConnection = {
      ws,
      isAlive: true,
    };
    clients.set(ws, client);

    // Handle pong responses for heartbeat
    ws.on('pong', () => {
      const client = clients.get(ws);
      if (client) {
        client.isAlive = true;
      }
    });

    // Handle incoming messages
    ws.on('message', (data: Buffer) => {
      try {
        const message: ClientMessage = JSON.parse(data.toString());
        context.devEvents?.publish?.({ type: 'ws_message_in_legacy', payload: { type: (message as any).type } });
        handleClientMessage(ws, client, message, context);
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
      if (client?.playerId) {
        // Remove player from world
        context.worldState.removePlayer(client.playerId);
      }
      
      clients.delete(ws);
    });

    // Handle errors
    ws.on('error', (error: Error) => {
      console.error('WebSocket error:', error);
      clients.delete(ws);
    });
  });

  wss.on('close', () => {
    clearInterval(heartbeatInterval);
  });

  return wss;
}

function handleClientMessage(
  ws: WebSocket, 
  client: ClientConnection, 
  message: ClientMessage, 
  context: AppContext
) {
  console.log('📨 Received message:', message.type, client.playerId || 'anonymous');

  switch (message.type) {
    case 'join':
      handleJoinMessage(ws, client, message, context);
      break;
    case 'move':
      handleMoveMessage(ws, client, message, context);
      break;
    case 'interact':
      handleInteractMessage(ws, client, message, context);
      break;
    case 'chat':
      handleChatMessage(ws, client, message, context);
      break;
    default:
      sendMessage(ws, {
        type: 'error',
        code: 'UNKNOWN_MESSAGE_TYPE',
        message: `Unknown message type: ${(message as any).type}`,
      });
  }
}

function handleJoinMessage(
  ws: WebSocket,
  client: ClientConnection,
  message: { type: 'join'; layerId: string; playerName?: string },
  context: AppContext
) {
  try {
    const playerId = context.worldState.addPlayer(message.layerId, message.playerName);
    
    client.playerId = playerId;
    client.layerId = message.layerId;

    sendMessage(ws, {
      type: 'welcome',
      playerId,
      layerId: message.layerId,
    });

    console.log(`✅ Player ${playerId} joined layer ${message.layerId}`);
  } catch (error) {
    console.error('Failed to handle join message:', error);
    sendMessage(ws, {
      type: 'error',
      code: 'JOIN_FAILED',
      message: 'Failed to join the world',
    });
  }
}

function handleMoveMessage(
  ws: WebSocket,
  client: ClientConnection,
  message: { type: 'move'; entityId: string; position: any; velocity?: any },
  context: AppContext
) {
  if (!client.playerId) {
    sendMessage(ws, {
      type: 'error',
      code: 'NOT_AUTHENTICATED',
      message: 'Must join before moving',
    });
    return;
  }

  // TODO: Validate movement and update entity position
  console.log(`🚶 Player ${client.playerId} moved to:`, message.position);
}

function handleInteractMessage(
  ws: WebSocket,
  client: ClientConnection,
  message: { type: 'interact'; entityId: string; targetId?: string; action: string },
  context: AppContext
) {
  if (!client.playerId) {
    sendMessage(ws, {
      type: 'error',
      code: 'NOT_AUTHENTICATED',
      message: 'Must join before interacting',
    });
    return;
  }

  // TODO: Handle interaction logic
  console.log(`🤝 Player ${client.playerId} performed action:`, message.action);
}

function handleChatMessage(
  ws: WebSocket,
  client: ClientConnection,
  message: { type: 'chat'; message: string },
  context: AppContext
) {
  if (!client.playerId) {
    sendMessage(ws, {
      type: 'error',
      code: 'NOT_AUTHENTICATED',
      message: 'Must join before chatting',
    });
    return;
  }

  // TODO: Broadcast chat message to other players
  console.log(`💬 Player ${client.playerId} says:`, message.message);
}

function sendMessage(ws: WebSocket, message: ServerMessage) {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(message));
  }
}
