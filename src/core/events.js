/** Barramento de eventos muito simples, usado para desacoplar sistemas. */
export class EventBus {
  constructor() {
    this.listeners = new Map();
  }

  on(name, callback) {
    if (!this.listeners.has(name)) this.listeners.set(name, new Set());
    this.listeners.get(name).add(callback);
    return () => this.off(name, callback);
  }

  off(name, callback) {
    this.listeners.get(name)?.delete(callback);
  }

  emit(name, payload) {
    const set = this.listeners.get(name);
    if (!set) return;
    for (const callback of [...set]) {
      try {
        callback(payload);
      } catch (error) {
        console.error(`[Minha Noite] Erro no evento "${name}":`, error);
      }
    }
  }
}
