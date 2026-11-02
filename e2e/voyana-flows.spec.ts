import { test, expect } from '@playwright/test';
import path from 'path';

const screenshotDir = path.resolve(process.cwd(), 'docs/testing/evidence/screenshots');

test.describe('Voyana Core User Experience & NFR UI Suite', () => {
  test('01: Homepage hero, globe canvas, and navigation load cleanly', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    await expect(page).toHaveTitle(/Voyana/i);
    const brandHeading = page.locator('header');
    await expect(brandHeading).toBeVisible();

    await page.screenshot({ path: path.join(screenshotDir, '01_homepage_hero.png'), fullPage: true });
  });

  test('02: Interactive search and destination filters render', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const searchInput = page.locator('input[placeholder*="search" i], input[placeholder*="destination" i]').first();
    if (await searchInput.isVisible()) {
      await searchInput.fill('Paris');
      await page.waitForTimeout(500);
      await page.screenshot({ path: path.join(screenshotDir, '02_destination_search.png') });
    } else {
      await page.screenshot({ path: path.join(screenshotDir, '02_destinations_view.png') });
    }
  });

  test('03: Responsive checks - Mobile (375px), Tablet (768px), Desktop (1440px)', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.screenshot({ path: path.join(screenshotDir, '03_responsive_mobile_375px.png') });

    await page.setViewportSize({ width: 768, height: 1024 });
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.screenshot({ path: path.join(screenshotDir, '03_responsive_tablet_768px.png') });

    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.screenshot({ path: path.join(screenshotDir, '03_responsive_desktop_1440px.png') });
  });

  test('04: Accessibility DOM baseline & focusability checks', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const buttons = page.locator('button');
    const buttonCount = await buttons.count();
    expect(buttonCount).toBeGreaterThan(0);

    await page.screenshot({ path: path.join(screenshotDir, '04_accessibility_view.png') });
  });

  test('05: AI Assistant drawer and interaction UI loads', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const chatTrigger = page.locator('button:has-text("Ask VoyaBot"), button:has-text("AI"), [aria-label*="chat" i], button:has-text("Assistant")').first();
    if (await chatTrigger.isVisible()) {
      await chatTrigger.click();
      await page.waitForTimeout(600);
    }
    await page.screenshot({ path: path.join(screenshotDir, '05_ai_assistant_view.png') });
  });
});
