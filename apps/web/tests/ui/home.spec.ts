import { expect, test } from '@playwright/test';

test('home page primary navigation paths are clickable', async ({ page }) => {
  await page.goto('/');

  await expect(page.getByRole('heading', { name: '把 NoteGen 的内容体验升级为云端知识产品' })).toBeVisible();

  await Promise.all([
    page.waitForURL(/\/workspace$/),
    page.getByRole('link', { name: '进入工作区' }).click(),
  ]);
  await expect(page.getByRole('heading', { name: '云端知识工作区' })).toBeVisible();

  await page.goto('/');
  await Promise.all([
    page.waitForURL(/\/developers$/),
    page.getByRole('link', { name: '查看开放接口方向' }).click(),
  ]);
  await expect(page.getByRole('heading', { name: '开放接口方向' })).toBeVisible();
});

test('workspace exposes Chinese creation actions and module switching', async ({ page }) => {
  const session = {
    accessToken: 'ui-test-access-token',
    refreshToken: 'ui-test-refresh-token',
    expiresAt: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
    user: { id: 'user-1', email: 'tester@example.com' },
  };
  const knowledgeBase = {
    id: 'kb-1',
    ownerUserId: 'user-1',
    name: '测试知识库',
    description: '用于 UI 测试',
  };
  const bootstrap = {
    session,
    workspace: {
      profile: { userId: 'user-1', displayName: '测试用户', defaultWorkspaceId: 'kb-1' },
      knowledgeBases: [knowledgeBase],
      memberships: [],
      accessContext: { userId: 'user-1', groupIds: [], knowledgeBaseIds: ['kb-1'] },
      mode: 'online',
    },
  };
  const notes = [
    {
      id: 'note-1',
      ownerUserId: 'user-1',
      knowledgeBaseId: 'kb-1',
      folderId: null,
      title: '欢迎笔记',
      markdownContent: '# 欢迎\n',
      contentHash: 'hash-note-1',
      version: 1,
    },
  ];

  await page.addInitScript((storedSession) => {
    window.localStorage.setItem('supanotegen.auth.session', JSON.stringify(storedSession));
  }, session);

  await page.route('**/auth/session', async (route) => {
    await route.fulfill({ json: bootstrap });
  });
  await page.route('**/auth/sign-out', async (route) => {
    await route.fulfill({ status: 204 });
  });
  await page.route('**/api/v1/knowledge-bases', async (route) => {
    if (route.request().method() === 'GET') {
      await route.fulfill({ json: [knowledgeBase] });
      return;
    }

    await route.fulfill({ json: { ...knowledgeBase, id: 'kb-created', name: '知识库 2' } });
  });
  await page.route('**/api/v1/knowledge-bases/kb-1', async (route) => {
    await route.fulfill({ json: { knowledgeBase, folders: [], notes } });
  });
  await page.route('**/api/v1/notes', async (route) => {
    const payload = (await route.request().postDataJSON()) as { title: string; markdownContent?: string; folderId?: string | null };
    const note = {
      id: `note-${notes.length + 1}`,
      ownerUserId: 'user-1',
      knowledgeBaseId: 'kb-1',
      folderId: payload.folderId ?? null,
      title: payload.title,
      markdownContent: payload.markdownContent ?? '',
      contentHash: `hash-note-${notes.length + 1}`,
      version: 1,
    };
    notes.push(note);
    await route.fulfill({ json: note });
  });
  await page.route('**/api/v1/notes/**', async (route) => {
    const noteId = route.request().url().split('/').pop() ?? '';
    const payload = (await route.request().postDataJSON()) as { title?: string; markdownContent?: string; folderId?: string | null };
    const existing = notes.find((note) => note.id === noteId) ?? notes[0];
    const saved = {
      ...existing,
      folderId: payload.folderId ?? existing.folderId,
      title: payload.title ?? existing.title,
      markdownContent: payload.markdownContent ?? existing.markdownContent,
      contentHash: `hash-${noteId}-saved`,
      version: existing.version + 1,
    };
    const index = notes.findIndex((note) => note.id === noteId);
    if (index >= 0) {
      notes[index] = saved;
    }
    await route.fulfill({ json: saved });
  });
  await page.route('**/api/v1/sync-events*', async (route) => {
    if (route.request().method() === 'GET') {
      await route.fulfill({ json: [] });
      return;
    }

    await route.fulfill({ status: 204 });
  });
  await page.route('**/api/v1/folders', async (route) => {
    await route.fulfill({
      json: {
        id: 'folder-1',
        ownerUserId: 'user-1',
        knowledgeBaseId: 'kb-1',
        parentFolderId: null,
        title: '目录 1',
        sortKey: '0001',
      },
    });
  });
  await page.route('**/api/v1/groups*', async (route) => {
    await route.fulfill({ json: [] });
  });
  await page.route('**/api/v1/groups/**', async (route) => {
    await route.fulfill({ json: [] });
  });
  await page.route('**/api/v1/shares*', async (route) => {
    await route.fulfill({ json: [] });
  });

  await page.goto('/workspace');

  await expect(page.getByRole('button', { name: '新建笔记' })).toBeVisible();
  await expect(page.getByRole('button', { name: '新建记录' })).toBeVisible();
  await expect(page.getByRole('button', { name: '刷新同步' })).toBeVisible();

  await page.getByRole('button', { name: '新建笔记' }).click();
  await expect(page.getByLabel('笔记标题')).toHaveValue('未命名笔记 2');

  await page.getByRole('button', { name: '新建记录' }).click();
  await expect(page.getByLabel('笔记标题')).toHaveValue(/记录/);
  await expect(page.getByRole('button', { name: '快速记录' })).toHaveAttribute('aria-pressed', 'true');
  await page.getByLabel('Markdown 内容').fill('> 记录 UI 保存路径\n\n保存测试');
  await page.getByRole('button', { name: '保存' }).click();
  await expect(page.locator('header').getByText('笔记已同步到云端。')).toBeVisible();

  await page.getByRole('button', { name: '群组共享' }).click();
  await expect(page.getByRole('button', { name: '群组共享' })).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByText('群组管理')).toBeVisible();

  await page.getByRole('button', { name: 'API Key 与 RAG 接口' }).click();
  await expect(page.getByText('开放接口')).toBeVisible();

  await page.getByRole('button', { name: '退出' }).click();
  await expect(page.getByRole('heading', { name: '云端知识工作区' })).toBeVisible();
  await expect(page.getByText('你已退出登录。')).toBeVisible();
});
