import { expect, test } from '@playwright/test';

test('home page redirects to core/main immediately', async ({ page }) => {
  const res = await page.goto('/');
  expect(res?.url()).toContain('/core/main');
  await page.waitForTimeout(5000);
  await expect(page.getByText('出错了')).toHaveCount(0);
});

test('workspace page loads without error boundary', async ({ page }) => {
  await page.goto('/workspace', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForTimeout(5000);

  await expect(page.getByText('出错了')).toHaveCount(0);
});
