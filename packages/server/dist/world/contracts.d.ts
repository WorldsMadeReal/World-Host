import type { AnyContract, EntityId, Shape, Solidity, Visual, Entrance, Mobility, Portable, Inventory, Durability, Identity, Vec3, AABB, Contract, ContractLimit, MovementRules, WorldConditions, WorldCommands, CommandAccess } from '@worldhost/shared';
import { z } from 'zod';
export declare const CONTRACT_TYPES: {
    readonly IDENTITY: "identity";
    readonly MOBILITY: "mobility";
    readonly SHAPE: "shape";
    readonly VISUAL: "visual";
    readonly SOLIDITY: "solidity";
    readonly ENTRANCE: "entrance";
    readonly PORTABLE: "portable";
    readonly INVENTORY: "inventory";
    readonly DURABILITY: "durability";
    readonly CONTRACT_LIMIT: "contract_limit";
    readonly MOVEMENT_RULES: "movement_rules";
    readonly WORLD_CONDITIONS: "world_conditions";
    readonly WORLD_COMMANDS: "world_commands";
    readonly COMMAND_ACCESS: "command_access";
};
export type ContractType = typeof CONTRACT_TYPES[keyof typeof CONTRACT_TYPES];
export declare const Vec3Schema: z.ZodObject<{
    x: z.ZodNumber;
    y: z.ZodNumber;
    z: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    x: number;
    y: number;
    z: number;
}, {
    x: number;
    y: number;
    z: number;
}>;
export declare const AABBSchema: z.ZodObject<{
    min: z.ZodObject<{
        x: z.ZodNumber;
        y: z.ZodNumber;
        z: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        x: number;
        y: number;
        z: number;
    }, {
        x: number;
        y: number;
        z: number;
    }>;
    max: z.ZodObject<{
        x: z.ZodNumber;
        y: z.ZodNumber;
        z: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        x: number;
        y: number;
        z: number;
    }, {
        x: number;
        y: number;
        z: number;
    }>;
}, "strip", z.ZodTypeAny, {
    min: {
        x: number;
        y: number;
        z: number;
    };
    max: {
        x: number;
        y: number;
        z: number;
    };
}, {
    min: {
        x: number;
        y: number;
        z: number;
    };
    max: {
        x: number;
        y: number;
        z: number;
    };
}>;
export declare const IdentitySchema: z.ZodObject<{
    type: z.ZodLiteral<"identity">;
    id: z.ZodString;
    name: z.ZodOptional<z.ZodString>;
    description: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    type: "identity";
    id: string;
    name?: string | undefined;
    description?: string | undefined;
}, {
    type: "identity";
    id: string;
    name?: string | undefined;
    description?: string | undefined;
}>;
export declare const MobilitySchema: z.ZodObject<{
    type: z.ZodLiteral<"mobility">;
    position: z.ZodObject<{
        x: z.ZodNumber;
        y: z.ZodNumber;
        z: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        x: number;
        y: number;
        z: number;
    }, {
        x: number;
        y: number;
        z: number;
    }>;
    velocity: z.ZodOptional<z.ZodObject<{
        x: z.ZodNumber;
        y: z.ZodNumber;
        z: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        x: number;
        y: number;
        z: number;
    }, {
        x: number;
        y: number;
        z: number;
    }>>;
    maxSpeed: z.ZodOptional<z.ZodNumber>;
    acceleration: z.ZodOptional<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    type: "mobility";
    position: {
        x: number;
        y: number;
        z: number;
    };
    velocity?: {
        x: number;
        y: number;
        z: number;
    } | undefined;
    maxSpeed?: number | undefined;
    acceleration?: number | undefined;
}, {
    type: "mobility";
    position: {
        x: number;
        y: number;
        z: number;
    };
    velocity?: {
        x: number;
        y: number;
        z: number;
    } | undefined;
    maxSpeed?: number | undefined;
    acceleration?: number | undefined;
}>;
export declare const ShapeSchema: z.ZodObject<{
    type: z.ZodLiteral<"shape">;
    bounds: z.ZodObject<{
        min: z.ZodObject<{
            x: z.ZodNumber;
            y: z.ZodNumber;
            z: z.ZodNumber;
        }, "strip", z.ZodTypeAny, {
            x: number;
            y: number;
            z: number;
        }, {
            x: number;
            y: number;
            z: number;
        }>;
        max: z.ZodObject<{
            x: z.ZodNumber;
            y: z.ZodNumber;
            z: z.ZodNumber;
        }, "strip", z.ZodTypeAny, {
            x: number;
            y: number;
            z: number;
        }, {
            x: number;
            y: number;
            z: number;
        }>;
    }, "strip", z.ZodTypeAny, {
        min: {
            x: number;
            y: number;
            z: number;
        };
        max: {
            x: number;
            y: number;
            z: number;
        };
    }, {
        min: {
            x: number;
            y: number;
            z: number;
        };
        max: {
            x: number;
            y: number;
            z: number;
        };
    }>;
    geometry: z.ZodOptional<z.ZodEnum<["box", "sphere", "cylinder", "mesh"]>>;
}, "strip", z.ZodTypeAny, {
    type: "shape";
    bounds: {
        min: {
            x: number;
            y: number;
            z: number;
        };
        max: {
            x: number;
            y: number;
            z: number;
        };
    };
    geometry?: "box" | "sphere" | "cylinder" | "mesh" | undefined;
}, {
    type: "shape";
    bounds: {
        min: {
            x: number;
            y: number;
            z: number;
        };
        max: {
            x: number;
            y: number;
            z: number;
        };
    };
    geometry?: "box" | "sphere" | "cylinder" | "mesh" | undefined;
}>;
export declare const VisualSchema: z.ZodObject<{
    type: z.ZodLiteral<"visual">;
    visible: z.ZodBoolean;
    color: z.ZodOptional<z.ZodString>;
    texture: z.ZodOptional<z.ZodString>;
    material: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    type: "visual";
    visible: boolean;
    color?: string | undefined;
    texture?: string | undefined;
    material?: string | undefined;
}, {
    type: "visual";
    visible: boolean;
    color?: string | undefined;
    texture?: string | undefined;
    material?: string | undefined;
}>;
export declare const SoliditySchema: z.ZodObject<{
    type: z.ZodLiteral<"solidity">;
    solid: z.ZodBoolean;
    collisionLayers: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
}, "strip", z.ZodTypeAny, {
    type: "solidity";
    solid: boolean;
    collisionLayers?: string[] | undefined;
}, {
    type: "solidity";
    solid: boolean;
    collisionLayers?: string[] | undefined;
}>;
export declare const EntranceSchema: z.ZodObject<{
    type: z.ZodLiteral<"entrance">;
    targetLayerId: z.ZodString;
    targetPosition: z.ZodObject<{
        x: z.ZodNumber;
        y: z.ZodNumber;
        z: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        x: number;
        y: number;
        z: number;
    }, {
        x: number;
        y: number;
        z: number;
    }>;
    enabled: z.ZodBoolean;
}, "strip", z.ZodTypeAny, {
    type: "entrance";
    targetLayerId: string;
    targetPosition: {
        x: number;
        y: number;
        z: number;
    };
    enabled: boolean;
}, {
    type: "entrance";
    targetLayerId: string;
    targetPosition: {
        x: number;
        y: number;
        z: number;
    };
    enabled: boolean;
}>;
export declare const PortableSchema: z.ZodObject<{
    type: z.ZodLiteral<"portable">;
    canPickup: z.ZodBoolean;
    weight: z.ZodOptional<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    type: "portable";
    canPickup: boolean;
    weight?: number | undefined;
}, {
    type: "portable";
    canPickup: boolean;
    weight?: number | undefined;
}>;
export declare const InventorySchema: z.ZodObject<{
    type: z.ZodLiteral<"inventory">;
    items: z.ZodArray<z.ZodString, "many">;
    capacity: z.ZodOptional<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    type: "inventory";
    items: string[];
    capacity?: number | undefined;
}, {
    type: "inventory";
    items: string[];
    capacity?: number | undefined;
}>;
export declare const DurabilityObjectSchema: z.ZodObject<{
    type: z.ZodLiteral<"durability">;
    health: z.ZodNumber;
    maxHealth: z.ZodNumber;
    armor: z.ZodOptional<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    type: "durability";
    health: number;
    maxHealth: number;
    armor?: number | undefined;
}, {
    type: "durability";
    health: number;
    maxHealth: number;
    armor?: number | undefined;
}>;
export declare const DurabilitySchema: z.ZodEffects<z.ZodObject<{
    type: z.ZodLiteral<"durability">;
    health: z.ZodNumber;
    maxHealth: z.ZodNumber;
    armor: z.ZodOptional<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    type: "durability";
    health: number;
    maxHealth: number;
    armor?: number | undefined;
}, {
    type: "durability";
    health: number;
    maxHealth: number;
    armor?: number | undefined;
}>, {
    type: "durability";
    health: number;
    maxHealth: number;
    armor?: number | undefined;
}, {
    type: "durability";
    health: number;
    maxHealth: number;
    armor?: number | undefined;
}>;
export declare const ContractLimitSchema: z.ZodObject<{
    type: z.ZodLiteral<"contract_limit">;
    limits: z.ZodArray<z.ZodObject<{
        contractType: z.ZodString;
        max: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        max: number;
        contractType: string;
    }, {
        max: number;
        contractType: string;
    }>, "many">;
}, "strip", z.ZodTypeAny, {
    type: "contract_limit";
    limits: {
        max: number;
        contractType: string;
    }[];
}, {
    type: "contract_limit";
    limits: {
        max: number;
        contractType: string;
    }[];
}>;
export declare const MovementRulesSchema: z.ZodObject<{
    type: z.ZodLiteral<"movement_rules">;
    stepDistance: z.ZodNumber;
    allowDiagonal: z.ZodDefault<z.ZodOptional<z.ZodBoolean>>;
    diagonalNormalized: z.ZodDefault<z.ZodOptional<z.ZodBoolean>>;
}, "strip", z.ZodTypeAny, {
    type: "movement_rules";
    stepDistance: number;
    allowDiagonal: boolean;
    diagonalNormalized: boolean;
}, {
    type: "movement_rules";
    stepDistance: number;
    allowDiagonal?: boolean | undefined;
    diagonalNormalized?: boolean | undefined;
}>;
export declare const WorldConditionsSchema: z.ZodObject<{
    type: z.ZodLiteral<"world_conditions">;
    gravity: z.ZodOptional<z.ZodNumber>;
    weather: z.ZodOptional<z.ZodEnum<["clear", "rain", "storm", "snow"]>>;
    timeOfDay: z.ZodOptional<z.ZodEnum<["day", "night", "dawn", "dusk"]>>;
    terrainSeed: z.ZodOptional<z.ZodString>;
    properties: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodAny>>;
}, "strip", z.ZodTypeAny, {
    type: "world_conditions";
    gravity?: number | undefined;
    weather?: "clear" | "rain" | "storm" | "snow" | undefined;
    timeOfDay?: "day" | "night" | "dawn" | "dusk" | undefined;
    terrainSeed?: string | undefined;
    properties?: Record<string, any> | undefined;
}, {
    type: "world_conditions";
    gravity?: number | undefined;
    weather?: "clear" | "rain" | "storm" | "snow" | undefined;
    timeOfDay?: "day" | "night" | "dawn" | "dusk" | undefined;
    terrainSeed?: string | undefined;
    properties?: Record<string, any> | undefined;
}>;
export declare const WorldCommandsSchema: z.ZodObject<{
    type: z.ZodLiteral<"world_commands">;
    commands: z.ZodArray<z.ZodString, "many">;
}, "strip", z.ZodTypeAny, {
    type: "world_commands";
    commands: string[];
}, {
    type: "world_commands";
    commands: string[];
}>;
export declare const CommandAccessSchema: z.ZodObject<{
    type: z.ZodLiteral<"command_access">;
    allowed: z.ZodArray<z.ZodString, "many">;
}, "strip", z.ZodTypeAny, {
    type: "command_access";
    allowed: string[];
}, {
    type: "command_access";
    allowed: string[];
}>;
export declare const AnyContractSchema: z.ZodDiscriminatedUnion<"type", [z.ZodObject<{
    type: z.ZodLiteral<"identity">;
    id: z.ZodString;
    name: z.ZodOptional<z.ZodString>;
    description: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    type: "identity";
    id: string;
    name?: string | undefined;
    description?: string | undefined;
}, {
    type: "identity";
    id: string;
    name?: string | undefined;
    description?: string | undefined;
}>, z.ZodObject<{
    type: z.ZodLiteral<"mobility">;
    position: z.ZodObject<{
        x: z.ZodNumber;
        y: z.ZodNumber;
        z: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        x: number;
        y: number;
        z: number;
    }, {
        x: number;
        y: number;
        z: number;
    }>;
    velocity: z.ZodOptional<z.ZodObject<{
        x: z.ZodNumber;
        y: z.ZodNumber;
        z: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        x: number;
        y: number;
        z: number;
    }, {
        x: number;
        y: number;
        z: number;
    }>>;
    maxSpeed: z.ZodOptional<z.ZodNumber>;
    acceleration: z.ZodOptional<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    type: "mobility";
    position: {
        x: number;
        y: number;
        z: number;
    };
    velocity?: {
        x: number;
        y: number;
        z: number;
    } | undefined;
    maxSpeed?: number | undefined;
    acceleration?: number | undefined;
}, {
    type: "mobility";
    position: {
        x: number;
        y: number;
        z: number;
    };
    velocity?: {
        x: number;
        y: number;
        z: number;
    } | undefined;
    maxSpeed?: number | undefined;
    acceleration?: number | undefined;
}>, z.ZodObject<{
    type: z.ZodLiteral<"shape">;
    bounds: z.ZodObject<{
        min: z.ZodObject<{
            x: z.ZodNumber;
            y: z.ZodNumber;
            z: z.ZodNumber;
        }, "strip", z.ZodTypeAny, {
            x: number;
            y: number;
            z: number;
        }, {
            x: number;
            y: number;
            z: number;
        }>;
        max: z.ZodObject<{
            x: z.ZodNumber;
            y: z.ZodNumber;
            z: z.ZodNumber;
        }, "strip", z.ZodTypeAny, {
            x: number;
            y: number;
            z: number;
        }, {
            x: number;
            y: number;
            z: number;
        }>;
    }, "strip", z.ZodTypeAny, {
        min: {
            x: number;
            y: number;
            z: number;
        };
        max: {
            x: number;
            y: number;
            z: number;
        };
    }, {
        min: {
            x: number;
            y: number;
            z: number;
        };
        max: {
            x: number;
            y: number;
            z: number;
        };
    }>;
    geometry: z.ZodOptional<z.ZodEnum<["box", "sphere", "cylinder", "mesh"]>>;
}, "strip", z.ZodTypeAny, {
    type: "shape";
    bounds: {
        min: {
            x: number;
            y: number;
            z: number;
        };
        max: {
            x: number;
            y: number;
            z: number;
        };
    };
    geometry?: "box" | "sphere" | "cylinder" | "mesh" | undefined;
}, {
    type: "shape";
    bounds: {
        min: {
            x: number;
            y: number;
            z: number;
        };
        max: {
            x: number;
            y: number;
            z: number;
        };
    };
    geometry?: "box" | "sphere" | "cylinder" | "mesh" | undefined;
}>, z.ZodObject<{
    type: z.ZodLiteral<"visual">;
    visible: z.ZodBoolean;
    color: z.ZodOptional<z.ZodString>;
    texture: z.ZodOptional<z.ZodString>;
    material: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    type: "visual";
    visible: boolean;
    color?: string | undefined;
    texture?: string | undefined;
    material?: string | undefined;
}, {
    type: "visual";
    visible: boolean;
    color?: string | undefined;
    texture?: string | undefined;
    material?: string | undefined;
}>, z.ZodObject<{
    type: z.ZodLiteral<"solidity">;
    solid: z.ZodBoolean;
    collisionLayers: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
}, "strip", z.ZodTypeAny, {
    type: "solidity";
    solid: boolean;
    collisionLayers?: string[] | undefined;
}, {
    type: "solidity";
    solid: boolean;
    collisionLayers?: string[] | undefined;
}>, z.ZodObject<{
    type: z.ZodLiteral<"entrance">;
    targetLayerId: z.ZodString;
    targetPosition: z.ZodObject<{
        x: z.ZodNumber;
        y: z.ZodNumber;
        z: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        x: number;
        y: number;
        z: number;
    }, {
        x: number;
        y: number;
        z: number;
    }>;
    enabled: z.ZodBoolean;
}, "strip", z.ZodTypeAny, {
    type: "entrance";
    targetLayerId: string;
    targetPosition: {
        x: number;
        y: number;
        z: number;
    };
    enabled: boolean;
}, {
    type: "entrance";
    targetLayerId: string;
    targetPosition: {
        x: number;
        y: number;
        z: number;
    };
    enabled: boolean;
}>, z.ZodObject<{
    type: z.ZodLiteral<"portable">;
    canPickup: z.ZodBoolean;
    weight: z.ZodOptional<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    type: "portable";
    canPickup: boolean;
    weight?: number | undefined;
}, {
    type: "portable";
    canPickup: boolean;
    weight?: number | undefined;
}>, z.ZodObject<{
    type: z.ZodLiteral<"inventory">;
    items: z.ZodArray<z.ZodString, "many">;
    capacity: z.ZodOptional<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    type: "inventory";
    items: string[];
    capacity?: number | undefined;
}, {
    type: "inventory";
    items: string[];
    capacity?: number | undefined;
}>, z.ZodObject<{
    type: z.ZodLiteral<"durability">;
    health: z.ZodNumber;
    maxHealth: z.ZodNumber;
    armor: z.ZodOptional<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    type: "durability";
    health: number;
    maxHealth: number;
    armor?: number | undefined;
}, {
    type: "durability";
    health: number;
    maxHealth: number;
    armor?: number | undefined;
}>, z.ZodObject<{
    type: z.ZodLiteral<"contract_limit">;
    limits: z.ZodArray<z.ZodObject<{
        contractType: z.ZodString;
        max: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        max: number;
        contractType: string;
    }, {
        max: number;
        contractType: string;
    }>, "many">;
}, "strip", z.ZodTypeAny, {
    type: "contract_limit";
    limits: {
        max: number;
        contractType: string;
    }[];
}, {
    type: "contract_limit";
    limits: {
        max: number;
        contractType: string;
    }[];
}>, z.ZodObject<{
    type: z.ZodLiteral<"movement_rules">;
    stepDistance: z.ZodNumber;
    allowDiagonal: z.ZodDefault<z.ZodOptional<z.ZodBoolean>>;
    diagonalNormalized: z.ZodDefault<z.ZodOptional<z.ZodBoolean>>;
}, "strip", z.ZodTypeAny, {
    type: "movement_rules";
    stepDistance: number;
    allowDiagonal: boolean;
    diagonalNormalized: boolean;
}, {
    type: "movement_rules";
    stepDistance: number;
    allowDiagonal?: boolean | undefined;
    diagonalNormalized?: boolean | undefined;
}>, z.ZodObject<{
    type: z.ZodLiteral<"world_conditions">;
    gravity: z.ZodOptional<z.ZodNumber>;
    weather: z.ZodOptional<z.ZodEnum<["clear", "rain", "storm", "snow"]>>;
    timeOfDay: z.ZodOptional<z.ZodEnum<["day", "night", "dawn", "dusk"]>>;
    terrainSeed: z.ZodOptional<z.ZodString>;
    properties: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodAny>>;
}, "strip", z.ZodTypeAny, {
    type: "world_conditions";
    gravity?: number | undefined;
    weather?: "clear" | "rain" | "storm" | "snow" | undefined;
    timeOfDay?: "day" | "night" | "dawn" | "dusk" | undefined;
    terrainSeed?: string | undefined;
    properties?: Record<string, any> | undefined;
}, {
    type: "world_conditions";
    gravity?: number | undefined;
    weather?: "clear" | "rain" | "storm" | "snow" | undefined;
    timeOfDay?: "day" | "night" | "dawn" | "dusk" | undefined;
    terrainSeed?: string | undefined;
    properties?: Record<string, any> | undefined;
}>, z.ZodObject<{
    type: z.ZodLiteral<"world_commands">;
    commands: z.ZodArray<z.ZodString, "many">;
}, "strip", z.ZodTypeAny, {
    type: "world_commands";
    commands: string[];
}, {
    type: "world_commands";
    commands: string[];
}>, z.ZodObject<{
    type: z.ZodLiteral<"command_access">;
    allowed: z.ZodArray<z.ZodString, "many">;
}, "strip", z.ZodTypeAny, {
    type: "command_access";
    allowed: string[];
}, {
    type: "command_access";
    allowed: string[];
}>]>;
export declare const AnyContractOverrideSchema: z.ZodObject<{
    type: z.ZodString;
}, "passthrough", z.ZodTypeAny, z.objectOutputType<{
    type: z.ZodString;
}, z.ZodTypeAny, "passthrough">, z.objectInputType<{
    type: z.ZodString;
}, z.ZodTypeAny, "passthrough">>;
export declare class ContractRegistry {
    private schemas;
    private globalLimits;
    constructor();
    private initializeSchemas;
    private initializeDefaultLimits;
    /**
     * Validate a contract against its schema
     */
    validate(contract: unknown): {
        success: true;
        data: AnyContract;
    } | {
        success: false;
        error: string;
    };
    /**
     * Check if adding a contract would violate limits
     */
    checkLimits(entityId: EntityId, contractType: string, existingContracts: Contract[], entityContractLimit?: ContractLimit): {
        allowed: boolean;
        reason?: string;
    };
    /**
     * Get the schema for a contract type
     */
    getSchema(contractType: string): z.ZodSchema | undefined;
    /**
     * Register a custom contract schema
     */
    registerSchema(contractType: string, schema: z.ZodSchema): void;
    /**
     * Set global limit for a contract type
     */
    setGlobalLimit(contractType: string, limit: number): void;
    /**
     * Get all registered contract types
     */
    getRegisteredTypes(): string[];
}
export declare const contractRegistry: ContractRegistry;
/**
 * Factory functions for creating contracts with sensible defaults
 */
export declare function createIdentity(id: EntityId, name?: string, description?: string): Identity;
export declare function createMobility(position: Vec3, velocity?: Vec3, maxSpeed?: number, acceleration?: number): Mobility;
export declare function createShape(bounds: AABB, geometry?: 'box' | 'sphere' | 'cylinder' | 'mesh'): Shape;
export declare function createBoxShape(center: Vec3, size: Vec3): Shape;
export declare function createSphereShape(center: Vec3, radius: number): Shape;
export declare function createSolidity(solid?: boolean, collisionLayers?: string[]): Solidity;
export declare function createVisual(visible?: boolean, color?: string, texture?: string, material?: string): Visual;
export declare function createEntrance(targetLayerId: string, targetPosition: Vec3, enabled?: boolean): Entrance;
export declare function createPortable(canPickup?: boolean, weight?: number): Portable;
export declare function createInventory(capacity?: number, items?: EntityId[]): Inventory;
export declare function createDurability(maxHealth: number, health?: number, armor?: number): Durability;
/**
 * Predefined entity templates
 */
export declare function createPlayerContracts(playerId: EntityId, playerName: string, spawnPosition?: Vec3): AnyContract[];
export declare function createBlockContracts(blockId: EntityId, position: Vec3, color?: string): AnyContract[];
export declare function createItemContracts(itemId: EntityId, position: Vec3, itemName: string, color?: string): AnyContract[];
export declare function createDoorContracts(doorId: EntityId, position: Vec3, targetLayerId: string, targetPosition: Vec3): AnyContract[];
/**
 * Contract validation utilities
 */
export declare function validateContract(contract: unknown): {
    success: true;
    data: AnyContract;
} | {
    success: false;
    error: string;
};
/**
 * Legacy boolean validation for backwards compatibility
 */
export declare function validateContractBoolean(contract: AnyContract): boolean;
export declare function sanitizeContract(contract: AnyContract): AnyContract;
/**
 * Create a contract limit contract
 */
export declare function createContractLimit(limits: Array<{
    contractType: string;
    max: number;
}>): ContractLimit;
export declare function createMovementRules(stepDistance?: number, allowDiagonal?: boolean, diagonalNormalized?: boolean): MovementRules;
export declare function createWorldConditions(gravity?: number, weather?: 'clear' | 'rain' | 'storm' | 'snow', timeOfDay?: 'day' | 'night' | 'dawn' | 'dusk', terrainSeed?: string, properties?: Record<string, any>): WorldConditions;
export declare function createWorldCommands(commands: string[]): WorldCommands;
export declare function createCommandAccess(allowed: string[]): CommandAccess;
//# sourceMappingURL=contracts.d.ts.map