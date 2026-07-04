export type ApiEnv = {
  port: number;
  host: string;
  supabaseUrl: string;
  supabaseServiceRoleKey: string;
};

export function getApiEnv(env: NodeJS.ProcessEnv = process.env): ApiEnv {
  const port = Number(env.API_PORT ?? 4000);

  return {
    port: Number.isFinite(port) ? port : 4000,
    host: env.API_HOST ?? '127.0.0.1',
    supabaseUrl: env.SUPABASE_URL ?? 'https://example.supabase.co',
    supabaseServiceRoleKey: env.SUPABASE_SERVICE_ROLE_KEY ?? 'service-role-key',
  };
}
