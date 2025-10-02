import type { EntityId, Contract, AnyContract, ContractLimit } from '@worldhost/shared';
import { contractRegistry } from './contracts.js';

// Hook function types
export type EntityHook = (entityId: EntityId) => void;
export type ContractHook<T extends Contract = Contract> = (
  entityId: EntityId, 
  contract: T
) => void;

// ECS World class
export class ECSWorld {
  // Core entity storage: Map<EntityId, Set<Contract>>
  private entities = new Map<EntityId, Set<Contract>>();
  
  // Index by contract type for quick queries: Map<ContractType, Set<EntityId>>
  private contractIndex = new Map<string, Set<EntityId>>();
  
  // Hook system for lifecycle events
  private entityAddHooks: EntityHook[] = [];
  private entityRemoveHooks: EntityHook[] = [];
  private contractAddHooks = new Map<string, ContractHook[]>();
  private contractRemoveHooks = new Map<string, ContractHook[]>();

  // Entity CRUD operations
  
  /**
   * Create a new entity with optional initial contracts
   */
  createEntity(id: EntityId, contracts: AnyContract[] = []): EntityId {
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
  removeEntity(id: EntityId): boolean {
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
  hasEntity(id: EntityId): boolean {
    return this.entities.has(id);
  }

  /**
   * Get all entity IDs
   */
  getAllEntities(): EntityId[] {
    return Array.from(this.entities.keys());
  }

  // Contract CRUD operations

  /**
   * Add a contract to an entity with validation and limit checking
   */
  addContract(entityId: EntityId, contract: Contract): void {
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
    const contractLimitContract = this.getContract<ContractLimit>(entityId, 'contract_limit');

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
    const limitCheck = contractRegistry.checkLimits(
      entityId,
      validContract.type,
      existingContracts,
      contractLimitContract
    );
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
  private getMaxContractsAllowed(
    entityId: EntityId, 
    contractType: string, 
    contractLimitContract?: ContractLimit
  ): number {
    // Check entity-specific limits first
    if (contractLimitContract) {
      const entityLimit = contractLimitContract.limits.find((l: { contractType: string; max: number }) => l.contractType === contractType);
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
  removeContract(entityId: EntityId, contractType: string): boolean {
    const contract = this.getContract(entityId, contractType);
    if (!contract) {
      return false;
    }

    return this.removeContractInternal(entityId, contract);
  }

  /**
   * Internal method to remove a contract (used by removeEntity and removeContract)
   */
  private removeContractInternal(entityId: EntityId, contract: Contract): boolean {
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
  getContract<T extends Contract>(entityId: EntityId, contractType: T['type']): T | undefined {
    const contracts = this.entities.get(entityId);
    if (!contracts) {
      return undefined;
    }

    for (const contract of contracts) {
      if (contract.type === contractType) {
        return contract as T;
      }
    }

    return undefined;
  }

  /**
   * Get all contracts for an entity
   */
  getContracts(entityId: EntityId): Contract[] {
    const contracts = this.entities.get(entityId);
    return contracts ? Array.from(contracts) : [];
  }

  /**
   * Check if an entity has a specific contract type
   */
  hasContract(entityId: EntityId, contractType: string): boolean {
    return this.getContract(entityId, contractType) !== undefined;
  }

  // Query operations

  /**
   * Get all entities that have a specific contract type
   */
  getEntitiesWithContract(contractType: string): EntityId[] {
    const entities = this.contractIndex.get(contractType);
    return entities ? Array.from(entities) : [];
  }

  /**
   * Get all entities that have ALL of the specified contract types
   */
  getEntitiesWithContracts(contractTypes: string[]): EntityId[] {
    if (contractTypes.length === 0) {
      return this.getAllEntities();
    }

    // Start with entities that have the first contract type
    let result = new Set(this.getEntitiesWithContract(contractTypes[0]!));

    // Intersect with entities that have each subsequent contract type
    for (let i = 1; i < contractTypes.length; i++) {
      const entitiesWithContract = new Set(this.getEntitiesWithContract(contractTypes[i]!));
      result = new Set([...result].filter(id => entitiesWithContract.has(id)));
    }

    return Array.from(result);
  }

  /**
   * Get all entities that have ANY of the specified contract types
   */
  getEntitiesWithAnyContract(contractTypes: string[]): EntityId[] {
    const result = new Set<EntityId>();

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
  onEntityAdd(hook: EntityHook): void {
    this.entityAddHooks.push(hook);
  }

  /**
   * Register a hook for when entities are removed
   */
  onEntityRemove(hook: EntityHook): void {
    this.entityRemoveHooks.push(hook);
  }

  /**
   * Register a hook for when contracts are added
   */
  onContractAdd<T extends Contract>(contractType: T['type'], hook: ContractHook<T>): void {
    let hooks = this.contractAddHooks.get(contractType);
    if (!hooks) {
      hooks = [];
      this.contractAddHooks.set(contractType, hooks);
    }
    hooks.push(hook as ContractHook);
  }

  /**
   * Register a hook for when contracts are removed
   */
  onContractRemove<T extends Contract>(contractType: T['type'], hook: ContractHook<T>): void {
    let hooks = this.contractRemoveHooks.get(contractType);
    if (!hooks) {
      hooks = [];
      this.contractRemoveHooks.set(contractType, hooks);
    }
    hooks.push(hook as ContractHook);
  }

  // Utility methods

  /**
   * Get statistics about the ECS world
   */
  getStats(): {
    entityCount: number;
    contractTypeCount: number;
    contractCounts: Record<string, number>;
  } {
    const contractCounts: Record<string, number> = {};
    
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
  clear(): void {
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
export function createECSWorld(): ECSWorld {
  return new ECSWorld();
}

/**
 * Type-safe helper to get a contract of a specific type
 */
export function getTypedContract<T extends AnyContract>(
  world: ECSWorld,
  entityId: EntityId,
  contractType: T['type']
): T | undefined {
  return world.getContract<T>(entityId, contractType);
}

/**
 * Type-safe helper to check if an entity has a contract of a specific type
 */
export function hasTypedContract<T extends AnyContract>(
  world: ECSWorld,
  entityId: EntityId,
  contractType: T['type']
): boolean {
  return world.hasContract(entityId, contractType);
}

/**
 * Helper to safely update a contract
 */
export function updateContract<T extends Contract>(
  world: ECSWorld,
  entityId: EntityId,
  contractType: T['type'],
  updateFn: (contract: T) => T
): boolean {
  const existingContract = world.getContract<T>(entityId, contractType);
  if (!existingContract) {
    return false;
  }

  const updatedContract = updateFn(existingContract);
  world.addContract(entityId, updatedContract);
  return true;
}
