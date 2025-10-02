import { register, Counter, Histogram, Gauge } from 'prom-client';
export declare const connectedClients: Gauge<string>;
export declare const totalConnections: Counter<string>;
export declare const connectionDuration: Histogram<string>;
export declare const messagesReceived: Counter<"type" | "client_id">;
export declare const messagesSent: Counter<"type">;
export declare const messagesPerSecond: Gauge<"direction">;
export declare const operationDuration: Histogram<"operation">;
export declare const entitiesTotal: Gauge<string>;
export declare const contractsTotal: Gauge<"type">;
export declare const systemUpdateDuration: Histogram<"system">;
export declare const chunksLoaded: Gauge<string>;
export declare const chunkSubscriptions: Gauge<string>;
export declare const chunkOperations: Counter<"operation">;
export declare const httpRequests: Counter<"method" | "route" | "status_code">;
export declare const httpDuration: Histogram<"method" | "route">;
export declare const gameLoopDuration: Histogram<string>;
export declare const gameLoopLag: Histogram<string>;
export declare const errors: Counter<"type" | "component">;
declare class PerformanceTimer {
    private startTime;
    constructor();
    end(): number;
    endSeconds(): number;
}
export declare function startTimer(): PerformanceTimer;
export declare function recordOperation<T>(operation: string, fn: () => T): T;
export declare function recordAsyncOperation<T>(operation: string, fn: () => Promise<T>): Promise<T>;
export declare function trackInboundMessage(type: string, clientId?: string): void;
export declare function trackOutboundMessage(type: string): void;
export declare function updateECSMetrics(stats: {
    entityCount: number;
    contractCounts: Record<string, number>;
}): void;
export declare function updateChunkMetrics(stats: {
    loadedChunks: number;
    totalSubscriptions: number;
}): void;
export { register };
//# sourceMappingURL=metrics.d.ts.map