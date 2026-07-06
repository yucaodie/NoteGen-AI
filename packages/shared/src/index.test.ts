import { describe, expect, it } from 'vitest';
import type { AccessContext, AppDescriptor, AuthBootstrap, PendingEmailConfirmation, SyncMetadata } from './index';

describe('shared domain contracts', () => {
  it('supports the base API descriptor shape', () => {
    const descriptor: AppDescriptor = {
      name: 'SupaNoteGen API',
      status: 'ok',
      surface: 'api',
    };

    expect(descriptor.status).toBe('ok');
    expect(descriptor.surface).toBe('api');
  });

  it('supports sync metadata state transitions', () => {
    const metadata: SyncMetadata = {
      resourceId: 'note-1',
      resourceType: 'note',
      localVersion: 2,
      cloudVersion: 1,
      syncStatus: 'pending',
      contentHash: 'hash-value',
      lastSyncedAt: null,
      tombstone: false,
    };

    expect(metadata.syncStatus).toBe('pending');
    expect(metadata.cloudVersion).toBeLessThan(metadata.localVersion);
  });

  it('supports auth bootstrap payloads for workspace recovery', () => {
    const accessContext: AccessContext = {
      userId: 'user-1',
      groupIds: ['group-1'],
      knowledgeBaseIds: ['kb-1'],
    };

    const bootstrap: AuthBootstrap = {
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
        accessContext,
        mode: 'online',
      },
    };

    expect(bootstrap.workspace.accessContext.knowledgeBaseIds).toContain('kb-1');
    expect(bootstrap.session.user.email).toContain('@');
  });

  it('supports pending email confirmation payloads after sign up', () => {
    const pending: PendingEmailConfirmation = {
      status: 'pending_email_confirmation',
      email: 'user@example.com',
      message: '注册成功，请先确认邮箱后再登录。',
    };

    expect(pending.status).toBe('pending_email_confirmation');
    expect(pending.email).toContain('@');
  });
});
