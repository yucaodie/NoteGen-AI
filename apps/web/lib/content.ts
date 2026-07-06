import type { Folder, KnowledgeBase, KnowledgeBaseTree, Note } from '@supanotegen/shared';
import type { AuthSession } from '@supanotegen/shared';
import { AuthApiError } from './auth';
import { getApiUrl } from './api';

type FetchLike = typeof fetch;

export async function listKnowledgeBases(session: AuthSession, fetchImpl: FetchLike = fetch): Promise<KnowledgeBase[]> {
  return request<KnowledgeBase[]>(session, '/api/v1/knowledge-bases', { method: 'GET' }, fetchImpl);
}

export async function getKnowledgeBaseTree(
  session: AuthSession,
  knowledgeBaseId: string,
  fetchImpl: FetchLike = fetch,
): Promise<KnowledgeBaseTree> {
  return request<KnowledgeBaseTree>(
    session,
    `/api/v1/knowledge-bases/${encodeURIComponent(knowledgeBaseId)}`,
    { method: 'GET' },
    fetchImpl,
  );
}

export async function createKnowledgeBase(
  session: AuthSession,
  payload: { name: string; description?: string | null },
  fetchImpl: FetchLike = fetch,
): Promise<KnowledgeBase> {
  return request<KnowledgeBase>(
    session,
    '/api/v1/knowledge-bases',
    {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(payload),
    },
    fetchImpl,
  );
}

export async function createFolder(
  session: AuthSession,
  payload: { knowledgeBaseId: string; parentFolderId?: string | null; title: string; sortKey?: string },
  fetchImpl: FetchLike = fetch,
): Promise<Folder> {
  return request<Folder>(
    session,
    '/api/v1/folders',
    {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(payload),
    },
    fetchImpl,
  );
}

export async function createNote(
  session: AuthSession,
  payload: { knowledgeBaseId: string; folderId?: string | null; title: string; markdownContent?: string },
  fetchImpl: FetchLike = fetch,
): Promise<Note> {
  return request<Note>(
    session,
    '/api/v1/notes',
    {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(payload),
    },
    fetchImpl,
  );
}

export async function updateNote(
  session: AuthSession,
  noteId: string,
  payload: {
    title?: string;
    folderId?: string | null;
    markdownContent?: string;
    expectedVersion?: number;
    expectedContentHash?: string;
  },
  fetchImpl: FetchLike = fetch,
): Promise<Note> {
  return request<Note>(
    session,
    `/api/v1/notes/${encodeURIComponent(noteId)}`,
    {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(payload),
    },
    fetchImpl,
  );
}

export async function createSyncEvent(
  session: AuthSession,
  payload: {
    resourceType: 'knowledge_base' | 'folder' | 'note';
    resourceId: string;
    operation: 'upsert' | 'delete';
    localVersion: number;
    cloudVersion: number | null;
    status: 'synced' | 'pending' | 'conflict' | 'failed';
    payload: Record<string, unknown>;
  },
  fetchImpl: FetchLike = fetch,
): Promise<void> {
  await request<void>(
    session,
    '/api/v1/sync-events',
    {
      method: 'POST',
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
    throw await parseApiError(response, '工作区内容请求失败。');
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}

async function parseApiError(response: Response, fallbackMessage: string) {
  try {
    const payload = (await response.json()) as Partial<{
      code: string;
      message: string;
      cloudVersion: number;
      cloudContentHash: string;
    }>;
    const error = new AuthApiError(payload.message ?? fallbackMessage, (payload.code as never) ?? 'network_error') as AuthApiError & {
      cloudVersion?: number;
      cloudContentHash?: string;
    };
    error.cloudVersion = payload.cloudVersion;
    error.cloudContentHash = payload.cloudContentHash;
    return error;
  } catch {
    return new AuthApiError(fallbackMessage, response.status === 401 ? 'session_expired' : 'network_error');
  }
}
