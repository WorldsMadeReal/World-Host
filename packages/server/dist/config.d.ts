/**
 * Environment-configurable performance constants for WorldHost server
 */
export declare const CHUNK_SIZE: number;
export declare const CHUNK_HEIGHT: number;
export declare const MAX_LOADED_CHUNKS: number;
export declare const CHUNK_UNLOAD_DELAY_MS: number;
export declare const MAX_CONTRACTS_PER_ADD_CHECK: number;
export declare const MAX_ENTITIES_PER_QUERY: number;
export declare const ECS_CLEANUP_INTERVAL_MS: number;
export declare const TICK_RATE_DISABLED: boolean;
export declare const TARGET_FPS: number;
export declare const MAX_DELTA_TIME: number;
export declare const WS_HEARTBEAT_MS: number;
export declare const WS_CONNECTION_TIMEOUT_MS: number;
export declare const MAX_SUBS_PER_CLIENT: number;
export declare const MAX_MESSAGE_SIZE: number;
export declare const MAX_MESSAGES_PER_SECOND: number;
export declare const SERVER_PORT: number;
export declare const REQUEST_TIMEOUT_MS: number;
export declare const MAX_REQUEST_SIZE: number;
export declare const COLLISION_EPSILON: number;
export declare const GRAVITY: number;
export declare const TERMINAL_VELOCITY: number;
export declare const GROUND_FRICTION: number;
export declare const AIR_FRICTION: number;
export declare const METRICS_ENABLED: boolean;
export declare const METRICS_PORT: number;
export declare const PERFORMANCE_LOGGING: boolean;
export declare const SLOW_OPERATION_THRESHOLD_MS: number;
export declare const DATA_DIRECTORY: string;
export declare const AUTO_SAVE_INTERVAL_MS: number;
export declare const MAX_BACKUP_FILES: number;
export declare const RATE_LIMIT_WINDOW_MS: number;
export declare const RATE_LIMIT_MAX_REQUESTS: number;
export declare const MAX_CONCURRENT_CONNECTIONS: number;
export declare const NODE_ENV: string;
export declare const LOG_LEVEL: string;
export declare const DEBUG_COLLISION: boolean;
export declare const DEBUG_CHUNKS: boolean;
export declare const DEBUG_WEBSOCKET: boolean;
export declare const OPEN_VISUALIZER: boolean;
export declare const CONFIG_SUMMARY: {
    readonly NODE_ENV: string;
    readonly SERVER_PORT: number;
    readonly CHUNK_SIZE: number;
    readonly TARGET_FPS: number;
    readonly TICK_RATE_DISABLED: boolean;
    readonly MAX_CONTRACTS_PER_ADD_CHECK: number;
    readonly WS_HEARTBEAT_MS: number;
    readonly MAX_SUBS_PER_CLIENT: number;
    readonly MAX_LOADED_CHUNKS: number;
    readonly METRICS_ENABLED: boolean;
    readonly PERFORMANCE_LOGGING: boolean;
    readonly AUTO_SAVE_INTERVAL_MS: number;
};
//# sourceMappingURL=config.d.ts.map