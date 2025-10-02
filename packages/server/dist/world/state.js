import { layerRegistry } from './space.js';
import { createPlayerContracts, createWorldCommands, createWorldConditions } from './contracts.js';
import { promises as fs } from 'node:fs';
import { join } from 'node:path';
export class WorldState {
    ecsWorld;
    playerCounter = 0;
    archetypes = new Map();
    dataDirectory = './data';
    // Entity tracking by layer
    entitiesByLayer = new Map();
    constructor(ecsWorld, dataDirectory = './data') {
        this.ecsWorld = ecsWorld;
        this.dataDirectory = dataDirectory;
        this.initializeWorld();
        this.setupEntityTracking();
    }
    async initializeWorld() {
        // Ensure data directory exists
        await this.ensureDataDirectory();
        // Set up ECS hooks for world management
        this.ecsWorld.onEntityAdd((entityId) => {
            console.log(`🆕 Entity created: ${entityId}`);
            // Fire dev event snapshot for new entity
            try {
                const contracts = this.ecsWorld.getContracts(entityId);
                const kind = (this.ecsWorld.getContract(entityId, 'identity')?.name || '').toLowerCase().includes('player') ? 'player' : (entityId.split('-')[0] || 'entity');
                globalThis.__DEV_EVENTS__?.publish?.({ type: 'entity_snapshot', payload: { id: entityId, contracts, kind } });
            }
            catch { }
        });
        this.ecsWorld.onEntityRemove((entityId) => {
            console.log(`🗑️ Entity removed: ${entityId}`);
            this.removeEntityFromLayerTracking(entityId);
            try {
                globalThis.__DEV_EVENTS__?.publish?.({ type: 'entity_despawn', payload: { id: entityId } });
            }
            catch { }
        });
        // Initialize default archetypes
        this.initializeDefaultArchetypes();
        // Try to load existing world data
        try {
            await this.loadWorld();
            console.log('📂 Loaded existing world data');
        }
        catch (error) {
            console.log('🆕 Creating new world (no existing data found)');
            this.createTestWorld();
            // Create a world entity with default conditions and commands
            const worldId = `world-default`;
            try {
                this.ecsWorld.createEntity(worldId, [
                    { type: 'identity', id: worldId, name: 'World', description: 'World container' },
                    createWorldConditions(undefined, 'clear', 'day', undefined, {}),
                    createWorldCommands(['login', 'logout', 'set_view', 'move_dir'])
                ]);
            }
            catch { }
        }
    }
    setupEntityTracking() {
        // Track entities by layer using mobility contract
        this.ecsWorld.onContractAdd('mobility', (entityId, contract) => {
            const mobility = contract;
            // For now, assume entities belong to 'default' layer
            // TODO: Add layer tracking to mobility or identity contract
            const layerId = 'default';
            let layerEntities = this.entitiesByLayer.get(layerId);
            if (!layerEntities) {
                layerEntities = new Set();
                this.entitiesByLayer.set(layerId, layerEntities);
            }
            layerEntities.add(entityId);
        });
        this.ecsWorld.onContractRemove('mobility', (entityId) => {
            this.removeEntityFromLayerTracking(entityId);
        });
    }
    removeEntityFromLayerTracking(entityId) {
        for (const [layerId, entities] of this.entitiesByLayer) {
            if (entities.has(entityId)) {
                entities.delete(entityId);
                if (entities.size === 0) {
                    this.entitiesByLayer.delete(layerId);
                }
                break;
            }
        }
    }
    createTestWorld() {
        // Spawn a test entity using the block archetype
        try {
            this.spawn('block', 'default', { x: 0, y: 0, z: 0 });
            this.spawn('item', 'default', { x: 2, y: 1, z: 0 });
            // Also spawn a visible player near origin so visualizer shows cyan dot
            try {
                const pid = this.addPlayer('default', 'VisualizerBot');
                const ecs = this.ecsWorld;
                const mobility = ecs.getContract(pid, 'mobility');
                if (mobility) {
                    ecs.addContract(pid, { ...mobility, position: { x: 1, y: 2, z: 1 } });
                }
            }
            catch { }
            console.log('🧪 Created test world entities');
        }
        catch (error) {
            console.error('Failed to create test world:', error);
        }
    }
    initializeDefaultArchetypes() {
        // Player archetype
        this.defineArchetype({
            id: 'player',
            name: 'Player',
            description: 'A player character',
            contracts: [], // Will be filled dynamically in spawn
            tags: ['player', 'character'],
            created: Date.now(),
        });
        // Block archetype
        this.defineArchetype({
            id: 'block',
            name: 'Block',
            description: 'A solid block',
            contracts: [
                {
                    type: 'identity',
                    id: '', // Will be set during spawn
                    name: 'Block',
                    description: 'A solid block',
                },
                {
                    type: 'mobility',
                    position: { x: 0, y: 0, z: 0 }, // Will be overridden
                },
                {
                    type: 'shape',
                    bounds: {
                        min: { x: -0.5, y: -0.5, z: -0.5 },
                        max: { x: 0.5, y: 0.5, z: 0.5 },
                    },
                    geometry: 'box',
                },
                {
                    type: 'visual',
                    color: '#8B4513',
                    visible: true,
                },
                {
                    type: 'solidity',
                    solid: true,
                },
                {
                    type: 'durability',
                    health: 50,
                    maxHealth: 50,
                },
            ],
            tags: ['block', 'solid', 'destructible'],
            created: Date.now(),
        });
        // Item archetype
        this.defineArchetype({
            id: 'item',
            name: 'Item',
            description: 'A collectible item',
            contracts: [
                {
                    type: 'identity',
                    id: '',
                    name: 'Item',
                    description: 'A collectible item',
                },
                {
                    type: 'mobility',
                    position: { x: 0, y: 0, z: 0 },
                },
                {
                    type: 'shape',
                    bounds: {
                        min: { x: -0.15, y: -0.15, z: -0.15 },
                        max: { x: 0.15, y: 0.15, z: 0.15 },
                    },
                    geometry: 'box',
                },
                {
                    type: 'visual',
                    color: '#FFD700',
                    visible: true,
                },
                {
                    type: 'portable',
                    canPickup: true,
                    weight: 1,
                },
            ],
            tags: ['item', 'portable'],
            created: Date.now(),
        });
        console.log('📋 Initialized default archetypes');
    }
    /**
     * Add a new player to the world
     */
    addPlayer(layerId, playerName) {
        this.playerCounter++;
        const playerId = `player-${this.playerCounter}`;
        const layer = layerRegistry.getLayer(layerId) || layerRegistry.getDefaultLayer();
        const spawnPosition = layer.spawnPoint;
        // Use player archetype with custom contracts
        const contracts = createPlayerContracts(playerId, playerName || `Player ${this.playerCounter}`, spawnPosition);
        this.ecsWorld.createEntity(playerId, contracts);
        // Track in layer
        let layerEntities = this.entitiesByLayer.get(layerId);
        if (!layerEntities) {
            layerEntities = new Set();
            this.entitiesByLayer.set(layerId, layerEntities);
        }
        layerEntities.add(playerId);
        return playerId;
    }
    /**
     * Remove a player from the world
     */
    removePlayer(playerId) {
        return this.ecsWorld.removeEntity(playerId);
    }
    /**
     * Get all players in the world
     */
    getPlayers() {
        return this.ecsWorld.getEntitiesWithContract('identity').filter(entityId => {
            const identity = this.ecsWorld.getContract(entityId, 'identity');
            return identity?.id.startsWith('player-');
        });
    }
    /**
     * Get entities in a specific chunk
     */
    getEntitiesInChunk(chunkKey) {
        // TODO: Implement spatial indexing for chunks
        // For now, return all entities with mobility (they have positions)
        return this.ecsWorld.getEntitiesWithContract('mobility');
    }
    /**
     * Get entities near a position
     */
    getEntitiesNearPosition(position, radius) {
        const nearbyEntities = [];
        const entitiesWithMobility = this.ecsWorld.getEntitiesWithContract('mobility');
        for (const entityId of entitiesWithMobility) {
            const mobility = this.ecsWorld.getContract(entityId, 'mobility');
            if (!mobility)
                continue;
            const distance = Math.sqrt(Math.pow(mobility.position.x - position.x, 2) +
                Math.pow(mobility.position.y - position.y, 2) +
                Math.pow(mobility.position.z - position.z, 2));
            if (distance <= radius) {
                nearbyEntities.push(entityId);
            }
        }
        return nearbyEntities;
    }
    /**
     * Update entity position
     */
    updateEntityPosition(entityId, position, velocity) {
        const mobility = this.ecsWorld.getContract(entityId, 'mobility');
        if (!mobility) {
            return false;
        }
        const updatedMobility = {
            ...mobility,
            position,
            velocity: velocity || mobility.velocity,
        };
        this.ecsWorld.addContract(entityId, updatedMobility);
        return true;
    }
    /**
     * Get the ECS world instance
     */
    getECSWorld() {
        return this.ecsWorld;
    }
    /**
     * Get layer registry instance
     */
    getLayerRegistry() {
        return layerRegistry;
    }
    /**
     * Create a new layer
     */
    createLayer(config) {
        return layerRegistry.createLayer(config);
    }
    /**
     * Define a new archetype
     */
    defineArchetype(archetype) {
        this.archetypes.set(archetype.id, archetype);
        console.log(`📋 Defined archetype: ${archetype.name} (${archetype.id})`);
    }
    /**
     * Get archetype by ID
     */
    getArchetype(id) {
        return this.archetypes.get(id);
    }
    /**
     * Get all archetypes
     */
    getAllArchetypes() {
        return Array.from(this.archetypes.values());
    }
    /**
     * Spawn entity from archetype
     */
    spawn(archetypeId, layerId, position, overrides) {
        const archetype = this.archetypes.get(archetypeId);
        if (!archetype) {
            throw new Error(`Archetype not found: ${archetypeId}`);
        }
        // Generate unique entity ID
        const entityId = `${archetypeId}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        // Clone and customize contracts
        const contracts = [];
        for (const contract of archetype.contracts) {
            let customizedContract = { ...contract };
            // Set entity ID for identity contracts
            if (contract.type === 'identity') {
                const c = { ...customizedContract };
                c.id = entityId;
                customizedContract = c;
            }
            // Set position for mobility contracts
            if (contract.type === 'mobility') {
                const c = { ...customizedContract };
                c.position = position;
                customizedContract = c;
            }
            // Apply overrides
            if (overrides) {
                const override = overrides.find(o => o.type === contract.type);
                if (override) {
                    customizedContract = { ...customizedContract, ...override };
                }
            }
            // Force exact contract shape by narrowing using type discriminator
            switch (customizedContract.type) {
                case 'identity':
                case 'mobility':
                case 'shape':
                case 'visual':
                case 'solidity':
                case 'entrance':
                case 'portable':
                case 'inventory':
                case 'durability':
                case 'contract_limit':
                    contracts.push(customizedContract);
                    break;
                default:
                    break;
            }
        }
        // Special handling for player archetype
        if (archetypeId === 'player') {
            // Use the player contract factory instead
            const playerName = overrides?.find(o => o.type === 'identity')?.name || 'Player';
            const playerContracts = createPlayerContracts(entityId, playerName, position);
            this.ecsWorld.createEntity(entityId, playerContracts);
        }
        else {
            this.ecsWorld.createEntity(entityId, contracts);
        }
        // Track in layer
        let layerEntities = this.entitiesByLayer.get(layerId);
        if (!layerEntities) {
            layerEntities = new Set();
            this.entitiesByLayer.set(layerId, layerEntities);
        }
        layerEntities.add(entityId);
        console.log(`🐣 Spawned ${archetype.name} as ${entityId} in layer ${layerId}`);
        return entityId;
    }
    /**
     * Get entities in a specific layer
     */
    getEntitiesInLayer(layerId) {
        const entities = this.entitiesByLayer.get(layerId);
        return entities ? Array.from(entities) : [];
    }
    /**
     * Get all layers with entity counts
     */
    getAllLayers() {
        const layers = layerRegistry.getAllLayers();
        return layers.map(layer => ({
            ...layer,
            entityCount: this.getEntitiesInLayer(layer.id).length,
        }));
    }
    /**
     * Ensure data directory exists
     */
    async ensureDataDirectory() {
        try {
            await fs.access(this.dataDirectory);
        }
        catch {
            await fs.mkdir(this.dataDirectory, { recursive: true });
        }
    }
    /**
     * Save world state to JSON file
     */
    async saveWorld(filename = 'world.json') {
        await this.ensureDataDirectory();
        const worldData = {
            version: '1.0.0',
            timestamp: Date.now(),
            layers: layerRegistry.getAllLayers(),
            archetypes: Array.from(this.archetypes.values()),
            entities: [],
            metadata: {
                playerCounter: this.playerCounter,
            },
        };
        // Export all entities
        for (const entityId of this.ecsWorld.getAllEntities()) {
            const contracts = this.ecsWorld.getContracts(entityId);
            // Determine layer (simplified - look for mobility contract)
            let layerId = 'default';
            for (const [layer, entities] of this.entitiesByLayer) {
                if (entities.has(entityId)) {
                    layerId = layer;
                    break;
                }
            }
            worldData.entities.push({
                id: entityId,
                layerId,
                contracts: contracts,
            });
        }
        const filepath = join(this.dataDirectory, filename);
        await fs.writeFile(filepath, JSON.stringify(worldData, null, 2));
        console.log(`💾 Saved world to ${filepath} (${worldData.entities.length} entities)`);
    }
    /**
     * Load world state from JSON file
     */
    async loadWorld(filename = 'world.json') {
        const filepath = join(this.dataDirectory, filename);
        const data = await fs.readFile(filepath, 'utf-8');
        const worldData = JSON.parse(data);
        // Clear existing world
        this.ecsWorld.clear();
        this.entitiesByLayer.clear();
        this.archetypes.clear();
        // Restore layers
        for (const layerConfig of worldData.layers) {
            layerRegistry.createLayer(layerConfig);
        }
        // Restore archetypes
        for (const archetype of worldData.archetypes) {
            this.archetypes.set(archetype.id, archetype);
        }
        // Restore entities
        for (const entityData of worldData.entities) {
            try {
                this.ecsWorld.createEntity(entityData.id, entityData.contracts);
                // Track in layer
                let layerEntities = this.entitiesByLayer.get(entityData.layerId);
                if (!layerEntities) {
                    layerEntities = new Set();
                    this.entitiesByLayer.set(entityData.layerId, layerEntities);
                }
                layerEntities.add(entityData.id);
            }
            catch (error) {
                console.warn(`Failed to restore entity ${entityData.id}:`, error);
            }
        }
        // Restore metadata
        if (worldData.metadata?.playerCounter) {
            this.playerCounter = worldData.metadata.playerCounter;
        }
        console.log(`📂 Loaded world from ${filepath} (${worldData.entities.length} entities, ${worldData.archetypes.length} archetypes)`);
    }
    /**
     * Get world statistics
     */
    getStats() {
        const players = this.getPlayers();
        const ecsStats = this.ecsWorld.getStats();
        const entitiesByLayer = {};
        for (const [layerId, entities] of this.entitiesByLayer) {
            entitiesByLayer[layerId] = entities.size;
        }
        return {
            playerCount: players.length,
            totalEntities: ecsStats.entityCount,
            layerCount: layerRegistry.getAllLayers().length,
            archetypeCount: this.archetypes.size,
            entitiesByLayer,
        };
    }
    // Get ECS world for metrics (alias)
    getECSWorldAlias() {
        return this.ecsWorld;
    }
}
//# sourceMappingURL=state.js.map