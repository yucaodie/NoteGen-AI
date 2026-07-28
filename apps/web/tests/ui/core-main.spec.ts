import { expect, test } from '@playwright/test';

test('core/main page renders without error boundary', async ({ page }) => {
  const res = await page.goto('/core/main', { waitUntil: 'domcontentloaded', timeout: 15000 });
  expect(res?.status()).not.toBe(500);

  await page.waitForTimeout(3000);

  // The "出错了" text signals the error boundary was triggered
  await expect(page.getByText('出错了')).toHaveCount(0);
});

