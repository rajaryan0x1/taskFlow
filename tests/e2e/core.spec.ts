import { expect, test } from '@playwright/test';

test('register, reload, edit, archive, restore, and sign out', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/register');
  await page.getByLabel('First Name').fill('Browser');
  await page.getByLabel('Last Name').fill('Tester');
  await page.getByLabel('Username').fill('browser_owner');
  await page.getByLabel('Email', { exact: true }).fill('browser@example.com');
  await page.getByLabel('Password', { exact: true }).fill('correct-horse-battery');
  await page.getByRole('button', { name: 'Create account', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'My Projects' })).toBeVisible();
  await page.reload();
  await expect(page.getByText('Browser', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'New Project', exact: true }).first().click();
  await page.getByLabel('Project Name').fill('Browser project');
  await page.getByRole('button', { name: 'Create Project', exact: true }).click();
  await page.getByRole('heading', { name: 'Browser project' }).click();
  await page.getByRole('button', { name: 'New task', exact: true }).click();
  await page.getByLabel('Task Title').fill('Browser task');
  await page.getByRole('button', { name: 'Create Task', exact: true }).click();
  const card = page.getByRole('button', { name: 'Open task: Browser task' });
  await expect(card).toBeVisible();
  await card.focus();
  await page.keyboard.press('Enter');
  await page.getByLabel('Status', { exact: true }).selectOption('done');
  await page.getByRole('button', { name: 'Save Changes', exact: true }).click();
  await expect(page.getByRole('dialog')).not.toBeVisible();
  await card.click();
  page.once('dialog', dialog => dialog.accept());
  await page.getByRole('button', { name: 'Archive Task', exact: true }).click();
  await expect(page.getByRole("dialog")).not.toBeVisible();
  await expect(card).not.toBeVisible();
  await page.getByLabel('Show archived tasks').check();
  await card.click();
  await expect(page.getByLabel('Title', { exact: true })).toBeDisabled();
  await page.getByRole('button', { name: 'Restore task', exact: true }).click();
  await page.getByLabel('Show archived tasks').uncheck();
  await expect(card).toBeVisible();
  await page.getByRole('button', { name: 'settings', exact: true }).click();
  page.once('dialog', dialog => dialog.accept());
  await page.getByRole('button', { name: 'Archive project', exact: true }).click();
  await expect(page.getByText('This project is archived and read-only.')).toBeVisible();
  await page.getByRole('button', { name: 'Restore project', exact: true }).click();
  await expect(page.getByText('This project is archived and read-only.')).not.toBeVisible();
  await page.getByRole('link', { name: 'Back to projects' }).click();
  await page.getByRole('button', { name: 'Logout', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Sign in to TaskFlow' })).toBeVisible();
  expect(await page.evaluate(() => localStorage.getItem('auth-storage'))).toBeNull();
  await page.goto('/register');
  await page.getByLabel('First Name').fill('Second');
  await page.getByLabel('Last Name').fill('Account');
  await page.getByLabel('Username').fill('browser_second');
  await page.getByLabel('Email', { exact: true }).fill('second@example.com');
  await page.getByLabel('Password', { exact: true }).fill('correct-horse-battery');
  await page.getByRole('button', { name: 'Create account', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'My Projects' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Browser project' })).not.toBeVisible();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole('button', { name: 'New Project', exact: true }).first().click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).not.toBeVisible();
  await expect(page.getByRole('button', { name: 'New Project', exact: true }).first()).toBeFocused();
  expect(errors).toEqual([]);
});

test('invite a colleague and change their role from the member panel', async ({ page, request }) => {
  for (const name of ['manager', 'colleague']) {
    const response = await request.post('http://127.0.0.1:5100/api/v1/auth/register', {
      headers: { Origin: 'http://127.0.0.1:5178', 'X-TaskFlow-Client': 'web' },
      data: { firstName: name, lastName: 'Tester', username: `e2e_${name}`, email: `${name}@example.com`, password: 'correct-horse-battery' },
    });
    expect(response.status()).toBe(201);
  }
  await page.goto('/login');
  await page.getByLabel('Email', { exact: true }).fill('manager@example.com');
  await page.getByLabel('Password', { exact: true }).fill('correct-horse-battery');
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await page.getByRole('button', { name: 'New Project', exact: true }).first().click();
  await page.getByLabel('Project Name').fill('Team project');
  await page.getByRole('button', { name: 'Create Project', exact: true }).click();
  await page.getByRole('heading', { name: 'Team project' }).click();
  await page.getByRole('button', { name: 'members', exact: true }).click();
  await page.getByLabel('Find a member to invite').fill('e2e_colleague');
  await page.getByRole('button', { name: /colleague Tester.*Invite/ }).click();
  await expect(page.getByText('Member invited successfully!')).toBeVisible();
  await page.getByLabel('Role for colleague Tester').selectOption('admin');
  await expect(page.getByLabel('Role for colleague Tester')).toHaveValue('admin');
  await page.reload();
  await page.getByRole('button', { name: 'members', exact: true }).click();
  await expect(page.getByLabel('Role for colleague Tester')).toHaveValue('admin');
});
