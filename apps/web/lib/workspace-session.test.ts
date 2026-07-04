import { describe, expect, it, vi } from 'vitest';
import type { AuthBootstrap, AuthSession } from '@supanotegen/shared';
import { AuthApiError } from './auth';
import { recoverWorkspaceSessionState } from './workspace-session';

const session: AuthSession = {
  accessToken: 'access-token',
  refreshToken: 'refresh-token',
  expiresAt: '2026-07-04T05:00:00.000Z',
  user: {
    id: 'user-1',
    email: 'user@example.com',
  },
};

const bootstrap: AuthBootstrap = {
  session,
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

describe('recoverWorkspaceSessionState', () => {
  it('returns authenticated state when online recovery succeeds', async () => {
    const persistBootstrap = vi.fn();
    const clearSession = vi.fn();

    const state = await recoverWorkspaceSessionState({
      session,
      cachedBootstrap: null,
      recoverOnline: vi.fn(async () => bootstrap),
      persistBootstrap,
      clearSession,
    });

    expect(state.kind).toBe('authenticated');
    expect(persistBootstrap).toHaveBeenCalledWith(bootstrap);
    expect(clearSession).not.toHaveBeenCalled();
  });

  it('falls back to offline-readonly when session expires and cache exists', async () => {
    const state = await recoverWorkspaceSessionState({
      session,
      cachedBootstrap: bootstrap,
      recoverOnline: vi.fn(async () => {
        throw new AuthApiError('expired', 'session_expired');
      }),
      persistBootstrap: vi.fn(),
      clearSession: vi.fn(),
    });

    expect(state.kind).toBe('offline-readonly');
    if (state.kind === 'offline-readonly') {
      expect(state.bootstrap.workspace.mode).toBe('offline-readonly');
    }
  });

  it('returns unauthenticated state when no session exists', async () => {
    const state = await recoverWorkspaceSessionState({
      session: null,
      cachedBootstrap: null,
      recoverOnline: vi.fn(),
      persistBootstrap: vi.fn(),
      clearSession: vi.fn(),
    });

    expect(state.kind).toBe('unauthenticated');
    expect(state.message).toContain('请先登录');
  });

  it('uses cached workspace during network failure', async () => {
    const state = await recoverWorkspaceSessionState({
      session,
      cachedBootstrap: bootstrap,
      recoverOnline: vi.fn(async () => {
        throw new Error('network down');
      }),
      persistBootstrap: vi.fn(),
      clearSession: vi.fn(),
    });

    expect(state.kind).toBe('offline-readonly');
    expect(state.message).toContain('本地缓存');
  });
});
