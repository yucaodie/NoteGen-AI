import type { Group, GroupInvitation, GroupMembership, ResourceShare } from '@supanotegen/shared';
import type { AuthSession } from '@supanotegen/shared';
import { AuthApiError } from './auth';
import { getApiUrl } from './api';

type FetchLike = typeof fetch;

export type GroupDetail = {
  id: string;
  ownerUserId: string;
  name: string;
  members: GroupMembership[];
};

export async function listGroups(session: AuthSession, fetchImpl: FetchLike = fetch): Promise<Group[]> {
  return request<Group[]>(session, '/api/v1/groups', { method: 'GET' }, fetchImpl);
}

export async function getGroup(session: AuthSession, groupId: string, fetchImpl: FetchLike = fetch): Promise<GroupDetail> {
  return request<GroupDetail>(session, `/api/v1/groups/${encodeURIComponent(groupId)}`, { method: 'GET' }, fetchImpl);
}

export async function createGroup(
  session: AuthSession,
  payload: { name: string },
  fetchImpl: FetchLike = fetch,
): Promise<Group> {
  return request<Group>(
    session,
    '/api/v1/groups',
    {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(payload),
    },
    fetchImpl,
  );
}

export async function listGroupInvitations(
  session: AuthSession,
  groupId: string,
  fetchImpl: FetchLike = fetch,
): Promise<GroupInvitation[]> {
  return request<GroupInvitation[]>(
    session,
    `/api/v1/groups/${encodeURIComponent(groupId)}/invitations`,
    { method: 'GET' },
    fetchImpl,
  );
}

export async function createGroupInvitation(
  session: AuthSession,
  groupId: string,
  payload: { inviteeEmail: string; expiresAt?: string },
  fetchImpl: FetchLike = fetch,
): Promise<GroupInvitation> {
  return request<GroupInvitation>(
    session,
    `/api/v1/groups/${encodeURIComponent(groupId)}/invitations`,
    {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(payload),
    },
    fetchImpl,
  );
}

export async function listPendingInvitations(
  session: AuthSession,
  fetchImpl: FetchLike = fetch,
): Promise<GroupInvitation[]> {
  return request<GroupInvitation[]>(
    session,
    '/api/v1/groups/invitations',
    { method: 'GET' },
    fetchImpl,
  );
}

export async function acceptInvitation(
  session: AuthSession,
  invitationId: string,
  fetchImpl: FetchLike = fetch,
): Promise<GroupMembership> {
  return request<GroupMembership>(
    session,
    `/api/v1/groups/invitations/${encodeURIComponent(invitationId)}/accept`,
    { method: 'POST' },
    fetchImpl,
  );
}

export async function listResourceShares(
  session: AuthSession,
  scope: 'owned' | 'group',
  fetchImpl: FetchLike = fetch,
): Promise<ResourceShare[]> {
  return request<ResourceShare[]>(
    session,
    `/api/v1/shares?scope=${scope}`,
    { method: 'GET' },
    fetchImpl,
  );
}

export async function createResourceShare(
  session: AuthSession,
  payload: { resourceType: 'knowledge_base' | 'folder'; resourceId: string; groupId: string; permission: 'read' | 'write' },
  fetchImpl: FetchLike = fetch,
): Promise<ResourceShare> {
  return request<ResourceShare>(
    session,
    '/api/v1/shares',
    {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(payload),
    },
    fetchImpl,
  );
}

export async function updateResourceShare(
  session: AuthSession,
  shareId: string,
  payload: { permission: 'read' | 'write' },
  fetchImpl: FetchLike = fetch,
): Promise<ResourceShare> {
  return request<ResourceShare>(
    session,
    `/api/v1/shares/${encodeURIComponent(shareId)}`,
    {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(payload),
    },
    fetchImpl,
  );
}

async function request<T>(session: AuthSession, path: string, init: RequestInit, fetchImpl: FetchLike): Promise<T> {
  const response = await fetchImpl(getApiUrl(path), {
    ...init,
    headers: {
      authorization: `Bearer ${session.accessToken}`,
      ...init.headers,
    },
  });

  if (!response.ok) {
    throw await parseApiError(response, '协作请求失败。');
  }

  return (await response.json()) as T;
}

async function parseApiError(response: Response, fallbackMessage: string) {
  try {
    const payload = (await response.json()) as Partial<{ code: string; message: string }>;
    return new AuthApiError(payload.message ?? fallbackMessage, (payload.code as never) ?? 'network_error');
  } catch {
    return new AuthApiError(fallbackMessage, response.status === 401 ? 'session_expired' : 'network_error');
  }
}
