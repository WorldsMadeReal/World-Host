import { contractRegistry } from './contracts.js';
// ECS World class
export class ECSWorld {
    // Core entity storage: Map<EntityId, Set<Contract>>
    entities = new Map();
    // Index by contract type for quick queries: Map<ContractType, Set<EntityId>>
    contractIndex = new Map();
    // Hook system for lifecycle events
    entityAddHooks = [];
    entityRemoveHooks = [];
    contractAddHooks = new Map();
    contractRemoveHooks = new Map();
    // Entity CRUD operations
    /**
     * Create a new entity with optional initial contracts
     */
    createEntity(id, contracts = []) {
        if (this.entities.has(id)) {
            throw new Error(`Entity ${id} already exists`);
        }
        this.entities.set(id, new Set());
        // Add initial contracts
        for (const contract of contracts) {
            this.addContract(id, contract);
        }
        // Trigger entity add hooks
        for (const hook of this.entityAddHooks) {
            hook(id);
        }
        return id;
    }
    /**
     * Remove an entity and all its contracts
     */
    removeEntity(id) {
        const contracts = this.entities.get(id);
        if (!contracts) {
            return false;
        }
        // Remove all contracts first (triggers contract remove hooks)
        for (const contract of contracts) {
            this.removeContractInternal(id, contract);
        }
        // Remove from entity storage
        this.entities.delete(id);
        // Trigger entity remove hooks
        for (const hook of this.entityRemoveHooks) {
            hook(id);
        }
        return true;
    }
    /**
     * Check if an entity exists
     */
    hasEntity(id) {
        return this.entities.has(id);
    }
    /**
     * Get all entity IDs
     */
    getAllEntities() {
        return Array.from(this.entities.keys());
    }
    // Contract CRUD operations
    /**
     * Add a contract to an entity with validation and limit checking
     */
    addContract(entityId, contract) {
        const contracts = this.entities.get(entityId);
        if (!contracts) {
            throw new Error(`Entity ${entityId} does not exist`);
        }
        // Validate contract structure
        const validation = contractRegistry.validate(contract);
        if (!validation.success) {
            throw new Error(`Invalid contract: ${validation.error}`);
        }
        const validContract = validation.data;
        // Get existing contracts for limit checking / replacement
        let existingContracts = Array.from(contracts);
        const contractLimitContract = this.getContract(entityId, 'contract_limit');
        // Proactively remove existing contracts of the same type if we're at the limit,
        // so that updates (replacements) don't trigger violations
        const existingOfSameType = existingContracts.filter(c => c.type === validContract.type);
        const maxAllowed = this.getMaxContractsAllowed(entityId, validContract.type, contractLimitContract);
        while (existingOfSameType.length >= maxAllowed) {
            const oldestContract = existingOfSameType.shift();
            if (oldestContract) {
                this.removeContractInternal(entityId, oldestContract);
            }
        }
        // Recompute existing contracts after removals and check limits
        existingContracts = Array.from(contracts);
        const limitCheck = contractRegistry.checkLimits(entityId, validContract.type, existingContracts, contractLimitContract);
        if (!limitCheck.allowed) {
            throw new Error(`Contract limit violation: ${limitCheck.reason}`);
        }
        // Add new contract
        contracts.add(validContract);
        // Update contract index
        let entitiesWithContract = this.contractIndex.get(validContract.type);
        if (!entitiesWithContract) {
            entitiesWithContract = new Set();
            this.contractIndex.set(validContract.type, entitiesWithContract);
        }
        entitiesWithContract.add(entityId);
        // Trigger contract add hooks
        const hooks = this.contractAddHooks.get(validContract.type);
        if (hooks) {
            for (const hook of hooks) {
                hook(entityId, validContract);
            }
        }
    }
    /**
     * Get the maximum number of contracts allowed for a specific type
     */
    getMaxContractsAllowed(entityId, contractType, contractLimitContract) {
        // Check entity-specific limits first
        if (contractLimitContract) {
            const entityLimit = contractLimitContract.limits.find((l) => l.contractType === contractType);
            if (entityLimit) {
                return entityLimit.max;
            }
        }
        // Check global limits
        const globalLimit = contractRegistry['globalLimits'].get(contractType);
        if (globalLimit !== undefined) {
            return globalLimit;
        }
        // Default: unlimited
        return Number.MAX_SAFE_INTEGER;
    }
    /**
     * Remove a contract from an entity
     */
    removeContract(entityId, contractType) {
        const contract = this.getContract(entityId, contractType);
        if (!contract) {
            return false;
        }
        return this.removeContractInternal(entityId, contract);
    }
    /**
     * Internal method to remove a contract (used by removeEntity and removeContract)
     */
    removeContractInternal(entityId, contract) {
        const contracts = this.entities.get(entityId);
        if (!contracts || !contracts.has(contract)) {
            return false;
        }
        // Remove from entity
        contracts.delete(contract);
        // Update contract index
        const entitiesWithContract = this.contractIndex.get(contract.type);
        if (entitiesWithContract) {
            entitiesWithContract.delete(entityId);
            if (entitiesWithContract.size === 0) {
                this.contractIndex.delete(contract.type);
            }
        }
        // Trigger contract remove hooks
        const hooks = this.contractRemoveHooks.get(contract.type);
        if (hooks) {
            for (const hook of hooks) {
                hook(entityId, contract);
            }
        }
        return true;
    }
    /**
     * Get a specific contract from an entity by type
     */
    getContract(entityId, contractType) {
        const contracts = this.entities.get(entityId);
        if (!contracts) {
            return undefined;
        }
        for (const contract of contracts) {
            if (contract.type === contractType) {
                return contract;
            }
        }
        return undefined;
    }
    /**
     * Get all contracts for an entity
     */
    getContracts(entityId) {
        const contracts = this.entities.get(entityId);
        return contracts ? Array.from(contracts) : [];
    }
    /**
     * Check if an entity has a specific contract type
     */
    hasContract(entityId, contractType) {
        return this.getContract(entityId, contractType) !== undefined;
    }
    // Query operations
    /**
     * Get all entities that have a specific contract type
     */
    getEntitiesWithContract(contractType) {
        const entities = this.contractIndex.get(contractType);
        return entities ? Array.from(entities) : [];
    }
    /**
     * Get all entities that have ALL of the specified contract types
     */
    getEntitiesWithContracts(contractTypes) {
        if (contractTypes.length === 0) {
            return this.getAllEntities();
        }
        // Start with entities that have the first contract type
        let result = new Set(this.getEntitiesWithContract(contractTypes[0]));
        // Intersect with entities that have each subsequent contract type
        for (let i = 1; i < contractTypes.length; i++) {
            const entitiesWithContract = new Set(this.getEntitiesWithContract(contractTypes[i]));
            result = new Set([...result].filter(id => entitiesWithContract.has(id)));
        }
        return Array.from(result);
    }
    /**
     * Get all entities that have ANY of the specified contract types
     */
    getEntitiesWithAnyContract(contractTypes) {
        const result = new Set();
        for (const contractType of contractTypes) {
            const entities = this.getEntitiesWithContract(contractType);
            for (const entityId of entities) {
                result.add(entityId);
            }
        }
        return Array.from(result);
    }
    // Hook system
    /**
     * Register a hook for when entities are added
     */
    onEntityAdd(hook) {
        this.entityAddHooks.push(hook);
    }
    /**
     * Register a hook for when entities are removed
     */
    onEntityRemove(hook) {
        this.entityRemoveHooks.push(hook);
    }
    /**
     * Register a hook for when contracts are added
     */
    onContractAdd(contractType, hook) {
        let hooks = this.contractAddHooks.get(contractType);
        if (!hooks) {
            hooks = [];
            this.contractAddHooks.set(contractType, hooks);
        }
        hooks.push(hook);
    }
    /**
     * Register a hook for when contracts are removed
     */
    onContractRemove(contractType, hook) {
        let hooks = this.contractRemoveHooks.get(contractType);
        if (!hooks) {
            hooks = [];
            this.contractRemoveHooks.set(contractType, hooks);
        }
        hooks.push(hook);
    }
    // Utility methods
    /**
     * Get statistics about the ECS world
     */
    getStats() {
        const contractCounts = {};
        for (const [contractType, entities] of this.contractIndex) {
            contractCounts[contractType] = entities.size;
        }
        return {
            entityCount: this.entities.size,
            contractTypeCount: this.contractIndex.size,
            contractCounts,
        };
    }
    /**
     * Clear all entities and contracts
     */
    clear() {
        // Remove all entities (this will trigger all hooks)
        const entityIds = this.getAllEntities();
        for (const id of entityIds) {
            this.removeEntity(id);
        }
    }
}
// Utility functions for working with the ECS
/**
 * Create a new ECS world instance
 */
export function createECSWorld() {
    return new ECSWorld();
}
/**
 * Type-safe helper to get a contract of a specific type
 */
export function getTypedContract(world, entityId, contractType) {
    return world.getContract(entityId, contractType);
}
/**
 * Type-safe helper to check if an entity has a contract of a specific type
 */
export function hasTypedContract(world, entityId, contractType) {
    return world.hasContract(entityId, contractType);
}
/**
 * Helper to safely update a contract
 */
export function updateContract(world, entityId, contractType, updateFn) {
    const existingContract = world.getContract(entityId, contractType);
    if (!existingContract) {
        return false;
    }
    const updatedContract = updateFn(existingContract);
    world.addContract(entityId, updatedContract);
    return true;
}
//# sourceMappingURL=ecs.js.map