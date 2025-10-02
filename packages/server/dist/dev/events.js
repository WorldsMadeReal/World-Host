/**
 * Lightweight publish/subscribe hub for developer events (used by SSE stream)
 */
export class DevEventHub {
    listeners = new Set();
    history = [];
    maxHistory = 200;
    publish(event) {
        const stamped = { ...event, ts: event.ts || Date.now() };
        this.history.push(stamped);
        if (this.history.length > this.maxHistory) {
            this.history.splice(0, this.history.length - this.maxHistory);
        }
        for (const listener of this.listeners) {
            try {
                listener(stamped);
            }
            catch { }
        }
    }
    subscribe(listener) {
        this.listeners.add(listener);
        return () => {
            this.listeners.delete(listener);
        };
    }
    getRecent() {
        return this.history.slice();
    }
}
//# sourceMappingURL=events.js.map