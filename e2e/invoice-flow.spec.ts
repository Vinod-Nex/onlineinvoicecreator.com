import { test, expect } from '@playwright/test';

test.describe('Phase 17: Accessibility, Mobile QA & Core User Journeys', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to homepage and wait for network to settle
    await page.goto('/', { waitUntil: 'networkidle' });
  });

  test('no horizontal scroll across viewport', async ({ page }) => {
    // Verify document width does not exceed viewport width
    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    const innerWidth = await page.evaluate(() => window.innerWidth);
    expect(scrollWidth).toBeLessThanOrEqual(innerWidth + 1); // 1px rounding tolerance
  });

  test('fill form and calculate totals', async ({ page }) => {
    // Fill Sender Details
    const senderName = page.locator('#field-sender-name');
    await senderName.fill('Acme Creative Studio Ltd');

    const senderEmail = page.locator('#field-sender-email');
    await senderEmail.fill('billing@acmecreative.com');

    const senderAddress = page.locator('#field-sender-address');
    await senderAddress.fill('100 Market St, Suite 400\nSan Francisco, CA 94105');

    // Fill Client Details
    const clientName = page.locator('#field-client-name');
    await clientName.fill('Global Enterprises Inc');

    const clientEmail = page.locator('#field-client-email');
    await clientEmail.fill('ap@globalenterprises.com');

    // Set Invoice Meta
    const invoiceNumber = page.locator('#field-invoice-number');
    await invoiceNumber.fill('INV-2026-999');

    // Edit first line item
    const itemDesc0 = page.locator('#item-desc-0');
    await itemDesc0.fill('Website Design & Frontend Architecture');

    const itemQty0 = page.locator('#item-qty-0');
    await itemQty0.fill('10');

    const itemPrice0 = page.locator('#item-price-0');
    await itemPrice0.fill('150');

    // Click Add Line Item
    const btnAddItem = page.locator('#btn-add-item');
    await btnAddItem.click();

    // Fill second line item
    const itemDesc1 = page.locator('#item-desc-1');
    await itemDesc1.fill('Performance Audit & Mobile QA');

    const itemQty1 = page.locator('#item-qty-1');
    await itemQty1.fill('5');

    const itemPrice1 = page.locator('#item-price-1');
    await itemPrice1.fill('200');

    // 10 * 150 = 1,500; 5 * 200 = 1,000 -> Total = $2,500.00
    const grandTotal = page.locator('#display-grand-total');
    await expect(grandTotal).toContainText('2,500.00');
  });

  test('live preview updates when form is edited', async ({ page }) => {
    // Fill Sender Name
    await page.locator('#field-sender-name').fill('Starlight Innovations');

    // Fill Client Name
    await page.locator('#field-client-name').fill('Apex Dynamics');

    // Fill Invoice Number
    await page.locator('#field-invoice-number').fill('INV-APEX-042');

    // On mobile viewports, toggle to Live Preview tab to inspect preview
    const isMobileToggleVisible = await page.locator('#btn-toggle-preview').isVisible();
    if (isMobileToggleVisible) {
      await page.locator('#btn-toggle-preview').click();
    }

    // Verify preview DOM elements update live
    await expect(page.locator('#preview-sender-name')).toHaveText('Starlight Innovations');
    await expect(page.locator('#preview-client-name')).toHaveText('Apex Dynamics');
    await expect(page.locator('#preview-invoice-number')).toHaveText('INV-APEX-042');
  });

  test('dark mode toggling and persistence', async ({ page }) => {
    // Target visible theme toggle button (desktop or mobile)
    const themeBtn = page.locator('#theme-toggle-btn:visible').first();
    await expect(themeBtn).toBeVisible();

    // Check initial state
    const initialTheme = await page.evaluate(() =>
      document.documentElement.getAttribute('data-theme')
    );

    // Click toggle
    await themeBtn.click();

    // Should switch to opposite theme
    const expectedTheme = initialTheme === 'dark' ? 'light' : 'dark';
    await expect(page.locator('html')).toHaveAttribute('data-theme', expectedTheme);

    // Verify localStorage persistence
    const savedTheme = await page.evaluate(() => localStorage.getItem('theme'));
    expect(savedTheme).toBe(expectedTheme);

    // Click again to toggle back
    await themeBtn.click();
    await expect(page.locator('html')).toHaveAttribute('data-theme', initialTheme || 'light');
  });

  test('mobile menu navigation drawer', async ({ page }) => {
    const mobileSummary = page.locator('#mobile-nav-details summary');

    // Only test if mobile summary is visible on this viewport
    if (await mobileSummary.isVisible()) {
      // Tap mobile menu trigger
      await mobileSummary.click();

      const details = page.locator('#mobile-nav-details');
      await expect(details).toHaveAttribute('open', '');

      // Verify menu contains navigation links
      const receiptLink = details.locator('a[href="/free-online-receipt-generator"]').first();
      await expect(receiptLink).toBeVisible();

      // Press Escape key to close
      await page.keyboard.press('Escape');
      await expect(details).not.toHaveAttribute('open', '');
    }
  });

  test('PDF download triggers dynamic import and initiates file download', async ({ page }) => {
    // Fill required sender & client name so form passes validation
    await page.locator('#field-sender-name').fill('Verified Agency LLC');
    await page.locator('#field-client-name').fill('Enterprise Client Corp');

    // Setup download event listener before clicking
    const downloadPromise = page.waitForEvent('download', { timeout: 20000 });

    const btnDownload = page.locator('#btn-download-pdf-form');
    await btnDownload.scrollIntoViewIfNeeded();
    await btnDownload.click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toMatch(/\.pdf$/i);
  });
});
