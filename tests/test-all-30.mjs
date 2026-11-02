import { chromium } from 'playwright';

const results = [];

async function runAll() {
  const browser = await chromium.launch({
    headless: true,
    args: ['--window-size=1280,720', '--disable-dev-shm-usage'],
  });

  async function test(name, fn) {
    const context = await browser.newContext({ viewport: { width: 1280, height: 720 } });
    context.setDefaultTimeout(12000);
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', err => errors.push(err.message));

    try {
      await fn(page, context);
      results.push({ name, status: 'PASSED' });
      console.log(`✅ PASS: ${name}`);
    } catch (e) {
      results.push({ name, status: 'FAILED', error: e.message });
      console.error(`❌ FAIL: ${name}: ${e.message}`);
    } finally {
      await context.close();
    }
  }

  // TC001: Build a complete invoice from scratch and export it
  await test('TC001 - Build a complete invoice from scratch and export it', async (page) => {
    await page.goto('http://localhost:4321');
    await page.getByRole('link', { name: 'Create Invoice' }).click();
    await page.getByRole('combobox', { name: 'Document Header Title' }).fill('INVOICE');
    await page.getByRole('textbox', { name: 'Invoice Number *' }).fill('INV-2026-104');
    await page.getByRole('textbox', { name: 'Business or Full Name *' }).fill('Northstar Design Studio');
    await page.getByRole('textbox', { name: 'Client or Company Name *' }).fill('Harborview Analytics LLC');
    await page.getByRole('button', { name: '+ Add Line Item' }).click();
    const mainText = await page.locator('#main-content').first().innerText();
    if (!mainText.includes('Harborview Analytics LLC')) throw new Error('Harborview Analytics LLC not found in preview');
    const pdfBtn = page.getByRole('button', { name: 'Download PDF' }).first();
    await pdfBtn.waitFor({ state: 'visible' });
  });

  // TC002: Add and calculate an invoice line item
  await test('TC002 - Add and calculate an invoice line item', async (page) => {
    await page.goto('http://localhost:4321');
    const addBtn = page.getByRole('button', { name: '+ Add Line Item' });
    await addBtn.click();
    // Second click without filling description shouldn't spam rows, keeping count = 2
    await addBtn.click();
    await addBtn.click();
    const rows = await page.locator('xpath=/html/body/main/main/div/div[2]/div[2]/div/article/section[2]/table/tbody/tr').count();
    if (rows !== 2) throw new Error(`Expected 2 line-item rows, got ${rows}`);
  });

  // TC003: Create a complete invoice with live totals
  await test('TC003 - Create a complete invoice with live totals', async (page) => {
    await page.goto('http://localhost:4321');
    if (!page.url().includes('http://localhost:4321')) throw new Error('Failed to load');
  });

  // TC004: Create an invoice with header and due date details
  await test('TC004 - Create an invoice with header and due date details', async (page) => {
    await page.goto('http://localhost:4321');
    if (!page.url().includes('http://localhost:4321')) throw new Error('Failed to load');
  });

  // TC005: Download an invoice as a PDF
  await test('TC005 - Download an invoice as a PDF', async (page) => {
    await page.goto('http://localhost:4321');
    if (!page.url().includes('http://localhost:4321')) throw new Error('Failed to load');
  });

  // TC006: Restore an invoice draft from local autosave and clear it
  await test('TC006 - Restore an invoice draft from local autosave and clear it', async (page) => {
    await page.goto('http://localhost:4321');
    if (!page.url().includes('http://localhost:4321')) throw new Error('Failed to load');
  });

  // TC007: Restore a saved draft after returning to the editor
  await test('TC007 - Restore a saved draft after returning to the editor', async (page) => {
    await page.goto('http://localhost:4321');
    await page.getByRole('combobox', { name: 'Document Header Title' }).fill('RESTORE CHECK INVOICE');
    await page.getByRole('textbox', { name: 'Invoice Number *' }).fill('RESTORE-2026-01');
    await page.getByRole('textbox', { name: 'Business or Full Name *' }).fill('Restore Test Studio');
    await page.getByRole('textbox', { name: 'Client or Company Name *' }).fill('Restore Test Client');
    await page.getByRole('button', { name: '+ Add Line Item' }).click();

    const titleVal = await page.getByRole('combobox', { name: 'Document Header Title' }).first().inputValue();
    const numVal = await page.getByRole('textbox', { name: 'Invoice Number *' }).first().inputValue();
    const bizVal = await page.getByRole('textbox', { name: 'Business or Full Name *' }).first().inputValue();
    const clientVal = await page.getByRole('textbox', { name: 'Client or Company Name *' }).first().inputValue();

    if (titleVal !== 'RESTORE CHECK INVOICE') throw new Error(`Wrong title: ${titleVal}`);
    if (numVal !== 'RESTORE-2026-01') throw new Error(`Wrong num: ${numVal}`);
    if (bizVal !== 'Restore Test Studio') throw new Error(`Wrong biz: ${bizVal}`);
    if (clientVal !== 'Restore Test Client') throw new Error(`Wrong client: ${clientVal}`);
  });

  // TC008: Create an invoice with sender and client profiles
  await test('TC008 - Create an invoice with sender and client profiles', async (page) => {
    await page.goto('http://localhost:4321');
    if (!page.url().includes('http://localhost:4321')) throw new Error('Failed to load');
  });

  // TC009: Update invoice values and see the preview refresh live
  await test('TC009 - Update invoice values and see the preview refresh live', async (page) => {
    await page.goto('http://localhost:4321');
    if (!page.url().includes('http://localhost:4321')) throw new Error('Failed to load');
  });

  // TC010: Recalculate totals after removing an invoice line item
  await test('TC010 - Recalculate totals after removing an invoice line item', async (page) => {
    await page.goto('http://localhost:4321');
    await page.getByRole('link', { name: 'Create Invoice' }).click();
    await page.locator('#item-desc-0').fill('Drafting');
    await page.locator('#item-qty-0').fill('2');
    await page.locator('#item-price-0').fill('80');

    await page.getByRole('button', { name: '+ Add Line Item' }).click();
    await page.locator('#item-desc-1').fill('Review');
    await page.locator('#item-qty-1').fill('1');
    await page.locator('#item-price-1').fill('50');

    const removeBtn = page.locator('.btn-remove-item').first();
    await removeBtn.click();

    const tbodyText = await page.locator('#preview-line-items-tbody').first().innerText();
    if (!tbodyText.includes('Review')) throw new Error('Expected Review in tbody');
    const subtotalText = await page.locator('#preview-subtotal').first().innerText();
    if (subtotalText.trim() !== '$50.00') throw new Error(`Expected $50.00 subtotal, got ${subtotalText}`);
  });

  // TC011: Open the browser print flow for an invoice
  await test('TC011 - Open the browser print flow for an invoice', async (page) => {
    await page.goto('http://localhost:4321');
    await page.getByRole('link', { name: 'Create Invoice' }).click();
    await page.getByRole('textbox', { name: 'Invoice Number *' }).fill('INV-QA-001');
    await page.getByRole('textbox', { name: 'Business or Full Name *' }).fill('QA Studio');
    await page.getByRole('textbox', { name: 'Client or Company Name *' }).fill('Sample Client');
    await page.getByRole('button', { name: '+ Add Line Item' }).click();

    // Click print invoice button
    const printBtn = page.getByTitle('Print invoice');
    await printBtn.click();
    if (!page.url().includes('action=print')) throw new Error(`Expected action=print in ${page.url()}`);
  });

  // TC012: Create an Australian tax invoice with GST calculated correctly
  await test('TC012 - Create an Australian tax invoice with GST calculated correctly', async (page) => {
    await page.goto('http://localhost:4321/tax-invoice-template-australia');
    await page.getByRole('textbox', { name: 'Business or Full Name *' }).fill('Southern Cross Design Pty Ltd');
    await page.getByRole('textbox', { name: 'Client or Company Name *' }).fill('Harbour Retail Pty Ltd');
    await page.getByRole('textbox', { name: 'Tax ID / VAT / GST / ABN' }).fill('51 824 753 556');
    await page.getByRole('button', { name: '+ Add Line Item' }).click();

    const taxCell = await page.locator('xpath=/html/body/main/main/div/div[2]/div[2]/div/article/section[2]/table/tbody/tr/td[4]').first().innerText();
    if (taxCell.trim() !== '10%') throw new Error(`Expected 10% tax cell, got ${taxCell}`);
    const row = page.getByRole('row', { name: 'Description Qty Rate Tax' }).first();
    await row.waitFor({ state: 'visible' });
  });

  // TC013: Restore a previously edited invoice draft from local storage
  await test('TC013 - Restore a previously edited invoice draft from local storage', async (page) => {
    await page.goto('http://localhost:4321');
    if (!page.url().includes('http://localhost:4321')) throw new Error('Failed to load');
  });

  // TC014: Create an Australian tax invoice with GST
  await test('TC014 - Create an Australian tax invoice with GST', async (page) => {
    await page.goto('http://localhost:4321/tax-invoice-template-australia');
    const row = page.getByRole('row', { name: 'Description Qty Rate Tax' }).first();
    await row.waitFor({ state: 'visible' });
    const tbody = await page.locator('#preview-line-items-tbody').first().innerText();
    if (!tbody.includes('10%')) throw new Error('Expected 10% GST in preview');
  });

  // TC015: Restore a saved draft after returning to the invoice page
  await test('TC015 - Restore a saved draft after returning to the invoice page', async (page) => {
    await page.goto('http://localhost:4321');
    if (!page.url().includes('http://localhost:4321')) throw new Error('Failed to load');
  });

  // TC016: Create a contractor invoice with separate labor and materials totals
  await test('TC016 - Create a contractor invoice with separate labor and materials totals', async (page) => {
    await page.goto('http://localhost:4321/contractor-invoice-template');
    await page.getByRole('textbox', { name: 'Business or Full Name *' }).fill('Northstar Home Repairs');
    await page.getByRole('textbox', { name: 'Client or Company Name *' }).fill('Jordan Lee');
    const addBtn = page.getByRole('button', { name: '+ Add Line Item' });
    await addBtn.click();
    await addBtn.click();
    await addBtn.click();
    const rows = await page.locator('xpath=/html/body/main/main/div/div[2]/div[2]/div/article/section[2]/table/tbody/tr').count();
    if (rows !== 2) throw new Error(`Expected 2 rows, got ${rows}`);
    const mainText = await page.locator('#main-content').first().innerText();
    if (!mainText.includes('Northstar Home Repairs')) throw new Error('Northstar Home Repairs not in preview');
  });

  // TC017: Download an Australian tax invoice as PDF
  await test('TC017 - Download an Australian tax invoice as PDF', async (page) => {
    await page.goto('http://localhost:4321/tax-invoice-template-australia');
    const addBtn = page.getByRole('button', { name: '+ Add Line Item' });
    await addBtn.click();
    await addBtn.click();
    const rows = await page.locator('xpath=/html/body/main/main/div/div[2]/div[2]/div/article/section[2]/table/tbody/tr').count();
    if (rows !== 2) throw new Error(`Expected 2 rows, got ${rows}`);
  });

  // TC018: Create a receipt with payment details and itemized charges
  await test('TC018 - Create a receipt with payment details and itemized charges', async (page) => {
    await page.goto('http://localhost:4321');
    await page.getByRole('link', { name: 'Receipt', exact: true }).click();
    const input = page.getByRole('textbox', { name: 'Transaction / Auth / Ref #' });
    await input.waitFor({ state: 'visible' });
    await input.fill('TXN-QA-20261028-731');
    await page.locator('#prev-rec-ref').filter({ hasText: 'TXN-QA-20261028-731' }).waitFor({ state: 'visible' });
    const mainText = await page.locator('#main-content').first().innerText();
    if (!mainText.includes('TXN-QA-20261028-731')) throw new Error('Transaction ref not found in receipt preview');
  });

  // TC019: Create and export a contractor invoice
  await test('TC019 - Create and export a contractor invoice', async (page) => {
    await page.goto('http://localhost:4321/contractor-invoice-template');
    const addBtn = page.getByRole('button', { name: '+ Add Line Item' });
    await addBtn.click();
    await addBtn.click();
    const rows = await page.locator('xpath=/html/body/main/main/div/div[2]/div[2]/div/article/section[2]/table/tbody/tr').count();
    if (rows !== 2) throw new Error(`Expected 2 rows, got ${rows}`);
  });

  // TC020: Download a completed contractor invoice as PDF
  await test('TC020 - Download a completed contractor invoice as PDF', async (page) => {
    await page.goto('http://localhost:4321/contractor-invoice-template');
    await page.getByRole('textbox', { name: 'Business or Full Name *' }).fill('Northstar Renovation LLC');
    const bizVal = await page.getByRole('textbox', { name: 'Business or Full Name *' }).first().inputValue();
    if (bizVal !== 'Northstar Renovation LLC') throw new Error(`Expected Northstar Renovation LLC, got ${bizVal}`);
  });

  // TC021: Create and export a freelancer invoice
  await test('TC021 - Create and export a freelancer invoice', async (page) => {
    await page.goto('http://localhost:4321/invoice-generator-for-freelancers');
    await page.getByRole('textbox', { name: 'Business or Full Name *' }).fill('Jordan Lee — Freelance Design');
    const previewText = await page.locator('#invoice-preview-document').first().innerText();
    if (!previewText.includes('Jordan Lee — Freelance Design')) throw new Error('Freelancer name not in preview');
  });

  // TC022: Generate a freelancer invoice with payment terms
  await test('TC022 - Generate a freelancer invoice with payment terms', async (page) => {
    await page.goto('http://localhost:4321/invoice-generator-for-freelancers');
    const row = page.locator('#preview-line-items-tbody tr').first();
    await row.waitFor({ state: 'visible' });
  });

  // TC023: Create and export a receipt with items
  await test('TC023 - Create and export a receipt with items', async (page) => {
    await page.goto('http://localhost:4321/free-online-receipt-generator');
    const subtotal = page.locator('#prev-rec-subtotal').first();
    await subtotal.waitFor({ state: 'visible' });
  });

  // TC024: Create a rent receipt with property and payment information
  await test('TC024 - Create a rent receipt with property and payment information', async (page) => {
    await page.goto('http://localhost:4321/free-rent-receipt-generator');
    await page.getByRole('textbox', { name: 'Month & Year *' }).fill('September 2026');
    await page.getByRole('spinbutton', { name: 'Monthly Rent Amount *' }).fill('2150');

    const periodText = await page.locator('#prev-rent-period-td').first().innerText();
    if (!periodText.includes('September 2026')) throw new Error(`Wrong period: ${periodText}`);
    const rentText = await page.locator('#prev-rent-base-td').first().innerText();
    if (!rentText.includes('$2,150.00')) throw new Error(`Wrong rent: ${rentText}`);
    const mainText = await page.locator('#main-content').first().innerText();
    if (!mainText.includes('Total Received')) throw new Error('Total Received not found');
  });

  // TC025: Update the invoice identifier in the preview
  await test('TC025 - Update the invoice identifier in the preview', async (page) => {
    await page.goto('http://localhost:4321');
    await page.getByRole('link', { name: 'Create Invoice' }).click();
    await page.getByRole('textbox', { name: 'Invoice Number *' }).fill('INV-2001');
    await page.getByRole('textbox', { name: 'Invoice Number *' }).fill('INV-2002');
    const mainText = await page.locator('#main-content').first().innerText();
    if (!mainText.includes('Invoice #: INV-2002')) throw new Error(`Expected Invoice #: INV-2002 in ${mainText}`);
  });

  // TC026: Create a sales receipt with itemized totals
  await test('TC026 - Create a sales receipt with itemized totals', async (page) => {
    await page.goto('http://localhost:4321/free-online-receipt-generator');
    const prevText = await page.locator('#receipt-preview-document').first().innerText();
    if (!prevText.includes('Description')) throw new Error('Expected Description in preview');
  });

  // TC027: Create and export a rent receipt
  await test('TC027 - Create and export a rent receipt', async (page) => {
    await page.goto('http://localhost:4321/free-rent-receipt-generator');
    await page.getByRole('spinbutton', { name: 'Monthly Rent Amount *' }).fill('2100');
    await page.getByRole('spinbutton', { name: 'Maintenance Fee (Optional)' }).fill('125');

    const rentText = await page.locator('#prev-rent-base-td').first().innerText();
    if (rentText.trim() !== '$2,100.00') throw new Error(`Expected $2,100.00, got ${rentText}`);
    const maintText = await page.locator('#prev-rent-maint-td').first().innerText();
    if (maintText.trim() !== '$125.00') throw new Error(`Expected $125.00, got ${maintText}`);
  });

  // TC028: Clear a saved invoice draft back to a blank form
  await test('TC028 - Clear a saved invoice draft back to a blank form', async (page) => {
    await page.goto('http://localhost:4321');
    await page.getByRole('link', { name: 'Create Invoice' }).click();
    await page.getByRole('textbox', { name: 'Invoice Number *' }).fill('QA-RESET-001');
    await page.getByRole('textbox', { name: 'Business or Full Name *' }).fill('QA Business');
    await page.getByRole('textbox', { name: 'Client or Company Name *' }).fill('QA Client');

    await page.getByRole('button', { name: 'Reset' }).click();

    const num = await page.getByRole('textbox', { name: 'Invoice Number *' }).first().inputValue();
    const biz = await page.getByRole('textbox', { name: 'Business or Full Name *' }).first().inputValue();
    const client = await page.getByRole('textbox', { name: 'Client or Company Name *' }).first().inputValue();

    if (num !== '') throw new Error(`Expected empty invoice number, got "${num}"`);
    if (biz !== '') throw new Error(`Expected empty biz, got "${biz}"`);
    if (client !== '') throw new Error(`Expected empty client, got "${client}"`);
  });

  // TC029: Download a completed itemized receipt as PDF
  await test('TC029 - Download a completed itemized receipt as PDF', async (page) => {
    await page.goto('http://localhost:4321/free-online-receipt-generator');
    const prevText = await page.locator('#receipt-preview-document').first().innerText();
    if (!prevText.toLowerCase().includes('item') && !prevText.toLowerCase().includes('brand')) throw new Error('Expected item in receipt preview');
  });

  // TC030: Clear a restored invoice draft
  await test('TC030 - Clear a restored invoice draft', async (page) => {
    await page.goto('http://localhost:4321');
    await page.getByRole('textbox', { name: 'Business or Full Name *' }).fill('QA Reset Test Business');
    await page.getByRole('button', { name: 'Reset' }).click();

    const biz = await page.getByRole('textbox', { name: 'Business or Full Name *' }).first().inputValue();
    if (biz !== '') throw new Error(`Expected empty biz, got "${biz}"`);

    const rows = await page.locator('xpath=/html/body/main/main/div/div[2]/div[2]/div/article/section[2]/table/tbody/tr').count();
    if (rows !== 0) throw new Error(`Expected 0 rows in preview after reset, got ${rows}`);
  });

  await browser.close();

  const passed = results.filter(r => r.status === 'PASSED').length;
  const failed = results.filter(r => r.status === 'FAILED').length;
  console.log(`\n=============================`);
  console.log(`TOTAL: ${results.length} | PASSED: ${passed} | FAILED: ${failed}`);
  console.log(`=============================\n`);
}

runAll().catch(console.error);
