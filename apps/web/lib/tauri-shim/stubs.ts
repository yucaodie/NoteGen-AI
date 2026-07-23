// Tauri stub modules

// OS
export function platform(): string { return 'web'; }
export function arch(): string { return 'wasm'; }
export function version(): string { return '1.0.0'; }
export function type(): string { return 'Linux'; }

// Shell
export async function open(path: string): Promise<void> {
  window.open(path, '_blank');
}

export class Command {
  constructor(_program: string, _args?: string[]) {}
  async execute(): Promise<{ code: number; stdout: string; stderr: string }> {
    return { code: 0, stdout: '', stderr: '' };
  }
}

// Process
export async function exit(code?: number): Promise<void> {}
export async function relaunch(): Promise<void> {
  window.location.reload();
}

// HTTP
export interface ClientOptions {
  connectTimeout?: number;
  maxRedirections?: number;
}
export interface Response<T> {
  data: T;
  ok: boolean;
  status: number;
  headers: Record<string, string>;
  text: () => string;
  arrayBuffer?: () => Promise<ArrayBuffer>;
}
export async function fetch<T>(url: string, options?: RequestInit & ClientOptions): Promise<Response<T>> {
  const res = await window.fetch(url, options);
  const textBody = await res.text();
  let data: T;
  try { data = JSON.parse(textBody) as T; } catch { data = textBody as unknown as T; }
  return {
    data,
    ok: res.ok,
    status: res.status,
    headers: Object.fromEntries(res.headers.entries()),
    text: () => textBody,
  };
}

// Updater
export interface Update {
  version: string;
  body?: string;
  date?: string;
  downloadAndInstall: () => Promise<void>;
}
export async function check(): Promise<{ shouldUpdate: boolean; manifest?: Update } | null> {
  return null;
}

// Clipboard Manager
export async function readText(): Promise<string> {
  try { return await navigator.clipboard.readText(); } catch { return ''; }
}
export async function writeText(text: string): Promise<void> {
  try { await navigator.clipboard.writeText(text); } catch {}
}
export async function readImage(): Promise<Uint8Array> {
  return new Uint8Array();
}
export async function writeImage(_data: Uint8Array): Promise<void> {}

// Clipboard API (tauri-plugin-clipboard-api)
export async function read(): Promise<string> {
  try { return await navigator.clipboard.readText(); } catch { return ''; }
}
export async function write(text: string): Promise<void> {
  try { await navigator.clipboard.writeText(text); } catch {}
}
export async function readImageBase64(): Promise<string> {
  return '';
}
export async function writeImageBase64(_base64: string): Promise<void> {}
export async function hasText(): Promise<boolean> {
  try { const items = await navigator.clipboard.read(); return items.length > 0; } catch { return false; }
}
export async function hasImage(): Promise<boolean> {
  return false;
}

// Global Shortcut
export async function register(_shortcut: string, _handler: (shortcut: string) => void): Promise<void> {}
export async function unregister(_shortcut: string): Promise<void> {}
export async function isRegistered(_shortcut: string): Promise<boolean> { return false; }

// Window State
export async function saveWindowState(): Promise<void> {}
export async function restoreWindowState(): Promise<void> {}

// SQL stub
export default class Database {
  static async load(_path: string): Promise<Database> { return new Database(); }
  async execute(_sql: string, _params?: unknown[]): Promise<{ lastInsertId: number; rows: unknown[]; rowsAffected: number }> {
    return { lastInsertId: 0, rows: [], rowsAffected: 0 };
  }
  async select<T>(_sql: string, _params?: unknown[]): Promise<T[]> { return []; }
  async close(): Promise<void> {}
}

// Window
export function getCurrentWindow(): any {
  return {
    setAlwaysOnTop: async () => {},
    listen: async (_event, _handler) => () => {},
    onCloseRequested: async (_handler) => () => {},
  };
}
export function getAllWindows(): unknown[] { return []; }

// App
export async function getVersion(): Promise<string> { return '0.1.0'; }
export async function getName(): Promise<string> { return 'SupaNoteGen'; }

// Global Shortcut additions
export async function unregisterAll(): Promise<void> {}

// convertFileSrc
export function convertFileSrc(path: string, _protocol?: string): string { return path; }

// Event
export type UnlistenFn = () => void;
export async function listen<T>(_event: string, _handler: (event: { payload: T }) => void): Promise<UnlistenFn> {
  return () => {};
}
export async function emit(_event: string, _payload?: unknown): Promise<void> {}

// WebviewWindow
export function getCurrentWebviewWindow(): {
  setAlwaysOnTop: (_alwaysOnTop: boolean) => Promise<void>;
  listen: <T>(_event: string, _handler: (event: { payload: T }) => void) => Promise<() => void>;
} {
  return {
    setAlwaysOnTop: async () => {},
    listen: async () => () => {},
  };
}

// Add invoke as direct export for window module compatibility
export async function invoke<T>(_cmd: string, _args?: Record<string, unknown>): Promise<T> {
  return undefined as T;
}

// Clipboard API additions
export async function clear(): Promise<void> {
  try { await navigator.clipboard.writeText(''); } catch {}
}

// Event additions
export async function once<T>(_event: string, _handler: (event: { payload: T }) => void): Promise<UnlistenFn> {
  return () => {};
}

// WebviewWindow additions
export class WebviewWindow {
  constructor(_label: string, _options?: { url?: string; title?: string; width?: number; height?: number; [key: string]: unknown }) {}

  static async getByLabel(_label: string): Promise<WebviewWindow | null> {
    return null;
  }

  static async getCurrent(): Promise<WebviewWindow> {
    return new WebviewWindow('main');
  }

  async close(): Promise<void> {}
  async setTitle(_title: string): Promise<void> {}
  async show(): Promise<void> {}

  listen<T>(_event: string, _handler: (event: { payload: T }) => void): Promise<() => void> {
    return Promise.resolve(() => {});
  }

  once<T>(_event: string, _handler: (event: { payload: T }) => void): Promise<() => void> {
    return Promise.resolve(() => {});
  }
}

// Path additions
export async function dirname(path: string): Promise<string> {
  const parts = path.split('/');
  parts.pop();
  return parts.join('/') || '/';
}

// Dialog additions (openPath)
export async function openPath(_options?: string | { directory?: boolean; multiple?: boolean; title?: string }): Promise<string | string[] | null> {
  if (typeof _options === 'string') {
    window.open(_options, '_blank');
    return _options;
  }
  return null;
}

// Shell additions
export async function openUrl(url: string): Promise<void> {
  window.open(url, '_blank');
}

// HTTP additions
export async function tauriFetch<T>(_url: string, _options?: Record<string, unknown>): Promise<{ data: T; status: number }> {
  return { data: undefined as T, status: 200 };
}
export async function httpFetch<T>(url: string, options?: RequestInit): Promise<{ data: T; status: number }> {
  const res = await window.fetch(url, options);
  const data = await res.json() as T;
  return { data, status: res.status };
}

// Proxy support
export class Proxy {
  type: string;
  host: string;
  port: number;
  
  constructor(type: string, host: string, port: number) {
    this.type = type;
    this.host = host;
    this.port = port;
  }
}

// Opener additions
export async function revealItemInDir(_path: string): Promise<void> {}

// Channel (was in core.ts)
export class Channel<T = unknown> {
  onmessage?: (message: T) => void;
  constructor() {
    this.onmessage = undefined;
  }
}
