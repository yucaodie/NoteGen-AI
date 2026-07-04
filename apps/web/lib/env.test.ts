import { describe, expect, it } from 'vitest';
import { getWebEnv } from './env';

describe('getWebEnv', () => {
  it('returns explicit public environment values', () => {
    const env = getWebEnv({
      NEXT_PUBLIC_API_BASE_URL: 'https://api.example.com',
      NEXT_PUBLIC_SUPABASE_URL: 'https://demo.supabase.co',
      NEXT_PUBLIC_SUPABASE_ANON_KEY: 'anon-demo',
    });

    expect(env).toEqual({
      apiBaseUrl: 'https://api.example.com',
      supabaseUrl: 'https://demo.supabase.co',
      supabaseAnonKey: 'anon-demo',
    });
  });

  it('falls back to safe development defaults', () => {
    const env = getWebEnv({});

    expect(env.apiBaseUrl).toBe('');
    expect(env.supabaseUrl).toContain('supabase.co');
    expect(env.supabaseAnonKey).toBe('public-anon-key');
  });
});
