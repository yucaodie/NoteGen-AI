export type WebEnv = {
  apiBaseUrl: string;
  supabaseUrl: string;
  supabaseAnonKey: string;
};

export function getWebEnv(env: NodeJS.ProcessEnv = process.env): WebEnv {
  return {
    apiBaseUrl: env.NEXT_PUBLIC_API_BASE_URL ?? '',
    supabaseUrl: env.NEXT_PUBLIC_SUPABASE_URL ?? 'https://example.supabase.co',
    supabaseAnonKey: env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? 'public-anon-key',
  };
}
