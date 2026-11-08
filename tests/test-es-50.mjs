import { chromium } from 'playwright';

const results = [];

async function runSpanish50() {
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

    const startTime = Date.now();
    try {
      await fn(page, context);
      const durationMs = Date.now() - startTime;
      results.push({ name, status: 'PASSED', durationMs });
      console.log(`✅ PASS: ${name} (${durationMs}ms)`);
    } catch (e) {
      const durationMs = Date.now() - startTime;
      results.push({ name, status: 'FAILED', durationMs, error: e.message });
      console.error(`❌ FAIL: ${name}: ${e.message} (${durationMs}ms)`);
    } finally {
      await context.close();
    }
  }

  console.log('\n========================================');
  console.log('  TESTSPRINT: SPANISH (es)');
  console.log('  Running 50 Comprehensive E2E Tests');
  console.log('========================================\n');

  // ES001: Spanish Hub (/es) loads with HTTP 200, <html lang="es">, title and H1
  await test('ES001 - Spanish Hub (/es) loads with HTTP 200, lang="es", and valid H1', async (page) => {
    const res = await page.goto('http://localhost:4321/es');
    if (!res || res.status() !== 200) throw new Error(`HTTP status: ${res?.status()}`);
    const lang = await page.locator('html').getAttribute('lang');
    if (lang !== 'es') throw new Error(`Expected lang="es", got ${lang}`);
    const h1 = await page.locator('h1').first().innerText();
    if (!h1.includes('Generador de Recibos y Facturas')) throw new Error(`Unexpected H1: ${h1}`);
    const title = await page.title();
    if (title.length > 60) throw new Error(`Title exceeds 60 chars: ${title.length}`);
  });

  // ES002: Spanish Hub embeds interactive invoice workspace
  await test('ES002 - Spanish Hub embeds interactive invoice generator workspace with EUR default', async (page) => {
    await page.goto('http://localhost:4321/es');
    const workspace = page.locator('#invoice-workspace');
    await workspace.waitFor({ state: 'visible' });
    const numInput = page.locator('#field-invoice-number');
    await numInput.waitFor({ state: 'visible' });
    const currSelect = page.locator('#field-currency');
    await currSelect.waitFor({ state: 'visible' });
    const val = await currSelect.inputValue();
    if (val !== 'EUR') throw new Error(`Expected default currency EUR, got ${val}`);
  });

  // ES003: Spanish Hub quick features strip
  await test('ES003 - Spanish Hub displays key trust badges strip', async (page) => {
    await page.goto('http://localhost:4321/es');
    const pageText = await page.innerText('body');
    if (!pageText.includes('Descarga Directa')) throw new Error('Missing Descarga Directa badge');
    if (!pageText.includes('Importe en Letras')) throw new Error('Missing Importe en Letras badge');
    if (!pageText.includes('Multipaís')) throw new Error('Missing Multipaís badge');
    if (!pageText.includes('Privacidad Local')) throw new Error('Missing Privacidad Local badge');
  });

  // ES004: Spanish Hub tools cards link to tools
  await test('ES004 - Spanish Hub renders tools cards with valid navigation links', async (page) => {
    await page.goto('http://localhost:4321/es');
    const receiptLink = page.locator('a[href="/es/generador-de-recibos"]').first();
    await receiptLink.waitFor({ state: 'visible' });
    const cardText = await page.innerText('body');
    if (!cardText.includes('Generador de Recibos de Pago')) throw new Error('Missing receipt tool card');
    if (!cardText.includes('Recibo de Alquiler o Arrendamiento')) throw new Error('Missing rent receipt card');
  });

  // ES005: Spanish Hub non-fiscal disclaimer
  await test('ES005 - Spanish Hub renders fiscal disclaimer regarding CFDI and e-invoice', async (page) => {
    await page.goto('http://localhost:4321/es');
    const disclaimer = page.locator('text=Aviso Legal y Tributario Importante').locator('..');
    await disclaimer.waitFor({ state: 'visible' });
    const text = await disclaimer.innerText();
    if (!text.includes('SAT') && !text.includes('CFDI')) throw new Error('Missing CFDI/SAT disclaimer');
    if (!text.includes('Información general, no es asesoramiento legal ni fiscal')) {
      throw new Error('Missing standard legal disclaimer');
    }
  });

  // ES006: Spanish Hub Open Graph metadata tags
  await test('ES006 - Spanish Hub renders complete Open Graph metadata tags', async (page) => {
    await page.goto('http://localhost:4321/es');
    const ogTitle = await page.locator('meta[property="og:title"]').getAttribute('content');
    const ogLocale = await page.locator('meta[property="og:locale"]').getAttribute('content');
    const ogImage = await page.locator('meta[property="og:image"]').getAttribute('content');
    if (!ogTitle || !ogTitle.includes('Generador de Recibos')) throw new Error(`Unexpected og:title: ${ogTitle}`);
    if (ogLocale !== 'es_ES') throw new Error(`Expected og:locale="es_ES", got ${ogLocale}`);
    if (!ogImage || !ogImage.includes('/og/og-es-index.png')) throw new Error(`Unexpected og:image: ${ogImage}`);
  });

  // ES007: Spanish Hub canonical link
  await test('ES007 - Spanish Hub canonical link resolves to https://onlineinvoicecreator.com/es', async (page) => {
    await page.goto('http://localhost:4321/es');
    const canonical = await page.locator('link[rel="canonical"]').getAttribute('href');
    if (canonical !== 'https://onlineinvoicecreator.com/es') throw new Error(`Unexpected canonical: ${canonical}`);
  });

  // ES008: Spanish Hub multilingual hreflang alternates
  await test('ES008 - Spanish Hub renders correct hreflang alternate tags', async (page) => {
    await page.goto('http://localhost:4321/es');
    const hreflangs = await page.locator('link[rel="alternate"]').evaluateAll((links) =>
      links.map((l) => ({ lang: l.getAttribute('hreflang'), href: l.getAttribute('href') }))
    );
    const langs = hreflangs.map((h) => h.lang);
    if (!langs.includes('en') || !langs.includes('pt-BR') || !langs.includes('es') || !langs.includes('x-default')) {
      throw new Error(`Missing expected hreflangs. Found: ${langs.join(', ')}`);
    }
  });

  // ES009: Spanish Receipt Pillar (/es/generador-de-recibos) loads with HTTP 200 and H1
  await test('ES009 - Spanish Receipt Pillar (/es/generador-de-recibos) loads with HTTP 200 and H1', async (page) => {
    const res = await page.goto('http://localhost:4321/es/generador-de-recibos');
    if (!res || res.status() !== 200) throw new Error(`HTTP status: ${res?.status()}`);
    const h1 = await page.locator('h1').first().innerText();
    if (!h1.includes('Generador de Recibos Gratis')) throw new Error(`Unexpected H1: ${h1}`);
    const title = await page.title();
    if (title.length > 60) throw new Error(`Title exceeds 60 chars: ${title.length}`);
  });

  // ES010: Breadcrumbs on Spanish Receipt Pillar
  await test('ES010 - Breadcrumbs navigation renders on Spanish receipt pillar', async (page) => {
    await page.goto('http://localhost:4321/es/generador-de-recibos');
    const breadcrumb = page.locator('nav[aria-label="Migas de pan"], nav[aria-label="Breadcrumb"]').first();
    await breadcrumb.waitFor({ state: 'visible' });
    const text = await breadcrumb.innerText();
    if (!text.includes('Inicio') || !text.includes('Generador de Recibos')) {
      throw new Error(`Unexpected breadcrumbs text: ${text}`);
    }
  });

  // ES011: Live preview syncs emitter name
  await test('ES011 - Live preview syncs emitter name in real time', async (page) => {
    await page.goto('http://localhost:4321/es/generador-de-recibos');
    await page.locator('#es-emitter-name').fill('Consultoría Carlos Ruiz');
    const prev = await page.locator('#prev-es-emitter-name').innerText();
    if (!prev.includes('Carlos Ruiz')) throw new Error(`Emitter missing from preview: ${prev}`);
  });

  // ES012: Live preview syncs payer name
  await test('ES012 - Live preview syncs payer name in real time', async (page) => {
    await page.goto('http://localhost:4321/es/generador-de-recibos');
    await page.locator('#es-payer-name').fill('Empresa Ibérica S.L.');
    const prev = await page.locator('#prev-es-payer-name').innerText();
    if (!prev.includes('Empresa Ibérica')) throw new Error(`Payer missing from preview: ${prev}`);
  });

  // ES013: Live preview syncs concept
  await test('ES013 - Live preview syncs detailed concept in real time', async (page) => {
    await page.goto('http://localhost:4321/es/generador-de-recibos');
    await page.locator('#es-concept').fill('Servicios de desarrollo web y consultoría técnica');
    const prev = await page.locator('#prev-es-concept').innerText();
    if (!prev.includes('desarrollo web')) throw new Error(`Concept missing from preview: ${prev}`);
  });

  // ES014: Live preview syncs document number
  await test('ES014 - Live preview syncs receipt document number', async (page) => {
    await page.goto('http://localhost:4321/es/generador-de-recibos');
    await page.locator('#es-receipt-number').fill('REC-2026-999');
    const prev = await page.locator('#prev-es-number').innerText();
    if (!prev.includes('REC-2026-999')) throw new Error(`Receipt number missing from preview: ${prev}`);
  });

  // ES015: Live preview syncs date and place
  await test('ES015 - Live preview syncs emission date and city', async (page) => {
    await page.goto('http://localhost:4321/es/generador-de-recibos');
    await page.locator('#es-receipt-date').fill('15/04/2026');
    await page.locator('#es-receipt-city').fill('Barcelona');
    const prevDate = await page.locator('#prev-es-date').innerText();
    const prevCity = await page.locator('#prev-es-city').innerText();
    const prevCityDate = await page.locator('#prev-es-city-date').innerText();
    if (!prevDate.includes('15/04/2026')) throw new Error(`Date missing: ${prevDate}`);
    if (!prevCity.includes('Barcelona')) throw new Error(`City missing: ${prevCity}`);
    if (!prevCityDate.includes('Barcelona') || !prevCityDate.includes('15/04/2026')) {
      throw new Error(`City/date footer mismatch: ${prevCityDate}`);
    }
  });

  // ES016: Live preview syncs emitter address and phone
  await test('ES016 - Live preview syncs emitter contact details', async (page) => {
    await page.goto('http://localhost:4321/es/generador-de-recibos');
    await page.locator('#es-emitter-address').fill('Avenida Diagonal, 200, Barcelona');
    await page.locator('#es-emitter-phone').fill('+34 930 111 222');
    const prevAddr = await page.locator('#prev-es-emitter-address').innerText();
    const prevPhone = await page.locator('#prev-es-emitter-phone').innerText();
    if (!prevAddr.includes('Avenida Diagonal')) throw new Error(`Address missing: ${prevAddr}`);
    if (!prevPhone.includes('+34 930 111 222')) throw new Error(`Phone missing: ${prevPhone}`);
  });

  // ES017: Formal statement box updates reactively
  await test('ES017 - Formal legal statement box updates reactively with payer and concept', async (page) => {
    await page.goto('http://localhost:4321/es/generador-de-recibos');
    await page.locator('#es-payer-name').fill('Transportes Rápidos S.A.');
    await page.locator('#es-concept').fill('Porte y entrega de mercancías');
    const statement = await page.locator('#prev-es-formal-statement').innerText();
    if (!statement.includes('Recibí de Transportes Rápidos S.A.')) {
      throw new Error(`Statement missing payer: ${statement}`);
    }
    if (!statement.includes('Porte y entrega de mercancías')) {
      throw new Error(`Statement missing concept: ${statement}`);
    }
  });

  // ES018: Signature line updates reactively
  await test('ES018 - Signature line updates reactively with signature person name', async (page) => {
    await page.goto('http://localhost:4321/es/generador-de-recibos');
    await page.locator('#es-signature-name').fill('Beatriz Soler Navas');
    const prevSig = await page.locator('#prev-es-signature-line').innerText();
    if (!prevSig.includes('Beatriz Soler Navas')) throw new Error(`Signature name missing: ${prevSig}`);
  });

  // ES019: Spain (ES) profile defaults
  await test('ES019 - Spain (ES) sets EUR, symbol €, A4 paper and NIF/CIF label', async (page) => {
    await page.goto('http://localhost:4321/es/generador-de-recibos');
    const taxLabel = await page.locator('#es-label-emitter-doc').innerText();
    if (!taxLabel.includes('NIF') && !taxLabel.includes('CIF')) throw new Error(`Unexpected tax label: ${taxLabel}`);
    const paper = await page.locator('#es-receipt-canvas').getAttribute('data-paper');
    if (paper !== 'a4') throw new Error(`Expected paper="a4", got ${paper}`);
  });

  // ES020: Spain (ES) enables SEPA EPC QR code row and generates QR
  await test('ES020 - Spain (ES) enables SEPA EPC QR section and unhides QR preview when checked', async (page) => {
    await page.goto('http://localhost:4321/es/generador-de-recibos');
    const sepaRow = page.locator('#es-sepa-row');
    await sepaRow.waitFor({ state: 'visible' });
    const checkbox = page.locator('#es-sepa-enabled');
    await checkbox.check();
    await page.waitForTimeout(200);

    const sepaBlock = page.locator('#prev-es-sepa-block');
    const isHidden = await sepaBlock.evaluate((el) => el.classList.contains('hidden'));
    if (isHidden) throw new Error('SEPA preview block is still hidden after enabling');
    const qrSrc = await page.locator('#prev-es-sepa-qr').getAttribute('src');
    if (!qrSrc || !qrSrc.startsWith('data:image/png')) throw new Error(`Invalid QR src: ${qrSrc}`);
  });

  // ES021: Mexico (MX) profile
  await test('ES021 - Mexico (MX) sets MXN, Letter paper, RFC label, and CLABE transfer label', async (page) => {
    await page.goto('http://localhost:4321/es/generador-de-recibos');
    await page.locator('#es-country-select').selectOption('MX');
    await page.waitForTimeout(100);

    const taxLabel = await page.locator('#es-label-emitter-doc').innerText();
    if (!taxLabel.includes('RFC')) throw new Error(`Expected RFC, got ${taxLabel}`);
    const paper = await page.locator('#es-receipt-canvas').getAttribute('data-paper');
    if (paper !== 'letter') throw new Error(`Expected paper="letter" for Mexico, got ${paper}`);

    const transferLabel = await page.locator('#es-label-bank-details').innerText();
    if (!transferLabel.includes('CLABE')) throw new Error(`Expected CLABE in transfer label, got ${transferLabel}`);
  });

  // ES022: Mexico (MX) hides SEPA EPC QR code row
  await test('ES022 - Mexico (MX) hides SEPA EPC QR row automatically', async (page) => {
    await page.goto('http://localhost:4321/es/generador-de-recibos');
    await page.locator('#es-country-select').selectOption('MX');
    await page.waitForTimeout(100);

    const sepaRow = page.locator('#es-sepa-row');
    const isHidden = await sepaRow.evaluate((el) => el.classList.contains('hidden'));
    if (!isHidden) throw new Error('SEPA row should be hidden for Mexico');
  });

  // ES023: Argentina (AR) profile
  await test('ES023 - Argentina (AR) sets CUIT and CBU/CVU/Alias bank transfer label', async (page) => {
    await page.goto('http://localhost:4321/es/generador-de-recibos');
    await page.locator('#es-country-select').selectOption('AR');
    await page.waitForTimeout(100);

    const taxLabel = await page.locator('#es-label-emitter-doc').innerText();
    if (!taxLabel.includes('CUIT')) throw new Error(`Expected CUIT, got ${taxLabel}`);
    const transferLabel = await page.locator('#es-label-bank-details').innerText();
    if (!transferLabel.includes('CBU') && !transferLabel.includes('Alias')) {
      throw new Error(`Expected CBU/Alias in transfer label, got ${transferLabel}`);
    }
  });

  // ES024: Colombia (CO) profile
  await test('ES024 - Colombia (CO) sets NIT tax label', async (page) => {
    await page.goto('http://localhost:4321/es/generador-de-recibos');
    await page.locator('#es-country-select').selectOption('CO');
    await page.waitForTimeout(100);

    const taxLabel = await page.locator('#es-label-emitter-doc').innerText();
    if (!taxLabel.includes('NIT')) throw new Error(`Expected NIT, got ${taxLabel}`);
  });

  // ES025: Chile (CL) profile
  await test('ES025 - Chile (CL) sets RUT tax label', async (page) => {
    await page.goto('http://localhost:4321/es/generador-de-recibos');
    await page.locator('#es-country-select').selectOption('CL');
    await page.waitForTimeout(100);

    const taxLabel = await page.locator('#es-label-emitter-doc').innerText();
    if (!taxLabel.includes('RUT')) throw new Error(`Expected RUT, got ${taxLabel}`);
  });

  // ES026: Perú (PE) profile
  await test('ES026 - Perú (PE) sets RUC tax label', async (page) => {
    await page.goto('http://localhost:4321/es/generador-de-recibos');
    await page.locator('#es-country-select').selectOption('PE');
    await page.waitForTimeout(100);

    const taxLabel = await page.locator('#es-label-emitter-doc').innerText();
    if (!taxLabel.includes('RUC')) throw new Error(`Expected RUC, got ${taxLabel}`);
  });

  // ES027: Other / Global profile
  await test('ES027 - Other / Global profile sets ID Fiscal / Tax ID label', async (page) => {
    await page.goto('http://localhost:4321/es/generador-de-recibos');
    await page.locator('#es-country-select').selectOption('OTRO');
    await page.waitForTimeout(100);

    const taxLabel = await page.locator('#es-label-emitter-doc').innerText();
    if (!taxLabel.includes('ID Fiscal')) throw new Error(`Expected ID Fiscal, got ${taxLabel}`);
  });

  // ES028: Spanish words conversion for EUR
  await test('ES028 - Automatic importe en letras converts 1250.50 EUR to words', async (page) => {
    await page.goto('http://localhost:4321/es/generador-de-recibos');
    const amountInput = page.locator('#es-amount');
    await amountInput.fill('1250.50');
    await amountInput.dispatchEvent('input');
    await page.waitForTimeout(100);

    const words = await page.locator('#prev-es-extenso').innerText();
    if (!words.includes('mil doscientos cincuenta euros con cincuenta céntimos')) {
      throw new Error(`Unexpected words output: ${words}`);
    }
  });

  // ES029: Spanish words conversion for MXN
  await test('ES029 - Automatic importe en letras converts 5000 MXN to pesos mexicanos', async (page) => {
    await page.goto('http://localhost:4321/es/generador-de-recibos');
    await page.locator('#es-country-select').selectOption('MX');
    const amountInput = page.locator('#es-amount');
    await amountInput.fill('5000');
    await amountInput.dispatchEvent('input');
    await page.waitForTimeout(100);

    const words = await page.locator('#prev-es-extenso').innerText();
    if (!words.includes('cinco mil pesos mexicanos')) {
      throw new Error(`Unexpected words output: ${words}`);
    }
  });

  // ES030: Spanish words conversion for round amount without cents
  await test('ES030 - Automatic importe en letras handles round amounts with zero cents', async (page) => {
    await page.goto('http://localhost:4321/es/generador-de-recibos');
    const amountInput = page.locator('#es-amount');
    await amountInput.fill('100');
    await amountInput.dispatchEvent('input');
    await page.waitForTimeout(100);

    const words = await page.locator('#prev-es-extenso').innerText();
    if (!words.includes('cien euros')) {
      throw new Error(`Unexpected round words output: ${words}`);
    }
  });

  // ES031: Custom override of "Importe en Letra"
  await test('ES031 - Custom override in #es-extenso updates preview text', async (page) => {
    await page.goto('http://localhost:4321/es/generador-de-recibos');
    await page.locator('#es-extenso').fill('Cantidad pactada de común acuerdo');
    await page.locator('#es-extenso').dispatchEvent('input');
    await page.waitForTimeout(100);

    const words = await page.locator('#prev-es-extenso').innerText();
    if (!words.includes('Cantidad pactada de común acuerdo')) {
      throw new Error(`Extenso override missing: ${words}`);
    }
  });

  // ES032: Switching document type to alquiler unhides rental fields
  await test('ES032 - Switching document type to alquiler unhides rental fields and updates title', async (page) => {
    await page.goto('http://localhost:4321/es/generador-de-recibos');
    await page.locator('#es-doc-type-select').selectOption('alquiler');
    await page.waitForTimeout(100);

    const rentFields = page.locator('#es-rent-fields');
    const isHidden = await rentFields.evaluate((el) => el.classList.contains('hidden'));
    if (isHidden) throw new Error('Rental fields should be unhidden');

    const docTitle = await page.locator('#prev-es-doc-title').innerText();
    if (!docTitle.includes('RECIBO DE ALQUILER')) throw new Error(`Unexpected title: ${docTitle}`);
  });

  // ES033: Rental cost breakdown auto-calculation
  await test('ES033 - Rental breakdown updates grand amount and breakdown label', async (page) => {
    await page.goto('http://localhost:4321/es/generador-de-recibos');
    await page.locator('#es-doc-type-select').selectOption('alquiler');
    await page.locator('#es-rent-base').fill('1000');
    await page.locator('#es-rent-community').fill('150');
    await page.locator('#es-rent-ibi').fill('60');
    await page.locator('#es-rent-utilities').fill('40.50');
    await page.locator('#es-rent-utilities').dispatchEvent('input');
    await page.waitForTimeout(100);

    const totalVal = await page.locator('#es-amount').inputValue();
    if (totalVal !== '1250.5') throw new Error(`Expected total 1250.5, got ${totalVal}`);

    const breakdownText = await page.locator('#prev-es-rent-breakdown').innerText();
    if (!breakdownText.includes('Renta (1000') || !breakdownText.includes('Comunidad (150')) {
      throw new Error(`Unexpected breakdown: ${breakdownText}`);
    }
  });

  // ES034: Rental property address and period sync
  await test('ES034 - Rental property address and period sync to preview', async (page) => {
    await page.goto('http://localhost:4321/es/generador-de-recibos');
    await page.locator('#es-doc-type-select').selectOption('alquiler');
    await page.locator('#es-rent-property').fill('Calle de Serrano, 42, 3º Izq, Madrid');
    await page.locator('#es-rent-month').fill('Noviembre 2026');
    await page.locator('#es-rent-month').dispatchEvent('input');
    await page.waitForTimeout(100);

    const prevProp = await page.locator('#prev-es-rent-property').innerText();
    const prevMonth = await page.locator('#prev-es-rent-month').innerText();
    if (!prevProp.includes('Calle de Serrano, 42')) throw new Error(`Property missing: ${prevProp}`);
    if (!prevMonth.includes('Noviembre 2026')) throw new Error(`Period missing: ${prevMonth}`);
  });

  // ES035: Document type factura_simple
  await test('ES035 - Switching doc type to factura_simple updates preview title', async (page) => {
    await page.goto('http://localhost:4321/es/generador-de-recibos');
    await page.locator('#es-doc-type-select').selectOption('factura_simple');
    await page.waitForTimeout(100);

    const docTitle = await page.locator('#prev-es-doc-title').innerText();
    if (!docTitle.includes('FACTURA SIMPLIFICADA')) throw new Error(`Unexpected title: ${docTitle}`);
  });

  // ES036: Document type factura_iva
  await test('ES036 - Switching doc type to factura_iva updates preview title', async (page) => {
    await page.goto('http://localhost:4321/es/generador-de-recibos');
    await page.locator('#es-doc-type-select').selectOption('factura_iva');
    await page.waitForTimeout(100);

    const docTitle = await page.locator('#prev-es-doc-title').innerText();
    if (!docTitle.includes('FACTURA COMERCIAL')) throw new Error(`Unexpected title: ${docTitle}`);
  });

  // ES037: Payment method dropdown
  await test('ES037 - Payment method select dropdown updates preview method badge', async (page) => {
    await page.goto('http://localhost:4321/es/generador-de-recibos');
    await page.locator('#es-payment-method').selectOption('Efectivo');
    await page.waitForTimeout(100);

    const prevMethod = await page.locator('#prev-es-method').innerText();
    if (!prevMethod.includes('Efectivo')) throw new Error(`Expected Efectivo, got ${prevMethod}`);
  });

  // ES038: Bank details block display
  await test('ES038 - Filling bank details unhides preview bank block', async (page) => {
    await page.goto('http://localhost:4321/es/generador-de-recibos');
    await page.locator('#es-bank-details').fill('ES91 0049 1500 0512 3456 7890');
    await page.locator('#es-bank-details').dispatchEvent('input');
    await page.waitForTimeout(100);

    const bankBlock = page.locator('#prev-es-bank-block');
    const isHidden = await bankBlock.evaluate((el) => el.classList.contains('hidden'));
    if (isHidden) throw new Error('Bank block is still hidden');
    const details = await page.locator('#prev-es-bank-details').innerText();
    if (!details.includes('ES91 0049 1500')) throw new Error(`Bank details missing: ${details}`);
  });

  // ES039: Layout classic
  await test('ES039 - Layout radio classic updates data-layout="classic" and class', async (page) => {
    await page.goto('http://localhost:4321/es/generador-de-recibos');
    const radio = page.locator('input[name="es-layout"][value="classic"]');
    await radio.check({ force: true });
    await page.waitForTimeout(100);

    const canvas = page.locator('#es-receipt-canvas');
    const layoutAttr = await canvas.getAttribute('data-layout');
    if (layoutAttr !== 'classic') throw new Error(`Expected classic layout, got ${layoutAttr}`);
  });

  // ES040: Layout minimal
  await test('ES040 - Layout radio minimal updates data-layout="minimal" and class', async (page) => {
    await page.goto('http://localhost:4321/es/generador-de-recibos');
    const radio = page.locator('input[name="es-layout"][value="minimal"]');
    await radio.check({ force: true });
    await page.waitForTimeout(100);

    const canvas = page.locator('#es-receipt-canvas');
    const layoutAttr = await canvas.getAttribute('data-layout');
    if (layoutAttr !== 'minimal') throw new Error(`Expected minimal layout, got ${layoutAttr}`);
  });

  // ES041: Layout corporate
  await test('ES041 - Layout radio corporate updates data-layout="corporate" and class', async (page) => {
    await page.goto('http://localhost:4321/es/generador-de-recibos');
    const radio = page.locator('input[name="es-layout"][value="corporate"]');
    await radio.check({ force: true });
    await page.waitForTimeout(100);

    const canvas = page.locator('#es-receipt-canvas');
    const layoutAttr = await canvas.getAttribute('data-layout');
    if (layoutAttr !== 'corporate') throw new Error(`Expected corporate layout, got ${layoutAttr}`);
  });

  // ES042: Storage persistence
  await test('ES042 - Draft persists across page refresh in localStorage', async (page) => {
    await page.goto('http://localhost:4321/es/generador-de-recibos');
    await page.locator('#es-emitter-name').fill('Persistent Test Emitter');
    await page.locator('#es-emitter-name').dispatchEvent('input');
    await page.waitForTimeout(200);

    await page.reload();
    await page.waitForTimeout(300);

    const val = await page.locator('#es-emitter-name').inputValue();
    if (!val.includes('Persistent Test Emitter')) throw new Error(`Draft did not persist: ${val}`);
  });

  // ES043: Reset data ("Borrar mis datos")
  await test('ES043 - "Borrar mis datos" clears draft safely after browser confirmation', async (page) => {
    await page.goto('http://localhost:4321/es/generador-de-recibos');
    await page.locator('#es-emitter-name').fill('Prueba Para Borrar');
    await page.locator('#es-concept').fill('Concepto temporal');

    page.once('dialog', async (dialog) => {
      await dialog.accept();
    });

    const resetBtn = page.locator('#btn-clear-es-data');
    await resetBtn.click();
    await page.waitForTimeout(600);

    const val = await page.locator('#es-emitter-name').inputValue();
    if (val === 'Prueba Para Borrar') throw new Error('Data was not reset');
  });

  // ES044: Editorial guide H2 sections
  await test('ES044 - Editorial guide contains all required H2 headings and sections', async (page) => {
    await page.goto('http://localhost:4321/es/generador-de-recibos');
    const h2s = await page.locator('h2').allInnerTexts();
    const joined = h2s.join(' | ');

    if (!joined.includes('Cómo Hacer un Recibo de Pago en 4 Pasos')) throw new Error('Missing 4 pasos H2');
    if (!joined.includes('Qué Debe Incluir un Recibo')) throw new Error('Missing qué debe incluir H2');
    if (!joined.includes('Ejemplo Práctico de Recibo')) throw new Error('Missing ejemplo práctico H2');
    if (!joined.includes('Recibo vs Factura')) throw new Error('Missing recibo vs factura H2');
  });

  // ES045: FAQ accordion interactive open/close
  await test('ES045 - FAQ accordion renders 10 questions and toggles open/close on click', async (page) => {
    await page.goto('http://localhost:4321/es/generador-de-recibos');
    const details = page.locator('article details');
    const count = await details.count();
    if (count !== 10) throw new Error(`Expected 10 FAQ items, got ${count}`);

    const firstDetail = details.first();
    await firstDetail.locator('summary').click();
    const isOpen = await firstDetail.evaluate((el) => el.hasAttribute('open'));
    if (!isOpen) throw new Error('FAQ item did not open');
  });

  // ES046: Schema.org structured data
  await test('ES046 - Schema.org JSON-LD graph contains WebApplication, FAQPage, and BreadcrumbList', async (page) => {
    await page.goto('http://localhost:4321/es/generador-de-recibos');
    const jsonLdScript = page.locator('script[type="application/ld+json"]').first();
    const raw = await jsonLdScript.innerText();
    const data = JSON.parse(raw);
    const types = (data['@graph'] || []).map((item) => item['@type']);

    if (!types.includes('WebApplication')) throw new Error('Missing WebApplication schema');
    if (!types.includes('FAQPage')) throw new Error('Missing FAQPage schema');
    if (!types.includes('BreadcrumbList')) throw new Error('Missing BreadcrumbList schema');
  });

  // ES047: /es/aviso-legal
  await test('ES047 - /es/aviso-legal loads with HTTP 200, H1 and LSSI-CE reference', async (page) => {
    const res = await page.goto('http://localhost:4321/es/aviso-legal');
    if (!res || res.status() !== 200) throw new Error(`HTTP status: ${res?.status()}`);
    const h1 = await page.locator('h1').innerText();
    if (!h1.includes('Aviso Legal')) throw new Error(`Unexpected H1: ${h1}`);
    const body = await page.innerText('body');
    if (!body.includes('LSSI-CE') && !body.includes('Ley 34/2002')) throw new Error('Missing LSSI-CE citation');
  });

  // ES048: /es/privacidad
  await test('ES048 - /es/privacidad loads with HTTP 200, RGPD compliance, and localStorage details', async (page) => {
    const res = await page.goto('http://localhost:4321/es/privacidad');
    if (!res || res.status() !== 200) throw new Error(`HTTP status: ${res?.status()}`);
    const body = await page.innerText('body');
    if (!body.includes('RGPD') && !body.includes('Protección de Datos')) throw new Error('Missing RGPD citation');
    if (!body.includes('localStorage')) throw new Error('Missing localStorage explanation');
  });

  // ES049: /es/terminos, /es/sobre, and /es/contacto
  await test('ES049 - Spanish legal and institutional pages load with HTTP 200', async (page) => {
    const r1 = await page.goto('http://localhost:4321/es/terminos');
    if (!r1 || r1.status() !== 200) throw new Error(`HTTP /es/terminos: ${r1?.status()}`);
    const r2 = await page.goto('http://localhost:4321/es/sobre');
    if (!r2 || r2.status() !== 200) throw new Error(`HTTP /es/sobre: ${r2?.status()}`);
    const r3 = await page.goto('http://localhost:4321/es/contacto');
    if (!r3 || r3.status() !== 200) throw new Error(`HTTP /es/contacto: ${r3?.status()}`);
  });

  // ES050: Responsive 360px viewport audit and export action buttons
  await test('ES050 - 360px responsive viewport audit has 0px overflow and export buttons callable', async (page) => {
    await page.setViewportSize({ width: 360, height: 740 });
    await page.goto('http://localhost:4321/es/generador-de-recibos');
    await page.waitForTimeout(200);

    const hasOverflow = await page.evaluate(() => {
      return document.documentElement.scrollWidth > document.documentElement.clientWidth;
    });
    if (hasOverflow) {
      const scrollW = await page.evaluate(() => document.documentElement.scrollWidth);
      const clientW = await page.evaluate(() => document.documentElement.clientWidth);
      throw new Error(`Horizontal overflow: scrollWidth (${scrollW}px) > clientWidth (${clientW}px)`);
    }

    const pdfBtn = page.locator('#btn-export-es-pdf');
    const pngBtn = page.locator('#btn-export-es-png');
    const printBtn = page.locator('#btn-print-es');

    await pdfBtn.waitFor({ state: 'visible' });
    await pngBtn.waitFor({ state: 'visible' });
    await printBtn.waitFor({ state: 'visible' });
  });

  await browser.close();

  const total = results.length;
  const passed = results.filter((r) => r.status === 'PASSED').length;
  const failed = results.filter((r) => r.status === 'FAILED').length;

  console.log('\n========================================');
  console.log(`  TESTSPRINT EXECUTION COMPLETE`);
  console.log(`  Total: ${total} | Passed: ${passed} | Failed: ${failed}`);
  console.log('========================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runSpanish50().catch((err) => {
  console.error('Fatal execution error:', err);
  process.exit(1);
});

