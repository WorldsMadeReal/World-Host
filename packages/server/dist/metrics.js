import { register, collectDefaultMetrics, Counter, Histogram, Gauge } from 'prom-client';
import { METRICS_ENABLED, NODE_ENV } from './config.js';
// Only enable metrics if configured
if (METRICS_ENABLED) {
    // Collect default Node.js metrics (memory, CPU, etc.)
    collectDefaultMetrics({
        prefix: 'worldhost_',
        gcDurationBuckets: [0.001, 0.01, 0.1, 1, 2, 5],
    });
}
// Connection metrics
export const connectedClients = new Gauge({
    name: 'worldhost_connected_clients_total',
    help: 'Number of currently connected WebSocket clients',
    registers: METRICS_ENABLED ? [register] : [],
});
export const totalConnections = new Counter({
    name: 'worldhost_connections_total',
    help: 'Total number of WebSocket connections established',
    registers: METRICS_ENABLED ? [register] : [],
});
export const connectionDuration = new Histogram({
    name: 'worldhost_connection_duration_seconds',
    help: 'Duration of WebSocket connections in seconds',
    buckets: [1, 10, 30, 60, 300, 600, 1800, 3600], // 1s to 1h
    registers: METRICS_ENABLED ? [register] : [],
});
// Message metrics
export const messagesReceived = new Counter({
    name: 'worldhost_messages_received_total',
    help: 'Total number of WebSocket messages received',
    labelNames: ['type', 'client_id'],
    registers: METRICS_ENABLED ? [register] : [],
});
export const messagesSent = new Counter({
    name: 'worldhost_messages_sent_total',
    help: 'Total number of WebSocket messages sent',
    labelNames: ['type'],
    registers: METRICS_ENABLED ? [register] : [],
});
export const messagesPerSecond = new Gauge({
    name: 'worldhost_messages_per_second',
    help: 'Current rate of messages per second',
    labelNames: ['direction'], // 'inbound' or 'outbound'
    registers: METRICS_ENABLED ? [register] : [],
});
// Operation latency metrics
export const operationDuration = new Histogram({
    name: 'worldhost_operation_duration_seconds',
    help: 'Duration of various operations in seconds',
    labelNames: ['operation'],
    buckets: [0.001, 0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10],
    registers: METRICS_ENABLED ? [register] : [],
});
// ECS metrics
export const entitiesTotal = new Gauge({
    name: 'worldhost_entities_total',
    help: 'Total number of entities in the ECS world',
    registers: METRICS_ENABLED ? [register] : [],
});
export const contractsTotal = new Gauge({
    name: 'worldhost_contracts_total',
    help: 'Total number of contracts across all entities',
    labelNames: ['type'],
    registers: METRICS_ENABLED ? [register] : [],
});
export const systemUpdateDuration = new Histogram({
    name: 'worldhost_system_update_duration_seconds',
    help: 'Duration of ECS system updates in seconds',
    labelNames: ['system'],
    buckets: [0.001, 0.005, 0.01, 0.016, 0.033, 0.05, 0.1], // Focus on frame times
    registers: METRICS_ENABLED ? [register] : [],
});
// Chunk metrics
export const chunksLoaded = new Gauge({
    name: 'worldhost_chunks_loaded_total',
    help: 'Number of currently loaded chunks',
    registers: METRICS_ENABLED ? [register] : [],
});
export const chunkSubscriptions = new Gauge({
    name: 'worldhost_chunk_subscriptions_total',
    help: 'Total number of chunk subscriptions across all clients',
    registers: METRICS_ENABLED ? [register] : [],
});
export const chunkOperations = new Counter({
    name: 'worldhost_chunk_operations_total',
    help: 'Total number of chunk operations',
    labelNames: ['operation'], // 'load', 'unload', 'subscribe', 'unsubscribe'
    registers: METRICS_ENABLED ? [register] : [],
});
// HTTP metrics
export const httpRequests = new Counter({
    name: 'worldhost_http_requests_total',
    help: 'Total number of HTTP requests',
    labelNames: ['method', 'route', 'status_code'],
    registers: METRICS_ENABLED ? [register] : [],
});
export const httpDuration = new Histogram({
    name: 'worldhost_http_request_duration_seconds',
    help: 'Duration of HTTP requests in seconds',
    labelNames: ['method', 'route'],
    buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10],
    registers: METRICS_ENABLED ? [register] : [],
});
// Game loop metrics
export const gameLoopDuration = new Histogram({
    name: 'worldhost_game_loop_duration_seconds',
    help: 'Duration of game loop iterations in seconds',
    buckets: [0.001, 0.005, 0.01, 0.016, 0.033, 0.05, 0.1], // Target 60 FPS = ~0.016s
    registers: METRICS_ENABLED ? [register] : [],
});
export const gameLoopLag = new Histogram({
    name: 'worldhost_game_loop_lag_seconds',
    help: 'Lag behind target frame time in seconds',
    buckets: [0, 0.001, 0.005, 0.01, 0.016, 0.033, 0.05, 0.1],
    registers: METRICS_ENABLED ? [register] : [],
});
// Error metrics
export const errors = new Counter({
    name: 'worldhost_errors_total',
    help: 'Total number of errors',
    labelNames: ['type', 'component'],
    registers: METRICS_ENABLED ? [register] : [],
});
// Performance monitoring helpers
class PerformanceTimer {
    startTime;
    constructor() {
        this.startTime = Date.now();
    }
    end() {
        return Date.now() - this.startTime;
    }
    endSeconds() {
        return this.end() / 1000;
    }
}
export function startTimer() {
    return new PerformanceTimer();
}
export function recordOperation(operation, fn) {
    if (!METRICS_ENABLED) {
        return fn();
    }
    const timer = startTimer();
    try {
        const result = fn();
        operationDuration.labels(operation).observe(timer.endSeconds());
        return result;
    }
    catch (error) {
        errors.labels('operation_error', operation).inc();
        operationDuration.labels(operation).observe(timer.endSeconds());
        throw error;
    }
}
export async function recordAsyncOperation(operation, fn) {
    if (!METRICS_ENABLED) {
        return fn();
    }
    const timer = startTimer();
    try {
        const result = await fn();
        operationDuration.labels(operation).observe(timer.endSeconds());
        return result;
    }
    catch (error) {
        errors.labels('async_operation_error', operation).inc();
        operationDuration.labels(operation).observe(timer.endSeconds());
        throw error;
    }
}
// Message rate tracking
let inboundMessageCount = 0;
let outboundMessageCount = 0;
let lastMessageRateUpdate = Date.now();
export function trackInboundMessage(type, clientId) {
    if (!METRICS_ENABLED)
        return;
    messagesReceived.labels(type, clientId || 'unknown').inc();
    inboundMessageCount++;
}
export function trackOutboundMessage(type) {
    if (!METRICS_ENABLED)
        return;
    messagesSent.labels(type).inc();
    outboundMessageCount++;
}
// Update message rates every second
if (METRICS_ENABLED) {
    setInterval(() => {
        const now = Date.now();
        const deltaSeconds = (now - lastMessageRateUpdate) / 1000;
        messagesPerSecond.labels('inbound').set(inboundMessageCount / deltaSeconds);
        messagesPerSecond.labels('outbound').set(outboundMessageCount / deltaSeconds);
        inboundMessageCount = 0;
        outboundMessageCount = 0;
        lastMessageRateUpdate = now;
    }, 1000);
}
// ECS metrics updater
export function updateECSMetrics(stats) {
    if (!METRICS_ENABLED)
        return;
    entitiesTotal.set(stats.entityCount);
    for (const [contractType, count] of Object.entries(stats.contractCounts)) {
        contractsTotal.labels(contractType).set(count);
    }
}
// Chunk metrics updater
export function updateChunkMetrics(stats) {
    if (!METRICS_ENABLED)
        return;
    chunksLoaded.set(stats.loadedChunks);
    chunkSubscriptions.set(stats.totalSubscriptions);
}
// Export metrics registry for /metrics endpoint
export { register };
// Log metrics status on startup
if (NODE_ENV === 'development') {
    console.log(`📊 Metrics ${METRICS_ENABLED ? 'enabled' : 'disabled'}`);
}
//# sourceMappingURL=metrics.js.map