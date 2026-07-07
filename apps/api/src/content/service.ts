import { createHash } from 'node:crypto';
import type { Folder, KnowledgeBase, KnowledgeBaseTree, Note, SyncEventRecord } from '@supanotegen/shared';
import type { ApiEnv } from '../config/env';

type FetchLike = typeof fetch;

type SupabaseAuthUser = {
  id: string;
  email?: string | null;
};

type SupabaseServiceError = Error & {
  statusCode?: number;
  code?: string;
  cloudVersion?: number;
  cloudContentHash?: string;
};

type KnowledgeBaseRow = {
  id: string;
  owner_user_id: string;
  name: string;
  description: string | null;
};

type FolderRow = {
  id: string;
  owner_user_id: string;
  knowledge_base_id: string;
  parent_folder_id: string | null;
  title: string;
  sort_key: string;
};

type NoteRow = {
  id: string;
  owner_user_id: string;
  knowledge_base_id: string;
  folder_id: string | null;
  title: string;
  markdown_content: string;
  content_hash: string;
  version: number;
};

type SyncEventInput = {
  resourceType: 'knowledge_base' | 'folder' | 'note';
  resourceId: string;
  operation: 'upsert' | 'delete';
  localVersion: number;
  cloudVersion: number | null;
  status: 'synced' | 'pending' | 'conflict' | 'failed';
  payload: Record<string, unknown>;
};

type ListSyncEventsInput = {
  since?: string;
  limit?: number;
};

type SyncEventRow = {
  id: string;
  resource_type: 'knowledge_base' | 'folder' | 'note';
  resource_id: string;
  operation: 'upsert' | 'delete';
  local_version: number;
  cloud_version: number | null;
  status: 'synced' | 'pending' | 'conflict' | 'failed';
  payload: Record<string, unknown>;
  created_at: string;
};

type CreateKnowledgeBaseInput = {
  name: string;
  description?: string | null;
};

type UpdateKnowledgeBaseInput = {
  name?: string;
  description?: string | null;
};

type CreateFolderInput = {
  knowledgeBaseId: string;
  parentFolderId?: string | null;
  title: string;
  sortKey?: string;
};

type UpdateFolderInput = {
  parentFolderId?: string | null;
  title?: string;
  sortKey?: string;
};

type CreateNoteInput = {
  knowledgeBaseId: string;
  folderId?: string | null;
  title: string;
  markdownContent?: string;
};

type UpdateNoteInput = {
  folderId?: string | null;
  title?: string;
  markdownContent?: string;
  expectedVersion?: number;
  expectedContentHash?: string;
};

export type ContentService = {
  listKnowledgeBases: (accessToken: string) => Promise<KnowledgeBase[]>;
  createKnowledgeBase: (accessToken: string, input: CreateKnowledgeBaseInput) => Promise<KnowledgeBase>;
  getKnowledgeBaseTree: (accessToken: string, knowledgeBaseId: string) => Promise<KnowledgeBaseTree>;
  updateKnowledgeBase: (
    accessToken: string,
    knowledgeBaseId: string,
    input: UpdateKnowledgeBaseInput,
  ) => Promise<KnowledgeBase>;
  deleteKnowledgeBase: (accessToken: string, knowledgeBaseId: string) => Promise<void>;
  createFolder: (accessToken: string, input: CreateFolderInput) => Promise<Folder>;
  updateFolder: (accessToken: string, folderId: string, input: UpdateFolderInput) => Promise<Folder>;
  deleteFolder: (accessToken: string, folderId: string) => Promise<void>;
  listFolderNotes: (accessToken: string, folderId: string) => Promise<Note[]>;
  createNote: (accessToken: string, input: CreateNoteInput) => Promise<Note>;
  updateNote: (accessToken: string, noteId: string, input: UpdateNoteInput) => Promise<Note>;
  deleteNote: (accessToken: string, noteId: string) => Promise<void>;
  createSyncEvent: (accessToken: string, input: SyncEventInput) => Promise<void>;
  listSyncEvents: (accessToken: string, input: ListSyncEventsInput) => Promise<SyncEventRecord[]>;
};

export function createContentService(env: ApiEnv, fetchImpl: FetchLike = fetch): ContentService {
  const authBaseUrl = new URL('/auth/v1/', env.supabaseUrl).toString();
  const restBaseUrl = new URL('/rest/v1/', env.supabaseUrl).toString();

  async function listKnowledgeBases(accessToken: string): Promise<KnowledgeBase[]> {
    const user = await getUser(accessToken);
    const rows = await restRequest<KnowledgeBaseRow[]>(
      `knowledge_bases?owner_user_id=eq.${encodeURIComponent(user.id)}&deleted_at=is.null&select=id,owner_user_id,name,description&order=created_at.asc`,
      { method: 'GET' },
    );
    return rows.map(mapKnowledgeBase);
  }

  async function createKnowledgeBase(accessToken: string, input: CreateKnowledgeBaseInput): Promise<KnowledgeBase> {
    const user = await getUser(accessToken);
    const rows = await restRequest<KnowledgeBaseRow[]>('knowledge_bases?select=id,owner_user_id,name,description', {
      method: 'POST',
      headers: { Prefer: 'return=representation' },
      body: JSON.stringify([
        {
          owner_user_id: user.id,
          name: normalizeRequiredText(input.name, '知识库名称'),
          description: normalizeOptionalText(input.description),
        },
      ]),
    });

    return mapKnowledgeBase(rows[0]);
  }

  async function getKnowledgeBaseTree(accessToken: string, knowledgeBaseId: string): Promise<KnowledgeBaseTree> {
    const user = await getUser(accessToken);
    const knowledgeBase = await getOwnedKnowledgeBase(knowledgeBaseId, user.id);
    const [folders, notes] = await Promise.all([
      listFoldersByKnowledgeBase(knowledgeBaseId, user.id),
      listNotesByKnowledgeBase(knowledgeBaseId, user.id),
    ]);

    return {
      knowledgeBase,
      folders,
      notes,
    };
  }

  async function updateKnowledgeBase(
    accessToken: string,
    knowledgeBaseId: string,
    input: UpdateKnowledgeBaseInput,
  ): Promise<KnowledgeBase> {
    const user = await getUser(accessToken);
    await assertKnowledgeBaseOwner(knowledgeBaseId, user.id);

    const patch: Record<string, unknown> = {};
    if (input.name !== undefined) {
      patch.name = normalizeRequiredText(input.name, '知识库名称');
    }
    if (input.description !== undefined) {
      patch.description = normalizeOptionalText(input.description);
    }

    ensurePatchHasFields(patch);

    const rows = await restRequest<KnowledgeBaseRow[]>(
      `knowledge_bases?id=eq.${encodeURIComponent(knowledgeBaseId)}&select=id,owner_user_id,name,description`,
      {
        method: 'PATCH',
        headers: { Prefer: 'return=representation' },
        body: JSON.stringify(patch),
      },
    );

    return mapKnowledgeBase(rows[0]);
  }

  async function deleteKnowledgeBase(accessToken: string, knowledgeBaseId: string): Promise<void> {
    const user = await getUser(accessToken);
    await assertKnowledgeBaseOwner(knowledgeBaseId, user.id);
    await softDelete('knowledge_bases', knowledgeBaseId);
  }

  async function createFolder(accessToken: string, input: CreateFolderInput): Promise<Folder> {
    const user = await getUser(accessToken);
    await assertKnowledgeBaseOwner(input.knowledgeBaseId, user.id);

    if (input.parentFolderId) {
      await assertFolderOwner(input.parentFolderId, user.id, input.knowledgeBaseId);
    }

    const rows = await restRequest<FolderRow[]>('folders?select=id,owner_user_id,knowledge_base_id,parent_folder_id,title,sort_key', {
      method: 'POST',
      headers: { Prefer: 'return=representation' },
      body: JSON.stringify([
        {
          owner_user_id: user.id,
          knowledge_base_id: input.knowledgeBaseId,
          parent_folder_id: input.parentFolderId ?? null,
          title: normalizeRequiredText(input.title, '文件夹标题'),
          sort_key: normalizeSortKey(input.sortKey),
        },
      ]),
    });

    return mapFolder(rows[0]);
  }

  async function updateFolder(accessToken: string, folderId: string, input: UpdateFolderInput): Promise<Folder> {
    const user = await getUser(accessToken);
    const existing = await getOwnedFolder(folderId, user.id);

    if (input.parentFolderId) {
      await assertFolderOwner(input.parentFolderId, user.id, existing.knowledgeBaseId);
    }

    const patch: Record<string, unknown> = {};
    if (input.parentFolderId !== undefined) {
      patch.parent_folder_id = input.parentFolderId;
    }
    if (input.title !== undefined) {
      patch.title = normalizeRequiredText(input.title, '文件夹标题');
    }
    if (input.sortKey !== undefined) {
      patch.sort_key = normalizeSortKey(input.sortKey);
    }

    ensurePatchHasFields(patch);

    const rows = await restRequest<FolderRow[]>(
      `folders?id=eq.${encodeURIComponent(folderId)}&select=id,owner_user_id,knowledge_base_id,parent_folder_id,title,sort_key`,
      {
        method: 'PATCH',
        headers: { Prefer: 'return=representation' },
        body: JSON.stringify(patch),
      },
    );

    return mapFolder(rows[0]);
  }

  async function deleteFolder(accessToken: string, folderId: string): Promise<void> {
    const user = await getUser(accessToken);
    await assertFolderOwner(folderId, user.id);
    await softDelete('folders', folderId);
  }

  async function listFolderNotes(accessToken: string, folderId: string): Promise<Note[]> {
    const user = await getUser(accessToken);
    await assertFolderOwner(folderId, user.id);
    const rows = await restRequest<NoteRow[]>(
      `notes?folder_id=eq.${encodeURIComponent(folderId)}&deleted_at=is.null&select=id,owner_user_id,knowledge_base_id,folder_id,title,markdown_content,content_hash,version&order=updated_at.desc`,
      { method: 'GET' },
    );
    return rows.map(mapNote);
  }

  async function createNote(accessToken: string, input: CreateNoteInput): Promise<Note> {
    const user = await getUser(accessToken);
    await assertKnowledgeBaseOwner(input.knowledgeBaseId, user.id);

    if (input.folderId) {
      await assertFolderOwner(input.folderId, user.id, input.knowledgeBaseId);
    }

    const markdownContent = input.markdownContent ?? '';
    const rows = await restRequest<NoteRow[]>('notes?select=id,owner_user_id,knowledge_base_id,folder_id,title,markdown_content,content_hash,version', {
      method: 'POST',
      headers: { Prefer: 'return=representation' },
      body: JSON.stringify([
        {
          owner_user_id: user.id,
          knowledge_base_id: input.knowledgeBaseId,
          folder_id: input.folderId ?? null,
          title: normalizeRequiredText(input.title, '笔记标题'),
          markdown_content: markdownContent,
          content_hash: hashContent(markdownContent),
          version: 1,
        },
      ]),
    });

    return mapNote(rows[0]);
  }

  async function updateNote(accessToken: string, noteId: string, input: UpdateNoteInput): Promise<Note> {
    const user = await getUser(accessToken);
    const existing = await getOwnedNote(noteId, user.id);

    if (
      input.expectedVersion !== undefined &&
      input.expectedContentHash !== undefined &&
      (input.expectedVersion !== existing.version || input.expectedContentHash !== existing.contentHash)
    ) {
      const error = createServiceError(409, 'conflict', '笔记已在其他端发生更新，请先同步最新内容。');
      error.cloudVersion = existing.version;
      error.cloudContentHash = existing.contentHash;
      throw error;
    }

    if (input.folderId) {
      await assertFolderOwner(input.folderId, user.id, existing.knowledgeBaseId);
    }

    const nextMarkdownContent = input.markdownContent ?? existing.markdownContent;
    const patch: Record<string, unknown> = {
      version: existing.version + 1,
      content_hash: hashContent(nextMarkdownContent),
    };

    if (input.folderId !== undefined) {
      patch.folder_id = input.folderId;
    }
    if (input.title !== undefined) {
      patch.title = normalizeRequiredText(input.title, '笔记标题');
    }
    if (input.markdownContent !== undefined) {
      patch.markdown_content = input.markdownContent;
    }

    const rows = await restRequest<NoteRow[]>(
      `notes?id=eq.${encodeURIComponent(noteId)}&select=id,owner_user_id,knowledge_base_id,folder_id,title,markdown_content,content_hash,version`,
      {
        method: 'PATCH',
        headers: { Prefer: 'return=representation' },
        body: JSON.stringify(patch),
      },
    );

    return mapNote(rows[0]);
  }

  async function deleteNote(accessToken: string, noteId: string): Promise<void> {
    const user = await getUser(accessToken);
    await assertNoteOwner(noteId, user.id);
    await softDelete('notes', noteId);
  }

  async function createSyncEvent(accessToken: string, input: SyncEventInput): Promise<void> {
    const user = await getUser(accessToken);

    await restRequest('sync_events', {
      method: 'POST',
      headers: { Prefer: 'return=minimal' },
      body: JSON.stringify([
        {
          owner_user_id: user.id,
          resource_type: input.resourceType,
          resource_id: input.resourceId,
          operation: input.operation,
          local_version: input.localVersion,
          cloud_version: input.cloudVersion,
          status: input.status,
          payload: input.payload,
        },
      ]),
    });
  }

  async function listSyncEvents(accessToken: string, input: ListSyncEventsInput): Promise<SyncEventRecord[]> {
    const user = await getUser(accessToken);
    const limit = Math.min(Math.max(input.limit ?? 20, 1), 100);
    const filters = [
      `owner_user_id=eq.${encodeURIComponent(user.id)}`,
      'select=id,resource_type,resource_id,operation,local_version,cloud_version,status,payload,created_at',
      'order=created_at.desc',
      `limit=${limit}`,
    ];

    if (input.since) {
      filters.unshift(`created_at=gt.${encodeURIComponent(input.since)}`);
    }

    const rows = await restRequest<SyncEventRow[]>(`sync_events?${filters.join('&')}`, { method: 'GET' });
    return rows.map(mapSyncEventRecord);
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

  async function getOwnedKnowledgeBase(knowledgeBaseId: string, userId: string): Promise<KnowledgeBase> {
    const rows = await restRequest<KnowledgeBaseRow[]>(
      `knowledge_bases?id=eq.${encodeURIComponent(knowledgeBaseId)}&deleted_at=is.null&select=id,owner_user_id,name,description`,
      { method: 'GET' },
    );
    return mapKnowledgeBase(assertOwnership(rows, 'knowledge_bases', knowledgeBaseId, userId, (row) => row.owner_user_id));
  }

  async function getOwnedFolder(folderId: string, userId: string): Promise<Folder> {
    const rows = await restRequest<FolderRow[]>(
      `folders?id=eq.${encodeURIComponent(folderId)}&deleted_at=is.null&select=id,owner_user_id,knowledge_base_id,parent_folder_id,title,sort_key`,
      { method: 'GET' },
    );
    return mapFolder(assertOwnership(rows, 'folders', folderId, userId, (row) => row.owner_user_id));
  }

  async function getOwnedNote(noteId: string, userId: string): Promise<Note> {
    const rows = await restRequest<NoteRow[]>(
      `notes?id=eq.${encodeURIComponent(noteId)}&deleted_at=is.null&select=id,owner_user_id,knowledge_base_id,folder_id,title,markdown_content,content_hash,version`,
      { method: 'GET' },
    );
    return mapNote(assertOwnership(rows, 'notes', noteId, userId, (row) => row.owner_user_id));
  }

  async function assertKnowledgeBaseOwner(knowledgeBaseId: string, userId: string) {
    await getOwnedKnowledgeBase(knowledgeBaseId, userId);
  }

  async function assertFolderOwner(folderId: string, userId: string, knowledgeBaseId?: string) {
    const folder = await getOwnedFolder(folderId, userId);
    if (knowledgeBaseId && folder.knowledgeBaseId !== knowledgeBaseId) {
      throw createServiceError(409, 'conflict', '文件夹不属于目标知识库。');
    }
  }

  async function assertNoteOwner(noteId: string, userId: string) {
    await getOwnedNote(noteId, userId);
  }

  async function listFoldersByKnowledgeBase(knowledgeBaseId: string, userId: string): Promise<Folder[]> {
    const rows = await restRequest<FolderRow[]>(
      `folders?knowledge_base_id=eq.${encodeURIComponent(knowledgeBaseId)}&owner_user_id=eq.${encodeURIComponent(userId)}&deleted_at=is.null&select=id,owner_user_id,knowledge_base_id,parent_folder_id,title,sort_key&order=sort_key.asc`,
      { method: 'GET' },
    );
    return rows.map(mapFolder);
  }

  async function listNotesByKnowledgeBase(knowledgeBaseId: string, userId: string): Promise<Note[]> {
    const rows = await restRequest<NoteRow[]>(
      `notes?knowledge_base_id=eq.${encodeURIComponent(knowledgeBaseId)}&owner_user_id=eq.${encodeURIComponent(userId)}&deleted_at=is.null&select=id,owner_user_id,knowledge_base_id,folder_id,title,markdown_content,content_hash,version&order=updated_at.desc`,
      { method: 'GET' },
    );
    return rows.map(mapNote);
  }

  async function softDelete(resource: 'knowledge_bases' | 'folders' | 'notes', resourceId: string) {
    await restRequest(
      `${resource}?id=eq.${encodeURIComponent(resourceId)}`,
      {
        method: 'PATCH',
        headers: { Prefer: 'return=minimal' },
        body: JSON.stringify({ deleted_at: new Date().toISOString() }),
      },
    );
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
      throw await createSupabaseError(response, 'Supabase data request failed');
    }

    if (response.status === 204) {
      return [] as T;
    }

    return (await response.json()) as T;
  }

  return {
    listKnowledgeBases,
    createKnowledgeBase,
    getKnowledgeBaseTree,
    updateKnowledgeBase,
    deleteKnowledgeBase,
    createFolder,
    updateFolder,
    deleteFolder,
    listFolderNotes,
    createNote,
    updateNote,
    deleteNote,
    createSyncEvent,
    listSyncEvents,
  };
}

function mapKnowledgeBase(row: KnowledgeBaseRow): KnowledgeBase {
  return {
    id: row.id,
    ownerUserId: row.owner_user_id,
    name: row.name,
    description: row.description,
  };
}

function mapFolder(row: FolderRow): Folder {
  return {
    id: row.id,
    ownerUserId: row.owner_user_id,
    knowledgeBaseId: row.knowledge_base_id,
    parentFolderId: row.parent_folder_id,
    title: row.title,
    sortKey: row.sort_key,
  };
}

function mapNote(row: NoteRow): Note {
  return {
    id: row.id,
    ownerUserId: row.owner_user_id,
    knowledgeBaseId: row.knowledge_base_id,
    folderId: row.folder_id,
    title: row.title,
    markdownContent: row.markdown_content,
    contentHash: row.content_hash,
    version: row.version,
  };
}

function mapSyncEventRecord(row: SyncEventRow): SyncEventRecord {
  return {
    id: row.id,
    resourceId: row.resource_id,
    resourceType: row.resource_type,
    operation: row.operation,
    localVersion: row.local_version,
    cloudVersion: row.cloud_version,
    status: row.status,
    payload: row.payload,
    createdAt: row.created_at,
  };
}

function normalizeRequiredText(value: string, fieldName: string): string {
  const normalized = value.trim();
  if (!normalized) {
    throw createServiceError(400, 'invalid_request', `${fieldName}不能为空。`);
  }
  return normalized;
}

function normalizeOptionalText(value?: string | null): string | null {
  if (value === undefined || value === null) {
    return null;
  }
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
}

function normalizeSortKey(value?: string): string {
  const normalized = value?.trim();
  return normalized && normalized.length > 0 ? normalized : `sort-${Date.now()}`;
}

function hashContent(content: string): string {
  return createHash('sha256').update(content).digest('hex');
}

function ensurePatchHasFields(patch: Record<string, unknown>) {
  if (Object.keys(patch).length === 0) {
    throw createServiceError(400, 'invalid_request', '至少需要提供一个可更新字段。');
  }
}

function assertOwnership<T extends { id: string }>(
  rows: T[],
  resourceName: string,
  resourceId: string,
  userId: string,
  getOwnerId: (row: T) => string,
): T {
  const row = rows[0];
  if (!row) {
    throw createServiceError(404, 'not_found', `${resourceName} ${resourceId} 不存在。`);
  }
  if (getOwnerId(row) !== userId) {
    throw createServiceError(403, 'forbidden', '当前用户无权访问该资源。');
  }
  return row;
}

function createServiceError(statusCode: number, code: string, message: string): SupabaseServiceError {
  const error = new Error(message) as SupabaseServiceError;
  error.statusCode = statusCode;
  error.code = code;
  return error;
}

async function createSupabaseError(response: Response, fallbackMessage: string): Promise<SupabaseServiceError> {
  let message = fallbackMessage;
  let code = response.status === 401 ? 'auth_failed' : 'network_error';

  try {
    const payload = (await response.json()) as { message?: string; msg?: string; code?: string };
    message = payload.message ?? payload.msg ?? message;
    code = payload.code ?? code;
  } catch {
    // Ignore malformed payloads and keep the fallback message.
  }

  const error = new Error(message) as SupabaseServiceError;
  error.statusCode = response.status;
  error.code = code;
  return error;
}
