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
        
        # -> Open the receipt maker page for receipts with multiple items.
        await page.goto("http://localhost:4321/receipt-maker-with-items")
        try:
            await page.wait_for_load_state("domcontentloaded", timeout=5000)
        except Exception:
            pass
        
        # -> Scroll to the receipt line-item and tax controls to inspect their labels and current values.
        await page.mouse.wheel(0, 300)
        
        # -> Add a new receipt line item using the visible “+ Add Item” control.
        # + Add Item button
        elem = page.get_by_role("button", name="+ Add Item")
        await elem.click(timeout=10000)
        
        # -> Add a second new line item using the receipt’s “+ Add Item” control.
        # + Add Item button
        elem = page.get_by_role("button", name="+ Add Item")
        await elem.click(timeout=10000)
        
        # -> Set a sales tax rate and verify the receipt’s tax and total update in the preview.
        # Sales Tax Rate number field
        elem = page.get_by_role("spinbutton", name="Sales Tax Rate")
        await elem.wait_for(state="visible", timeout=10000)
        await elem.fill("10")
        
        # -> Download the finished itemized receipt using the visible “Download PDF” control.
        # Download: Download PDF button
        elem = page.get_by_role("button", name="Download PDF")
        async with page.expect_download(timeout=30000) as dl_info:
            await elem.click(timeout=10000)
        download = await dl_info.value
        assert download.suggested_filename  # verify file was downloaded
        await download.save_as(f"./downloads/{download.suggested_filename}")
        
        # --> Assertions to verify final state
        
        # --> The itemized receipt preview is displayed.
        await page.get_by_role("row", name="Brand Identity & Design").nth(0).scroll_into_view_if_needed()
        # Assert-outcome: not verified — the export-time check could not be evaluated
        # Assert: The itemized receipt preview should be visible.
        await expect(page.get_by_role("row", name="Brand Identity & Design").nth(0)).to_be_visible(timeout=15000), "The itemized receipt preview should be visible."
        
        # --> The receipt preview displays a calculated tax amount as part of its totals.
        await page.locator("#prev-rec-tax").nth(0).scroll_into_view_if_needed()
        # Assert-outcome: not verified — the export-time check could not be evaluated
        # Assert: The calculated tax amount should be visible in the receipt preview.
        await expect(page.locator("#prev-rec-tax").nth(0)).to_be_visible(timeout=15000), "The calculated tax amount should be visible in the receipt preview."
        await asyncio.sleep(5)

    finally:
        if context:
            await context.close()
        if browser:
            await browser.close()
        if pw:
            await pw.stop()

asyncio.run(run_test())
    