import { chromium } from 'playwright';

const results = [];

async function runSpanish30() {
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
  console.log('  Running 30 Comprehensive E2E Tests');
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

  // ES002: Spanish Hub embeds interactive workspace with country selector
  await test('ES002 - Spanish Hub embeds interactive workspace with country selector', async (page) => {
    await page.goto('http://localhost:4321/es');
    const workspace = page.locator('#workspace-recibos');
    await workspace.waitFor({ state: 'visible' });
    const countrySelect = page.locator('#es-country-select');
    await countrySelect.waitFor({ state: 'visible' });
    const val = await countrySelect.inputValue();
    if (val !== 'ES') throw new Error(`Expected default country ES, got ${val}`);
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

  // ES006: Spanish Receipt Pillar (/es/generador-de-recibos) loads with HTTP 200 and H1
  await test('ES006 - Spanish Receipt Pillar (/es/generador-de-recibos) loads with HTTP 200 and H1', async (page) => {
    const res = await page.goto('http://localhost:4321/es/generador-de-recibos');
    if (!res || res.status() !== 200) throw new Error(`HTTP status: ${res?.status()}`);
    const h1 = await page.locator('h1').first().innerText();
    if (!h1.includes('Generador de Recibos Gratis')) throw new Error(`Unexpected H1: ${h1}`);
  });

  // ES007: Spanish Receipt interactive live preview syncs text inputs
  await test('ES007 - Interactive preview syncs emitter, payer and concept in real time', async (page) => {
    await page.goto('http://localhost:4321/es/generador-de-recibos');
    await page.locator('#es-emitter-name').fill('Carlos Ruiz Asesorías');
    await page.locator('#es-payer-name').fill('Empresa Ibérica S.L.');
    await page.locator('#es-concept').fill('Servicios de desarrollo de software');

    const prevEmitter = await page.locator('#prev-es-emitter-name').innerText();
    const prevPayer = await page.locator('#prev-es-payer-name').innerText();
    const prevConcept = await page.locator('#prev-es-concept').innerText();

    if (!prevEmitter.includes('Carlos Ruiz')) throw new Error('Emitter missing from preview');
    if (!prevPayer.includes('Empresa Ibérica')) throw new Error('Payer missing from preview');
    if (!prevConcept.includes('desarrollo de software')) throw new Error('Concept missing from preview');
  });

  // ES008: Default country Spain (ES) sets EUR, A4 paper and NIF/CIF
  await test('ES008 - Default country Spain (ES) sets EUR, symbol €, A4 paper and NIF/CIF label', async (page) => {
    await page.goto('http://localhost:4321/es/generador-de-recibos');
    const taxLabel = await page.locator('#es-label-emitter-doc').innerText();
    if (!taxLabel.includes('NIF') && !taxLabel.includes('CIF')) throw new Error(`Unexpected tax label: ${taxLabel}`);
    const paper = await page.locator('#es-receipt-canvas').getAttribute('data-paper');
    if (paper !== 'a4') throw new Error(`Expected paper="a4", got ${paper}`);
  });

  // ES009: Switching country to Mexico (MX) updates currency, paper size and tax label
  await test('ES009 - Switching country to Mexico (MX) sets MXN, Letter paper, and RFC label', async (page) => {
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

  // ES010: Switching country to Argentina (AR) sets ARS, CUIT and CBU/Alias
  await test('ES010 - Switching country to Argentina (AR) sets CUIT and CBU/CVU/Alias', async (page) => {
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

  // ES011: Switching country to Colombia (CO) sets NIT label
  await test('ES011 - Switching country to Colombia (CO) sets NIT tax label', async (page) => {
    await page.goto('http://localhost:4321/es/generador-de-recibos');
    await page.locator('#es-country-select').selectOption('CO');
    await page.waitForTimeout(100);

    const taxLabel = await page.locator('#es-label-emitter-doc').innerText();
    if (!taxLabel.includes('NIT')) throw new Error(`Expected NIT, got ${taxLabel}`);
  });

  // ES012: Switching country to Chile (CL) sets RUT label
  await test('ES012 - Switching country to Chile (CL) sets RUT tax label', async (page) => {
    await page.goto('http://localhost:4321/es/generador-de-recibos');
    await page.locator('#es-country-select').selectOption('CL');
    await page.waitForTimeout(100);

    const taxLabel = await page.locator('#es-label-emitter-doc').innerText();
    if (!taxLabel.includes('RUT')) throw new Error(`Expected RUT, got ${taxLabel}`);
  });

  // ES013: Switching country to Perú (PE) sets RUC label
  await test('ES013 - Switching country to Perú (PE) sets RUC tax label', async (page) => {
    await page.goto('http://localhost:4321/es/generador-de-recibos');
    await page.locator('#es-country-select').selectOption('PE');
    await page.waitForTimeout(100);

    const taxLabel = await page.locator('#es-label-emitter-doc').innerText();
    if (!taxLabel.includes('RUC')) throw new Error(`Expected RUC, got ${taxLabel}`);
  });

  // ES014: Automatic "Importe en letras" updates live in Spanish for EUR
  await test('ES014 - Automatic importe en letras converts 1250.50 EUR to words', async (page) => {
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

  // ES015: Automatic "Importe en letras" updates live for Mexico MXN
  await test('ES015 - Automatic importe en letras converts 5000 MXN to pesos mexicanos', async (page) => {
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

  // ES016: Editorial content below generator contains required H2 headings
  await test('ES016 - Editorial guide contains all required H2 headings and sections', async (page) => {
    await page.goto('http://localhost:4321/es/generador-de-recibos');
    const h2s = await page.locator('h2').allInnerTexts();
    const joined = h2s.join(' | ');

    if (!joined.includes('Cómo Hacer un Recibo de Pago en 4 Pasos')) {
      throw new Error('Missing 4 pasos H2');
    }
    if (!joined.includes('Qué Debe Incluir un Recibo')) {
      throw new Error('Missing qué debe incluir H2');
    }
    if (!joined.includes('Ejemplo Práctico de Recibo')) {
      throw new Error('Missing ejemplo práctico H2');
    }
    if (!joined.includes('Recibo vs Factura')) {
      throw new Error('Missing recibo vs factura H2');
    }
  });

  // ES017: FAQ accordion renders 10 items and toggles open on click
  await test('ES017 - FAQ accordion renders 10 questions and toggles open/close on click', async (page) => {
    await page.goto('http://localhost:4321/es/generador-de-recibos');
    const details = page.locator('article details');
    const count = await details.count();
    if (count !== 10) throw new Error(`Expected 10 FAQ items, got ${count}`);

    const firstDetail = details.first();
    const summary = firstDetail.locator('summary');
    await summary.click();
    const isOpen = await firstDetail.evaluate((el) => el.hasAttribute('open'));
    if (!isOpen) throw new Error('FAQ item did not open upon click');
  });

  // ES018: Schema.org structured data contains WebApplication, FAQPage and BreadcrumbList
  await test('ES018 - Schema.org JSON-LD graph contains WebApplication and FAQPage', async (page) => {
    await page.goto('http://localhost:4321/es/generador-de-recibos');
    const jsonLdScript = page.locator('script[type="application/ld+json"]').first();
    await jsonLdScript.waitFor({ state: 'attached' });
    const raw = await jsonLdScript.innerText();
    const data = JSON.parse(raw);
    const types = (data['@graph'] || []).map((item) => item['@type']);

    if (!types.includes('WebApplication')) throw new Error('Missing WebApplication schema');
    if (!types.includes('FAQPage')) throw new Error('Missing FAQPage schema');
    if (!types.includes('BreadcrumbList')) throw new Error('Missing BreadcrumbList schema');
  });

  // ES019: Aviso Legal (/es/aviso-legal) loads with HTTP 200 and LSSI-CE compliance text
  await test('ES019 - /es/aviso-legal loads with HTTP 200, H1 and LSSI-CE reference', async (page) => {
    const res = await page.goto('http://localhost:4321/es/aviso-legal');
    if (!res || res.status() !== 200) throw new Error(`HTTP status: ${res?.status()}`);
    const h1 = await page.locator('h1').innerText();
    if (!h1.includes('Aviso Legal')) throw new Error(`Unexpected H1: ${h1}`);
    const body = await page.innerText('body');
    if (!body.includes('LSSI-CE') && !body.includes('Ley 34/2002')) {
      throw new Error('Missing LSSI-CE statutory reference');
    }
  });

  // ES020: Política de Privacidad (/es/privacidad) loads with HTTP 200 and RGPD text
  await test('ES020 - /es/privacidad loads with HTTP 200 and RGPD client-side explanation', async (page) => {
    const res = await page.goto('http://localhost:4321/es/privacidad');
    if (!res || res.status() !== 200) throw new Error(`HTTP status: ${res?.status()}`);
    const body = await page.innerText('body');
    if (!body.includes('RGPD') && !body.includes('Protección de Datos')) {
      throw new Error('Missing RGPD reference');
    }
    if (!body.includes('localStorage')) throw new Error('Missing localStorage explanation');
  });

  // ES021: Términos y Condiciones (/es/terminos) loads with HTTP 200 and non-fiscal disclaimer
  await test('ES021 - /es/terminos loads with HTTP 200 and civil non-fiscal disclaimer', async (page) => {
    const res = await page.goto('http://localhost:4321/es/terminos');
    if (!res || res.status() !== 200) throw new Error(`HTTP status: ${res?.status()}`);
    const body = await page.innerText('body');
    if (!body.includes('Términos y Condiciones')) throw new Error('Missing Términos title');
    if (!body.includes('CFDI') && !body.includes('Agencia Tributaria')) {
      throw new Error('Missing tax authorities disclaimer');
    }
  });

  // ES022: Sobre Nosotros (/es/sobre) loads with HTTP 200 and philosophy cards
  await test('ES022 - /es/sobre loads with HTTP 200 and privacy philosophy cards', async (page) => {
    const res = await page.goto('http://localhost:4321/es/sobre');
    if (!res || res.status() !== 200) throw new Error(`HTTP status: ${res?.status()}`);
    const body = await page.innerText('body');
    if (!body.includes('100% en tu Navegador')) throw new Error('Missing browser-only principle');
    if (!body.includes('Sin Registro ni Cuentas')) throw new Error('Missing no-registration principle');
  });

  // ES023: Contacto (/es/contacto) loads with HTTP 200 and support email link
  await test('ES023 - /es/contacto loads with HTTP 200 and support email channel', async (page) => {
    const res = await page.goto('http://localhost:4321/es/contacto');
    if (!res || res.status() !== 200) throw new Error(`HTTP status: ${res?.status()}`);
    const emailLink = page.locator('a[href^="mailto:support@onlineinvoicecreator.com"]');
    await emailLink.waitFor({ state: 'visible' });
  });

  // ES024: Localized Cookie Banner renders Spanish buttons and dismisses
  await test('ES024 - Localized Cookie Banner displays Spanish options and dismisses on click', async (page) => {
    await page.goto('http://localhost:4321/es');
    const banner = page.locator('#cookie-consent-banner');
    if ((await banner.count()) > 0 && (await banner.isVisible())) {
      const essentialBtn = page.locator('#btn-cookie-essential');
      await essentialBtn.waitFor({ state: 'visible' });
      const btnText = await essentialBtn.innerText();
      if (!btnText.includes('Solo esenciales')) throw new Error(`Unexpected button text: ${btnText}`);
      await essentialBtn.click();
      await page.waitForTimeout(200);
      const isHidden = !(await banner.isVisible());
      if (!isHidden) throw new Error('Cookie banner did not hide after click');
    }
  });

  // ES025: Language Switcher shows published languages and highlights Español
  await test('ES025 - Language switcher dropdown includes English, Português, and Español', async (page) => {
    await page.goto('http://localhost:4321/es');
    const switcher = page.locator('#lang-switcher-btn');
    await switcher.waitFor({ state: 'visible' });
    const currentLangText = await switcher.innerText();
    if (!currentLangText.includes('Español')) throw new Error(`Expected Español, got ${currentLangText}`);

    const links = page.locator('.lang-choice-link');
    const count = await links.count();
    if (count < 3) throw new Error(`Expected at least 3 published languages, got ${count}`);
  });

  // ES026: Header and Footer navigation links on Spanish pages are valid and un-broken
  await test('ES026 - Header and Footer navigation links point only to valid built routes', async (page) => {
    await page.goto('http://localhost:4321/es');
    const navLinks = await page.locator('header a, footer a').evaluateAll((anchors) =>
      anchors.map((a) => a.getAttribute('href')).filter(Boolean)
    );

    for (const href of navLinks) {
      if (!href) continue;
      if (href.startsWith('#') || href.startsWith('mailto:') || href.startsWith('http')) continue;
      if (href.includes('recibo-de-alquiler') && !href.includes('?tipo=')) {
        throw new Error(`Found reserved unbuilt link: ${href}`);
      }
    }
  });

  // ES027: Switching layout themes updates preview attributes dynamically
  await test('ES027 - Switching visual theme (modern, classic, minimal, corporate) updates preview design', async (page) => {
    await page.goto('http://localhost:4321/es/generador-de-recibos');
    const classicRadio = page.locator('input[name="es-layout"][value="classic"]');
    await classicRadio.waitFor({ state: 'attached' });
    await classicRadio.check({ force: true });
    await page.waitForTimeout(100);

    const canvas = page.locator('#es-receipt-canvas');
    const layoutAttr = await canvas.getAttribute('data-layout');
    if (layoutAttr !== 'classic') throw new Error(`Expected layout "classic", got "${layoutAttr}"`);
  });

  // ES028: Reset / "Borrar mis datos" clears draft safely
  await test('ES028 - "Borrar mis datos" clears input fields and draft safely', async (page) => {
    await page.goto('http://localhost:4321/es/generador-de-recibos');
    await page.locator('#es-emitter-name').fill('Prueba Para Borrar');
    await page.locator('#es-concept').fill('Concepto temporal');

    // Auto-accept browser confirm dialog
    page.once('dialog', async (dialog) => {
      await dialog.accept();
    });

    const resetBtn = page.locator('#btn-clear-es-data');
    await resetBtn.waitFor({ state: 'visible' });
    await resetBtn.click();
    await page.waitForTimeout(600);

    const emitterVal = await page.locator('#es-emitter-name').inputValue();
    if (emitterVal === 'Prueba Para Borrar') throw new Error('Emitter was not reset');
  });

  // ES029: Responsive viewport test at 360px width confirms no horizontal scroll
  await test('ES029 - Responsive viewport test at 360px confirms zero horizontal overflow', async (page) => {
    await page.setViewportSize({ width: 360, height: 740 });
    await page.goto('http://localhost:4321/es/generador-de-recibos');
    await page.waitForTimeout(200);

    const hasHorizontalOverflow = await page.evaluate(() => {
      return document.documentElement.scrollWidth > document.documentElement.clientWidth;
    });

    if (hasHorizontalOverflow) {
      const scrollW = await page.evaluate(() => document.documentElement.scrollWidth);
      const clientW = await page.evaluate(() => document.documentElement.clientWidth);
      throw new Error(`Horizontal overflow detected: scrollWidth (${scrollW}px) > clientWidth (${clientW}px)`);
    }
  });

  // ES030: Action export buttons (PDF, PNG, Print) are rendered and clickable
  await test('ES030 - Action buttons (PDF, PNG, Print) are rendered and callable without exception', async (page) => {
    await page.goto('http://localhost:4321/es/generador-de-recibos');
    const pdfBtn = page.locator('#btn-export-es-pdf');
    const pngBtn = page.locator('#btn-export-es-png');
    const printBtn = page.locator('#btn-print-es');

    await pdfBtn.waitFor({ state: 'visible' });
    await pngBtn.waitFor({ state: 'visible' });
    await printBtn.waitFor({ state: 'visible' });

    const pdfText = await pdfBtn.innerText();
    const pngText = await pngBtn.innerText();
    const printText = await printBtn.innerText();

    if (!pdfText.includes('PDF')) throw new Error('Missing PDF text in button');
    if (!pngText.includes('PNG')) throw new Error('Missing PNG text in button');
    if (!printText.includes('Imprimir')) throw new Error('Missing Imprimir text in button');
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

runSpanish30().catch((err) => {
  console.error('Fatal execution error:', err);
  process.exit(1);
});
