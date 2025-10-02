import type { EntityId, LayerId, Vec3, ChunkKey, AnyContract } from '@worldhost/shared';
import { ECSWorld } from './ecs.js';
import { type LayerConfig } from './space.js';
export interface Archetype {
    id: string;
    name: string;
    description?: string;
    contracts: AnyContract[];
    tags: string[];
    created: number;
}
export interface WorldData {
    version: string;
    timestamp: number;
    layers: LayerConfig[];
    archetypes: Archetype[];
    entities: Array<{
        id: EntityId;
        layerId: LayerId;
        contracts: AnyContract[];
    }>;
    metadata: Record<string, any>;
}
export interface SpawnRequest {
    archetypeId: string;
    layerId: LayerId;
    position: Vec3;
    overrides?: Partial<AnyContract>[];
}
export declare class WorldState {
    private ecsWorld;
    private playerCounter;
    private archetypes;
    private dataDirectory;
    private entitiesByLayer;
    constructor(ecsWorld: ECSWorld, dataDirectory?: string);
    private initializeWorld;
    private setupEntityTracking;
    private removeEntityFromLayerTracking;
    private createTestWorld;
    private initializeDefaultArchetypes;
    /**
     * Add a new player to the world
     */
    addPlayer(layerId: LayerId, playerName?: string): EntityId;
    /**
     * Remove a player from the world
     */
    removePlayer(playerId: EntityId): boolean;
    /**
     * Get all players in the world
     */
    getPlayers(): EntityId[];
    /**
     * Get entities in a specific chunk
     */
    getEntitiesInChunk(chunkKey: ChunkKey): EntityId[];
    /**
     * Get entities near a position
     */
    getEntitiesNearPosition(position: Vec3, radius: number): EntityId[];
    /**
     * Update entity position
     */
    updateEntityPosition(entityId: EntityId, position: Vec3, velocity?: Vec3): boolean;
    /**
     * Get the ECS world instance
     */
    getECSWorld(): ECSWorld;
    /**
     * Get layer registry instance
     */
    getLayerRegistry(): import("./space.js").LayerRegistry;
    /**
     * Create a new layer
     */
    createLayer(config: Omit<LayerConfig, 'id'> & {
        id?: LayerId;
    }): LayerConfig;
    /**
     * Define a new archetype
     */
    defineArchetype(archetype: Archetype): void;
    /**
     * Get archetype by ID
     */
    getArchetype(id: string): Archetype | undefined;
    /**
     * Get all archetypes
     */
    getAllArchetypes(): Archetype[];
    /**
     * Spawn entity from archetype
     */
    spawn(archetypeId: string, layerId: LayerId, position: Vec3, overrides?: Array<Partial<AnyContract> & {
        type: AnyContract['type'];
    }>): EntityId;
    /**
     * Get entities in a specific layer
     */
    getEntitiesInLayer(layerId: LayerId): EntityId[];
    /**
     * Get all layers with entity counts
     */
    getAllLayers(): Array<LayerConfig & {
        entityCount: number;
    }>;
    /**
     * Ensure data directory exists
     */
    private ensureDataDirectory;
    /**
     * Save world state to JSON file
     */
    saveWorld(filename?: string): Promise<void>;
    /**
     * Load world state from JSON file
     */
    loadWorld(filename?: string): Promise<void>;
    /**
     * Get world statistics
     */
    getStats(): {
        playerCount: number;
        totalEntities: number;
        layerCount: number;
        archetypeCount: number;
        entitiesByLayer: Record<LayerId, number>;
    };
    getECSWorldAlias(): ECSWorld;
}
//# sourceMappingURL=state.d.ts.map