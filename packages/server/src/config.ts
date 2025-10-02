/**
 * Environment-configurable performance constants for WorldHost server
 */

// Helper function to parse environment variables with defaults
function getEnvNumber(key: string, defaultValue: number): number {
  const value = process.env[key];
  if (value === undefined) return defaultValue;
  
  const parsed = parseInt(value, 10);
  if (isNaN(parsed)) {
    console.warn(`Invalid number for ${key}: "${value}", using default: ${defaultValue}`);
    return defaultValue;
  }
  
  return parsed;
}

function getEnvBoolean(key: string, defaultValue: boolean): boolean {
  const value = process.env[key];
  if (value === undefined) return defaultValue;
  
  const lower = value.toLowerCase();
  return lower === 'true' || lower === '1' || lower === 'yes' || lower === 'on';
}

function getEnvString(key: string, defaultValue: string): string {
  return process.env[key] || defaultValue;
}

// World and Spatial Configuration
export const CHUNK_SIZE = getEnvNumber('WORLDHOST_CHUNK_SIZE', 32);
export const CHUNK_HEIGHT = getEnvNumber('WORLDHOST_CHUNK_HEIGHT', 256);
export const MAX_LOADED_CHUNKS = getEnvNumber('WORLDHOST_MAX_LOADED_CHUNKS', 1000);
export const CHUNK_UNLOAD_DELAY_MS = getEnvNumber('WORLDHOST_CHUNK_UNLOAD_DELAY_MS', 60000); // 1 minute

// ECS Performance Configuration  
export const MAX_CONTRACTS_PER_ADD_CHECK = getEnvNumber('WORLDHOST_MAX_CONTRACTS_PER_ADD_CHECK', 50);
export const MAX_ENTITIES_PER_QUERY = getEnvNumber('WORLDHOST_MAX_ENTITIES_PER_QUERY', 10000);
export const ECS_CLEANUP_INTERVAL_MS = getEnvNumber('WORLDHOST_ECS_CLEANUP_INTERVAL_MS', 30000); // 30 seconds

// Game Loop Configuration
export const TICK_RATE_DISABLED = getEnvBoolean('WORLDHOST_TICK_RATE_DISABLED', false); // MVP is event-driven
export const TARGET_FPS = getEnvNumber('WORLDHOST_TARGET_FPS', 60);
export const MAX_DELTA_TIME = getEnvNumber('WORLDHOST_MAX_DELTA_TIME', 100); // Max 100ms delta to prevent huge jumps

// WebSocket Configuration
export const WS_HEARTBEAT_MS = getEnvNumber('WORLDHOST_WS_HEARTBEAT_MS', 30000); // 30 seconds
export const WS_CONNECTION_TIMEOUT_MS = getEnvNumber('WORLDHOST_WS_CONNECTION_TIMEOUT_MS', 60000); // 1 minute
export const MAX_SUBS_PER_CLIENT = getEnvNumber('WORLDHOST_MAX_SUBS_PER_CLIENT', 100);
export const MAX_MESSAGE_SIZE = getEnvNumber('WORLDHOST_MAX_MESSAGE_SIZE', 65536); // 64KB
export const MAX_MESSAGES_PER_SECOND = getEnvNumber('WORLDHOST_MAX_MESSAGES_PER_SECOND', 60);

// HTTP Server Configuration
export const SERVER_PORT = getEnvNumber('PORT', 8080);
export const REQUEST_TIMEOUT_MS = getEnvNumber('WORLDHOST_REQUEST_TIMEOUT_MS', 30000); // 30 seconds
export const MAX_REQUEST_SIZE = getEnvNumber('WORLDHOST_MAX_REQUEST_SIZE', 1048576); // 1MB

// Collision and Physics Configuration
export const COLLISION_EPSILON = parseFloat(process.env.WORLDHOST_COLLISION_EPSILON || '0.001');
export const GRAVITY = parseFloat(process.env.WORLDHOST_GRAVITY || '-9.81');
export const TERMINAL_VELOCITY = parseFloat(process.env.WORLDHOST_TERMINAL_VELOCITY || '-53');
export const GROUND_FRICTION = parseFloat(process.env.WORLDHOST_GROUND_FRICTION || '0.8');
export const AIR_FRICTION = parseFloat(process.env.WORLDHOST_AIR_FRICTION || '0.98');

// Performance Monitoring
export const METRICS_ENABLED = getEnvBoolean('WORLDHOST_METRICS_ENABLED', false);
export const METRICS_PORT = getEnvNumber('WORLDHOST_METRICS_PORT', 9090);
export const PERFORMANCE_LOGGING = getEnvBoolean('WORLDHOST_PERFORMANCE_LOGGING', false);
export const SLOW_OPERATION_THRESHOLD_MS = getEnvNumber('WORLDHOST_SLOW_OPERATION_THRESHOLD_MS', 10);

// Data Persistence Configuration
export const DATA_DIRECTORY = getEnvString('WORLDHOST_DATA_DIR', './data');
export const AUTO_SAVE_INTERVAL_MS = getEnvNumber('WORLDHOST_AUTO_SAVE_INTERVAL_MS', 300000); // 5 minutes
export const MAX_BACKUP_FILES = getEnvNumber('WORLDHOST_MAX_BACKUP_FILES', 10);

// Security and Rate Limiting
export const RATE_LIMIT_WINDOW_MS = getEnvNumber('WORLDHOST_RATE_LIMIT_WINDOW_MS', 60000); // 1 minute
export const RATE_LIMIT_MAX_REQUESTS = getEnvNumber('WORLDHOST_RATE_LIMIT_MAX_REQUESTS', 100);
export const MAX_CONCURRENT_CONNECTIONS = getEnvNumber('WORLDHOST_MAX_CONCURRENT_CONNECTIONS', 1000);

// Development and Debug Configuration
export const NODE_ENV = getEnvString('NODE_ENV', 'development');
export const LOG_LEVEL = getEnvString('WORLDHOST_LOG_LEVEL', 'info');
export const DEBUG_COLLISION = getEnvBoolean('WORLDHOST_DEBUG_COLLISION', false);
export const DEBUG_CHUNKS = getEnvBoolean('WORLDHOST_DEBUG_CHUNKS', false);
export const DEBUG_WEBSOCKET = getEnvBoolean('WORLDHOST_DEBUG_WEBSOCKET', false);
export const OPEN_VISUALIZER = getEnvBoolean('WORLDHOST_OPEN_VISUALIZER', true);

// Validation and warnings
if (CHUNK_SIZE < 8 || CHUNK_SIZE > 512) {
  console.warn(`CHUNK_SIZE ${CHUNK_SIZE} is outside recommended range (8-512)`);
}

if (TARGET_FPS < 10 || TARGET_FPS > 120) {
  console.warn(`TARGET_FPS ${TARGET_FPS} is outside recommended range (10-120)`);
}

if (WS_HEARTBEAT_MS < 5000 || WS_HEARTBEAT_MS > 120000) {
  console.warn(`WS_HEARTBEAT_MS ${WS_HEARTBEAT_MS} is outside recommended range (5000-120000)`);
}

if (MAX_SUBS_PER_CLIENT > 1000) {
  console.warn(`MAX_SUBS_PER_CLIENT ${MAX_SUBS_PER_CLIENT} is very high and may impact performance`);
}

// Export configuration summary for logging
export const CONFIG_SUMMARY = {
  // Core settings
  NODE_ENV,
  SERVER_PORT,
  CHUNK_SIZE,
  TARGET_FPS,
  TICK_RATE_DISABLED,
  
  // Performance settings
  MAX_CONTRACTS_PER_ADD_CHECK,
  WS_HEARTBEAT_MS,
  MAX_SUBS_PER_CLIENT,
  MAX_LOADED_CHUNKS,
  
  // Features
  METRICS_ENABLED,
  PERFORMANCE_LOGGING,
  AUTO_SAVE_INTERVAL_MS,
} as const;

// Log configuration on startup
if (NODE_ENV === 'development' || PERFORMANCE_LOGGING) {
  console.log('🔧 WorldHost Configuration:', CONFIG_SUMMARY);
}
