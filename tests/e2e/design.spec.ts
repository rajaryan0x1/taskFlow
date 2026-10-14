import { expect, test } from '@playwright/test';

test('responsive workspace, personal tasks, and redesigned screens', async ({ page }, testInfo) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto('/register');
  await page.screenshot({ animations: "disabled", path: testInfo.outputPath('register-desktop.png'), fullPage: true });
  await page.getByLabel('First Name').fill('Alex');
  await page.getByLabel('Last Name').fill('Morgan');
  await page.getByLabel('Username').fill('design_reviewer');
  await page.getByLabel('Email', { exact: true }).fill('design@example.com');
  await page.getByLabel('Password', { exact: true }).fill('correct-horse-battery');
  await page.getByRole('button', { name: 'Create account', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'My Projects' })).toBeVisible();
  await page.screenshot({ animations: "disabled", path: testInfo.outputPath('empty-dashboard.png'), fullPage: true });
  const headers = { Origin: 'http://127.0.0.1:5178', 'X-TaskFlow-Client': 'web' };
  const me = await (await page.request.get('http://127.0.0.1:5100/api/v1/auth/me')).json();
  let projectId = '';
  for (const [name, description] of [
    ['Website redesign', 'A fresh digital experience, from first impression to final interaction.'],
    ['Product launch', 'The people, plans, and details behind our next big release.'],
    ['Customer experience', 'Small improvements that make every customer interaction better.'],
  ]) {
    const response = await page.request.post('http://127.0.0.1:5100/api/v1/projects', { headers, data: { name, description } });
    expect(response.status()).toBe(201);
    const project = (await response.json()).data;
    if (!projectId) projectId = project._id;
  }
  for (const [title, status, priority, dueDate] of [
    ['Explore the new visual direction', 'done', 'high', '2026-10-01'],
    ['Design the homepage experience', 'in_progress', 'high', '2026-10-12'],
    ['Build the component library', 'in_progress', 'medium', '2026-10-15'],
    ['Review mobile navigation', 'todo', 'medium', '2026-10-18'],
    ['Write the onboarding copy', 'todo', 'low', '2026-10-20'],
    ['Document the design decisions', 'done', 'low', '2026-10-08'],
  ]) {
    const response = await page.request.post(`http://127.0.0.1:5100/api/v1/projects/${projectId}/tasks`, { headers, data: { title, description: 'Keep the experience clear, consistent, and easy to use across every screen.', status, priority, dueDate, assignee: me.user.id } });
    expect(response.status()).toBe(201);
  }
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Website redesign', exact: true })).toBeVisible();
  await expect(page.getByText('Design the homepage experience', { exact: true })).toBeVisible();
  await page.screenshot({ animations: "disabled", path: testInfo.outputPath('dashboard-desktop.png'), fullPage: true });
  await page.getByRole('heading', { name: 'Website redesign', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Open task: Design the homepage experience' })).toBeVisible();
  await page.screenshot({ animations: "disabled", path: testInfo.outputPath('board-desktop.png'), fullPage: true });
  await page.getByRole('button', { name: 'New task', exact: true }).click();
  await expect(page.getByRole('dialog', { name: 'Create task' })).toBeVisible();
  await page.screenshot({ animations: 'disabled', path: testInfo.outputPath('create-task-desktop.png'), fullPage: true });
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: 'Open task: Design the homepage experience' }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.screenshot({ animations: "disabled", path: testInfo.outputPath('task-details.png'), fullPage: true });
  await page.keyboard.press('Escape');
  for (const tab of ['analytics', 'members', 'settings']) {
    await page.getByRole('button', { name: tab, exact: true }).click();
    await expect(page.getByRole('button', { name: tab, exact: true })).toHaveAttribute('aria-pressed', 'true');
    if (tab === 'analytics') await expect(page.getByText('Total Tasks', { exact: true })).toBeVisible();
    await page.screenshot({ animations: "disabled", path: testInfo.outputPath(`${tab}-desktop.png`), fullPage: true });
  }
  await page.getByRole('button', { name: 'Account', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Account settings', exact: true })).toBeVisible();
  await page.screenshot({ animations: "disabled", path: testInfo.outputPath('account-desktop.png'), fullPage: true });
  await page.getByRole('link', { name: 'My tasks', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'My tasks', exact: true })).toBeVisible();
  await page.getByRole('link', { name: /Design the homepage experience/ }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.keyboard.press('Escape');
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.getByRole('button', { name: 'Open navigation' }).click();
  await expect(page.getByRole('dialog', { name: 'Navigation' })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('button', { name: 'Open navigation' })).toBeFocused();
  await page.getByRole('button', { name: 'Open navigation' }).click();
  await page.getByRole('link', { name: 'Overview', exact: true }).click();
  await expect(page.getByRole('dialog')).not.toBeVisible();
  await page.screenshot({ animations: "disabled", path: testInfo.outputPath('dashboard-mobile.png'), fullPage: true });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.getByRole('button', { name: 'Notifications', exact: true }).click();
  await expect(page.getByRole('region', { name: 'Notifications' })).toBeVisible();
  await page.screenshot({ animations: "disabled", path: testInfo.outputPath('notifications-mobile.png'), fullPage: true });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.keyboard.press('Escape');
  await page.getByRole('heading', { name: 'Website redesign', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Website redesign', exact: true })).toBeVisible();
  await page.screenshot({ animations: "disabled", path: testInfo.outputPath('board-mobile.png'), fullPage: true });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.getByRole('button', { name: 'Open task: Design the homepage experience' }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  expect(await page.getByRole('dialog').evaluate(node => node.scrollWidth <= node.clientWidth)).toBe(true);
  await page.screenshot({ animations: 'disabled', path: testInfo.outputPath('task-details-mobile.png'), fullPage: true });
  await page.keyboard.press('Escape');
  expect(errors).toEqual([]);
});
