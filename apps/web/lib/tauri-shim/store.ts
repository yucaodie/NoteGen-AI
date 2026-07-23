// Tauri Plugin Store -> Browser localStorage
const stores: Record<string, Record<string, unknown>> = {};

const isBrowser = typeof window !== 'undefined' && typeof localStorage !== 'undefined';

function safeGetItem(key: string): string | null {
  if (!isBrowser) return null;
  try { return localStorage.getItem(key); } catch { return null; }
}

function safeSetItem(key: string, value: string): void {
  if (!isBrowser) return;
  try { localStorage.setItem(key, value); } catch { /* ignore */ }
}

export class Store {
  private path: string;
  private data: Record<string, unknown>;

  constructor(path: string) {
    this.path = path;
    this.data = {};
    const raw = safeGetItem(`tauri-store:${path}`);
    if (raw) {
      try { this.data = JSON.parse(raw); } catch { /* ignore */ }
    }
    stores[path] = this.data;
  }

  static async load(path: string): Promise<Store> {
    return new Store(path);
  }

  static async get(path: string): Promise<Store> {
    return new Store(path);
  }

  async get<T>(key: string): Promise<T | undefined> {
    return this.data[key] as T | undefined;
  }

  async set(key: string, value: unknown): Promise<void> {
    this.data[key] = value;
    safeSetItem(`tauri-store:${this.path}`, JSON.stringify(this.data));
  }

  async save(): Promise<void> {
    safeSetItem(`tauri-store:${this.path}`, JSON.stringify(this.data));
  }

  async entries<T>(): Promise<[string, T][]> {
    return Object.entries(this.data) as [string, T][];
  }

  async delete(key: string): Promise<boolean> {
    const had = key in this.data;
    delete this.data[key];
    safeSetItem(`tauri-store:${this.path}`, JSON.stringify(this.data));
    return had;
  }

  async clear(): Promise<void> {
    this.data = {};
    safeSetItem(`tauri-store:${this.path}`, JSON.stringify({}));
  }

  async close(): Promise<void> {
    // no-op
  }
}
