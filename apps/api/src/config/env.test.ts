import { describe, expect, it } from 'vitest';
import { getApiEnv } from './env';

describe('getApiEnv', () => {
  it('parses explicit server configuration', () => {
    const env = getApiEnv({
      API_PORT: '4100',
      API_HOST: '0.0.0.0',
      SUPABASE_URL: 'https://demo.supabase.co',
      SUPABASE_ANON_KEY: 'anon-key',
      SUPABASE_SERVICE_ROLE_KEY: 'secret-key',
    });

    expect(env).toEqual({
      port: 4100,
      host: '0.0.0.0',
      supabaseUrl: 'https://demo.supabase.co',
      supabaseAnonKey: 'anon-key',
      supabaseServiceRoleKey: 'secret-key',
    });
  });

  it('falls back to development defaults when values are missing', () => {
    const env = getApiEnv({});

    expect(env.port).toBe(4000);
    expect(env.host).toBe('127.0.0.1');
    expect(env.supabaseUrl).toContain('supabase.co');
    expect(env.supabaseAnonKey).toBe('public-anon-key');
    expect(env.supabaseServiceRoleKey).toBe('service-role-key');
  });
});
