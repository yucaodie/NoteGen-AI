// Tauri Plugin FS -> Browser IndexedDB virtual filesystem

let db: IDBDatabase | null = null;

function openDB(): Promise<IDBDatabase> {
  if (db) return Promise.resolve(db);
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('notegen-fs', 1);
    request.onupgradeneeded = () => {
      const store = request.result.createObjectStore('files', { keyPath: 'path' });
      store.createIndex('parent', 'parent', { unique: false });
    };
    request.onsuccess = () => {
      db = request.result;
      resolve(db);
    };
    request.onerror = () => reject(request.error);
  });
}

interface FileEntry {
  path: string;
  parent: string;
  content: string;
  isDir: boolean;
  modifiedAt: number;
}

function getStore(mode: IDBTransactionMode = 'readonly'): Promise<IDBObjectStore> {
  return openDB().then((d) => {
    const tx = d.transaction('files', mode);
    return tx.objectStore('files');
  });
}

function normalizePath(base: string, ...parts: string[]): string {
  return [base, ...parts].join('/').replace(/\/+/g, '/').replace(/\/$/, '') || '/';
}

export enum BaseDirectory {
  AppData = 1,
  AppConfig = 2,
}

export interface DirEntry {
  name: string;
  isDirectory: boolean;
  isFile: boolean;
  isSymlink: boolean;
}

export interface WriteFileOptions {
  baseDir?: BaseDirectory;
}

export interface CopyFileOptions {
  fromPathBaseDir?: BaseDirectory;
  toPathBaseDir?: BaseDirectory;
  baseDir?: BaseDirectory;
}

export interface ExistOptions {
  baseDir?: BaseDirectory;
}

export interface MkdirOptions {
  baseDir?: BaseDirectory;
  recursive?: boolean;
}

export interface ReadDirOptions {
  baseDir?: BaseDirectory;
  recursive?: boolean;
}

export interface RemoveOptions {
  baseDir?: BaseDirectory;
  recursive?: boolean;
}

export interface RenameOptions {
  oldBaseDir?: BaseDirectory;
  newBaseDir?: BaseDirectory;
  oldPathBaseDir?: BaseDirectory;
  newPathBaseDir?: BaseDirectory;
  baseDir?: BaseDirectory;
}

export interface StatOptions {
  baseDir?: BaseDirectory;
}

function resolveBase(options?: { baseDir?: BaseDirectory }): string {
  return options?.baseDir !== undefined ? baseMap[options.baseDir] : '';
}

export async function exists(path: string, options?: ExistOptions): Promise<boolean> {
  const fullPath = options?.baseDir !== undefined
    ? normalizePath(baseMap[options.baseDir], path)
    : normalizePath('', path);
  const store = await getStore();
  return new Promise((resolve) => {
    const req = store.get(fullPath);
    req.onsuccess = () => resolve(!!req.result);
    req.onerror = () => resolve(false);
  });
}

export async function readTextFile(path: string, options?: ExistOptions): Promise<string> {
  const fullPath = options?.baseDir !== undefined
    ? normalizePath(baseMap[options.baseDir], path)
    : normalizePath('', path);
  const store = await getStore();
  return new Promise((resolve, reject) => {
    const req = store.get(fullPath);
    req.onsuccess = () => {
      if (req.result) resolve(req.result.content || '');
      else reject(new Error(`File not found: ${fullPath}`));
    };
    req.onerror = () => reject(req.error);
  });
}

export async function writeTextFile(path: string, contents: string, options?: WriteFileOptions): Promise<void> {
  const fullPath = options?.baseDir !== undefined
    ? normalizePath(baseMap[options.baseDir], path)
    : normalizePath('', path);
  const store = await getStore('readwrite');
  const parent = fullPath.substring(0, fullPath.lastIndexOf('/')) || '';
  const entry: FileEntry = {
    path: fullPath,
    parent,
    content: contents,
    isDir: false,
    modifiedAt: Date.now(),
  };
  return new Promise((resolve, reject) => {
    const req = store.put(entry);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

export async function readFile(path: string, options?: ExistOptions): Promise<Uint8Array> {
  const text = await readTextFile(path, options);
  return new TextEncoder().encode(text);
}

export async function writeFile(path: string, contents: Uint8Array | string, options?: WriteFileOptions): Promise<void> {
  const text = typeof contents === 'string' ? contents : new TextDecoder().decode(contents);
  return writeTextFile(path, text, options);
}

export async function mkdir(path: string, options?: MkdirOptions): Promise<void> {
  const fullPath = options?.baseDir !== undefined
    ? normalizePath(baseMap[options.baseDir], path)
    : normalizePath('', path);
  const store = await getStore('readwrite');
  const parent = fullPath.substring(0, fullPath.lastIndexOf('/')) || '';
  const entry: FileEntry = {
    path: fullPath,
    parent,
    content: '',
    isDir: true,
    modifiedAt: Date.now(),
  };
  return new Promise((resolve, reject) => {
    const req = store.put(entry);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

export async function readDir(path: string, options?: ReadDirOptions): Promise<DirEntry[]> {
  const fullPath = options?.baseDir !== undefined
    ? normalizePath(baseMap[options.baseDir], path)
    : normalizePath('', path);
  const store = await getStore();
  return new Promise((resolve) => {
    const index = store.index('parent');
    const req = index.getAll(fullPath);
    req.onsuccess = () => {
      resolve((req.result || []).map((entry: FileEntry) => ({
        name: entry.path.split('/').pop() || '',
        isDirectory: entry.isDir,
        isFile: !entry.isDir,
        isSymlink: false,
      })));
    };
    req.onerror = () => resolve([]);
  });
}

export async function remove(path: string, options?: RemoveOptions): Promise<void> {
  const fullPath = options?.baseDir !== undefined
    ? normalizePath(baseMap[options.baseDir], path)
    : normalizePath('', path);
  const store = await getStore('readwrite');
  return new Promise((resolve) => {
    const req = store.delete(fullPath);
    req.onsuccess = () => resolve();
    req.onerror = () => resolve();
  });
}

export async function rename(oldPath: string, newPath: string, options?: RenameOptions): Promise<void> {
  const oldBase = options?.oldPathBaseDir !== undefined ? baseMap[options.oldPathBaseDir] : (options?.baseDir !== undefined ? baseMap[options.baseDir] : '');
  const newBase = options?.newPathBaseDir !== undefined ? baseMap[options.newPathBaseDir] : (options?.baseDir !== undefined ? baseMap[options.baseDir] : '');
  const text = await readTextFile(oldPath, { baseDir: options?.oldPathBaseDir || options?.baseDir });
  await writeTextFile(newPath, text, { baseDir: options?.newPathBaseDir || options?.baseDir });
  await remove(oldPath, { baseDir: options?.oldPathBaseDir || options?.baseDir });
}

export async function copyFile(source: string, destination: string, options?: CopyFileOptions): Promise<void> {
  const fromBase = options?.fromPathBaseDir !== undefined ? baseMap[options.fromPathBaseDir] : (options?.baseDir !== undefined ? baseMap[options.baseDir] : '');
  const toBase = options?.toPathBaseDir !== undefined ? baseMap[options.toPathBaseDir] : (options?.baseDir !== undefined ? baseMap[options.baseDir] : '');
  const text = await readTextFile(source, { baseDir: options?.fromPathBaseDir || options?.baseDir });
  await writeTextFile(destination, text, { baseDir: options?.toPathBaseDir || options?.baseDir });
}

export interface FileStat {
  size: number;
  isDirectory: boolean;
  isFile: boolean;
  isSymlink: boolean;
  mtime?: Date;
  atime?: Date;
  ctime?: Date;
  birthtime?: Date;
}

export async function stat(path: string, options?: ExistOptions): Promise<FileStat> {
  const fullPath = options?.baseDir !== undefined
    ? normalizePath(baseMap[options.baseDir], path)
    : normalizePath('', path);
  const store = await getStore();
  return new Promise((resolve, reject) => {
    const req = store.get(fullPath);
    req.onsuccess = () => {
      if (req.result) {
        const entry = req.result;
        resolve({
          size: (entry.content || '').length,
          isDirectory: entry.isDir,
          isFile: !entry.isDir,
          isSymlink: false,
          mtime: new Date(entry.modifiedAt),
          atime: new Date(entry.modifiedAt),
          ctime: new Date(entry.modifiedAt),
          birthtime: new Date(entry.modifiedAt),
        });
      } else {
        reject(new Error(`File not found: ${fullPath}`));
      }
    };
    req.onerror = () => reject(req.error);
  });
}
