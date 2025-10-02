import type { EntityId, Durability } from '@worldhost/shared';
import type { ECSWorld } from '../ecs.js';
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
export declare class BasicDurabilitySystem implements DurabilitySystem {
    private ecsWorld;
    private damageEvents;
    private healEvents;
    private destroyEvents;
    private onDamageHandlers;
    private onHealHandlers;
    private onDestroyHandlers;
    constructor(ecsWorld: ECSWorld);
    private setupHooks;
    /**
     * Ensure all existing entities with identity have durability
     */
    private ensureAllEntitiesHaveDurability;
    update(deltaTime: number): void;
    /**
     * Apply damage to an entity, ensuring it has durability contract
     */
    applyDamage(entityId: EntityId, amount: number, source?: EntityId): boolean;
    /**
     * Get durability contract, returning default if none exists
     */
    getDurability(entityId: EntityId): Durability;
    /**
     * Ensure entity has durability contract if it has identity
     */
    ensureDurability(entityId: EntityId): void;
    damage(entityId: EntityId, amount: number, source?: EntityId): boolean;
    heal(entityId: EntityId, amount: number, source?: EntityId): boolean;
    repair(entityId: EntityId): boolean;
    isDestroyed(entityId: EntityId): boolean;
    private calculateActualDamage;
    private destroyEntity;
    private processDestroyedEntities;
    private cleanupEvents;
    onDamage(handler: (event: DamageEvent) => void): void;
    onHeal(handler: (event: HealEvent) => void): void;
    onDestroy(handler: (event: DestroyEvent) => void): void;
    getDamageHistory(entityId?: EntityId): DamageEvent[];
    getHealHistory(entityId?: EntityId): HealEvent[];
    getDestroyHistory(): DestroyEvent[];
    getDurabilityPercentage(entityId: EntityId): number;
    isDamaged(entityId: EntityId): boolean;
    getHealthStatus(entityId: EntityId): 'healthy' | 'damaged' | 'critical' | 'destroyed' | 'no-identity';
}
//# sourceMappingURL=durability.d.ts.map