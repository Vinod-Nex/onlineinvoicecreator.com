import asyncio
import re
from playwright import async_api
from playwright.async_api import expect

async def run_test():
    pw = None
    browser = None
    context = None

    try:
        # Start a Playwright session in asynchronous mode
        pw = await async_api.async_playwright().start()

        # Launch a Chromium browser in headless mode with custom arguments
        browser = await pw.chromium.launch(
            headless=True,
            args=[
                "--window-size=1280,720",
                "--disable-dev-shm-usage",
                "--ipc=host",
                "--single-process"
            ],
        )

        # Create a new browser context (like an incognito window)
        context = await browser.new_context()
        # Wider default timeout to match the agent's DOM-stability budget;
        # auto-waiting Playwright APIs (expect, locator.wait_for) inherit this.
        context.set_default_timeout(15000)

        # Open a new page in the browser context
        page = await context.new_page()

        # Interact with the page elements to simulate user flow
        # -> navigate
        await page.goto("http://localhost:4321")
        try:
            await page.wait_for_load_state("domcontentloaded", timeout=5000)
        except Exception:
            pass
        
        # -> Open the invoice editor using the visible “Create Invoice” control.
        # Create Invoice link
        elem = page.get_by_role("link", name="Create Invoice")
        await elem.click(timeout=10000)
        
        # -> Fill in the first item (Drafting, 2, 80)
        await page.locator("#item-desc-0").fill("Drafting")
        await page.locator("#item-qty-0").fill("2")
        await page.locator("#item-price-0").fill("80")

        # -> Add a second line item (Review, 1, 50)
        elem = page.get_by_role("button", name="+ Add Line Item")
        await elem.click(timeout=10000)
        await page.locator("#item-desc-1").fill("Review")
        await page.locator("#item-qty-1").fill("1")
        await page.locator("#item-price-1").fill("50")

        # -> Remove the first line item
        remove_btn = page.locator(".btn-remove-item").nth(0)
        await remove_btn.click(timeout=10000)

        # --> Assertions to verify final state
        await expect(page.locator("#preview-line-items-tbody").nth(0)).to_contain_text("Review", timeout=15000), "Expected the remaining line item to show Review."
        await expect(page.locator("#preview-subtotal").nth(0)).to_have_text("$50.00", timeout=15000), "Expected the invoice total to recalculate to $50.00."
        await asyncio.sleep(5)

    finally:
        if context:
            await context.close()
        if browser:
            await browser.close()
        if pw:
            await pw.stop()

asyncio.run(run_test())
    