import { WebSocket } from 'ws';
import { IncomingMessage, Server } from 'node:http';
import type { AppContext } from './app.js';
export interface ClientConnection {
    ws: WebSocket;
    playerId?: string;
    layerId?: string;
    isAlive: boolean;
}
export declare function setupWebSocketServer(httpServer: Server, context: AppContext): import("ws").Server<typeof WebSocket, typeof IncomingMessage>;
//# sourceMappingURL=ws.d.ts.map