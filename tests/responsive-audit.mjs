import { chromium } from 'playwright';

const viewports = [
  { name: 'iPhone SE (375x667)', width: 375, height: 667 },
  { name: 'iPhone 14/15/16 (390x844)', width: 390, height: 844 },
  { name: 'Samsung Galaxy (412x915)', width: 412, height: 915 },
  { name: 'iPad Portrait (768x1024)', width: 768, height: 1024 },
  { name: 'iPad Air/Pro (820x1180)', width: 820, height: 1180 },
  { name: 'Desktop Laptop (1024x768)', width: 1024, height: 768 },
  { name: 'Desktop Full (1440x900)', width: 1440, height: 900 },
];

const urls = [
  '/',
  '/free-online-receipt-generator',
  '/free-rent-receipt-generator',
  '/contractor-invoice-template',
  '/about',
  '/contact',
];

async function runAudit() {
  const browser = await chromium.launch({
    headless: true,
    args: ['--disable-dev-shm-usage'],
  });

  const issues = [];

  for (const vp of viewports) {
    console.log(`\n📱 Checking Viewport: ${vp.name} (${vp.width}x${vp.height})`);
    const context = await browser.newContext({
      viewport: { width: vp.width, height: vp.height },
      deviceScaleFactor: 2,
    });
    const page = await context.newPage();

    for (const urlPath of urls) {
      try {
        await page.goto(`http://localhost:4321${urlPath}`, { waitUntil: 'domcontentloaded' });
        await page.waitForTimeout(300);

        // Check horizontal overflow
        const overflow = await page.evaluate(() => {
          const docWidth = document.documentElement.offsetWidth;
          const scrollWidth = document.documentElement.scrollWidth;
          const bodyScrollWidth = document.body.scrollWidth;
          const maxScroll = Math.max(scrollWidth, bodyScrollWidth);
          const hasOverflow = maxScroll > window.innerWidth + 1; // 1px tolerance

          // Find offending elements if overflow exists
          let offending = [];
          if (hasOverflow) {
            const allElements = document.querySelectorAll('*');
            for (const el of allElements) {
              const rect = el.getBoundingClientRect();
              if (rect.right > window.innerWidth + 1) {
                const tag = el.tagName.toLowerCase();
                const id = el.id ? `#${el.id}` : '';
                const cls = el.className ? `.${String(el.className).split(' ')[0]}` : '';
                offending.push(`${tag}${id}${cls} (right: ${Math.round(rect.right)}px vs vp: ${window.innerWidth}px)`);
                if (offending.length >= 5) break;
              }
            }
          }
          return { hasOverflow, windowWidth: window.innerWidth, maxScroll, offending };
        });

        if (overflow.hasOverflow) {
          const msg = `[${vp.name}] ${urlPath} OVERFLOW: maxScroll ${overflow.maxScroll}px > ${overflow.windowWidth}px. Offending: ${overflow.offending.join(', ')}`;
          issues.push(msg);
          console.error(`  ❌ ${msg}`);
        } else {
          console.log(`  ✅ ${urlPath}: No horizontal overflow (scrollWidth: ${overflow.maxScroll}px)`);
        }

        // Check touch target sizes on mobile viewports (< 600px)
        if (vp.width < 600) {
          const touchIssues = await page.evaluate(() => {
            const smallTargets = [];
            const buttons = document.querySelectorAll('button:not([disabled]):not([aria-hidden="true"]), a.btn, a[role="button"]');
            for (const btn of buttons) {
              if (btn.offsetParent === null) continue; // hidden
              const rect = btn.getBoundingClientRect();
              if (rect.width > 0 && rect.height > 0 && (rect.width < 32 || rect.height < 32)) {
                smallTargets.push(`${btn.tagName.toLowerCase()}${btn.id ? '#' + btn.id : ''} (${Math.round(rect.width)}x${Math.round(rect.height)})`);
                if (smallTargets.length >= 4) break;
              }
            }
            return smallTargets;
          });
          if (touchIssues.length > 0) {
            console.warn(`  ⚠️ [${vp.name}] ${urlPath} Small tap targets: ${touchIssues.join(', ')}`);
          }
        }
      } catch (err) {
        console.error(`  💥 Error on ${urlPath}:`, err.message);
      }
    }
    await context.close();
  }

  await browser.close();

  console.log('\n=======================================');
  console.log(`Total Overflow Issues Found: ${issues.length}`);
  if (issues.length > 0) {
    console.log(issues.join('\n'));
  }
}

runAudit().catch(console.error);
