import { describe, expect, it } from 'vitest';
import { getApiUrl } from './api';

describe('getApiUrl', () => {
  it('returns same-origin paths when no public API base url is configured', () => {
    const originalEnv = process.env.NEXT_PUBLIC_API_BASE_URL;
    delete process.env.NEXT_PUBLIC_API_BASE_URL;

    expect(getApiUrl('/auth/sign-in')).toBe('/auth/sign-in');
    expect(getApiUrl('api/health')).toBe('/api/health');

    restoreApiBaseUrl(originalEnv);
  });

  it('returns absolute urls when a public API base url is configured', () => {
    const originalEnv = process.env.NEXT_PUBLIC_API_BASE_URL;
    process.env.NEXT_PUBLIC_API_BASE_URL = 'https://api.example.com';

    expect(getApiUrl('/auth/sign-in')).toBe('https://api.example.com/auth/sign-in');

    restoreApiBaseUrl(originalEnv);
  });
});

function restoreApiBaseUrl(value: string | undefined) {
  if (value === undefined) {
    delete process.env.NEXT_PUBLIC_API_BASE_URL;
    return;
  }

  process.env.NEXT_PUBLIC_API_BASE_URL = value;
}
