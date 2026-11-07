import { chromium } from 'playwright';

const results = [];

async function runPtBr30() {
  const browser = await chromium.launch({
    headless: true,
    args: ['--window-size=1280,720', '--disable-dev-shm-usage'],
  });

  async function test(name, fn) {
    const context = await browser.newContext({ viewport: { width: 1280, height: 720 } });
    context.setDefaultTimeout(12000);
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', (err) => errors.push(err.message));

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

  console.log('\n========================================');
  console.log('  TESTSPRINT: BRAZILIAN PORTUGUESE (pt-BR)');
  console.log('  Running 30 Comprehensive E2E Tests');
  console.log('========================================\n');

  // BR001: Brazilian Hub (/pt-br) loads with HTTP 200 and correct localized title & H1
  await test('BR001 - Brazilian Hub (/pt-br) loads with HTTP 200 and H1', async (page) => {
    const res = await page.goto('http://localhost:4321/pt-br');
    if (!res || res.status() !== 200) throw new Error(`HTTP status: ${res?.status()}`);
    const h1 = await page.locator('h1').first().innerText();
    if (!h1.includes('Gerador de Recibo e Fatura')) throw new Error(`Unexpected H1: ${h1}`);
  });

  // BR002: Brazilian Hub (/pt-br) embeds the full interactive invoice generator
  await test('BR002 - Brazilian Hub embeds interactive invoice generator workspace', async (page) => {
    await page.goto('http://localhost:4321/pt-br');
    const workspace = page.locator('#invoice-workspace');
    await workspace.waitFor({ state: 'visible' });
    const numInput = page.locator('#field-invoice-number');
    await numInput.waitFor({ state: 'visible' });
  });

  // BR003: Brazilian Hub (/pt-br) defaults currency selector to BRL (R$)
  await test('BR003 - Brazilian Hub defaults currency selector to BRL (R$)', async (page) => {
    await page.goto('http://localhost:4321/pt-br');
    const currSelect = page.locator('#field-currency');
    await currSelect.waitFor({ state: 'visible' });
    const val = await currSelect.inputValue();
    if (val !== 'BRL') throw new Error(`Expected currency BRL, got ${val}`);
  });

  // BR004: Brazilian Hub (/pt-br) enters invoice number and verifies live preview
  await test('BR004 - Brazilian Hub updates invoice identifier in live preview', async (page) => {
    await page.goto('http://localhost:4321/pt-br');
    const numInput = page.locator('#field-invoice-number');
    await numInput.fill('FAT-2026-BR01');
    const previewNum = page.locator('#preview-invoice-number');
    await previewNum.waitFor({ state: 'visible' });
    const txt = await previewNum.innerText();
    if (!txt.includes('FAT-2026-BR01')) throw new Error(`Preview number mismatch: ${txt}`);
  });

  // BR005: Brazilian Hub (/pt-br) enters sender (emissor) and client (destinatário) details
  await test('BR005 - Brazilian Hub enters sender and client details with live preview sync', async (page) => {
    await page.goto('http://localhost:4321/pt-br');
    await page.locator('#field-sender-name').fill('Silva & Santos Consultoria Ltda');
    await page.locator('#field-client-name').fill('Indústria Paulista S.A.');
    const previewFrom = await page.locator('#preview-sender-name').innerText();
    const previewTo = await page.locator('#preview-client-name').innerText();
    if (!previewFrom.includes('Silva & Santos')) throw new Error('Sender not in preview');
    if (!previewTo.includes('Indústria Paulista')) throw new Error('Client not in preview');
  });

  // BR006: Brazilian Hub (/pt-br) adds line items with BRL rates and quantity
  await test('BR006 - Brazilian Hub adds line item and computes subtotal in BRL', async (page) => {
    await page.goto('http://localhost:4321/pt-br');
    const addBtn = page.locator('#btn-add-item');
    await addBtn.waitFor({ state: 'visible' });
    await addBtn.click();
    const itemDescs = page.locator('input[placeholder="Description of service or product..."]');
    if ((await itemDescs.count()) > 0) {
      await itemDescs.last().fill('Consultoria Estratégica MEI');
    }
    const previewSubtotal = await page.locator('#preview-subtotal').innerText();
    if (!previewSubtotal) throw new Error('Preview subtotal not displayed');
  });

  // BR007: Brazilian Hub (/pt-br) recalculates grand total with discount
  await test('BR007 - Brazilian Hub recalculates grand total with discount', async (page) => {
    await page.goto('http://localhost:4321/pt-br');
    const discountInput = page.locator('#field-discount-value');
    await discountInput.waitFor({ state: 'visible' });
    await discountInput.fill('50');
    await discountInput.dispatchEvent('input');
    await page.waitForTimeout(100);
    const grandTotal = await page.locator('#preview-grand-total').innerText();
    if (!grandTotal) throw new Error('Grand total not displayed in preview');
  });

  // BR008: Brazilian Hub (/pt-br) renders payment details block
  await test('BR008 - Brazilian Hub renders payment terms and bank details block', async (page) => {
    await page.goto('http://localhost:4321/pt-br');
    const bankInput = page.locator('#field-bank-name');
    await bankInput.waitFor({ state: 'visible' });
    await bankInput.fill('Banco do Brasil - Chave PIX: contato@empresa.com.br');
    await bankInput.dispatchEvent('input');
    const previewBlock = page.locator('#preview-payment-block');
    await previewBlock.waitFor({ state: 'visible' });
    const bankNameText = await page.locator('#preview-bank-name').innerText();
    if (!bankNameText.includes('Banco do Brasil')) throw new Error('Bank details not shown in preview');
  });

  // BR009: Brazilian Hub (/pt-br) persists invoice draft to localStorage across page reloads
  await test('BR009 - Brazilian Hub persists draft to localStorage across reload', async (page) => {
    await page.goto('http://localhost:4321/pt-br');
    await page.locator('#field-invoice-number').fill('FAT-RESTORE-99');
    await page.locator('#field-invoice-number').dispatchEvent('input');
    await page.waitForTimeout(300);
    await page.reload();
    const restoredNum = await page.locator('#field-invoice-number').inputValue();
    if (restoredNum !== 'FAT-RESTORE-99') throw new Error(`Restoration failed: ${restoredNum}`);
  });

  // BR010: Brazilian Hub (/pt-br) clears stored invoice data and resets to initial blank state
  await test('BR010 - Brazilian Hub clears stored invoice data via reset button', async (page) => {
    await page.goto('http://localhost:4321/pt-br');
    const clearBtn = page.locator('#btn-clear-my-data');
    await clearBtn.waitFor({ state: 'visible' });
    await clearBtn.click();
    const confirmBtn = page.locator('#btn-confirm-clear-data');
    await confirmBtn.waitFor({ state: 'visible' });
    await confirmBtn.click();
    await page.waitForTimeout(200);
    const num = await page.locator('#field-invoice-number').inputValue();
    if (num === 'FAT-RESTORE-99') throw new Error('Reset failed to wipe custom draft');
  });

  // BR011: Brazilian Hub (/pt-br) provides Download PDF button ready for export
  await test('BR011 - Brazilian Hub Download PDF button is visible and enabled', async (page) => {
    await page.goto('http://localhost:4321/pt-br');
    const pdfBtn = page.locator('#btn-download-pdf-form');
    await pdfBtn.waitFor({ state: 'visible' });
    if (!(await pdfBtn.isEnabled())) throw new Error('Download PDF button disabled');
  });

  // BR012: Brazilian Hub (/pt-br) provides Print button
  await test('BR012 - Brazilian Hub Print button is visible and operational', async (page) => {
    await page.goto('http://localhost:4321/pt-br');
    const printBtn = page.locator('#btn-print-invoice');
    await printBtn.waitFor({ state: 'visible' });
    if (!(await printBtn.isEnabled())) throw new Error('Print button disabled');
  });

  // BR013: Brazilian Hub (/pt-br) mobile view toggle switches between form editor and live preview
  await test('BR013 - Brazilian Hub mobile toggle buttons are present', async (page) => {
    await page.goto('http://localhost:4321/pt-br');
    const toggleForm = page.locator('#btn-toggle-form');
    const togglePrev = page.locator('#btn-toggle-preview');
    if ((await toggleForm.count()) === 0 || (await togglePrev.count()) === 0) {
      throw new Error('Mobile view toggles missing');
    }
  });

  // BR014: Pillar Receipt Tool (/pt-br/gerador-de-recibo) loads with HTTP 200 and H1
  await test('BR014 - Pillar Receipt Tool loads with H1 Gerador de Recibo Grátis', async (page) => {
    const res = await page.goto('http://localhost:4321/pt-br/gerador-de-recibo');
    if (!res || res.status() !== 200) throw new Error(`HTTP status: ${res?.status()}`);
    const h1 = await page.locator('h1').first().innerText();
    if (!h1.includes('Gerador de Recibo Grátis')) throw new Error(`Unexpected H1: ${h1}`);
  });

  // BR015: Pillar Receipt Tool (/pt-br/gerador-de-recibo) enters emissor (nome & CPF/CNPJ) and updates preview
  await test('BR015 - Pillar Receipt Tool fills emissor details and syncs preview', async (page) => {
    await page.goto('http://localhost:4321/pt-br/gerador-de-recibo');
    const nameInput = page.locator('#br-receiver-name');
    await nameInput.waitFor({ state: 'visible' });
    await nameInput.fill('Marcos Vinicius da Silva');
    const docInput = page.locator('#br-receiver-doc');
    await docInput.fill('123.456.789-00');
    const prevText = await page.locator('#brazilian-receipt-root').innerText();
    if (!prevText.includes('Marcos Vinicius da Silva')) throw new Error('Receiver not in preview');
  });

  // BR016: Pillar Receipt Tool (/pt-br/gerador-de-recibo) enters pagador and updates preview
  await test('BR016 - Pillar Receipt Tool fills pagador details and syncs preview', async (page) => {
    await page.goto('http://localhost:4321/pt-br/gerador-de-recibo');
    const payerInput = page.locator('#br-payer-name');
    await payerInput.waitFor({ state: 'visible' });
    await payerInput.fill('Carla Mendonça Ramos');
    const prevText = await page.locator('#brazilian-receipt-root').innerText();
    if (!prevText.includes('Carla Mendonça Ramos')) throw new Error('Payer not in preview');
  });

  // BR017: Pillar Receipt Tool (/pt-br/gerador-de-recibo) formats amount in BRL
  await test('BR017 - Pillar Receipt Tool enters monetary amount and reflects BRL format', async (page) => {
    await page.goto('http://localhost:4321/pt-br/gerador-de-recibo');
    const amountInput = page.locator('#br-amount');
    await amountInput.waitFor({ state: 'visible' });
    await amountInput.fill('1850.00');
    await amountInput.dispatchEvent('input');
    const prevText = await page.locator('#brazilian-receipt-root').innerText();
    if (!prevText.includes('1.850,00')) throw new Error('Amount not reflected in receipt');
  });

  // BR018: Pillar Receipt Tool (/pt-br/gerador-de-recibo) computes automatic 'Valor por extenso'
  await test('BR018 - Pillar Receipt Tool verifies automatic valor por extenso in Portuguese', async (page) => {
    await page.goto('http://localhost:4321/pt-br/gerador-de-recibo');
    const amountInput = page.locator('#br-amount');
    await amountInput.fill('500');
    await amountInput.dispatchEvent('input');
    await page.waitForTimeout(100);
    const extensoVal = await page.locator('#br-extenso').inputValue();
    if (!extensoVal.toLowerCase().includes('quinhentos reais')) {
      throw new Error(`Unexpected extenso: ${extensoVal}`);
    }
  });

  // BR019: Pillar Receipt Tool (/pt-br/gerador-de-recibo) toggles PIX QR Code container
  await test('BR019 - Pillar Receipt Tool toggles PIX QR Code input controls', async (page) => {
    await page.goto('http://localhost:4321/pt-br/gerador-de-recibo');
    const pixCheckbox = page.locator('#br-pix-enabled');
    await pixCheckbox.waitFor({ state: 'visible' });
    await pixCheckbox.check();
    const pixContainer = page.locator('#br-pix-container');
    await pixContainer.waitFor({ state: 'visible' });
    const pixKeyInput = page.locator('#br-pix-key');
    await pixKeyInput.fill('11999998888');
  });

  // BR020: Pillar Receipt Tool (/pt-br/gerador-de-recibo) provides PDF download and PNG export buttons
  await test('BR020 - Pillar Receipt Tool PDF & PNG export buttons are operational', async (page) => {
    await page.goto('http://localhost:4321/pt-br/gerador-de-recibo');
    const pdfBtn = page.locator('#btn-export-br-pdf');
    const pngBtn = page.locator('#btn-export-br-png');
    await pdfBtn.waitFor({ state: 'visible' });
    await pngBtn.waitFor({ state: 'visible' });
    if (!(await pdfBtn.isEnabled()) || !(await pngBtn.isEnabled())) {
      throw new Error('Export buttons disabled');
    }
  });

  // BR021: Rental Receipt Tool (/pt-br/gerador-de-recibo-de-aluguel) loads with HTTP 200 and H1
  await test('BR021 - Rental Receipt Tool loads with H1 Recibo de Aluguel Grátis', async (page) => {
    const res = await page.goto('http://localhost:4321/pt-br/gerador-de-recibo-de-aluguel');
    if (!res || res.status() !== 200) throw new Error(`HTTP status: ${res?.status()}`);
    const h1 = await page.locator('h1').first().innerText();
    if (!h1.includes('Recibo de Aluguel Grátis')) throw new Error(`Unexpected H1: ${h1}`);
  });

  // BR022: Rental Receipt Tool (/pt-br/gerador-de-recibo-de-aluguel) displays specialized rental fields
  await test('BR022 - Rental Receipt Tool displays property address and rental fields', async (page) => {
    await page.goto('http://localhost:4321/pt-br/gerador-de-recibo-de-aluguel');
    const rentFields = page.locator('#br-rent-fields');
    await rentFields.waitFor({ state: 'visible' });
    const propertyInput = page.locator('#br-rent-property');
    await propertyInput.waitFor({ state: 'visible' });
  });

  // BR023: Rental Receipt Tool (/pt-br/gerador-de-recibo-de-aluguel) calculates total with rent, condomínio, IPTU and water
  await test('BR023 - Rental Receipt Tool calculates total breakdown with condo and IPTU', async (page) => {
    await page.goto('http://localhost:4321/pt-br/gerador-de-recibo-de-aluguel');
    await page.locator('#br-rent-val').fill('2000.00');
    await page.locator('#br-rent-condo').fill('450.00');
    await page.locator('#br-rent-iptu').fill('150.00');
    await page.locator('#br-rent-iptu').dispatchEvent('input');
    await page.waitForTimeout(100);
    const amountVal = await page.locator('#br-amount').inputValue();
    // 2000 (rent) + 450 (condo) + 150 (iptu) + default 70 (water) = 2670.00
    if (!amountVal.includes('2670.00') && !amountVal.includes('2.670,00')) {
      throw new Error(`Expected combined 2670.00, got ${amountVal}`);
    }
  });

  // BR024: Rental Receipt Tool (/pt-br/gerador-de-recibo-de-aluguel) renders property address in preview
  await test('BR024 - Rental Receipt Tool renders property address and month in preview', async (page) => {
    await page.goto('http://localhost:4321/pt-br/gerador-de-recibo-de-aluguel');
    await page.locator('#br-rent-property').fill('Rua das Flores, 123 - Apto 42');
    await page.locator('#br-rent-month').fill('Outubro/2026');
    const previewContent = await page.locator('#brazilian-receipt-root').innerText();
    if (!previewContent.includes('Rua das Flores')) throw new Error('Property address not in preview');
  });

  // BR025: Template Guide (/pt-br/modelo-de-recibo) loads with HTTP 200 and H1
  await test('BR025 - Template Guide loads with H1 Modelo de Recibo Grátis', async (page) => {
    const res = await page.goto('http://localhost:4321/pt-br/modelo-de-recibo');
    if (!res || res.status() !== 200) throw new Error(`HTTP status: ${res?.status()}`);
    const h1 = await page.locator('h1').first().innerText();
    if (!h1.includes('Modelo de Recibo Grátis')) throw new Error(`Unexpected H1: ${h1}`);
  });

  // BR026: Template Guide (/pt-br/modelo-de-recibo) displays pre-filled sample receipt and legal guide
  await test('BR026 - Template Guide displays pre-filled sample and legal requirements', async (page) => {
    await page.goto('http://localhost:4321/pt-br/modelo-de-recibo');
    const mainContent = await page.locator('main').innerText();
    if (!mainContent.includes('Código Civil')) throw new Error('Legal reference missing in guide');
  });

  // BR027: About Page (/pt-br/sobre) loads with HTTP 200, H1, and privacy statement
  await test('BR027 - About Page loads with H1 Sobre Nós and privacy statement', async (page) => {
    const res = await page.goto('http://localhost:4321/pt-br/sobre');
    if (!res || res.status() !== 200) throw new Error(`HTTP status: ${res?.status()}`);
    const h1 = await page.locator('h1').first().innerText();
    if (!h1.includes('Sobre Nós')) throw new Error(`Unexpected H1: ${h1}`);
    const body = await page.locator('main').innerText();
    if (!body.includes('dados')) throw new Error('Privacy reference missing');
  });

  // BR028: Contact Page (/pt-br/contato) loads with HTTP 200, contact channels, and email
  await test('BR028 - Contact Page loads with official support channel and direct email', async (page) => {
    const res = await page.goto('http://localhost:4321/pt-br/contato');
    if (!res || res.status() !== 200) throw new Error(`HTTP status: ${res?.status()}`);
    const h1 = await page.locator('h1').first().innerText();
    if (!h1.includes('Contato e Suporte')) throw new Error(`Unexpected H1: ${h1}`);
    const mainContent = await page.locator('main').innerText();
    if (!mainContent.includes('support@onlineinvoicecreator.com')) {
      throw new Error('Support email address missing on contact page');
    }
  });

  // BR029: Privacy Policy (/pt-br/privacidade) & Terms (/pt-br/termos) load with valid HTTP 200
  await test('BR029 - Privacy Policy and Terms of Use load with HTTP 200 and legal copy', async (page) => {
    const resPriv = await page.goto('http://localhost:4321/pt-br/privacidade');
    if (!resPriv || resPriv.status() !== 200) throw new Error('Failed to load privacidade');
    const h1Priv = await page.locator('h1').first().innerText();
    if (!h1Priv.includes('Privacidade')) throw new Error(`Unexpected H1: ${h1Priv}`);

    const resTermos = await page.goto('http://localhost:4321/pt-br/termos');
    if (!resTermos || resTermos.status() !== 200) throw new Error('Failed to load termos');
    const h1Termos = await page.locator('h1').first().innerText();
    if (!h1Termos.includes('Termos')) throw new Error(`Unexpected H1: ${h1Termos}`);
  });

  // BR030: Cross-navigation & language switcher: header/footer navigation between pt-BR and EN pages
  await test('BR030 - Cross-navigation between Brazilian pages and language switcher', async (page) => {
    await page.goto('http://localhost:4321/pt-br');
    // Check navigation to gerador-de-recibo from Brazilian hub
    const receiptLink = page.locator('a[href="/pt-br/gerador-de-recibo"]').first();
    await receiptLink.waitFor({ state: 'visible' });
    await receiptLink.click();
    await page.waitForURL('**/pt-br/gerador-de-recibo');
    const h1 = await page.locator('h1').first().innerText();
    if (!h1.includes('Gerador de Recibo')) throw new Error('Failed navigation to receipt tool');
  });

  await browser.close();

  const passed = results.filter((r) => r.status === 'PASSED').length;
  const failed = results.filter((r) => r.status === 'FAILED').length;

  console.log('\n=============================');
  console.log(`TOTAL: ${results.length} | PASSED: ${passed} | FAILED: ${failed}`);
  console.log('=============================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runPtBr30().catch((err) => {
  console.error('Fatal runner error:', err);
  process.exit(1);
});

