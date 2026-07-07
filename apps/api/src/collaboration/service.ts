import type { Group, GroupInvitation, GroupMembership, ResourceShare } from '@supanotegen/shared';
import type { ApiEnv } from '../config/env';

type FetchLike = typeof fetch;

type SupabaseAuthUser = {
  id: string;
  email?: string | null;
};

type CollaborationError = Error & {
  statusCode?: number;
  code?: string;
};

type GroupRow = {
  id: string;
  owner_user_id: string;
  name: string;
};

type GroupInvitationRow = {
  id: string;
  group_id: string;
  inviter_user_id: string;
  invitee_email: string;
  status: 'pending' | 'accepted' | 'expired' | 'revoked';
  expires_at: string;
};

type GroupMembershipRow = {
  group_id: string;
  user_id: string;
  role: 'owner' | 'member';
};

type ResourceShareRow = {
  id: string;
  resource_type: 'knowledge_base' | 'folder';
  resource_id: string;
  group_id: string;
  permission: 'read' | 'write';
  created_by: string;
};

type OwnedKnowledgeBaseRow = {
  id: string;
  owner_user_id: string;
};

type OwnedFolderRow = {
  id: string;
  owner_user_id: string;
};

type CreateGroupInput = {
  name: string;
};

type CreateGroupInvitationInput = {
  inviteeEmail: string;
  expiresAt?: string;
};

type CreateResourceShareInput = {
  resourceType: 'knowledge_base' | 'folder';
  resourceId: string;
  groupId: string;
  permission: 'read' | 'write';
};

type UpdateResourceShareInput = {
  permission: 'read' | 'write';
};

export type CollaborationService = {
  createGroup: (accessToken: string, input: CreateGroupInput) => Promise<Group>;
  createGroupInvitation: (
    accessToken: string,
    groupId: string,
    input: CreateGroupInvitationInput,
  ) => Promise<GroupInvitation>;
  acceptGroupInvitation: (accessToken: string, invitationId: string) => Promise<GroupMembership>;
  createResourceShare: (accessToken: string, input: CreateResourceShareInput) => Promise<ResourceShare>;
  updateResourceShare: (accessToken: string, shareId: string, input: UpdateResourceShareInput) => Promise<ResourceShare>;
};

export function createCollaborationService(env: ApiEnv, fetchImpl: FetchLike = fetch): CollaborationService {
  const authBaseUrl = new URL('/auth/v1/', env.supabaseUrl).toString();
  const restBaseUrl = new URL('/rest/v1/', env.supabaseUrl).toString();

  async function createGroup(accessToken: string, input: CreateGroupInput): Promise<Group> {
    const user = await getUser(accessToken);
    const rows = await restRequest<GroupRow[]>('groups?select=id,owner_user_id,name', {
      method: 'POST',
      headers: { Prefer: 'return=representation' },
      body: JSON.stringify([
        {
          owner_user_id: user.id,
          name: normalizeRequiredText(input.name, '群组名称'),
        },
      ]),
    });

    const group = mapGroup(rows[0]);
    await restRequest<GroupMembershipRow[]>('group_members?select=group_id,user_id,role', {
      method: 'POST',
      headers: { Prefer: 'return=representation' },
      body: JSON.stringify([
        {
          group_id: group.id,
          user_id: user.id,
          role: 'owner',
        },
      ]),
    });

    return group;
  }

  async function createGroupInvitation(
    accessToken: string,
    groupId: string,
    input: CreateGroupInvitationInput,
  ): Promise<GroupInvitation> {
    const user = await getUser(accessToken);
    await assertGroupOwner(groupId, user.id);

    const rows = await restRequest<GroupInvitationRow[]>(
      'group_invitations?select=id,group_id,inviter_user_id,invitee_email,status,expires_at',
      {
        method: 'POST',
        headers: { Prefer: 'return=representation' },
        body: JSON.stringify([
          {
            group_id: groupId,
            inviter_user_id: user.id,
            invitee_email: normalizeEmail(input.inviteeEmail),
            status: 'pending',
            expires_at: input.expiresAt ?? new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
          },
        ]),
      },
    );

    return mapGroupInvitation(rows[0]);
  }

  async function acceptGroupInvitation(accessToken: string, invitationId: string): Promise<GroupMembership> {
    const user = await getUser(accessToken);
    const invitation = await getInvitation(invitationId);

    if (normalizeEmail(user.email ?? '') !== normalizeEmail(invitation.invitee_email)) {
      throw createError(403, 'forbidden', '当前用户不能接受这条邀请。');
    }
    if (invitation.status !== 'pending') {
      throw createError(400, 'invalid_request', '当前邀请已不处于待接受状态。');
    }
    if (new Date(invitation.expires_at).getTime() <= Date.now()) {
      throw createError(400, 'invalid_request', '当前邀请已过期。');
    }

    const existingMembership = await getMembership(invitation.group_id, user.id);
    if (!existingMembership) {
      await restRequest<GroupMembershipRow[]>('group_members?select=group_id,user_id,role', {
        method: 'POST',
        headers: { Prefer: 'return=representation' },
        body: JSON.stringify([
          {
            group_id: invitation.group_id,
            user_id: user.id,
            role: 'member',
          },
        ]),
      });
    }

    await restRequest<GroupInvitationRow[]>(
      `group_invitations?id=eq.${encodeURIComponent(invitationId)}&select=id,group_id,inviter_user_id,invitee_email,status,expires_at`,
      {
        method: 'PATCH',
        headers: { Prefer: 'return=representation' },
        body: JSON.stringify({ status: 'accepted' }),
      },
    );

    return {
      groupId: invitation.group_id,
      role: 'member',
    };
  }

  async function createResourceShare(accessToken: string, input: CreateResourceShareInput): Promise<ResourceShare> {
    const user = await getUser(accessToken);
    await assertGroupOwner(input.groupId, user.id);
    await assertResourceOwner(input.resourceType, input.resourceId, user.id);

    const rows = await restRequest<ResourceShareRow[]>(
      'resource_shares?select=id,resource_type,resource_id,group_id,permission,created_by',
      {
        method: 'POST',
        headers: { Prefer: 'return=representation' },
        body: JSON.stringify([
          {
            resource_type: input.resourceType,
            resource_id: input.resourceId,
            group_id: input.groupId,
            permission: input.permission,
            created_by: user.id,
          },
        ]),
      },
    );

    return mapResourceShare(rows[0]);
  }

  async function updateResourceShare(
    accessToken: string,
    shareId: string,
    input: UpdateResourceShareInput,
  ): Promise<ResourceShare> {
    const user = await getUser(accessToken);
    const existingShare = await getResourceShare(shareId);
    await assertGroupOwner(existingShare.group_id, user.id);

    const rows = await restRequest<ResourceShareRow[]>(
      `resource_shares?id=eq.${encodeURIComponent(shareId)}&select=id,resource_type,resource_id,group_id,permission,created_by`,
      {
        method: 'PATCH',
        headers: { Prefer: 'return=representation' },
        body: JSON.stringify({ permission: input.permission }),
      },
    );

    return mapResourceShare(rows[0]);
  }

  async function assertGroupOwner(groupId: string, userId: string) {
    const rows = await restRequest<GroupRow[]>(
      `groups?id=eq.${encodeURIComponent(groupId)}&select=id,owner_user_id,name`,
      { method: 'GET' },
    );
    const group = rows[0];
    if (!group) {
      throw createError(404, 'not_found', '群组不存在。');
    }
    if (group.owner_user_id !== userId) {
      throw createError(403, 'forbidden', '当前用户没有群组管理权限。');
    }
  }

  async function assertResourceOwner(resourceType: 'knowledge_base' | 'folder', resourceId: string, userId: string) {
    if (resourceType === 'knowledge_base') {
      const rows = await restRequest<OwnedKnowledgeBaseRow[]>(
        `knowledge_bases?id=eq.${encodeURIComponent(resourceId)}&deleted_at=is.null&select=id,owner_user_id`,
        { method: 'GET' },
      );
      if (!rows[0]) {
        throw createError(404, 'not_found', '知识库不存在。');
      }
      if (rows[0].owner_user_id !== userId) {
        throw createError(403, 'forbidden', '当前用户不能共享这个知识库。');
      }
      return;
    }

    const rows = await restRequest<OwnedFolderRow[]>(
      `folders?id=eq.${encodeURIComponent(resourceId)}&deleted_at=is.null&select=id,owner_user_id`,
      { method: 'GET' },
    );
    if (!rows[0]) {
      throw createError(404, 'not_found', '文件夹不存在。');
    }
    if (rows[0].owner_user_id !== userId) {
      throw createError(403, 'forbidden', '当前用户不能共享这个文件夹。');
    }
  }

  async function getInvitation(invitationId: string) {
    const rows = await restRequest<GroupInvitationRow[]>(
      `group_invitations?id=eq.${encodeURIComponent(invitationId)}&select=id,group_id,inviter_user_id,invitee_email,status,expires_at`,
      { method: 'GET' },
    );
    const invitation = rows[0];
    if (!invitation) {
      throw createError(404, 'not_found', '邀请不存在。');
    }
    return invitation;
  }

  async function getMembership(groupId: string, userId: string) {
    const rows = await restRequest<GroupMembershipRow[]>(
      `group_members?group_id=eq.${encodeURIComponent(groupId)}&user_id=eq.${encodeURIComponent(userId)}&select=group_id,user_id,role`,
      { method: 'GET' },
    );
    return rows[0] ?? null;
  }

  async function getResourceShare(shareId: string) {
    const rows = await restRequest<ResourceShareRow[]>(
      `resource_shares?id=eq.${encodeURIComponent(shareId)}&select=id,resource_type,resource_id,group_id,permission,created_by`,
      { method: 'GET' },
    );
    const share = rows[0];
    if (!share) {
      throw createError(404, 'not_found', '共享关系不存在。');
    }
    return share;
  }

  async function getUser(accessToken: string): Promise<SupabaseAuthUser> {
    const response = await fetchImpl(new URL('user', authBaseUrl), {
      headers: {
        apikey: env.supabaseAnonKey,
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) {
      throw await createSupabaseError(response, 'Unable to load user session');
    }

    return (await response.json()) as SupabaseAuthUser;
  }

  async function restRequest<T>(path: string, init: RequestInit): Promise<T> {
    const response = await fetchImpl(new URL(path, restBaseUrl), {
      ...init,
      headers: {
        'content-type': 'application/json',
        apikey: env.supabaseServiceRoleKey,
        Authorization: `Bearer ${env.supabaseServiceRoleKey}`,
        ...init.headers,
      },
    });

    if (!response.ok) {
      throw await createSupabaseError(response, 'Supabase collaboration request failed');
    }

    if (response.status === 204) {
      return [] as T;
    }

    return (await response.json()) as T;
  }

  return {
    createGroup,
    createGroupInvitation,
    acceptGroupInvitation,
    createResourceShare,
    updateResourceShare,
  };
}

function mapGroup(row: GroupRow): Group {
  return {
    id: row.id,
    ownerUserId: row.owner_user_id,
    name: row.name,
  };
}

function mapGroupInvitation(row: GroupInvitationRow): GroupInvitation {
  return {
    id: row.id,
    groupId: row.group_id,
    inviterUserId: row.inviter_user_id,
    inviteeEmail: row.invitee_email,
    status: row.status,
    expiresAt: row.expires_at,
  };
}

function mapResourceShare(row: ResourceShareRow): ResourceShare {
  return {
    id: row.id,
    resourceType: row.resource_type,
    resourceId: row.resource_id,
    groupId: row.group_id,
    permission: row.permission,
  };
}

function normalizeRequiredText(value: string, fieldName: string) {
  const normalized = value.trim();
  if (!normalized) {
    throw createError(400, 'invalid_request', `${fieldName}不能为空。`);
  }
  return normalized;
}

function normalizeEmail(value: string) {
  const normalized = value.trim().toLowerCase();
  if (!normalized.includes('@')) {
    throw createError(400, 'invalid_request', '邀请邮箱格式无效。');
  }
  return normalized;
}

function createError(statusCode: number, code: string, message: string) {
  const error = new Error(message) as CollaborationError;
  error.statusCode = statusCode;
  error.code = code;
  return error;
}

async function createSupabaseError(response: Response, fallbackMessage: string) {
  const error = new Error(fallbackMessage) as CollaborationError;
  error.statusCode = response.status;
  error.code = response.status === 404 ? 'not_found' : response.status === 403 ? 'forbidden' : 'network_error';

  try {
    const payload = (await response.json()) as { message?: string; msg?: string; code?: string };
    error.message = payload.message ?? payload.msg ?? fallbackMessage;
    error.code = payload.code ?? error.code;
  } catch {
    error.message = fallbackMessage;
  }

  return error;
}
