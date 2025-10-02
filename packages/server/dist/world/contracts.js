import { z } from 'zod';
// Contract type constants
export const CONTRACT_TYPES = {
    IDENTITY: 'identity',
    MOBILITY: 'mobility',
    SHAPE: 'shape',
    VISUAL: 'visual',
    SOLIDITY: 'solidity',
    ENTRANCE: 'entrance',
    PORTABLE: 'portable',
    INVENTORY: 'inventory',
    DURABILITY: 'durability',
    CONTRACT_LIMIT: 'contract_limit',
    MOVEMENT_RULES: 'movement_rules',
    WORLD_CONDITIONS: 'world_conditions',
    WORLD_COMMANDS: 'world_commands',
    COMMAND_ACCESS: 'command_access',
};
// ContractLimit is now imported from shared
// Zod schemas for validation
export const Vec3Schema = z.object({
    x: z.number(),
    y: z.number(),
    z: z.number(),
});
export const AABBSchema = z.object({
    min: Vec3Schema,
    max: Vec3Schema,
});
export const IdentitySchema = z.object({
    type: z.literal(CONTRACT_TYPES.IDENTITY),
    id: z.string(),
    name: z.string().optional(),
    description: z.string().optional(),
});
export const MobilitySchema = z.object({
    type: z.literal(CONTRACT_TYPES.MOBILITY),
    position: Vec3Schema,
    velocity: Vec3Schema.optional(),
    maxSpeed: z.number().positive().optional(),
    acceleration: z.number().positive().optional(),
});
export const ShapeSchema = z.object({
    type: z.literal(CONTRACT_TYPES.SHAPE),
    bounds: AABBSchema,
    geometry: z.enum(['box', 'sphere', 'cylinder', 'mesh']).optional(),
});
export const VisualSchema = z.object({
    type: z.literal(CONTRACT_TYPES.VISUAL),
    visible: z.boolean(),
    color: z.string().optional(),
    texture: z.string().optional(),
    material: z.string().optional(),
});
export const SoliditySchema = z.object({
    type: z.literal(CONTRACT_TYPES.SOLIDITY),
    solid: z.boolean(),
    collisionLayers: z.array(z.string()).optional(),
});
export const EntranceSchema = z.object({
    type: z.literal(CONTRACT_TYPES.ENTRANCE),
    targetLayerId: z.string(),
    targetPosition: Vec3Schema,
    enabled: z.boolean(),
});
export const PortableSchema = z.object({
    type: z.literal(CONTRACT_TYPES.PORTABLE),
    canPickup: z.boolean(),
    weight: z.number().nonnegative().optional(),
});
export const InventorySchema = z.object({
    type: z.literal(CONTRACT_TYPES.INVENTORY),
    items: z.array(z.string()),
    capacity: z.number().positive().optional(),
});
// Base object for durability used in discriminated union (must be ZodObject)
export const DurabilityObjectSchema = z.object({
    type: z.literal(CONTRACT_TYPES.DURABILITY),
    health: z.number().nonnegative(),
    maxHealth: z.number().positive(),
    armor: z.number().nonnegative().optional(),
});
// Refined durability schema for external validation usage
export const DurabilitySchema = DurabilityObjectSchema.refine((data) => data.health <= data.maxHealth, { message: 'Health cannot exceed maxHealth' });
export const ContractLimitSchema = z.object({
    type: z.literal(CONTRACT_TYPES.CONTRACT_LIMIT),
    limits: z.array(z.object({
        contractType: z.string(),
        max: z.number().positive(),
    })),
});
export const MovementRulesSchema = z.object({
    type: z.literal(CONTRACT_TYPES.MOVEMENT_RULES),
    stepDistance: z.number().positive(),
    allowDiagonal: z.boolean().optional().default(true),
    diagonalNormalized: z.boolean().optional().default(true),
});
export const WorldConditionsSchema = z.object({
    type: z.literal(CONTRACT_TYPES.WORLD_CONDITIONS),
    gravity: z.number().optional(),
    weather: z.enum(['clear', 'rain', 'storm', 'snow']).optional(),
    timeOfDay: z.enum(['day', 'night', 'dawn', 'dusk']).optional(),
    terrainSeed: z.string().optional(),
    properties: z.record(z.any()).optional(),
});
export const WorldCommandsSchema = z.object({
    type: z.literal(CONTRACT_TYPES.WORLD_COMMANDS),
    commands: z.array(z.string()),
});
export const CommandAccessSchema = z.object({
    type: z.literal(CONTRACT_TYPES.COMMAND_ACCESS),
    allowed: z.array(z.string()),
});
// Union schema for all contracts
export const AnyContractSchema = z.discriminatedUnion('type', [
    IdentitySchema,
    MobilitySchema,
    ShapeSchema,
    VisualSchema,
    SoliditySchema,
    EntranceSchema,
    PortableSchema,
    InventorySchema,
    // Use base object here (ZodObject required by discriminatedUnion)
    DurabilityObjectSchema,
    ContractLimitSchema,
    MovementRulesSchema,
    WorldConditionsSchema,
    WorldCommandsSchema,
    CommandAccessSchema,
]);
// Override schema: allow partial contracts for overrides in API
export const AnyContractOverrideSchema = z.object({ type: z.string() }).passthrough();
// Contract registry for validation and limits
export class ContractRegistry {
    schemas = new Map();
    globalLimits = new Map();
    constructor() {
        this.initializeSchemas();
        this.initializeDefaultLimits();
    }
    initializeSchemas() {
        this.schemas.set(CONTRACT_TYPES.IDENTITY, IdentitySchema);
        this.schemas.set(CONTRACT_TYPES.MOBILITY, MobilitySchema);
        this.schemas.set(CONTRACT_TYPES.SHAPE, ShapeSchema);
        this.schemas.set(CONTRACT_TYPES.VISUAL, VisualSchema);
        this.schemas.set(CONTRACT_TYPES.SOLIDITY, SoliditySchema);
        this.schemas.set(CONTRACT_TYPES.ENTRANCE, EntranceSchema);
        this.schemas.set(CONTRACT_TYPES.PORTABLE, PortableSchema);
        this.schemas.set(CONTRACT_TYPES.INVENTORY, InventorySchema);
        this.schemas.set(CONTRACT_TYPES.DURABILITY, DurabilitySchema);
        this.schemas.set(CONTRACT_TYPES.CONTRACT_LIMIT, ContractLimitSchema);
        this.schemas.set(CONTRACT_TYPES.MOVEMENT_RULES, MovementRulesSchema);
        this.schemas.set(CONTRACT_TYPES.WORLD_CONDITIONS, WorldConditionsSchema);
        this.schemas.set(CONTRACT_TYPES.WORLD_COMMANDS, WorldCommandsSchema);
        this.schemas.set(CONTRACT_TYPES.COMMAND_ACCESS, CommandAccessSchema);
    }
    initializeDefaultLimits() {
        // Default limits - "unlimited unless limited" rule
        // Most contracts have no limit (can have multiple)
        // Some contracts should typically be limited to 1
        this.globalLimits.set(CONTRACT_TYPES.IDENTITY, 1);
        this.globalLimits.set(CONTRACT_TYPES.MOBILITY, 1);
        this.globalLimits.set(CONTRACT_TYPES.SHAPE, 1);
        this.globalLimits.set(CONTRACT_TYPES.VISUAL, 1);
        this.globalLimits.set(CONTRACT_TYPES.SOLIDITY, 1);
        this.globalLimits.set(CONTRACT_TYPES.INVENTORY, 1);
        this.globalLimits.set(CONTRACT_TYPES.DURABILITY, 1);
        this.globalLimits.set(CONTRACT_TYPES.CONTRACT_LIMIT, 1);
        // ENTRANCE and PORTABLE can have multiple, but default to 1 to ensure replacement semantics in simple worlds/tests
        this.globalLimits.set(CONTRACT_TYPES.ENTRANCE, 1);
        this.globalLimits.set(CONTRACT_TYPES.PORTABLE, 3);
        this.globalLimits.set(CONTRACT_TYPES.MOVEMENT_RULES, 1);
        this.globalLimits.set(CONTRACT_TYPES.WORLD_CONDITIONS, 1);
        this.globalLimits.set(CONTRACT_TYPES.WORLD_COMMANDS, 1);
        this.globalLimits.set(CONTRACT_TYPES.COMMAND_ACCESS, 1);
    }
    /**
     * Validate a contract against its schema
     */
    validate(contract) {
        try {
            const validContract = AnyContractSchema.parse(contract);
            return { success: true, data: validContract };
        }
        catch (error) {
            if (error instanceof z.ZodError) {
                return {
                    success: false,
                    error: error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ')
                };
            }
            return { success: false, error: 'Unknown validation error' };
        }
    }
    /**
     * Check if adding a contract would violate limits
     */
    checkLimits(entityId, contractType, existingContracts, entityContractLimit) {
        // Get entity-specific limits first
        const entityLimits = entityContractLimit?.limits || [];
        const entityLimit = entityLimits.find(l => l.contractType === contractType);
        if (entityLimit) {
            // Entity has specific limit for this contract type
            const currentCount = existingContracts.filter(c => c.type === contractType).length;
            if (currentCount >= entityLimit.max) {
                return {
                    allowed: false,
                    reason: `Entity limit exceeded: ${contractType} (max: ${entityLimit.max}, current: ${currentCount})`
                };
            }
        }
        else {
            // Check global default limits
            const globalLimit = this.globalLimits.get(contractType);
            if (globalLimit !== undefined) {
                const currentCount = existingContracts.filter(c => c.type === contractType).length;
                if (currentCount >= globalLimit) {
                    return {
                        allowed: false,
                        reason: `Global limit exceeded: ${contractType} (max: ${globalLimit}, current: ${currentCount})`
                    };
                }
            }
        }
        return { allowed: true };
    }
    /**
     * Get the schema for a contract type
     */
    getSchema(contractType) {
        return this.schemas.get(contractType);
    }
    /**
     * Register a custom contract schema
     */
    registerSchema(contractType, schema) {
        this.schemas.set(contractType, schema);
    }
    /**
     * Set global limit for a contract type
     */
    setGlobalLimit(contractType, limit) {
        this.globalLimits.set(contractType, limit);
    }
    /**
     * Get all registered contract types
     */
    getRegisteredTypes() {
        return Array.from(this.schemas.keys());
    }
}
// Global contract registry instance
export const contractRegistry = new ContractRegistry();
/**
 * Factory functions for creating contracts with sensible defaults
 */
export function createIdentity(id, name, description) {
    return {
        type: 'identity',
        id,
        name,
        description,
    };
}
export function createMobility(position, velocity, maxSpeed, acceleration) {
    return {
        type: 'mobility',
        position,
        velocity: velocity || { x: 0, y: 0, z: 0 },
        maxSpeed,
        acceleration,
    };
}
export function createShape(bounds, geometry = 'box') {
    return {
        type: 'shape',
        bounds,
        geometry,
    };
}
export function createBoxShape(center, size) {
    const halfSize = { x: size.x / 2, y: size.y / 2, z: size.z / 2 };
    return createShape({
        min: {
            x: center.x - halfSize.x,
            y: center.y - halfSize.y,
            z: center.z - halfSize.z,
        },
        max: {
            x: center.x + halfSize.x,
            y: center.y + halfSize.y,
            z: center.z + halfSize.z,
        },
    });
}
export function createSphereShape(center, radius) {
    return createShape({
        min: {
            x: center.x - radius,
            y: center.y - radius,
            z: center.z - radius,
        },
        max: {
            x: center.x + radius,
            y: center.y + radius,
            z: center.z + radius,
        },
    }, 'sphere');
}
export function createSolidity(solid = true, collisionLayers) {
    return {
        type: 'solidity',
        solid,
        collisionLayers,
    };
}
export function createVisual(visible = true, color, texture, material) {
    return {
        type: 'visual',
        visible,
        color,
        texture,
        material,
    };
}
export function createEntrance(targetLayerId, targetPosition, enabled = true) {
    return {
        type: 'entrance',
        targetLayerId,
        targetPosition,
        enabled,
    };
}
export function createPortable(canPickup = true, weight) {
    return {
        type: 'portable',
        canPickup,
        weight,
    };
}
export function createInventory(capacity, items = []) {
    return {
        type: 'inventory',
        items: [...items],
        capacity,
    };
}
export function createDurability(maxHealth, health, armor) {
    return {
        type: 'durability',
        health: health ?? maxHealth,
        maxHealth,
        armor,
    };
}
/**
 * Predefined entity templates
 */
export function createPlayerContracts(playerId, playerName, spawnPosition = { x: 0, y: 1, z: 0 }) {
    return [
        createIdentity(playerId, playerName, 'A player entity'),
        createMobility(spawnPosition, undefined, 5, 10),
        createBoxShape(spawnPosition, { x: 0.6, y: 1.8, z: 0.6 }),
        createVisual(true, '#00ff00'),
        createInventory(10),
        createDurability(100),
        createMovementRules(1, true, true),
        createCommandAccess(['login', 'logout', 'set_view', 'move_dir']),
        // Players can have multiple entrance and portable contracts
        createContractLimit([
            { contractType: CONTRACT_TYPES.ENTRANCE, max: 5 },
            { contractType: CONTRACT_TYPES.PORTABLE, max: 3 },
        ]),
    ];
}
export function createBlockContracts(blockId, position, color = '#8B4513') {
    return [
        createIdentity(blockId, 'Block', 'A solid block'),
        createMobility(position),
        createBoxShape(position, { x: 1, y: 1, z: 1 }),
        createVisual(true, color),
        createSolidity(true),
        createDurability(50),
    ];
}
export function createItemContracts(itemId, position, itemName, color = '#FFD700') {
    return [
        createIdentity(itemId, itemName, 'A collectible item'),
        createMobility(position),
        createBoxShape(position, { x: 0.3, y: 0.3, z: 0.3 }),
        createVisual(true, color),
        createPortable(true, 1),
    ];
}
export function createDoorContracts(doorId, position, targetLayerId, targetPosition) {
    return [
        createIdentity(doorId, 'Door', 'A portal to another layer'),
        createMobility(position),
        createBoxShape(position, { x: 1, y: 2, z: 0.1 }),
        createVisual(true, '#4A90E2'),
        createEntrance(targetLayerId, targetPosition),
        createDurability(25),
    ];
}
/**
 * Contract validation utilities
 */
export function validateContract(contract) {
    return contractRegistry.validate(contract);
}
/**
 * Legacy boolean validation for backwards compatibility
 */
export function validateContractBoolean(contract) {
    const result = contractRegistry.validate(contract);
    return result.success;
}
export function sanitizeContract(contract) {
    // Validate and return clean contract
    const result = contractRegistry.validate(contract);
    if (result.success) {
        return result.data;
    }
    // Fallback to manual sanitization for unknown types
    switch (contract.type) {
        case 'identity':
            const identity = contract;
            return createIdentity(identity.id, identity.name, identity.description);
        case 'mobility':
            const mobility = contract;
            return createMobility(mobility.position, mobility.velocity, mobility.maxSpeed, mobility.acceleration);
        case 'shape':
            const shape = contract;
            return createShape(shape.bounds, shape.geometry);
        case 'visual':
            const visual = contract;
            return createVisual(visual.visible, visual.color, visual.texture, visual.material);
        case 'solidity':
            const solidity = contract;
            return createSolidity(solidity.solid, solidity.collisionLayers);
        case 'entrance':
            const entrance = contract;
            return createEntrance(entrance.targetLayerId, entrance.targetPosition, entrance.enabled);
        case 'portable':
            const portable = contract;
            return createPortable(portable.canPickup, portable.weight);
        case 'inventory':
            const inventory = contract;
            return createInventory(inventory.capacity, inventory.items);
        case 'durability':
            const durability = contract;
            return createDurability(durability.maxHealth, durability.health, durability.armor);
        case 'contract_limit':
            const limit = contract;
            return createContractLimit(limit.limits);
        case 'movement_rules':
            const mr = contract;
            return createMovementRules(mr.stepDistance, mr.allowDiagonal, mr.diagonalNormalized);
        case 'world_conditions':
            const wc = contract;
            return createWorldConditions(wc.gravity, wc.weather, wc.timeOfDay, wc.terrainSeed, wc.properties);
        case 'world_commands':
            const wcmd = contract;
            return createWorldCommands(wcmd.commands);
        case 'command_access':
            const ca = contract;
            return createCommandAccess(ca.allowed);
        default:
            return contract;
    }
}
/**
 * Create a contract limit contract
 */
export function createContractLimit(limits) {
    return {
        type: CONTRACT_TYPES.CONTRACT_LIMIT,
        limits,
    };
}
export function createMovementRules(stepDistance = 1, allowDiagonal = true, diagonalNormalized = true) {
    return {
        type: CONTRACT_TYPES.MOVEMENT_RULES,
        stepDistance,
        allowDiagonal,
        diagonalNormalized,
    };
}
export function createWorldConditions(gravity, weather, timeOfDay, terrainSeed, properties) {
    return {
        type: CONTRACT_TYPES.WORLD_CONDITIONS,
        gravity,
        weather,
        timeOfDay,
        terrainSeed,
        properties,
    };
}
export function createWorldCommands(commands) {
    return {
        type: CONTRACT_TYPES.WORLD_COMMANDS,
        commands,
    };
}
export function createCommandAccess(allowed) {
    return {
        type: CONTRACT_TYPES.COMMAND_ACCESS,
        allowed,
    };
}
//# sourceMappingURL=contracts.js.map