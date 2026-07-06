import { afterEach, describe, expect, it, vi } from 'vitest';
import type { AddressInfo } from 'node:net';
import type { AuthBootstrap } from '@supanotegen/shared';
import { createAppServer } from './server';

const logger = {
  info: vi.fn(),
  error: vi.fn(),
};

const bootstrapFixture: AuthBootstrap = {
  session: {
    accessToken: 'access-token',
    refreshToken: 'refresh-token',
    expiresAt: '2026-07-04T05:00:00.000Z',
    user: {
      id: 'user-1',
      email: 'user@example.com',
    },
  },
  workspace: {
    profile: {
      userId: 'user-1',
      displayName: 'user',
      defaultWorkspaceId: 'kb-1',
    },
    knowledgeBases: [
      {
        id: 'kb-1',
        ownerUserId: 'user-1',
        name: 'My Knowledge Base',
        description: null,
      },
    ],
    memberships: [],
    accessContext: {
      userId: 'user-1',
      groupIds: [],
      knowledgeBaseIds: ['kb-1'],
    },
    mode: 'online',
  },
};

const authService = {
  signUp: vi.fn(async () => bootstrapFixture),
  signIn: vi.fn(async () => bootstrapFixture),
  signOut: vi.fn(async () => undefined),
  getSession: vi.fn(async () => bootstrapFixture),
};

let activeServer: ReturnType<typeof createAppServer> | undefined;

afterEach(async () => {
  vi.clearAllMocks();

  if (activeServer) {
    await new Promise<void>((resolve, reject) => {
      activeServer?.close((error) => {
        if (error) {
          reject(error);
          return;
        }

        resolve();
      });
    });
  }

  activeServer = undefined;
});

describe('createAppServer auth routes', () => {
  it('returns bootstrap payload after sign up', async () => {
    const response = await sendJsonRequest('/auth/sign-up', {
      method: 'POST',
      body: { email: 'user@example.com', password: 'password-123' },
    });

    expect(response.status).toBe(200);
    expect(authService.signUp).toHaveBeenCalledWith('user@example.com', 'password-123');
    expect(response.body.workspace.profile.defaultWorkspaceId).toBe('kb-1');
  });

  it('returns pending confirmation payload after sign up when email verification is enabled', async () => {
    authService.signUp.mockResolvedValueOnce({
      status: 'pending_email_confirmation',
      email: 'pending@example.com',
      message: '注册成功，请先确认邮箱后再登录。',
    });

    const response = await sendJsonRequest('/auth/sign-up', {
      method: 'POST',
      body: { email: 'pending@example.com', password: 'password-123' },
    });

    expect(response.status).toBe(200);
    expect(response.body.status).toBe('pending_email_confirmation');
    expect(response.body.email).toBe('pending@example.com');
  });

  it('returns bootstrap payload after sign in', async () => {
    const response = await sendJsonRequest('/auth/sign-in', {
      method: 'POST',
      body: { email: 'user@example.com', password: 'password-123' },
    });

    expect(response.status).toBe(200);
    expect(authService.signIn).toHaveBeenCalledWith('user@example.com', 'password-123');
    expect(response.body.session.accessToken).toBe('access-token');
  });

  it('returns auth_failed when sign in is rejected', async () => {
    authService.signIn.mockRejectedValueOnce(
      Object.assign(new Error('Invalid login credentials'), { statusCode: 400, code: 'auth_failed' }),
    );

    const response = await sendJsonRequest('/auth/sign-in', {
      method: 'POST',
      body: { email: 'user@example.com', password: 'wrong-password' },
    });

    expect(response.status).toBe(400);
    expect(response.body.code).toBe('auth_failed');
    expect(response.body.message).toContain('Invalid login credentials');
  });

  it('recovers session using bearer and refresh token headers', async () => {
    const response = await sendJsonRequest('/auth/session', {
      method: 'GET',
      headers: {
        authorization: 'Bearer access-token',
        'x-refresh-token': 'refresh-token',
      },
    });

    expect(response.status).toBe(200);
    expect(authService.getSession).toHaveBeenCalledWith('access-token', 'refresh-token');
    expect(response.body.session.user.id).toBe('user-1');
  });

  it('returns session_expired when session recovery fails', async () => {
    authService.getSession.mockRejectedValueOnce(
      Object.assign(new Error('Session expired'), { statusCode: 401, code: 'session_expired' }),
    );

    const response = await sendJsonRequest('/auth/session', {
      method: 'GET',
      headers: {
        authorization: 'Bearer stale-token',
        'x-refresh-token': 'stale-refresh-token',
      },
    });

    expect(response.status).toBe(401);
    expect(response.body.code).toBe('session_expired');
    expect(response.body.message).toContain('Session expired');
  });

  it('returns signedOut true after sign out', async () => {
    const response = await sendJsonRequest('/auth/sign-out', {
      method: 'POST',
      headers: {
        authorization: 'Bearer access-token',
      },
    });

    expect(response.status).toBe(200);
    expect(authService.signOut).toHaveBeenCalledWith('access-token');
    expect(response.body.signedOut).toBe(true);
  });
});

async function sendJsonRequest(
  path: string,
  options: {
    method: string;
    body?: Record<string, unknown>;
    headers?: Record<string, string>;
  },
) {
  activeServer = createAppServer(logger, authService);
  await new Promise<void>((resolve) => activeServer?.listen(0, '127.0.0.1', resolve));

  const address = activeServer.address() as AddressInfo;
  const response = await fetch(`http://127.0.0.1:${address.port}${path}`, {
    method: options.method,
    headers: {
      'content-type': 'application/json',
      ...options.headers,
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  return {
    status: response.status,
    body: (await response.json()) as Record<string, any>,
  };
}
