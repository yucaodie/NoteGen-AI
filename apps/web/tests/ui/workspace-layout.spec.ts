import { expect, test } from '@playwright/test';

test('core/main page loads without errors and core UI is visible', async ({ page }) => {
  await page.goto('/core/main', { waitUntil: 'domcontentloaded', timeout: 30000 });

  await page.waitForTimeout(3000);

  await expect(page.getByText('出错了')).toHaveCount(0);
  await expect(page.locator('body')).toBeVisible();
});

test('core/main page renders resizable layout panels', async ({ page }) => {
  await page.goto('/core/main', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForTimeout(5000);

  await expect(page.getByText('出错了')).toHaveCount(0);

  const handles = page.locator('[data-panel-group]');
  await expect(handles.first()).toBeVisible({ timeout: 10000 });
});

test('navigating back to core/main after home page works', async ({ page }) => {
  await page.goto('/', { waitUntil: 'domcontentloaded', timeout: 15000 });
  await page.waitForTimeout(2000);

  await page.goto('/core/main', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForTimeout(5000);

  await expect(page.getByText('出错了')).toHaveCount(0);
});
