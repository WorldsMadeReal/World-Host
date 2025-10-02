import type { EntityId, Durability, Identity } from '@worldhost/shared';
import type { ECSWorld } from '../ecs.js';

// Default durability for entities without explicit durability contract
const DEFAULT_DURABILITY: Durability = {
  type: 'durability',
  health: 1,
  maxHealth: 1,
};

export interface DamageEvent {
  entityId: EntityId;
  damage: number;
  damageType?: string;
  source?: EntityId;
  timestamp: number;
}

export interface HealEvent {
  entityId: EntityId;
  healing: number;
  source?: EntityId;
  timestamp: number;
}

export interface DestroyEvent {
  entityId: EntityId;
  cause: 'damage' | 'command' | 'timeout';
  source?: EntityId;
  timestamp: number;
}

export interface DurabilitySystem {
  update(deltaTime: number): void;
  applyDamage(entityId: EntityId, amount: number, source?: EntityId): boolean;
  damage(entityId: EntityId, amount: number, source?: EntityId): boolean;
  heal(entityId: EntityId, amount: number, source?: EntityId): boolean;
  repair(entityId: EntityId): boolean;
  isDestroyed(entityId: EntityId): boolean;
  getDurability(entityId: EntityId): Durability;
  ensureDurability(entityId: EntityId): void;
}

export class BasicDurabilitySystem implements DurabilitySystem {
  private ecsWorld: ECSWorld;
  private damageEvents: DamageEvent[] = [];
  private healEvents: HealEvent[] = [];
  private destroyEvents: DestroyEvent[] = [];
  
  // Event handlers
  private onDamageHandlers: Array<(event: DamageEvent) => void> = [];
  private onHealHandlers: Array<(event: HealEvent) => void> = [];
  private onDestroyHandlers: Array<(event: DestroyEvent) => void> = [];

  constructor(ecsWorld: ECSWorld) {
    this.ecsWorld = ecsWorld;
    this.setupHooks();
    this.ensureAllEntitiesHaveDurability();
  }

  private setupHooks(): void {
    // Listen for durability contract changes
    this.ecsWorld.onContractAdd('durability', (entityId, contract) => {
      const durability = contract as Durability;
      console.log(`🛡️ Entity ${entityId} gained durability: ${durability.health}/${durability.maxHealth}`);
    });

    this.ecsWorld.onContractRemove('durability', (entityId, contract) => {
      console.log(`💥 Entity ${entityId} lost durability (destroyed)`);
    });
    
    // Ensure new entities with identity get durability
    this.ecsWorld.onContractAdd('identity', (entityId) => {
      // Add durability on next tick to avoid conflicts during entity creation
      setTimeout(() => {
        try {
          this.ensureDurability(entityId);
        } catch (error) {
          // Entity might have been removed already
          console.debug(`Could not add durability to ${entityId}:`, error);
        }
      }, 0);
    });
  }
  
  /**
   * Ensure all existing entities with identity have durability
   */
  private ensureAllEntitiesHaveDurability(): void {
    const identityEntities = this.ecsWorld.getEntitiesWithContract('identity');
    
    for (const entityId of identityEntities) {
      try {
        this.ensureDurability(entityId);
      } catch (error) {
        console.warn(`Failed to ensure durability for ${entityId}:`, error);
      }
    }
    
    console.log(`🛡️ Ensured durability for ${identityEntities.length} entities with identity`);
  }

  update(deltaTime: number): void {
    // Process any pending destruction
    this.processDestroyedEntities();
    
    // Clean up old events (keep last 100 of each type)
    this.cleanupEvents();
  }

  /**
   * Apply damage to an entity, ensuring it has durability contract
   */
  applyDamage(entityId: EntityId, amount: number, source?: EntityId): boolean {
    // Ensure entity has durability (every Identity can be destroyed)
    this.ensureDurability(entityId);
    
    return this.damage(entityId, amount, source);
  }
  
  /**
   * Get durability contract, returning default if none exists
   */
  getDurability(entityId: EntityId): Durability {
    const durability = this.ecsWorld.getContract<Durability>(entityId, 'durability');
    if (durability) {
      return durability;
    }
    
    // Return default durability if entity has Identity
    const identity = this.ecsWorld.getContract<Identity>(entityId, 'identity');
    if (identity) {
      return { ...DEFAULT_DURABILITY };
    }
    
    // Entity without identity cannot have durability
    throw new Error(`Entity ${entityId} has no identity and cannot have durability`);
  }
  
  /**
   * Ensure entity has durability contract if it has identity
   */
  ensureDurability(entityId: EntityId): void {
    const identity = this.ecsWorld.getContract<Identity>(entityId, 'identity');
    if (!identity) {
      throw new Error(`Entity ${entityId} has no identity and cannot have durability`);
    }
    
    const existingDurability = this.ecsWorld.getContract<Durability>(entityId, 'durability');
    if (!existingDurability) {
      // Add default durability contract
      const defaultDurability: Durability = {
        ...DEFAULT_DURABILITY,
      };
      
      try {
        this.ecsWorld.addContract(entityId, defaultDurability);
        console.log(`🛡️ Added default durability to entity ${entityId}`);
      } catch (error) {
        console.warn(`Failed to add durability to entity ${entityId}:`, error);
      }
    }
  }
  
  damage(entityId: EntityId, amount: number, source?: EntityId): boolean {
    const durability = this.ecsWorld.getContract<Durability>(entityId, 'durability');
    if (!durability) return false;

    // Apply armor reduction if present
    const actualDamage = this.calculateActualDamage(amount, durability.armor);
    
    if (actualDamage <= 0) {
      return false; // No damage dealt
    }

    // Calculate new health
    const newHealth = Math.max(0, durability.health - actualDamage);
    
    // Create damage event
    const damageEvent: DamageEvent = {
      entityId,
      damage: actualDamage,
      source,
      timestamp: Date.now(),
    };
    this.damageEvents.push(damageEvent);

    // Update durability contract
    const updatedDurability: Durability = {
      ...durability,
      health: newHealth,
    };
    this.ecsWorld.addContract(entityId, updatedDurability);

    // Trigger damage handlers
    for (const handler of this.onDamageHandlers) {
      handler(damageEvent);
    }

    // Check if entity is destroyed
    if (newHealth <= 0) {
      this.destroyEntity(entityId, 'damage', source);
    }

    console.log(`⚔️ Entity ${entityId} took ${actualDamage} damage (${newHealth}/${durability.maxHealth} remaining)`);
    return true;
  }

  heal(entityId: EntityId, amount: number, source?: EntityId): boolean {
    const durability = this.ecsWorld.getContract<Durability>(entityId, 'durability');
    if (!durability) return false;

    if (durability.health >= durability.maxHealth) {
      return false; // Already at full health
    }

    // Calculate new health (capped at max)
    const newHealth = Math.min(durability.maxHealth, durability.health + amount);
    const actualHealing = newHealth - durability.health;

    if (actualHealing <= 0) {
      return false; // No healing applied
    }

    // Create heal event
    const healEvent: HealEvent = {
      entityId,
      healing: actualHealing,
      source,
      timestamp: Date.now(),
    };
    this.healEvents.push(healEvent);

    // Update durability contract
    const updatedDurability: Durability = {
      ...durability,
      health: newHealth,
    };
    this.ecsWorld.addContract(entityId, updatedDurability);

    // Trigger heal handlers
    for (const handler of this.onHealHandlers) {
      handler(healEvent);
    }

    console.log(`💚 Entity ${entityId} healed ${actualHealing} health (${newHealth}/${durability.maxHealth})`);
    return true;
  }

  repair(entityId: EntityId): boolean {
    const durability = this.ecsWorld.getContract<Durability>(entityId, 'durability');
    if (!durability) return false;

    return this.heal(entityId, durability.maxHealth - durability.health);
  }

  isDestroyed(entityId: EntityId): boolean {
    // Entity is destroyed if it doesn't exist
    if (!this.ecsWorld.hasEntity(entityId)) {
      return true;
    }
    
    try {
      const durability = this.getDurability(entityId);
      return durability.health <= 0;
    } catch (error) {
      // Entity without identity is considered destroyed
      return true;
    }
  }

  private calculateActualDamage(damage: number, armor?: number): number {
    if (!armor || armor <= 0) {
      return damage;
    }

    // Simple armor calculation: each point of armor reduces damage by 1%
    const damageReduction = Math.min(0.75, armor * 0.01); // Max 75% reduction
    return damage * (1 - damageReduction);
  }

  private destroyEntity(entityId: EntityId, cause: 'damage' | 'command' | 'timeout', source?: EntityId): void {
    const destroyEvent: DestroyEvent = {
      entityId,
      cause,
      source,
      timestamp: Date.now(),
    };
    this.destroyEvents.push(destroyEvent);

    // Trigger destroy handlers before removal
    for (const handler of this.onDestroyHandlers) {
      handler(destroyEvent);
    }

    // Remove the entity from the world (this will emit despawn events)
    this.ecsWorld.removeEntity(entityId);
    
    console.log(`💀 Entity ${entityId} destroyed (cause: ${cause})`);
  }

  private processDestroyedEntities(): void {
    // Find entities with 0 health that haven't been destroyed yet
    const entitiesWithDurability = this.ecsWorld.getEntitiesWithContract('durability');
    
    for (const entityId of entitiesWithDurability) {
      const durability = this.ecsWorld.getContract<Durability>(entityId, 'durability');
      if (durability && durability.health <= 0) {
        this.destroyEntity(entityId, 'damage');
      }
    }
  }

  private cleanupEvents(): void {
    // Keep only the last 100 events of each type
    const maxEvents = 100;
    
    if (this.damageEvents.length > maxEvents) {
      this.damageEvents = this.damageEvents.slice(-maxEvents);
    }
    
    if (this.healEvents.length > maxEvents) {
      this.healEvents = this.healEvents.slice(-maxEvents);
    }
    
    if (this.destroyEvents.length > maxEvents) {
      this.destroyEvents = this.destroyEvents.slice(-maxEvents);
    }
  }

  // Event handler registration
  onDamage(handler: (event: DamageEvent) => void): void {
    this.onDamageHandlers.push(handler);
  }

  onHeal(handler: (event: HealEvent) => void): void {
    this.onHealHandlers.push(handler);
  }

  onDestroy(handler: (event: DestroyEvent) => void): void {
    this.onDestroyHandlers.push(handler);
  }

  // Event history access
  getDamageHistory(entityId?: EntityId): DamageEvent[] {
    if (entityId) {
      return this.damageEvents.filter(event => event.entityId === entityId);
    }
    return [...this.damageEvents];
  }

  getHealHistory(entityId?: EntityId): HealEvent[] {
    if (entityId) {
      return this.healEvents.filter(event => event.entityId === entityId);
    }
    return [...this.healEvents];
  }

  getDestroyHistory(): DestroyEvent[] {
    return [...this.destroyEvents];
  }

  // Utility methods
  getDurabilityPercentage(entityId: EntityId): number {
    try {
      const durability = this.getDurability(entityId);
      return (durability.health / durability.maxHealth) * 100;
    } catch (error) {
      return 0;
    }
  }

  isDamaged(entityId: EntityId): boolean {
    try {
      const durability = this.getDurability(entityId);
      return durability.health < durability.maxHealth;
    } catch (error) {
      return false;
    }
  }

  getHealthStatus(entityId: EntityId): 'healthy' | 'damaged' | 'critical' | 'destroyed' | 'no-identity' {
    try {
      const percentage = this.getDurabilityPercentage(entityId);
      
      if (percentage <= 0) return 'destroyed';
      if (percentage <= 25) return 'critical';
      if (percentage < 100) return 'damaged';
      return 'healthy';
    } catch (error) {
      return 'no-identity';
    }
  }
}
