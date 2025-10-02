export interface DevEvent {
  type: string;
  payload?: any;
  ts?: number;
}

/**
 * Lightweight publish/subscribe hub for developer events (used by SSE stream)
 */
export class DevEventHub {
  private listeners = new Set<(event: DevEvent) => void>();
  private history: DevEvent[] = [];
  private maxHistory = 200;

  publish(event: DevEvent): void {
    const stamped: DevEvent = { ...event, ts: event.ts || Date.now() };
    this.history.push(stamped);
    if (this.history.length > this.maxHistory) {
      this.history.splice(0, this.history.length - this.maxHistory);
    }
    for (const listener of this.listeners) {
      try {
        listener(stamped);
      } catch {}
    }
  }

  subscribe(listener: (event: DevEvent) => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  getRecent(): DevEvent[] {
    return this.history.slice();
  }
}


