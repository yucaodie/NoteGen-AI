import { describe, expect, it } from 'vitest';
import type {
  AccessContext,
  AppDescriptor,
  AuthBootstrap,
  KnowledgeBaseTree,
  PendingEmailConfirmation,
  SyncEventRecord,
  SyncMetadata,
} from './index';

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

  it('supports knowledge base tree aggregates for workspace rendering', () => {
    const tree: KnowledgeBaseTree = {
      knowledgeBase: {
        id: 'kb-1',
        ownerUserId: 'user-1',
        name: 'My Knowledge Base',
        description: null,
      },
      folders: [
        {
          id: 'folder-1',
          ownerUserId: 'user-1',
          knowledgeBaseId: 'kb-1',
          parentFolderId: null,
          title: 'Inbox',
          sortKey: '0001',
        },
      ],
      notes: [
        {
          id: 'note-1',
          ownerUserId: 'user-1',
          knowledgeBaseId: 'kb-1',
          folderId: 'folder-1',
          title: 'Quick Note',
          markdownContent: '# Hello',
          contentHash: 'hash',
          version: 1,
        },
      ],
    };

    expect(tree.folders[0]?.knowledgeBaseId).toBe(tree.knowledgeBase.id);
    expect(tree.notes[0]?.folderId).toBe(tree.folders[0]?.id);
  });

  it('supports conflict records for sync convergence handling', () => {
    const conflict = {
      resourceId: 'note-1',
      resourceType: 'note' as const,
      localVersion: 2,
      cloudVersion: 3,
      localContentHash: 'local-hash',
      cloudContentHash: 'cloud-hash',
      createdAt: '2026-07-06T16:30:00.000Z',
    };

    expect(conflict.cloudVersion).toBeGreaterThan(conflict.localVersion);
    expect(conflict.resourceType).toBe('note');
  });

  it('supports sync event records for incremental refresh checks', () => {
    const syncEvent: SyncEventRecord = {
      id: 'event-1',
      resourceId: 'note-1',
      resourceType: 'note',
      operation: 'upsert',
      localVersion: 3,
      cloudVersion: 3,
      status: 'synced',
      payload: { knowledgeBaseId: 'kb-1' },
      createdAt: '2026-07-07T16:40:00.000Z',
    };

    expect(syncEvent.payload.knowledgeBaseId).toBe('kb-1');
    expect(syncEvent.operation).toBe('upsert');
  });
});
