import { getWebEnv } from '../env';

export type SupabaseBrowserConfig = {
  url: string;
  anonKey: string;
};

export function getSupabaseBrowserConfig(): SupabaseBrowserConfig {
  const env = getWebEnv();
  return {
    url: env.supabaseUrl,
    anonKey: env.supabaseAnonKey,
  };
}
