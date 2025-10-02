import { WebSocket } from 'ws';
import { IncomingMessage, Server } from 'node:http';
import type { ChunkKey, Vec3, EntityId, AnyContract } from '@worldhost/shared';
import type { AppContext } from './app.js';
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
export interface LoginMessage {
    type: 'login';
    layerId?: string;
    playerName?: string;
}
export interface LogoutMessage {
    type: 'logout';
}
export interface SetViewMessage {
    type: 'set_view';
    radius: number;
}
export interface MoveDirMessage {
    type: 'move_dir';
    directions: Array<'north' | 'south' | 'east' | 'west'>;
}
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
export type EnhancedClientMessage = HelloMessage | SubscribeChunksMessage | UnsubscribeChunksMessage | MoveMessage | InteractMessage | AddContractMessage | RemoveContractMessage | LoginMessage | LogoutMessage | SetViewMessage | MoveDirMessage;
export type EnhancedServerMessage = HelloOkMessage | ChunkSnapshotMessage | ChunkDeltaMessage | EntityUpdateMessage | EntitySpawnMessage | EntityDespawnMessage | MoveResultMessage | {
    type: 'login_ok';
    playerId: string;
    layerId: string;
} | {
    type: 'logout_ok';
} | {
    type: 'set_view_ok';
    radius: number;
} | ErrorMessage;
export interface ClientConnection {
    ws: WebSocket;
    clientId: string;
    playerId?: string;
    isAlive: boolean;
    subscribedChunks: Set<string>;
    lastActivity: number;
    viewRadius?: number;
}
export declare function setupEnhancedWebSocketServer(httpServer: Server, context: AppContext): {
    wss: import("ws").Server<typeof WebSocket, typeof IncomingMessage>;
    broadcastToChunkSubscribers: (chunkKey: ChunkKey, message: EnhancedServerMessage, excludeClientId?: string) => void;
    clients: Map<WebSocket, ClientConnection>;
    clientsById: Map<string, ClientConnection>;
    chunkSubscriptions: Map<string, Set<string>>;
};
//# sourceMappingURL=ws-enhanced.d.ts.map