import { Vec3Utils, ChunkUtils } from '@worldhost/shared';
import { keyFromPos, getNeighboringChunks } from '../space.js';
import { GRAVITY, TERMINAL_VELOCITY, GROUND_FRICTION, AIR_FRICTION, COLLISION_EPSILON } from '../../config.js';
export class BasicMovementSystem {
    ecsWorld;
    chunkManager;
    // Movement configuration (from config)
    gravity;
    terminalVelocity;
    groundFriction;
    airFriction;
    collisionEpsilon;
    constructor(ecsWorld, chunkManager) {
        this.ecsWorld = ecsWorld;
        this.chunkManager = chunkManager;
        // Load configuration from imports
        this.gravity = GRAVITY;
        this.terminalVelocity = TERMINAL_VELOCITY;
        this.groundFriction = GROUND_FRICTION;
        this.airFriction = AIR_FRICTION;
        this.collisionEpsilon = COLLISION_EPSILON;
    }
    update(deltaTime) {
        // Get all entities with mobility
        const mobileEntities = this.ecsWorld.getEntitiesWithContract('mobility');
        for (const entityId of mobileEntities) {
            this.updateEntityMovement(entityId, deltaTime);
        }
    }
    updateEntityMovement(entityId, deltaTime) {
        const mobility = this.ecsWorld.getContract(entityId, 'mobility');
        if (!mobility)
            return;
        let newVelocity = { ...mobility.velocity || { x: 0, y: 0, z: 0 } };
        let newPosition = { ...mobility.position };
        // Apply gravity if not on ground
        if (!this.isOnGround(entityId)) {
            newVelocity.y += this.gravity * deltaTime;
            newVelocity.y = Math.max(newVelocity.y, this.terminalVelocity);
        }
        else {
            // On ground, stop falling
            if (newVelocity.y < 0) {
                newVelocity.y = 0;
            }
        }
        // Apply friction
        const friction = this.isOnGround(entityId) ? this.groundFriction : this.airFriction;
        newVelocity.x *= Math.pow(friction, deltaTime);
        newVelocity.z *= Math.pow(friction, deltaTime);
        // Apply max speed limits
        if (mobility.maxSpeed !== undefined) {
            const horizontalSpeed = Math.sqrt(newVelocity.x ** 2 + newVelocity.z ** 2);
            if (horizontalSpeed > mobility.maxSpeed) {
                const scale = mobility.maxSpeed / horizontalSpeed;
                newVelocity.x *= scale;
                newVelocity.z *= scale;
            }
        }
        // Calculate new position
        newPosition.x += newVelocity.x * deltaTime;
        newPosition.y += newVelocity.y * deltaTime;
        newPosition.z += newVelocity.z * deltaTime;
        // Check for collisions and adjust position
        if (this.checkCollision(entityId, newPosition)) {
            // Simple collision response: stop movement in the colliding direction
            const originalPosition = mobility.position;
            // Try moving only horizontally
            const horizontalPosition = {
                x: newPosition.x,
                y: originalPosition.y,
                z: newPosition.z,
            };
            if (!this.checkCollision(entityId, horizontalPosition)) {
                newPosition = horizontalPosition;
                newVelocity.y = 0; // Stop vertical movement
            }
            else {
                // Try moving only vertically
                const verticalPosition = {
                    x: originalPosition.x,
                    y: newPosition.y,
                    z: originalPosition.z,
                };
                if (!this.checkCollision(entityId, verticalPosition)) {
                    newPosition = verticalPosition;
                    newVelocity.x = 0;
                    newVelocity.z = 0;
                }
                else {
                    // Can't move at all, stop all movement
                    newPosition = originalPosition;
                    newVelocity = { x: 0, y: 0, z: 0 };
                }
            }
        }
        // Update the mobility contract
        const updatedMobility = {
            ...mobility,
            position: newPosition,
            velocity: newVelocity,
        };
        this.ecsWorld.addContract(entityId, updatedMobility);
    }
    /**
     * Attempt to move an entity to a desired position with collision detection
     */
    attemptMove(entityId, want, deltaTime) {
        const mobility = this.ecsWorld.getContract(entityId, 'mobility');
        const shape = this.ecsWorld.getContract(entityId, 'shape');
        if (!mobility) {
            return { ok: false, position: { x: 0, y: 0, z: 0 }, blockedReason: 'No mobility contract' };
        }
        if (!shape) {
            return { ok: false, position: mobility.position, blockedReason: 'No shape contract' };
        }
        const currentPosition = mobility.position;
        const maxSpeed = mobility.maxSpeed || 5;
        // Calculate desired movement direction and distance
        const direction = Vec3Utils.subtract(want, currentPosition);
        const wantDistance = Vec3Utils.length(direction);
        if (wantDistance < this.collisionEpsilon) {
            return { ok: true, position: currentPosition };
        }
        // Normalize direction and apply speed limit
        const normalizedDirection = Vec3Utils.normalize(direction);
        const maxDisplacement = maxSpeed * deltaTime;
        const actualDistance = Math.min(wantDistance, maxDisplacement);
        // Proposed displacement
        const displacement = Vec3Utils.multiply(normalizedDirection, actualDistance);
        const proposedPosition = Vec3Utils.add(currentPosition, displacement);
        // Perform swept-AABB collision detection
        const collision = this.performSweptAABB(entityId, currentPosition, proposedPosition, shape);
        if (!collision.hit) {
            // No collision, movement is allowed
            return { ok: true, position: proposedPosition };
        }
        // Collision detected, clamp movement
        const clampedPosition = this.clampMovementToCollision(currentPosition, proposedPosition, collision);
        return {
            ok: false,
            position: clampedPosition,
            blockedReason: collision.entityId ? `Blocked by entity ${collision.entityId}` : 'Blocked by solid',
            collisionNormal: collision.normal,
        };
    }
    moveEntity(entityId, targetPosition, deltaTime) {
        const result = this.attemptMove(entityId, targetPosition, deltaTime);
        if (result.ok || result.position) {
            // Update entity position
            const mobility = this.ecsWorld.getContract(entityId, 'mobility');
            if (mobility) {
                const updatedMobility = {
                    ...mobility,
                    position: result.position,
                };
                this.ecsWorld.addContract(entityId, updatedMobility);
            }
        }
        return result.ok;
    }
    /**
     * Perform swept-AABB collision detection
     */
    performSweptAABB(entityId, startPos, endPos, shape) {
        const displacement = Vec3Utils.subtract(endPos, startPos);
        const movingAABB = this.getEntityAABB(shape, startPos);
        let closestCollision = {
            hit: false,
            point: endPos,
            normal: { x: 0, y: 1, z: 0 },
            distance: Vec3Utils.length(displacement),
        };
        // Get chunks that the movement path intersects
        const affectedChunks = this.getChunksForMovement(startPos, endPos);
        // Gather dynamic solid entities once to ensure collisions are detected even if
        // chunk indices are not populated for test environments
        const solidEntities = new Set(this.ecsWorld.getEntitiesWithContract('solidity'));
        solidEntities.delete(entityId);
        for (const chunkKey of affectedChunks) {
            // Check static solids in chunk
            const staticCollision = this.checkStaticSolids(movingAABB, displacement, chunkKey);
            if (staticCollision.hit && staticCollision.distance < closestCollision.distance) {
                closestCollision = staticCollision;
            }
        }
        // Check dynamic solid entities globally (filtered by solidity contract)
        for (const otherEntityId of solidEntities) {
            const dynamicCollision = this.checkDynamicSolid(movingAABB, displacement, otherEntityId);
            if (dynamicCollision.hit && dynamicCollision.distance < closestCollision.distance) {
                closestCollision = dynamicCollision;
            }
        }
        return closestCollision;
    }
    /**
     * Get entity AABB at a specific position
     */
    getEntityAABB(shape, position) {
        return {
            min: Vec3Utils.add(shape.bounds.min, position),
            max: Vec3Utils.add(shape.bounds.max, position),
        };
    }
    /**
     * Get chunks that a movement path intersects
     */
    getChunksForMovement(startPos, endPos) {
        const layerId = 'default'; // TODO: Get actual layer from entity
        const startChunk = keyFromPos(layerId, startPos);
        const endChunk = keyFromPos(layerId, endPos);
        const chunks = new Set();
        chunks.add(ChunkUtils.toString(startChunk));
        chunks.add(ChunkUtils.toString(endChunk));
        // Add neighboring chunks for safety
        for (const neighbor of getNeighboringChunks(startChunk, 1)) {
            chunks.add(ChunkUtils.toString(neighbor));
        }
        return Array.from(chunks).map(keyStr => {
            const key = ChunkUtils.fromString(keyStr);
            if (!key)
                throw new Error(`Invalid chunk key: ${keyStr}`);
            return key;
        });
    }
    /**
     * Check collision with static solids in chunk grid
     */
    checkStaticSolids(movingAABB, displacement, chunkKey) {
        const chunk = this.chunkManager.getChunk(chunkKey);
        if (!chunk.solidGrid) {
            return {
                hit: false,
                point: Vec3Utils.add(movingAABB.min, displacement),
                normal: { x: 0, y: 1, z: 0 },
                distance: Vec3Utils.length(displacement),
            };
        }
        // TODO: Implement proper swept-AABB vs grid collision
        // For now, just check if the end position intersects any solid cells
        const endAABB = {
            min: Vec3Utils.add(movingAABB.min, displacement),
            max: Vec3Utils.add(movingAABB.max, displacement),
        };
        // Simple grid collision check (can be optimized)
        const gridRes = chunk.solidGrid.width;
        const chunkSize = 32; // TODO: Get from layer config
        const minGridX = Math.floor((endAABB.min.x % chunkSize) / chunkSize * gridRes);
        const maxGridX = Math.ceil((endAABB.max.x % chunkSize) / chunkSize * gridRes);
        const minGridY = Math.floor((endAABB.min.y % 256) / 256 * gridRes);
        const maxGridY = Math.ceil((endAABB.max.y % 256) / 256 * gridRes);
        const minGridZ = Math.floor((endAABB.min.z % chunkSize) / chunkSize * gridRes);
        const maxGridZ = Math.ceil((endAABB.max.z % chunkSize) / chunkSize * gridRes);
        for (let x = Math.max(0, minGridX); x < Math.min(gridRes, maxGridX); x++) {
            for (let y = Math.max(0, minGridY); y < Math.min(gridRes, maxGridY); y++) {
                for (let z = Math.max(0, minGridZ); z < Math.min(gridRes, maxGridZ); z++) {
                    if (this.chunkManager.isSolid(chunk, x, y, z)) {
                        return {
                            hit: true,
                            point: endAABB.min,
                            normal: { x: 0, y: 1, z: 0 }, // Simplified normal
                            distance: Vec3Utils.length(displacement) * 0.5, // Approximate
                        };
                    }
                }
            }
        }
        return {
            hit: false,
            point: Vec3Utils.add(movingAABB.min, displacement),
            normal: { x: 0, y: 1, z: 0 },
            distance: Vec3Utils.length(displacement),
        };
    }
    /**
     * Check collision with dynamic solid entity
     */
    checkDynamicSolid(movingAABB, displacement, otherEntityId) {
        const otherSolidity = this.ecsWorld.getContract(otherEntityId, 'solidity');
        if (!otherSolidity?.solid) {
            return {
                hit: false,
                point: Vec3Utils.add(movingAABB.min, displacement),
                normal: { x: 0, y: 1, z: 0 },
                distance: Vec3Utils.length(displacement),
            };
        }
        const otherShape = this.ecsWorld.getContract(otherEntityId, 'shape');
        const otherMobility = this.ecsWorld.getContract(otherEntityId, 'mobility');
        if (!otherShape || !otherMobility) {
            return {
                hit: false,
                point: Vec3Utils.add(movingAABB.min, displacement),
                normal: { x: 0, y: 1, z: 0 },
                distance: Vec3Utils.length(displacement),
            };
        }
        const otherAABB = this.getEntityAABB(otherShape, otherMobility.position);
        // Swept test: expand target AABB by the half extents of the moving AABB
        const halfExtents = {
            x: (movingAABB.max.x - movingAABB.min.x) / 2,
            y: (movingAABB.max.y - movingAABB.min.y) / 2,
            z: (movingAABB.max.z - movingAABB.min.z) / 2,
        };
        const startCenter = {
            x: (movingAABB.min.x + movingAABB.max.x) / 2,
            y: (movingAABB.min.y + movingAABB.max.y) / 2,
            z: (movingAABB.min.z + movingAABB.max.z) / 2,
        };
        const endCenter = Vec3Utils.add(startCenter, displacement);
        const expandedAABB = {
            min: { x: otherAABB.min.x - halfExtents.x, y: otherAABB.min.y - halfExtents.y, z: otherAABB.min.z - halfExtents.z },
            max: { x: otherAABB.max.x + halfExtents.x, y: otherAABB.max.y + halfExtents.y, z: otherAABB.max.z + halfExtents.z },
        };
        const sweep = this.intersectSegmentAABB(startCenter, endCenter, expandedAABB);
        if (sweep.hit) {
            const totalDist = Vec3Utils.length(displacement);
            const hitDist = Math.max(0, Math.min(1, sweep.t)) * totalDist;
            const hitPoint = Vec3Utils.add(startCenter, Vec3Utils.multiply(Vec3Utils.subtract(endCenter, startCenter), sweep.t));
            return {
                hit: true,
                point: hitPoint,
                normal: sweep.normal,
                distance: hitDist,
                entityId: otherEntityId,
            };
        }
        return {
            hit: false,
            point: Vec3Utils.add(movingAABB.min, displacement),
            normal: { x: 0, y: 1, z: 0 },
            distance: Vec3Utils.length(displacement),
        };
    }
    /**
     * Segment-vs-AABB intersection using the slab method. Returns entry t in [0,1] and surface normal.
     */
    intersectSegmentAABB(start, end, aabb) {
        const dir = Vec3Utils.subtract(end, start);
        let tmin = 0;
        let tmax = 1;
        let normal = { x: 0, y: 0, z: 0 };
        const axes = ['x', 'y', 'z'];
        for (const axis of axes) {
            const s = start[axis];
            const d = dir[axis];
            const min = aabb.min[axis];
            const max = aabb.max[axis];
            if (Math.abs(d) < 1e-9) {
                if (s < min || s > max) {
                    return { hit: false, t: 1, normal: { x: 0, y: 0, z: 0 } };
                }
                continue;
            }
            let t1 = (min - s) / d;
            let t2 = (max - s) / d;
            let enterNormalAxis = axis;
            if (t1 > t2) {
                const tmp = t1;
                t1 = t2;
                t2 = tmp;
                // entering from max side -> normal points positive along axis
                // will resolve after selecting the final tmin axis
            }
            if (t1 > tmin) {
                tmin = t1;
                // Determine normal for this axis and direction
                normal = { x: 0, y: 0, z: 0 };
                if (axis === 'x')
                    normal.x = d > 0 ? -1 : 1;
                if (axis === 'y')
                    normal.y = d > 0 ? -1 : 1;
                if (axis === 'z')
                    normal.z = d > 0 ? -1 : 1;
            }
            tmax = Math.min(tmax, t2);
            if (tmax < tmin) {
                return { hit: false, t: 1, normal: { x: 0, y: 0, z: 0 } };
            }
        }
        return { hit: tmin >= 0 && tmin <= 1, t: tmin, normal };
    }
    /**
     * Clamp movement to collision point
     */
    clampMovementToCollision(startPos, endPos, collision) {
        const displacement = Vec3Utils.subtract(endPos, startPos);
        const clampFactor = Math.max(0, collision.distance / Vec3Utils.length(displacement) - this.collisionEpsilon);
        const clampedDisplacement = Vec3Utils.multiply(displacement, clampFactor);
        return Vec3Utils.add(startPos, clampedDisplacement);
    }
    checkCollision(entityId, newPosition) {
        const result = this.attemptMove(entityId, newPosition, 0.016); // Assume 60fps for quick check
        return !result.ok;
    }
    isOnGround(entityId) {
        const mobility = this.ecsWorld.getContract(entityId, 'mobility');
        if (!mobility)
            return false;
        // Check if there's solid ground slightly below the entity
        const testPosition = {
            x: mobility.position.x,
            y: mobility.position.y - 0.1,
            z: mobility.position.z,
        };
        return this.checkCollision(entityId, testPosition);
    }
    /**
     * Apply an impulse to an entity (instant velocity change)
     */
    applyImpulse(entityId, impulse) {
        const mobility = this.ecsWorld.getContract(entityId, 'mobility');
        if (!mobility)
            return false;
        const currentVelocity = mobility.velocity || { x: 0, y: 0, z: 0 };
        const newVelocity = Vec3Utils.add(currentVelocity, impulse);
        const updatedMobility = {
            ...mobility,
            velocity: newVelocity,
        };
        this.ecsWorld.addContract(entityId, updatedMobility);
        return true;
    }
    /**
     * Set entity velocity directly
     */
    setVelocity(entityId, velocity) {
        const mobility = this.ecsWorld.getContract(entityId, 'mobility');
        if (!mobility)
            return false;
        const updatedMobility = {
            ...mobility,
            velocity,
        };
        this.ecsWorld.addContract(entityId, updatedMobility);
        return true;
    }
    /**
     * Teleport entity to a new position
     */
    teleport(entityId, position) {
        const mobility = this.ecsWorld.getContract(entityId, 'mobility');
        if (!mobility)
            return false;
        // Check if the new position would cause a collision
        if (this.checkCollision(entityId, position)) {
            return false; // Can't teleport into solid objects
        }
        const updatedMobility = {
            ...mobility,
            position,
            velocity: { x: 0, y: 0, z: 0 }, // Stop movement when teleporting
        };
        this.ecsWorld.addContract(entityId, updatedMobility);
        return true;
    }
}
//# sourceMappingURL=movement.js.map