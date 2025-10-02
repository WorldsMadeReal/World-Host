import type { EntityId, Vec3 } from '@worldhost/shared';
import type { ECSWorld } from '../ecs.js';
import type { ChunkManager } from '../chunks.js';
export interface MoveResult {
    ok: boolean;
    position: Vec3;
    blockedReason?: string;
    collisionNormal?: Vec3;
}
export interface CollisionInfo {
    hit: boolean;
    point: Vec3;
    normal: Vec3;
    distance: number;
    entityId?: EntityId;
}
export interface MovementSystem {
    update(deltaTime: number): void;
    attemptMove(entityId: EntityId, want: Vec3, deltaTime: number): MoveResult;
    moveEntity(entityId: EntityId, targetPosition: Vec3, deltaTime: number): boolean;
    checkCollision(entityId: EntityId, newPosition: Vec3): boolean;
}
export declare class BasicMovementSystem implements MovementSystem {
    private ecsWorld;
    private chunkManager;
    private readonly gravity;
    private readonly terminalVelocity;
    private readonly groundFriction;
    private readonly airFriction;
    private readonly collisionEpsilon;
    constructor(ecsWorld: ECSWorld, chunkManager: ChunkManager);
    update(deltaTime: number): void;
    private updateEntityMovement;
    /**
     * Attempt to move an entity to a desired position with collision detection
     */
    attemptMove(entityId: EntityId, want: Vec3, deltaTime: number): MoveResult;
    moveEntity(entityId: EntityId, targetPosition: Vec3, deltaTime: number): boolean;
    /**
     * Perform swept-AABB collision detection
     */
    private performSweptAABB;
    /**
     * Get entity AABB at a specific position
     */
    private getEntityAABB;
    /**
     * Get chunks that a movement path intersects
     */
    private getChunksForMovement;
    /**
     * Check collision with static solids in chunk grid
     */
    private checkStaticSolids;
    /**
     * Check collision with dynamic solid entity
     */
    private checkDynamicSolid;
    /**
     * Segment-vs-AABB intersection using the slab method. Returns entry t in [0,1] and surface normal.
     */
    private intersectSegmentAABB;
    /**
     * Clamp movement to collision point
     */
    private clampMovementToCollision;
    checkCollision(entityId: EntityId, newPosition: Vec3): boolean;
    private isOnGround;
    /**
     * Apply an impulse to an entity (instant velocity change)
     */
    applyImpulse(entityId: EntityId, impulse: Vec3): boolean;
    /**
     * Set entity velocity directly
     */
    setVelocity(entityId: EntityId, velocity: Vec3): boolean;
    /**
     * Teleport entity to a new position
     */
    teleport(entityId: EntityId, position: Vec3): boolean;
}
//# sourceMappingURL=movement.d.ts.map