import { describe, expect, it, vi } from 'vitest';
import { getKnowledgeBaseTree, listSyncEvents, updateNote } from './content';

const session = {
  accessToken: 'access-token',
  refreshToken: 'refresh-token',
  expiresAt: '2026-07-06T16:00:00.000Z',
  user: {
    id: 'user-1',
    email: 'user@example.com',
  },
};

describe('content api client', () => {
  it('loads a knowledge base tree through authenticated api requests', async () => {
    const fetchMock = vi.fn(async () =>
      new Response(
        JSON.stringify({
          knowledgeBase: {
            id: 'kb-1',
            ownerUserId: 'user-1',
            name: 'My Knowledge Base',
            description: null,
          },
          folders: [],
          notes: [],
        }),
        { status: 200, headers: { 'content-type': 'application/json' } },
      ),
    );

    const tree = await getKnowledgeBaseTree(session, 'kb-1', fetchMock as typeof fetch);
    expect(tree.knowledgeBase.id).toBe('kb-1');
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('/api/v1/knowledge-bases/kb-1'),
      expect.objectContaining({
        headers: expect.objectContaining({ authorization: 'Bearer access-token' }),
      }),
    );
  });

  it('sends note updates to the content api', async () => {
    const fetchMock = vi.fn(async () =>
      new Response(
        JSON.stringify({
          id: 'note-1',
          ownerUserId: 'user-1',
          knowledgeBaseId: 'kb-1',
          folderId: null,
          title: 'Updated',
          markdownContent: '# Updated',
          contentHash: 'hash',
          version: 2,
        }),
        { status: 200, headers: { 'content-type': 'application/json' } },
      ),
    );

    const note = await updateNote(
      session,
      'note-1',
      { title: 'Updated', markdownContent: '# Updated' },
      fetchMock as typeof fetch,
    );

    expect(note.version).toBe(2);
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('/api/v1/notes/note-1'),
      expect.objectContaining({ method: 'PATCH' }),
    );
  });

  it('loads incremental sync events with an optional cursor', async () => {
    const fetchMock = vi.fn(async () =>
      new Response(
        JSON.stringify([
          {
            id: 'event-1',
            resourceId: 'note-1',
            resourceType: 'note',
            operation: 'upsert',
            localVersion: 2,
            cloudVersion: 2,
            status: 'synced',
            payload: { knowledgeBaseId: 'kb-1' },
            createdAt: '2026-07-07T16:45:00.000Z',
          },
        ]),
        { status: 200, headers: { 'content-type': 'application/json' } },
      ),
    );

    const events = await listSyncEvents(
      session,
      { since: '2026-07-07T16:40:00.000Z', limit: 5 },
      fetchMock as typeof fetch,
    );

    expect(events[0]?.resourceId).toBe('note-1');
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('/api/v1/sync-events?since=2026-07-07T16%3A40%3A00.000Z&limit=5'),
      expect.objectContaining({ method: 'GET' }),
    );
  });
});
