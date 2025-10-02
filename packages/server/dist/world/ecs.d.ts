import type { EntityId, Contract, AnyContract } from '@worldhost/shared';
export type EntityHook = (entityId: EntityId) => void;
export type ContractHook<T extends Contract = Contract> = (entityId: EntityId, contract: T) => void;
export declare class ECSWorld {
    private entities;
    private contractIndex;
    private entityAddHooks;
    private entityRemoveHooks;
    private contractAddHooks;
    private contractRemoveHooks;
    /**
     * Create a new entity with optional initial contracts
     */
    createEntity(id: EntityId, contracts?: AnyContract[]): EntityId;
    /**
     * Remove an entity and all its contracts
     */
    removeEntity(id: EntityId): boolean;
    /**
     * Check if an entity exists
     */
    hasEntity(id: EntityId): boolean;
    /**
     * Get all entity IDs
     */
    getAllEntities(): EntityId[];
    /**
     * Add a contract to an entity with validation and limit checking
     */
    addContract(entityId: EntityId, contract: Contract): void;
    /**
     * Get the maximum number of contracts allowed for a specific type
     */
    private getMaxContractsAllowed;
    /**
     * Remove a contract from an entity
     */
    removeContract(entityId: EntityId, contractType: string): boolean;
    /**
     * Internal method to remove a contract (used by removeEntity and removeContract)
     */
    private removeContractInternal;
    /**
     * Get a specific contract from an entity by type
     */
    getContract<T extends Contract>(entityId: EntityId, contractType: T['type']): T | undefined;
    /**
     * Get all contracts for an entity
     */
    getContracts(entityId: EntityId): Contract[];
    /**
     * Check if an entity has a specific contract type
     */
    hasContract(entityId: EntityId, contractType: string): boolean;
    /**
     * Get all entities that have a specific contract type
     */
    getEntitiesWithContract(contractType: string): EntityId[];
    /**
     * Get all entities that have ALL of the specified contract types
     */
    getEntitiesWithContracts(contractTypes: string[]): EntityId[];
    /**
     * Get all entities that have ANY of the specified contract types
     */
    getEntitiesWithAnyContract(contractTypes: string[]): EntityId[];
    /**
     * Register a hook for when entities are added
     */
    onEntityAdd(hook: EntityHook): void;
    /**
     * Register a hook for when entities are removed
     */
    onEntityRemove(hook: EntityHook): void;
    /**
     * Register a hook for when contracts are added
     */
    onContractAdd<T extends Contract>(contractType: T['type'], hook: ContractHook<T>): void;
    /**
     * Register a hook for when contracts are removed
     */
    onContractRemove<T extends Contract>(contractType: T['type'], hook: ContractHook<T>): void;
    /**
     * Get statistics about the ECS world
     */
    getStats(): {
        entityCount: number;
        contractTypeCount: number;
        contractCounts: Record<string, number>;
    };
    /**
     * Clear all entities and contracts
     */
    clear(): void;
}
/**
 * Create a new ECS world instance
 */
export declare function createECSWorld(): ECSWorld;
/**
 * Type-safe helper to get a contract of a specific type
 */
export declare function getTypedContract<T extends AnyContract>(world: ECSWorld, entityId: EntityId, contractType: T['type']): T | undefined;
/**
 * Type-safe helper to check if an entity has a contract of a specific type
 */
export declare function hasTypedContract<T extends AnyContract>(world: ECSWorld, entityId: EntityId, contractType: T['type']): boolean;
/**
 * Helper to safely update a contract
 */
export declare function updateContract<T extends Contract>(world: ECSWorld, entityId: EntityId, contractType: T['type'], updateFn: (contract: T) => T): boolean;
//# sourceMappingURL=ecs.d.ts.map