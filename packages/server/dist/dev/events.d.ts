export interface DevEvent {
    type: string;
    payload?: any;
    ts?: number;
}
/**
 * Lightweight publish/subscribe hub for developer events (used by SSE stream)
 */
export declare class DevEventHub {
    private listeners;
    private history;
    private maxHistory;
    publish(event: DevEvent): void;
    subscribe(listener: (event: DevEvent) => void): () => void;
    getRecent(): DevEvent[];
}
//# sourceMappingURL=events.d.ts.map