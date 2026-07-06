import { describe, expect, it, vi } from 'vitest';
import { createAuthService } from './service';

const env = {
  port: 4000,
  host: '127.0.0.1',
  supabaseUrl: 'https://example.supabase.co',
  supabaseAnonKey: 'anon-key',
  supabaseServiceRoleKey: 'service-role-key',
};

describe('createAuthService', () => {
  it('falls back when user_profiles is missing from PostgREST schema cache', async () => {
    const fetchMock = vi.fn(async (input: URL | RequestInfo, init?: RequestInit) => {
      const url = input.toString();

      if (url.includes('/auth/v1/token?grant_type=password')) {
        return jsonResponse({
          access_token: 'access-token',
          refresh_token: 'refresh-token',
          expires_in: 3600,
          user: {
            id: 'user-1',
            email: 'user@example.com',
          },
        });
      }

      if (url.includes('/rest/v1/user_profiles')) {
        return jsonResponse(
          {
            code: 'PGRST205',
            message: "Could not find the table 'public.user_profiles' in the schema cache",
          },
          { status: 404 },
        );
      }

      if (url.includes('/rest/v1/knowledge_bases?')) {
        return jsonResponse([]);
      }

      if (url.endsWith('/rest/v1/knowledge_bases')) {
        return jsonResponse([
          {
            id: 'kb-1',
            owner_user_id: 'user-1',
            name: 'My Knowledge Base',
            description: 'Default workspace for SupaNoteGen',
          },
        ]);
      }

      if (url.includes('/rest/v1/group_members?')) {
        return jsonResponse([]);
      }

      throw new Error(`Unexpected request: ${url} ${init?.method}`);
    });

    const service = createAuthService(env, fetchMock as typeof fetch);
    const result = await service.signIn('user@example.com', 'password-123');

    expect(result.workspace.profile.userId).toBe('user-1');
    expect(result.workspace.profile.defaultWorkspaceId).toBe('kb-1');
    expect(result.workspace.profile.displayName).toBe('user');
    expect(result.workspace.knowledgeBases).toHaveLength(1);
  });

  it('returns pending confirmation when sign up requires email verification', async () => {
    const fetchMock = vi.fn(async (input: URL | RequestInfo) => {
      const url = input.toString();

      if (url.includes('/auth/v1/signup')) {
        return jsonResponse({
          user: {
            id: 'user-2',
            email: 'pending@example.com',
          },
          msg: 'Confirmation mail sent',
        });
      }

      throw new Error(`Unexpected request: ${url}`);
    });

    const service = createAuthService(env, fetchMock as typeof fetch);
    const result = await service.signUp('pending@example.com', 'password-123');

    expect('status' in result && result.status).toBe('pending_email_confirmation');
    if ('status' in result) {
      expect(result.email).toBe('pending@example.com');
      expect(result.message).toContain('Confirmation mail sent');
    }
  });
});

function jsonResponse(body: unknown, init?: { status?: number }) {
  return new Response(JSON.stringify(body), {
    status: init?.status ?? 200,
    headers: {
      'content-type': 'application/json',
    },
  });
}
