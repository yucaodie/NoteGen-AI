import { expect, test } from '@playwright/test';

test('home page primary navigation paths are clickable', async ({ page }) => {
  await page.goto('/');

  await expect(page.getByRole('heading', { name: '把 NoteGen 的内容体验升级为云端知识产品' })).toBeVisible();

  await page.getByRole('link', { name: '进入工作区壳层' }).click();
  await expect(page).toHaveURL(/\/workspace$/);
  await expect(page.getByRole('heading', { name: '知识工作区骨架' })).toBeVisible();

  await page.goto('/');
  await page.getByRole('link', { name: '查看开放接口方向' }).click();
  await expect(page).toHaveURL(/\/developers$/);
  await expect(page.getByRole('heading', { name: '开放接口方向' })).toBeVisible();
});
