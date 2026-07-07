import { afterEach, describe, expect, it, vi } from 'vitest';
import type { AddressInfo } from 'node:net';
import type {
  AuthBootstrap,
  Folder,
  Group,
  GroupInvitation,
  GroupMembership,
  KnowledgeBase,
  KnowledgeBaseTree,
  Note,
  ResourceShare,
  SyncEventRecord,
} from '@supanotegen/shared';
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

const knowledgeBaseFixture: KnowledgeBase = {
  id: 'kb-1',
  ownerUserId: 'user-1',
  name: 'My Knowledge Base',
  description: null,
};

const folderFixture: Folder = {
  id: 'folder-1',
  ownerUserId: 'user-1',
  knowledgeBaseId: 'kb-1',
  parentFolderId: null,
  title: 'Inbox',
  sortKey: '0001',
};

const noteFixture: Note = {
  id: 'note-1',
  ownerUserId: 'user-1',
  knowledgeBaseId: 'kb-1',
  folderId: 'folder-1',
  title: 'Quick Note',
  markdownContent: '# Hello',
  contentHash: 'hash',
  version: 1,
};

const knowledgeBaseTreeFixture: KnowledgeBaseTree = {
  knowledgeBase: knowledgeBaseFixture,
  folders: [folderFixture],
  notes: [noteFixture],
};

const syncEventFixture: SyncEventRecord = {
  id: 'event-1',
  resourceId: 'note-1',
  resourceType: 'note',
  operation: 'upsert',
  localVersion: 2,
  cloudVersion: 2,
  status: 'synced',
  payload: { knowledgeBaseId: 'kb-1' },
  createdAt: '2026-07-07T16:42:00.000Z',
};

const groupFixture: Group = {
  id: 'group-1',
  ownerUserId: 'user-1',
  name: 'Editors',
};

const invitationFixture: GroupInvitation = {
  id: 'invite-1',
  groupId: 'group-1',
  inviterUserId: 'user-1',
  inviteeEmail: 'member@example.com',
  status: 'pending',
  expiresAt: '2099-07-14T00:00:00.000Z',
};

const membershipFixture: GroupMembership = {
  groupId: 'group-1',
  role: 'member',
};

const shareFixture: ResourceShare = {
  id: 'share-1',
  resourceType: 'knowledge_base',
  resourceId: 'kb-1',
  groupId: 'group-1',
  permission: 'read',
};

const contentService = {
  listKnowledgeBases: vi.fn(async () => [knowledgeBaseFixture]),
  createKnowledgeBase: vi.fn(async () => knowledgeBaseFixture),
  getKnowledgeBaseTree: vi.fn(async () => knowledgeBaseTreeFixture),
  updateKnowledgeBase: vi.fn(async () => ({ ...knowledgeBaseFixture, name: 'Renamed Knowledge Base' })),
  deleteKnowledgeBase: vi.fn(async () => undefined),
  createFolder: vi.fn(async () => folderFixture),
  updateFolder: vi.fn(async () => ({ ...folderFixture, title: 'Renamed Folder' })),
  deleteFolder: vi.fn(async () => undefined),
  listFolderNotes: vi.fn(async () => [noteFixture]),
  createNote: vi.fn(async () => noteFixture),
  updateNote: vi.fn(async () => ({ ...noteFixture, title: 'Renamed Note', version: 2 })),
  deleteNote: vi.fn(async () => undefined),
  createSyncEvent: vi.fn(async () => undefined),
  listSyncEvents: vi.fn(async () => [syncEventFixture]),
};

const collaborationService = {
  createGroup: vi.fn(async () => groupFixture),
  createGroupInvitation: vi.fn(async () => invitationFixture),
  acceptGroupInvitation: vi.fn(async () => membershipFixture),
  createResourceShare: vi.fn(async () => shareFixture),
  updateResourceShare: vi.fn(async () => ({ ...shareFixture, permission: 'write' as const })),
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
    expect((response.body as Record<string, any>).workspace.profile.defaultWorkspaceId).toBe('kb-1');
  });

  it('returns pending confirmation payload after sign up when email verification is enabled', async () => {
    authService.signUp.mockResolvedValueOnce({
      status: 'pending_email_confirmation',
      email: 'pending@example.com',
      message: '注册成功，请先确认邮箱后再登录。',
    } as any);

    const response = await sendJsonRequest('/auth/sign-up', {
      method: 'POST',
      body: { email: 'pending@example.com', password: 'password-123' },
    });

    expect(response.status).toBe(200);
    expect((response.body as Record<string, any>).status).toBe('pending_email_confirmation');
    expect((response.body as Record<string, any>).email).toBe('pending@example.com');
  });

  it('returns bootstrap payload after sign in', async () => {
    const response = await sendJsonRequest('/auth/sign-in', {
      method: 'POST',
      body: { email: 'user@example.com', password: 'password-123' },
    });

    expect(response.status).toBe(200);
    expect(authService.signIn).toHaveBeenCalledWith('user@example.com', 'password-123');
    expect((response.body as Record<string, any>).session.accessToken).toBe('access-token');
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
    expect((response.body as Record<string, any>).code).toBe('auth_failed');
    expect((response.body as Record<string, any>).message).toContain('Invalid login credentials');
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
    expect((response.body as Record<string, any>).session.user.id).toBe('user-1');
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
    expect((response.body as Record<string, any>).code).toBe('session_expired');
    expect((response.body as Record<string, any>).message).toContain('Session expired');
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
    expect((response.body as Record<string, any>).signedOut).toBe(true);
  });
});

describe('createAppServer content routes', () => {
  it('lists knowledge bases for the current user', async () => {
    const response = await sendJsonRequest('/api/v1/knowledge-bases', {
      method: 'GET',
      headers: { authorization: 'Bearer access-token' },
    });

    expect(response.status).toBe(200);
    expect(contentService.listKnowledgeBases).toHaveBeenCalledWith('access-token');
    expect((response.body as Array<Record<string, any>>)[0]?.id).toBe('kb-1');
  });

  it('returns knowledge base tree aggregate', async () => {
    const response = await sendJsonRequest('/api/v1/knowledge-bases/kb-1', {
      method: 'GET',
      headers: { authorization: 'Bearer access-token' },
    });

    expect(response.status).toBe(200);
    expect(contentService.getKnowledgeBaseTree).toHaveBeenCalledWith('access-token', 'kb-1');
    expect((response.body as Record<string, any>).notes).toHaveLength(1);
  });

  it('creates and updates a note', async () => {
    const createResponse = await sendJsonRequest('/api/v1/notes', {
      method: 'POST',
      headers: { authorization: 'Bearer access-token' },
      body: {
        knowledgeBaseId: 'kb-1',
        folderId: 'folder-1',
        title: 'Quick Note',
        markdownContent: '# Hello',
      },
    });

    const updateResponse = await sendJsonRequest('/api/v1/notes/note-1', {
      method: 'PATCH',
      headers: { authorization: 'Bearer access-token' },
      body: {
        title: 'Renamed Note',
        markdownContent: '# Updated',
      },
    });

    expect(createResponse.status).toBe(200);
    expect(contentService.createNote).toHaveBeenCalledWith(
      'access-token',
      expect.objectContaining({ title: 'Quick Note' }),
    );
    expect(updateResponse.status).toBe(200);
    expect((updateResponse.body as Record<string, any>).version).toBe(2);
  });

  it('returns notes scoped to a folder', async () => {
    const response = await sendJsonRequest('/api/v1/folders/folder-1/notes', {
      method: 'GET',
      headers: { authorization: 'Bearer access-token' },
    });

    expect(response.status).toBe(200);
    expect(contentService.listFolderNotes).toHaveBeenCalledWith('access-token', 'folder-1');
    expect((response.body as Array<Record<string, any>>)[0]?.folderId).toBe('folder-1');
  });

  it('returns forbidden for cross-user access rejection', async () => {
    contentService.getKnowledgeBaseTree.mockRejectedValueOnce(
      Object.assign(new Error('当前用户无权访问该资源。'), { statusCode: 403, code: 'forbidden' }),
    );

    const response = await sendJsonRequest('/api/v1/knowledge-bases/kb-2', {
      method: 'GET',
      headers: { authorization: 'Bearer access-token' },
    });

    expect(response.status).toBe(403);
    expect((response.body as Record<string, any>).code).toBe('forbidden');
  });

  it('returns deleted true for soft delete endpoints', async () => {
    const response = await sendJsonRequest('/api/v1/notes/note-1', {
      method: 'DELETE',
      headers: { authorization: 'Bearer access-token' },
    });

    expect(response.status).toBe(200);
    expect(contentService.deleteNote).toHaveBeenCalledWith('access-token', 'note-1');
    expect((response.body as Record<string, any>).deleted).toBe(true);
  });

  it('records sync events for note saves', async () => {
    const response = await sendJsonRequest('/api/v1/sync-events', {
      method: 'POST',
      headers: { authorization: 'Bearer access-token' },
      body: {
        resourceType: 'note',
        resourceId: 'note-1',
        operation: 'upsert',
        localVersion: 2,
        cloudVersion: 2,
        status: 'synced',
        payload: { title: 'Saved Note' },
      },
    });

    expect(response.status).toBe(200);
    expect(contentService.createSyncEvent).toHaveBeenCalledWith(
      'access-token',
      expect.objectContaining({ resourceId: 'note-1', status: 'synced' }),
    );
    expect((response.body as Record<string, any>).recorded).toBe(true);
  });

  it('lists sync events for incremental refresh checks', async () => {
    const response = await sendJsonRequest('/api/v1/sync-events?since=2026-07-07T16:40:00.000Z&limit=5', {
      method: 'GET',
      headers: { authorization: 'Bearer access-token' },
    });

    expect(response.status).toBe(200);
    expect(contentService.listSyncEvents).toHaveBeenCalledWith('access-token', {
      since: '2026-07-07T16:40:00.000Z',
      limit: 5,
    });
    expect(Array.isArray(response.body)).toBe(true);
  });
});

describe('createAppServer collaboration routes', () => {
  it('creates a group', async () => {
    const response = await sendJsonRequest('/api/v1/groups', {
      method: 'POST',
      headers: { authorization: 'Bearer access-token' },
      body: { name: 'Editors' },
    });

    expect(response.status).toBe(200);
    expect(collaborationService.createGroup).toHaveBeenCalledWith('access-token', { name: 'Editors' });
    expect((response.body as Record<string, any>).id).toBe('group-1');
  });

  it('creates and accepts a group invitation', async () => {
    const inviteResponse = await sendJsonRequest('/api/v1/groups/group-1/invitations', {
      method: 'POST',
      headers: { authorization: 'Bearer access-token' },
      body: { inviteeEmail: 'member@example.com' },
    });

    const acceptResponse = await sendJsonRequest('/api/v1/groups/invitations/invite-1/accept', {
      method: 'POST',
      headers: { authorization: 'Bearer access-token' },
    });

    expect(inviteResponse.status).toBe(200);
    expect(collaborationService.createGroupInvitation).toHaveBeenCalledWith('access-token', 'group-1', {
      inviteeEmail: 'member@example.com',
    });
    expect(acceptResponse.status).toBe(200);
    expect(collaborationService.acceptGroupInvitation).toHaveBeenCalledWith('access-token', 'invite-1');
  });

  it('creates and updates a resource share', async () => {
    const createResponse = await sendJsonRequest('/api/v1/shares', {
      method: 'POST',
      headers: { authorization: 'Bearer access-token' },
      body: {
        resourceType: 'knowledge_base',
        resourceId: 'kb-1',
        groupId: 'group-1',
        permission: 'read',
      },
    });

    const updateResponse = await sendJsonRequest('/api/v1/shares/share-1', {
      method: 'PATCH',
      headers: { authorization: 'Bearer access-token' },
      body: { permission: 'write' },
    });

    expect(createResponse.status).toBe(200);
    expect(updateResponse.status).toBe(200);
    expect(collaborationService.createResourceShare).toHaveBeenCalledWith(
      'access-token',
      expect.objectContaining({ resourceId: 'kb-1', permission: 'read' }),
    );
    expect(collaborationService.updateResourceShare).toHaveBeenCalledWith('access-token', 'share-1', {
      permission: 'write',
    });
  });

  it('returns forbidden when collaboration service rejects unauthorized group changes', async () => {
    collaborationService.createResourceShare.mockRejectedValueOnce(
      Object.assign(new Error('当前用户没有群组管理权限。'), { statusCode: 403, code: 'forbidden' }),
    );

    const response = await sendJsonRequest('/api/v1/shares', {
      method: 'POST',
      headers: { authorization: 'Bearer access-token' },
      body: {
        resourceType: 'knowledge_base',
        resourceId: 'kb-1',
        groupId: 'group-1',
        permission: 'read',
      },
    });

    expect(response.status).toBe(403);
    expect((response.body as Record<string, any>).code).toBe('forbidden');
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
  activeServer = createAppServer(logger, authService, contentService, collaborationService);
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
    body: (await response.json()) as Record<string, any> | Array<Record<string, any>>,
  };
}
