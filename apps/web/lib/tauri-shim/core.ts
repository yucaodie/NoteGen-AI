// Tauri API Core stubs

export class Channel<T = unknown> {
  onmessage?: (message: T) => void;

  constructor() {
    this.onmessage = undefined;
  }
}

export async function invoke<T>(cmd: string, args?: Record<string, unknown>): Promise<T> {
  console.warn(`Tauri invoke not available in browser: ${cmd}`);
  return undefined as T;
}
