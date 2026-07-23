// Tauri Plugin Store -> Browser localStorage
const stores: Record<string, Record<string, unknown>> = {};

export class Store {
  private path: string;
  private data: Record<string, unknown>;

  constructor(path: string) {
    this.path = path;
    try {
      this.data = JSON.parse(localStorage.getItem(`tauri-store:${path}`) || '{}');
    } catch {
      this.data = {};
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
    localStorage.setItem(`tauri-store:${this.path}`, JSON.stringify(this.data));
  }

  async save(): Promise<void> {
    localStorage.setItem(`tauri-store:${this.path}`, JSON.stringify(this.data));
  }

  async entries<T>(): Promise<[string, T][]> {
    return Object.entries(this.data) as [string, T][];
  }

  async delete(key: string): Promise<boolean> {
    const had = key in this.data;
    delete this.data[key];
    localStorage.setItem(`tauri-store:${this.path}`, JSON.stringify(this.data));
    return had;
  }

  async clear(): Promise<void> {
    this.data = {};
    localStorage.setItem(`tauri-store:${this.path}`, JSON.stringify({}));
  }

  async close(): Promise<void> {
    // no-op in browser
  }
}
