import { WorldState } from './world/state.js';
import { ChunkManager } from './world/chunks.js';
import { BasicMovementSystem } from './world/systems/movement.js';
import { BasicDurabilitySystem } from './world/systems/durability.js';
import { DevEventHub } from './dev/events.js';
export interface AppContext {
    worldState: WorldState;
    chunkManager: ChunkManager;
    movementSystem: BasicMovementSystem;
    durabilitySystem: BasicDurabilitySystem;
    devEvents: DevEventHub;
}
export declare function createApp(): {
    fastify: import("fastify").FastifyInstance<import("http").Server<typeof import("http").IncomingMessage, typeof import("http").ServerResponse>, import("http").IncomingMessage, import("http").ServerResponse<import("http").IncomingMessage>, import("fastify").FastifyBaseLogger, import("fastify").FastifyTypeProviderDefault> & PromiseLike<import("fastify").FastifyInstance<import("http").Server<typeof import("http").IncomingMessage, typeof import("http").ServerResponse>, import("http").IncomingMessage, import("http").ServerResponse<import("http").IncomingMessage>, import("fastify").FastifyBaseLogger, import("fastify").FastifyTypeProviderDefault>>;
    wsServer: {
        wss: import("ws").Server<typeof import("ws").default, typeof import("http").IncomingMessage>;
        broadcastToChunkSubscribers: (chunkKey: import("@worldhost/shared").ChunkKey, message: import("./ws-enhanced.js").EnhancedServerMessage, excludeClientId?: string) => void;
        clients: Map<import("ws").default, import("./ws-enhanced.js").ClientConnection>;
        clientsById: Map<string, import("./ws-enhanced.js").ClientConnection>;
        chunkSubscriptions: Map<string, Set<string>>;
    };
    context: AppContext;
};
export declare function start(port?: number): Promise<void>;
//# sourceMappingURL=app.d.ts.map