import { getWebEnv } from './env';

export function getApiUrl(path: string): string {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return new URL(normalizedPath, getWebEnv().apiBaseUrl).toString();
}
