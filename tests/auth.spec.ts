import { test, expect } from '@playwright/test';
import 'dotenv/config';

test('Admin can log in and see Overview page', async ({ page }) => {
  // 1. Navigate to the login page
  // Since the app uses HashRouter (from App.tsx), the path is prefixed with #/
  await page.goto('http://localhost:3000/#/login');

  // 2. Fill in the email and password
  // Using the exact IDs from Login.tsx
  await page.locator('#email').fill(process.env.TEST_ADMIN_EMAIL as string);
  await page.locator('#password').fill(process.env.TEST_ADMIN_PASSWORD as string);

  // 3. Click the login button
  // Using the exact button text from Login.tsx
  await page.getByRole('button', { name: /Secure Login/i }).click();

  // 4. Verify successful redirection and page load
  // The Admin user is redirected to /admin/overview
  await page.waitForURL('**/#/admin/overview');

  // 5. Verify a distinct element on the Overview page is visible
  // The Overview.tsx page has a greeting "Ahlan, {user?.full_name}!"
  await expect(page.getByText(/Ahlan,/i)).toBeVisible();
});
