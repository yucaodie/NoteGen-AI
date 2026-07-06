import { describe, expect, it, vi } from 'vitest';
import { getKnowledgeBaseTree, updateNote } from './content';

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
});
