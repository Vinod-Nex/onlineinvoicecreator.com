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
        
        # -> Change the business and client names in the billing fields and verify that the invoice preview updates to match.
        # e.g. Acme Creative Studio text field
        elem = page.get_by_role("textbox", name="Business or Full Name *")
        await elem.wait_for(state="visible", timeout=10000)
        await elem.fill("Northstar Design Studio")
        
        # -> Change the business and client names in the billing fields and verify that the invoice preview updates to match.
        # e.g. Globex Corporation text field
        elem = page.get_by_role("textbox", name="Client or Company Name *")
        await elem.wait_for(state="visible", timeout=10000)
        await elem.fill("Harborview Consulting")
        
        # -> Set the existing Professional Services line item rate to $250 and verify the updated amount in the invoice preview.
        # Unit Price number field
        elem = page.get_by_role("spinbutton", name="Unit Price")
        await elem.wait_for(state="visible", timeout=10000)
        await elem.fill("250")
        
        # -> Download the invoice PDF using the visible “Download PDF” control.
        # Download: Download PDF button
        elem = page.get_by_role("button", name="Download PDF")
        async with page.expect_download(timeout=30000) as dl_info:
            await elem.click(timeout=10000)
        download = await dl_info.value
        assert download.suggested_filename  # verify file was downloaded
        await download.save_as(f"./downloads/{download.suggested_filename}")
        
        # --> Assertions to verify final state
        
        # --> The invoice preview reflects the entered business and client names.
        # Assert-outcome: not verified — the export-time check could not be evaluated
        # Assert: The invoice preview shows Northstar Design Studio.
        await expect(page.locator("#main-content").nth(0)).to_contain_text("Northstar Design Studio", timeout=15000), "The invoice preview shows Northstar Design Studio."
        # Assert-outcome: not verified — the export-time check could not be evaluated
        # Assert: The invoice preview shows Harborview Consulting.
        await expect(page.locator("#main-content").nth(0)).to_contain_text("Harborview Consulting", timeout=15000), "The invoice preview shows Harborview Consulting."
        
        # --> The edited $250.00 line item is reflected in the invoice’s $250.00 grand total.
        # Assert-outcome: not verified — the export-time check could not be evaluated
        # Assert: The invoice preview shows the edited $250.00 line item.
        await expect(page.locator("#preview-line-items-tbody").nth(0)).to_contain_text("$250.00", timeout=15000), "The invoice preview shows the edited $250.00 line item."
        # Assert-outcome: not verified — the export-time check could not be evaluated
        # Assert: The invoice grand total is $250.00.
        await expect(page.locator("#main-content").nth(0)).to_contain_text("Grand Total: $250.00", timeout=15000), "The invoice grand total is $250.00."
        await asyncio.sleep(5)

    finally:
        if context:
            await context.close()
        if browser:
            await browser.close()
        if pw:
            await pw.stop()

asyncio.run(run_test())
    