import { WebSocketServer, WebSocket } from 'ws';
export function setupWebSocketServer(httpServer, context) {
    const wss = new WebSocketServer({
        server: httpServer,
        path: '/ws'
    });
    // Prevent unhandled error events on legacy WS server
    wss.on('error', (err) => {
        console.error('WebSocketServer (legacy) error:', err.message);
    });
    const clients = new Map();
    // Heartbeat interval to detect dead connections
    const heartbeatInterval = setInterval(() => {
        wss.clients.forEach((ws) => {
            const client = clients.get(ws);
            if (!client)
                return;
            if (!client.isAlive) {
                ws.terminate();
                return;
            }
            client.isAlive = false;
            ws.ping();
        });
    }, 30000); // 30 seconds
    wss.on('connection', (ws, req) => {
        console.log('🔗 New WebSocket connection from:', req.socket.remoteAddress);
        context.devEvents?.publish?.({ type: 'ws_connect_legacy', payload: { remote: req.socket.remoteAddress } });
        const client = {
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
        ws.on('message', (data) => {
            try {
                const message = JSON.parse(data.toString());
                context.devEvents?.publish?.({ type: 'ws_message_in_legacy', payload: { type: message.type } });
                handleClientMessage(ws, client, message, context);
            }
            catch (error) {
                console.error('Failed to parse message:', error);
                sendMessage(ws, {
                    type: 'error',
                    code: 'INVALID_MESSAGE',
                    message: 'Failed to parse message',
                });
            }
        });
        // Handle connection close
        ws.on('close', (code, reason) => {
            console.log('🔌 WebSocket disconnected:', code, reason.toString());
            const client = clients.get(ws);
            if (client?.playerId) {
                // Remove player from world
                context.worldState.removePlayer(client.playerId);
            }
            clients.delete(ws);
        });
        // Handle errors
        ws.on('error', (error) => {
            console.error('WebSocket error:', error);
            clients.delete(ws);
        });
    });
    wss.on('close', () => {
        clearInterval(heartbeatInterval);
    });
    return wss;
}
function handleClientMessage(ws, client, message, context) {
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
                message: `Unknown message type: ${message.type}`,
            });
    }
}
function handleJoinMessage(ws, client, message, context) {
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
    }
    catch (error) {
        console.error('Failed to handle join message:', error);
        sendMessage(ws, {
            type: 'error',
            code: 'JOIN_FAILED',
            message: 'Failed to join the world',
        });
    }
}
function handleMoveMessage(ws, client, message, context) {
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
function handleInteractMessage(ws, client, message, context) {
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
function handleChatMessage(ws, client, message, context) {
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
function sendMessage(ws, message) {
    if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify(message));
    }
}
//# sourceMappingURL=ws.js.map