import { test, expect } from '@playwright/test';

test.describe('Authentication and Dashboard', () => {
  test('should login as process analyst and view dashboard', async ({ page }) => {
    // Navigate to login page
    await page.goto('http://localhost:3000/login');
    
    // Expect the page to have the login form
    await expect(page.locator('h1')).toContainText('Process Mapper');
    
    // Fill in the email and password for Process Analyst
    await page.fill('input[type="email"]', 'analyst@company.com');
    await page.fill('input[type="password"]', 'password123');
    
    // Click the login button
    await page.click('button[type="submit"]');
    
    // Check that we're redirected to the dashboard
    await expect(page).toHaveURL(/.*\/dashboard/);
    
    // Check that the dashboard has the correct user info (Іваненко Олена)
    await expect(page.locator('text=Іваненко Олена')).toBeVisible();
    
    // Check that the sidebar has the 'Дошка аналітиків' link
    await expect(page.locator('nav').locator('text=Дошка аналітиків')).toBeVisible();
  });
});
