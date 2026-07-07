import { describe, expect, it, vi } from 'vitest';
import { createCollaborationService } from './service';

const env = {
  port: 4000,
  host: '127.0.0.1',
  supabaseUrl: 'https://example.supabase.co',
  supabaseAnonKey: 'anon-key',
  supabaseServiceRoleKey: 'service-role-key',
};

describe('createCollaborationService', () => {
  it('creates a group and bootstraps owner membership', async () => {
    const fetchMock = vi.fn(async (input: URL | string, init?: RequestInit) => {
      const url = input.toString();

      if (url.endsWith('/auth/v1/user')) {
        return jsonResponse({ id: 'user-1', email: 'owner@example.com' });
      }

      if (url.includes('/rest/v1/groups?select=') && init?.method === 'POST') {
        return jsonResponse([{ id: 'group-1', owner_user_id: 'user-1', name: 'Editors' }]);
      }

      if (url.includes('/rest/v1/group_members?select=') && init?.method === 'POST') {
        const body = JSON.parse(String(init.body)) as Array<Record<string, unknown>>;
        expect(body[0]?.role).toBe('owner');
        return jsonResponse([{ group_id: 'group-1', user_id: 'user-1', role: 'owner' }]);
      }

      throw new Error(`Unexpected request: ${url}`);
    });

    const service = createCollaborationService(env, fetchMock as typeof fetch);
    const group = await service.createGroup('access-token', { name: 'Editors' });

    expect(group.id).toBe('group-1');
    expect(group.ownerUserId).toBe('user-1');
  });

  it('creates and accepts a group invitation', async () => {
    const fetchMock = vi.fn(async (input: URL | string, init?: RequestInit) => {
      const url = input.toString();

      if (url.endsWith('/auth/v1/user')) {
        const authorization = (init?.headers as Record<string, string> | undefined)?.Authorization;
        if (authorization?.includes('owner-token')) {
          return jsonResponse({ id: 'user-1', email: 'owner@example.com' });
        }

        return jsonResponse({ id: 'user-2', email: 'member@example.com' });
      }

      if (url.includes('/rest/v1/groups?id=eq.group-1') && init?.method === 'GET') {
        return jsonResponse([{ id: 'group-1', owner_user_id: 'user-1', name: 'Editors' }]);
      }

      if (url.includes('/rest/v1/group_invitations?select=') && init?.method === 'POST') {
        return jsonResponse([
          {
            id: 'invite-1',
            group_id: 'group-1',
            inviter_user_id: 'user-1',
            invitee_email: 'member@example.com',
            status: 'pending',
            expires_at: '2099-07-14T00:00:00.000Z',
          },
        ]);
      }

      if (url.includes('/rest/v1/group_invitations?id=eq.invite-1') && init?.method === 'GET') {
        return jsonResponse([
          {
            id: 'invite-1',
            group_id: 'group-1',
            inviter_user_id: 'user-1',
            invitee_email: 'member@example.com',
            status: 'pending',
            expires_at: '2099-07-14T00:00:00.000Z',
          },
        ]);
      }

      if (url.includes('/rest/v1/group_members?group_id=eq.group-1&user_id=eq.user-2') && init?.method === 'GET') {
        return jsonResponse([]);
      }

      if (url.includes('/rest/v1/group_members?select=') && init?.method === 'POST') {
        return jsonResponse([{ group_id: 'group-1', user_id: 'user-2', role: 'member' }]);
      }

      if (url.includes('/rest/v1/group_invitations?id=eq.invite-1') && init?.method === 'PATCH') {
        return jsonResponse([
          {
            id: 'invite-1',
            group_id: 'group-1',
            inviter_user_id: 'user-1',
            invitee_email: 'member@example.com',
            status: 'accepted',
            expires_at: '2099-07-14T00:00:00.000Z',
          },
        ]);
      }

      throw new Error(`Unexpected request: ${url}`);
    });

    const service = createCollaborationService(env, fetchMock as typeof fetch);
    const invitation = await service.createGroupInvitation('owner-token', 'group-1', {
      inviteeEmail: 'member@example.com',
    });
    const membership = await service.acceptGroupInvitation('member-token', invitation.id);

    expect(invitation.groupId).toBe('group-1');
    expect(membership.role).toBe('member');
  });

  it('creates and updates a resource share for a group owner', async () => {
    const fetchMock = vi.fn(async (input: URL | string, init?: RequestInit) => {
      const url = input.toString();

      if (url.endsWith('/auth/v1/user')) {
        return jsonResponse({ id: 'user-1', email: 'owner@example.com' });
      }

      if (url.includes('/rest/v1/groups?id=eq.group-1') && init?.method === 'GET') {
        return jsonResponse([{ id: 'group-1', owner_user_id: 'user-1', name: 'Editors' }]);
      }

      if (url.includes('/rest/v1/knowledge_bases?id=eq.kb-1') && init?.method === 'GET') {
        return jsonResponse([{ id: 'kb-1', owner_user_id: 'user-1' }]);
      }

      if (url.includes('/rest/v1/resource_shares?select=') && init?.method === 'POST') {
        return jsonResponse([
          {
            id: 'share-1',
            resource_type: 'knowledge_base',
            resource_id: 'kb-1',
            group_id: 'group-1',
            permission: 'read',
            created_by: 'user-1',
          },
        ]);
      }

      if (url.includes('/rest/v1/resource_shares?id=eq.share-1') && init?.method === 'GET') {
        return jsonResponse([
          {
            id: 'share-1',
            resource_type: 'knowledge_base',
            resource_id: 'kb-1',
            group_id: 'group-1',
            permission: 'read',
            created_by: 'user-1',
          },
        ]);
      }

      if (url.includes('/rest/v1/resource_shares?id=eq.share-1') && init?.method === 'PATCH') {
        return jsonResponse([
          {
            id: 'share-1',
            resource_type: 'knowledge_base',
            resource_id: 'kb-1',
            group_id: 'group-1',
            permission: 'write',
            created_by: 'user-1',
          },
        ]);
      }

      throw new Error(`Unexpected request: ${url}`);
    });

    const service = createCollaborationService(env, fetchMock as typeof fetch);
    const share = await service.createResourceShare('access-token', {
      resourceType: 'knowledge_base',
      resourceId: 'kb-1',
      groupId: 'group-1',
      permission: 'read',
    });
    const updatedShare = await service.updateResourceShare('access-token', share.id, { permission: 'write' });

    expect(share.permission).toBe('read');
    expect(updatedShare.permission).toBe('write');
  });

  it('rejects creating a share when the caller does not own the target group', async () => {
    const fetchMock = vi.fn(async (input: URL | string, init?: RequestInit) => {
      const url = input.toString();

      if (url.endsWith('/auth/v1/user')) {
        return jsonResponse({ id: 'user-1', email: 'owner@example.com' });
      }

      if (url.includes('/rest/v1/groups?id=eq.group-1') && init?.method === 'GET') {
        return jsonResponse([{ id: 'group-1', owner_user_id: 'user-2', name: 'Other Group' }]);
      }

      throw new Error(`Unexpected request: ${url}`);
    });

    const service = createCollaborationService(env, fetchMock as typeof fetch);

    await expect(
      service.createResourceShare('access-token', {
        resourceType: 'knowledge_base',
        resourceId: 'kb-1',
        groupId: 'group-1',
        permission: 'read',
      }),
    ).rejects.toMatchObject({ statusCode: 403, code: 'forbidden' });
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
