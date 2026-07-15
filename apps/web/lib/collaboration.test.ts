import { describe, expect, it, vi } from 'vitest';
import type { Group, GroupInvitation, GroupMembership, ResourceShare } from '@supanotegen/shared';
import {
  acceptInvitation,
  createGroup,
  createGroupInvitation,
  createResourceShare,
  type GroupDetail,
  getGroup,
  listGroupInvitations,
  listGroups,
  listPendingInvitations,
  listResourceShares,
  updateResourceShare,
} from './collaboration';

const session = {
  accessToken: 'test-token',
  refreshToken: 'test-refresh',
  expiresAt: '2099-01-01T00:00:00.000Z',
  user: { id: 'user-1', email: 'owner@example.com' },
};

const apiUrl = 'http://localhost:4000';

describe('collaboration', () => {
  it('creates a group', async () => {
    const fetchMock = vi.fn(async () =>
      jsonResponse({ id: 'group-1', ownerUserId: 'user-1', name: '我的群组' }),
    );
    const group = await createGroup(session, { name: '我的群组' }, fetchMock as typeof fetch);
    expect(group.name).toBe('我的群组');
  });

  it('lists groups', async () => {
    const fetchMock = vi.fn(async () =>
      jsonResponse([{ id: 'group-1', ownerUserId: 'user-1', name: '我的群组' }]),
    );
    const groups = await listGroups(session, fetchMock as typeof fetch);
    expect(groups).toHaveLength(1);
  });

  it('gets group detail', async () => {
    const detail: GroupDetail = {
      id: 'group-1',
      ownerUserId: 'user-1',
      name: '我的群组',
      members: [{ groupId: 'group-1', role: 'owner' }],
    };
    const fetchMock = vi.fn(async () => jsonResponse(detail));
    const result = await getGroup(session, 'group-1', fetchMock as typeof fetch);
    expect(result.members).toHaveLength(1);
  });

  it('creates a group invitation', async () => {
    const inv: GroupInvitation = {
      id: 'inv-1',
      groupId: 'group-1',
      inviterUserId: 'user-1',
      inviteeEmail: 'member@example.com',
      status: 'pending',
      expiresAt: '2099-01-01T00:00:00.000Z',
    };
    const fetchMock = vi.fn(async () => jsonResponse(inv));
    const result = await createGroupInvitation(session, 'group-1', { inviteeEmail: 'member@example.com' }, fetchMock as typeof fetch);
    expect(result.status).toBe('pending');
  });

  it('lists group invitations', async () => {
    const fetchMock = vi.fn(async () => jsonResponse([]));
    const result = await listGroupInvitations(session, 'group-1', fetchMock as typeof fetch);
    expect(result).toHaveLength(0);
  });

  it('lists pending invitations for current user', async () => {
    const fetchMock = vi.fn(async () => jsonResponse([]));
    const result = await listPendingInvitations(session, fetchMock as typeof fetch);
    expect(result).toHaveLength(0);
  });

  it('accepts an invitation', async () => {
    const membership: GroupMembership = { groupId: 'group-1', role: 'member' };
    const fetchMock = vi.fn(async () => jsonResponse(membership));
    const result = await acceptInvitation(session, 'inv-1', fetchMock as typeof fetch);
    expect(result.role).toBe('member');
  });

  it('lists owned resource shares', async () => {
    const fetchMock = vi.fn(async () => jsonResponse([]));
    const result = await listResourceShares(session, 'owned', fetchMock as typeof fetch);
    expect(result).toHaveLength(0);
  });

  it('creates a resource share', async () => {
    const share: ResourceShare = {
      id: 'share-1',
      resourceType: 'knowledge_base',
      resourceId: 'kb-1',
      groupId: 'group-1',
      permission: 'read',
    };
    const fetchMock = vi.fn(async () => jsonResponse(share));
    const result = await createResourceShare(session, {
      resourceType: 'knowledge_base',
      resourceId: 'kb-1',
      groupId: 'group-1',
      permission: 'read',
    }, fetchMock as typeof fetch);
    expect(result.permission).toBe('read');
  });

  it('updates a resource share', async () => {
    const share: ResourceShare = {
      id: 'share-1',
      resourceType: 'knowledge_base',
      resourceId: 'kb-1',
      groupId: 'group-1',
      permission: 'write',
    };
    const fetchMock = vi.fn(async () => jsonResponse(share));
    const result = await updateResourceShare(session, 'share-1', { permission: 'write' }, fetchMock as typeof fetch);
    expect(result.permission).toBe('write');
  });

  it('handles API error responses', async () => {
    const fetchMock = vi.fn(async () =>
      new Response(JSON.stringify({ code: 'forbidden', message: '权限不足。' }), { status: 403 }),
    );
    await expect(
      listGroups(session, fetchMock as typeof fetch),
    ).rejects.toMatchObject({ message: '权限不足。' });
  });
});

function jsonResponse(body: unknown) {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { 'content-type': 'application/json' },
  });
}
