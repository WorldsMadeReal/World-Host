// Core ID types
export type EntityId = string;
export type LayerId = string;

// Geometric types
export interface Vec3 {
  x: number;
  y: number;
  z: number;
}

export interface AABB {
  min: Vec3;
  max: Vec3;
}

// Chunk system
export interface ChunkKey {
  layerId: string;
  cx: number;
  cy: number;
  cz: number;
}

// Identity system
export interface Identity extends Contract {
  type: 'identity';
  id: EntityId;
  name?: string;
  description?: string;
}

// Base contract interface
export interface Contract {
  type: string;
}

// Concrete contract shapes
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

// Movement rules for simple directional movement commands
export interface MovementRules extends Contract {
  type: 'movement_rules';
  stepDistance: number; // distance moved per command
  allowDiagonal?: boolean; // default true
  diagonalNormalized?: boolean; // if true, diagonals are normalized by sqrt(2)
}

// World conditions and rules toggles
export interface WorldConditions extends Contract {
  type: 'world_conditions';
  gravity?: number;
  weather?: 'clear' | 'rain' | 'storm' | 'snow';
  timeOfDay?: 'day' | 'night' | 'dawn' | 'dusk';
  terrainSeed?: string;
  properties?: Record<string, any>;
}

// World-advertised command catalogue
export interface WorldCommands extends Contract {
  type: 'world_commands';
  commands: string[]; // e.g., ['login','logout','set_view','move_dir']
}

// Per-entity command access gate (capabilities)
export interface CommandAccess extends Contract {
  type: 'command_access';
  allowed: string[]; // subset of world commands
}

// Union of all contract types
export type AnyContract = 
  | Identity
  | Shape 
  | Solidity 
  | Visual 
  | Entrance 
  | Mobility 
  | Portable 
  | Inventory 
  | Durability
  | ContractLimit
  | MovementRules
  | WorldConditions
  | WorldCommands
  | CommandAccess;

// Type guard helpers
export function isContract<T extends AnyContract>(
  contract: Contract, 
  type: T['type']
): contract is T {
  return contract.type === type;
}

export function hasContract<T extends AnyContract>(
  contracts: Set<Contract>, 
  type: T['type']
): T | undefined {
  for (const contract of contracts) {
    if (isContract<T>(contract, type)) {
      return contract;
    }
  }
  return undefined;
}

// WebSocket message types - Client to Server
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

export type ClientMessage = 
  | ClientJoinMessage 
  | ClientMoveMessage 
  | ClientInteractMessage 
  | ClientChatMessage;

// Extended client -> server messages (optional usage by enhanced WS)
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
  radius: number; // meters
}

export interface ClientMoveDirMessage {
  type: 'move_dir';
  directions: Array<'north' | 'south' | 'east' | 'west'>; // up to 2
}

export type ClientEnhancedMessage =
  | ClientMessage
  | ClientLoginMessage
  | ClientLogoutMessage
  | ClientSetViewMessage
  | ClientMoveDirMessage;

// WebSocket message types - Server to Client
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

export type ServerMessage = 
  | ServerWelcomeMessage 
  | ServerEntityUpdateMessage 
  | ServerChunkDataMessage 
  | ServerChatMessage 
  | ServerErrorMessage;

// Extended server -> client messages
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

export type ServerEnhancedMessage =
  | ServerMessage
  | ServerLoginOkMessage
  | ServerLogoutOkMessage
  | ServerSetViewOkMessage
  | ServerMoveResultMessage;

// Utility functions for working with Vec3
export const Vec3Utils = {
  create(x = 0, y = 0, z = 0): Vec3 {
    return { x, y, z };
  },

  add(a: Vec3, b: Vec3): Vec3 {
    return { x: a.x + b.x, y: a.y + b.y, z: a.z + b.z };
  },

  subtract(a: Vec3, b: Vec3): Vec3 {
    return { x: a.x - b.x, y: a.y - b.y, z: a.z - b.z };
  },

  multiply(v: Vec3, scalar: number): Vec3 {
    return { x: v.x * scalar, y: v.y * scalar, z: v.z * scalar };
  },

  distance(a: Vec3, b: Vec3): number {
    const diff = Vec3Utils.subtract(a, b);
    return Math.sqrt(diff.x * diff.x + diff.y * diff.y + diff.z * diff.z);
  },

  length(v: Vec3): number {
    return Math.sqrt(v.x * v.x + v.y * v.y + v.z * v.z);
  },

  normalize(v: Vec3): Vec3 {
    const len = Vec3Utils.length(v);
    if (len === 0) return { x: 0, y: 0, z: 0 };
    return Vec3Utils.multiply(v, 1 / len);
  }
};

// Utility functions for working with ChunkKey
export const ChunkUtils = {
  create(layerId: LayerId, cx: number, cy: number, cz: number): ChunkKey {
    return { layerId, cx, cy, cz };
  },

  toString(key: ChunkKey): string {
    return `${key.layerId}:${key.cx},${key.cy},${key.cz}`;
  },

  fromString(str: string): ChunkKey | null {
    const match = str.match(/^([^:]+):(-?\d+),(-?\d+),(-?\d+)$/);
    if (!match) return null;
    
    return {
      layerId: match[1]!,
      cx: parseInt(match[2]!, 10),
      cy: parseInt(match[3]!, 10),
      cz: parseInt(match[4]!, 10),
    };
  },

  equals(a: ChunkKey, b: ChunkKey): boolean {
    return a.layerId === b.layerId && a.cx === b.cx && a.cy === b.cy && a.cz === b.cz;
  }
};
