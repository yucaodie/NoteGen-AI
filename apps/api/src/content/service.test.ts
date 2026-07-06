import { describe, expect, it, vi } from 'vitest';
import { createContentService } from './service';

const env = {
  port: 4000,
  host: '127.0.0.1',
  supabaseUrl: 'https://example.supabase.co',
  supabaseAnonKey: 'anon-key',
  supabaseServiceRoleKey: 'service-role-key',
};

describe('createContentService', () => {
  it('returns knowledge base tree with folders and notes', async () => {
    const fetchMock = vi.fn(async (input: URL | RequestInfo) => {
      const url = input.toString();

      if (url.endsWith('/auth/v1/user')) {
        return jsonResponse({ id: 'user-1', email: 'user@example.com' });
      }

      if (url.includes('/rest/v1/knowledge_bases?id=eq.kb-1')) {
        return jsonResponse([
          { id: 'kb-1', owner_user_id: 'user-1', name: 'My Knowledge Base', description: null },
        ]);
      }

      if (url.includes('/rest/v1/folders?knowledge_base_id=eq.kb-1')) {
        return jsonResponse([
          {
            id: 'folder-1',
            owner_user_id: 'user-1',
            knowledge_base_id: 'kb-1',
            parent_folder_id: null,
            title: 'Inbox',
            sort_key: '0001',
          },
        ]);
      }

      if (url.includes('/rest/v1/notes?knowledge_base_id=eq.kb-1')) {
        return jsonResponse([
          {
            id: 'note-1',
            owner_user_id: 'user-1',
            knowledge_base_id: 'kb-1',
            folder_id: 'folder-1',
            title: 'Quick Note',
            markdown_content: '# Hello',
            content_hash: 'hash',
            version: 1,
          },
        ]);
      }

      throw new Error(`Unexpected request: ${url}`);
    });

    const service = createContentService(env, fetchMock as typeof fetch);
    const result = await service.getKnowledgeBaseTree('access-token', 'kb-1');

    expect(result.knowledgeBase.id).toBe('kb-1');
    expect(result.folders).toHaveLength(1);
    expect(result.notes[0]?.folderId).toBe('folder-1');
  });

  it('increments note version and content hash when updating a note', async () => {
    const fetchMock = vi.fn(async (input: URL | RequestInfo, init?: RequestInit) => {
      const url = input.toString();

      if (url.endsWith('/auth/v1/user')) {
        return jsonResponse({ id: 'user-1', email: 'user@example.com' });
      }

      if (url.includes('/rest/v1/notes?id=eq.note-1') && init?.method === 'GET') {
        return jsonResponse([
          {
            id: 'note-1',
            owner_user_id: 'user-1',
            knowledge_base_id: 'kb-1',
            folder_id: 'folder-1',
            title: 'Quick Note',
            markdown_content: '# Hello',
            content_hash: 'old-hash',
            version: 1,
          },
        ]);
      }

      if (url.includes('/rest/v1/notes?id=eq.note-1') && init?.method === 'PATCH') {
        const body = JSON.parse(String(init.body)) as Record<string, unknown>;
        expect(body.version).toBe(2);
        expect(body.content_hash).toBeTypeOf('string');
        expect(body.markdown_content).toBe('# Updated');

        return jsonResponse([
          {
            id: 'note-1',
            owner_user_id: 'user-1',
            knowledge_base_id: 'kb-1',
            folder_id: 'folder-1',
            title: 'Updated Note',
            markdown_content: '# Updated',
            content_hash: body.content_hash,
            version: 2,
          },
        ]);
      }

      throw new Error(`Unexpected request: ${url}`);
    });

    const service = createContentService(env, fetchMock as typeof fetch);
    const result = await service.updateNote('access-token', 'note-1', {
      title: 'Updated Note',
      markdownContent: '# Updated',
      expectedVersion: 1,
      expectedContentHash: 'old-hash',
    });

    expect(result.version).toBe(2);
    expect(result.title).toBe('Updated Note');
  });

  it('rejects access to resources owned by another user', async () => {
    const fetchMock = vi.fn(async (input: URL | RequestInfo, init?: RequestInit) => {
      const url = input.toString();

      if (url.endsWith('/auth/v1/user')) {
        return jsonResponse({ id: 'user-1', email: 'user@example.com' });
      }

      if (url.includes('/rest/v1/knowledge_bases?id=eq.kb-2') && init?.method === 'GET') {
        return jsonResponse([
          { id: 'kb-2', owner_user_id: 'user-2', name: 'Other Knowledge Base', description: null },
        ]);
      }

      throw new Error(`Unexpected request: ${url}`);
    });

    const service = createContentService(env, fetchMock as typeof fetch);

    await expect(service.getKnowledgeBaseTree('access-token', 'kb-2')).rejects.toMatchObject({
      statusCode: 403,
      code: 'forbidden',
    });
  });

  it('creates conflict when the cloud version moved ahead', async () => {
    const fetchMock = vi.fn(async (input: URL | RequestInfo, init?: RequestInit) => {
      const url = input.toString();

      if (url.endsWith('/auth/v1/user')) {
        return jsonResponse({ id: 'user-1', email: 'user@example.com' });
      }

      if (url.includes('/rest/v1/notes?id=eq.note-1') && init?.method === 'GET') {
        return jsonResponse([
          {
            id: 'note-1',
            owner_user_id: 'user-1',
            knowledge_base_id: 'kb-1',
            folder_id: 'folder-1',
            title: 'Cloud Note',
            markdown_content: '# Cloud',
            content_hash: 'cloud-hash',
            version: 3,
          },
        ]);
      }

      throw new Error(`Unexpected request: ${url}`);
    });

    const service = createContentService(env, fetchMock as typeof fetch);

    await expect(
      service.updateNote('access-token', 'note-1', {
        title: 'Updated Note',
        markdownContent: '# Updated',
        expectedVersion: 2,
        expectedContentHash: 'local-hash',
      }),
    ).rejects.toMatchObject({ statusCode: 409, code: 'conflict' });
  });

  it('writes sync events with the current user owner id', async () => {
    const fetchMock = vi.fn(async (input: URL | RequestInfo, init?: RequestInit) => {
      const url = input.toString();

      if (url.endsWith('/auth/v1/user')) {
        return jsonResponse({ id: 'user-1', email: 'user@example.com' });
      }

      if (url.endsWith('/rest/v1/sync_events') && init?.method === 'POST') {
        const body = JSON.parse(String(init.body)) as Array<Record<string, unknown>>;
        expect(body[0]?.owner_user_id).toBe('user-1');
        expect(body[0]?.status).toBe('pending');
        return new Response(null, { status: 204 });
      }

      throw new Error(`Unexpected request: ${url}`);
    });

    const service = createContentService(env, fetchMock as typeof fetch);
    await service.createSyncEvent('access-token', {
      resourceType: 'note',
      resourceId: 'note-1',
      operation: 'upsert',
      localVersion: 2,
      cloudVersion: null,
      status: 'pending',
      payload: { title: 'Pending Note' },
    });
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
