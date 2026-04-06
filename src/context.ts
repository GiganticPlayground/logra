import { AsyncLocalStorage } from "async_hooks";

type ContextMap = Record<string, unknown>;

const stores: Record<string, AsyncLocalStorage<ContextMap>> = {};

function getOrCreateStore(contextKey: string): AsyncLocalStorage<ContextMap> {
  if (!stores[contextKey]) {
    stores[contextKey] = new AsyncLocalStorage<ContextMap>();
  }

  return stores[contextKey];
}

export class ContextManager {
  static enterContext(contextKey = "default", initialContext: ContextMap = {}): void {
    getOrCreateStore(contextKey).enterWith(initialContext);
  }

  static runContext<T>(
    callback: () => T,
    contextKey = "default",
    initialContext: ContextMap = {}
  ): T {
    return getOrCreateStore(contextKey).run(initialContext, callback);
  }

  static addContext(key: string, value: unknown, contextKey = "default"): void {
    const contextStore = getOrCreateStore(contextKey);
    let store = contextStore.getStore();

    if (!store) {
      store = {};
      contextStore.enterWith(store);
    }

    store[key] = value;
  }

  static removeContext(key: string, contextKey = "default"): void {
    const store = getOrCreateStore(contextKey).getStore();

    if (store) {
      delete store[key];
    }
  }

  static getContext(contextKey = "default"): ContextMap | undefined {
    return getOrCreateStore(contextKey).getStore();
  }

  static clearContext(contextKey = "default"): void {
    const store = getOrCreateStore(contextKey).getStore();

    if (!store) {
      return;
    }

    Object.keys(store).forEach((key) => {
      delete store[key];
    });
  }
}
