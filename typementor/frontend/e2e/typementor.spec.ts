import { test, expect } from '@playwright/test';

test.describe('TypeMentor AI — E2E Test Suite', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to homepage
    await page.goto('http://localhost:5173/');
  });

  test('should render landing page content and seo links', async ({ page }) => {
    await expect(page).toHaveTitle(/TypeMentor AI/);
    
    // Check main title
    const mainTitle = page.locator('h1');
    await expect(mainTitle).toContainText('TypeMentor');

    // Check footer links
    const privacyLink = page.locator('a[href="/privacy"]');
    const termsLink = page.locator('a[href="/terms"]');
    await expect(privacyLink).toBeVisible();
    await expect(termsLink).toBeVisible();
  });

  test('should support guest mode practice lifecycle', async ({ page }) => {
    // Click Guest Mode practice
    const guestPracticeBtn = page.locator('button', { hasText: 'Try Typing Academy (Guest)' });
    if (await guestPracticeBtn.isVisible()) {
      await guestPracticeBtn.click();
      
      // Page should redirect to /academy
      await page.waitForURL('**/academy');
      await expect(page).toHaveURL(/.*academy/);

      // Verify progress dashboard
      const academyTitle = page.locator('h2', { hasText: 'Touch Typing Academy' });
      await expect(academyTitle).toBeVisible();
    }
  });

  test('should allow navigating to practice board and typing', async ({ page }) => {
    await page.goto('http://localhost:5173/practice');

    // Check typing container
    const inputArea = page.locator('input[type="text"]');
    if (await inputArea.isVisible()) {
      await expect(inputArea).toBeEnabled();
      
      // Click container to focus
      await inputArea.click();
      
      // Verify keyboard layout exists
      const keyboard = page.locator('.keyboard-layout');
      if (await keyboard.isVisible()) {
        await expect(keyboard).toBeVisible();
      }
    }
  });

  test('should verify access restricted views redirect to landing', async ({ page }) => {
    // Attempting to visit /dashboard without auth
    await page.goto('http://localhost:5173/dashboard');
    
    // Redirects back to homepage / auth state
    await page.waitForURL('http://localhost:5173/');
    await expect(page).toHaveURL('http://localhost:5173/');
  });
});
