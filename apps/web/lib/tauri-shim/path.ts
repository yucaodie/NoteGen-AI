// Tauri API Path -> Browser path utilities

export async function appDataDir(): Promise<string> {
  return '/app-data';
}

export async function join(...paths: string[]): Promise<string> {
  return paths.join('/').replace(/\/+/g, '/');
}

export async function basename(path: string, ext?: string): Promise<string> {
  let name = path.split('/').pop() || path;
  if (ext && name.endsWith(ext)) name = name.slice(0, -ext.length);
  return name;
}

export async function normalize(path: string): Promise<string> {
  return path.replace(/\/+/g, '/').replace(/\/$/, '') || '/';
}

export async function dirname(path: string): Promise<string> {
  const parts = path.split('/');
  parts.pop();
  return parts.join('/') || '/';
}

export async function extname(path: string): Promise<string> {
  const parts = path.split('.');
  return parts.length > 1 ? `.${parts.pop()}` : '';
}
