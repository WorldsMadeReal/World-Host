export type EntityId = string;
export type LayerId = string;
export interface Vec3 {
    x: number;
    y: number;
    z: number;
}
export interface AABB {
    min: Vec3;
    max: Vec3;
}
export interface ChunkKey {
    layerId: string;
    cx: number;
    cy: number;
    cz: number;
}
export interface Identity extends Contract {
    type: 'identity';
    id: EntityId;
    name?: string;
    description?: string;
}
export interface Contract {
    type: string;
}
export interface Shape extends Contract {
    type: 'shape';
    bounds: AABB;
    geometry?: 'box' | 'sphere' | 'cylinder' | 'mesh';
}
export interface Solidity extends Contract {
    type: 'solidity';
    solid: boolean;
    collisionLayers?: string[];
}
export interface Visual extends Contract {
    type: 'visual';
    color?: string;
    texture?: string;
    material?: string;
    visible: boolean;
}
export interface Entrance extends Contract {
    type: 'entrance';
    targetLayerId: LayerId;
    targetPosition: Vec3;
    enabled: boolean;
}
export interface Mobility extends Contract {
    type: 'mobility';
    position: Vec3;
    velocity?: Vec3;
    maxSpeed?: number;
    acceleration?: number;
}
export interface Portable extends Contract {
    type: 'portable';
    canPickup: boolean;
    weight?: number;
}
export interface Inventory extends Contract {
    type: 'inventory';
    items: EntityId[];
    capacity?: number;
}
export interface Durability extends Contract {
    type: 'durability';
    health: number;
    maxHealth: number;
    armor?: number;
}
export interface ContractLimit extends Contract {
    type: 'contract_limit';
    limits: Array<{
        contractType: string;
        max: number;
    }>;
}
export interface MovementRules extends Contract {
    type: 'movement_rules';
    stepDistance: number;
    allowDiagonal?: boolean;
    diagonalNormalized?: boolean;
}
export interface WorldConditions extends Contract {
    type: 'world_conditions';
    gravity?: number;
    weather?: 'clear' | 'rain' | 'storm' | 'snow';
    timeOfDay?: 'day' | 'night' | 'dawn' | 'dusk';
    terrainSeed?: string;
    properties?: Record<string, any>;
}
export interface WorldCommands extends Contract {
    type: 'world_commands';
    commands: string[];
}
export interface CommandAccess extends Contract {
    type: 'command_access';
    allowed: string[];
}
export type AnyContract = Identity | Shape | Solidity | Visual | Entrance | Mobility | Portable | Inventory | Durability | ContractLimit | MovementRules | WorldConditions | WorldCommands | CommandAccess;
export declare function isContract<T extends AnyContract>(contract: Contract, type: T['type']): contract is T;
export declare function hasContract<T extends AnyContract>(contracts: Set<Contract>, type: T['type']): T | undefined;
export interface ClientJoinMessage {
    type: 'join';
    layerId: LayerId;
    playerName?: string;
}
export interface ClientMoveMessage {
    type: 'move';
    entityId: EntityId;
    position: Vec3;
    velocity?: Vec3;
}
export interface ClientInteractMessage {
    type: 'interact';
    entityId: EntityId;
    targetId?: EntityId;
    action: 'pickup' | 'drop' | 'use' | 'attack';
}
export interface ClientChatMessage {
    type: 'chat';
    message: string;
}
export type ClientMessage = ClientJoinMessage | ClientMoveMessage | ClientInteractMessage | ClientChatMessage;
export interface ClientLoginMessage {
    type: 'login';
    layerId?: LayerId;
    playerName?: string;
}
export interface ClientLogoutMessage {
    type: 'logout';
}
export interface ClientSetViewMessage {
    type: 'set_view';
    radius: number;
}
export interface ClientMoveDirMessage {
    type: 'move_dir';
    directions: Array<'north' | 'south' | 'east' | 'west'>;
}
export type ClientEnhancedMessage = ClientMessage | ClientLoginMessage | ClientLogoutMessage | ClientSetViewMessage | ClientMoveDirMessage;
export interface ServerWelcomeMessage {
    type: 'welcome';
    playerId: EntityId;
    layerId: LayerId;
}
export interface ServerEntityUpdateMessage {
    type: 'entity_update';
    entityId: EntityId;
    contracts: AnyContract[];
    removed?: boolean;
}
export interface ServerChunkDataMessage {
    type: 'chunk_data';
    chunkKey: ChunkKey;
    entities: Array<{
        id: EntityId;
        contracts: AnyContract[];
    }>;
}
export interface ServerChatMessage {
    type: 'chat';
    playerId: EntityId;
    playerName: string;
    message: string;
    timestamp: number;
}
export interface ServerErrorMessage {
    type: 'error';
    code: string;
    message: string;
}
export type ServerMessage = ServerWelcomeMessage | ServerEntityUpdateMessage | ServerChunkDataMessage | ServerChatMessage | ServerErrorMessage;
export interface ServerLoginOkMessage {
    type: 'login_ok';
    playerId: EntityId;
    layerId: LayerId;
}
export interface ServerLogoutOkMessage {
    type: 'logout_ok';
}
export interface ServerSetViewOkMessage {
    type: 'set_view_ok';
    radius: number;
}
export interface ServerMoveResultMessage {
    type: 'move_result';
    success: boolean;
    position: Vec3;
    reason?: string;
}
export type ServerEnhancedMessage = ServerMessage | ServerLoginOkMessage | ServerLogoutOkMessage | ServerSetViewOkMessage | ServerMoveResultMessage;
export declare const Vec3Utils: {
    create(x?: number, y?: number, z?: number): Vec3;
    add(a: Vec3, b: Vec3): Vec3;
    subtract(a: Vec3, b: Vec3): Vec3;
    multiply(v: Vec3, scalar: number): Vec3;
    distance(a: Vec3, b: Vec3): number;
    length(v: Vec3): number;
    normalize(v: Vec3): Vec3;
};
export declare const ChunkUtils: {
    create(layerId: LayerId, cx: number, cy: number, cz: number): ChunkKey;
    toString(key: ChunkKey): string;
    fromString(str: string): ChunkKey | null;
    equals(a: ChunkKey, b: ChunkKey): boolean;
};
//# sourceMappingURL=index.d.ts.map