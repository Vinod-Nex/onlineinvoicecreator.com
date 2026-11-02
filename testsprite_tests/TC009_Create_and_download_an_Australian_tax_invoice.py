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
        
        # -> Open the Australian tax invoice template page and inspect its form and preview.
        await page.goto("http://localhost:4321/tax-invoice-template-australia")
        try:
            await page.wait_for_load_state("domcontentloaded", timeout=5000)
        except Exception:
            pass
        
        # -> Scroll to the Australian invoice editor fields and locate the ABN input and line-item controls.
        await page.mouse.wheel(0, 300)
        
        # -> Enter an ABN, client name, and first invoice item, then check the live preview and tax calculation.
        # e.g. VAT GB123456789 or ABN 12 345 678 text field
        elem = page.get_by_role("textbox", name="Tax ID / VAT / GST / ABN")
        await elem.wait_for(state="visible", timeout=10000)
        await elem.fill("51 824 753 556")
        
        # -> Enter an ABN, client name, and first invoice item, then check the live preview and tax calculation.
        # e.g. Globex Corporation text field
        elem = page.get_by_role("textbox", name="Client or Company Name *")
        await elem.wait_for(state="visible", timeout=10000)
        await elem.fill("Acme Pty Ltd")
        
        # -> Enter an ABN, client name, and first invoice item, then check the live preview and tax calculation.
        # Item Description text field
        elem = page.get_by_role("textbox", name="Item Description")
        await elem.wait_for(state="visible", timeout=10000)
        await elem.fill("Consulting services")
        
        # -> Enter an ABN, client name, and first invoice item, then check the live preview and tax calculation.
        # Unit Price number field
        elem = page.get_by_role("spinbutton", name="Unit Price")
        await elem.wait_for(state="visible", timeout=10000)
        await elem.fill("100")
        
        # -> Add a second invoice line item and verify the invoice preview and GST totals update.
        # + Add Line Item button
        elem = page.get_by_role("button", name="+ Add Line Item")
        await elem.click(timeout=10000)
        
        # -> Enter a second item description and amount, then verify that the Australian invoice preview and GST totals update.
        # Item Description text field
        elem = page.locator("#item-desc-1")
        await elem.wait_for(state="visible", timeout=10000)
        await elem.fill("Design consultation")
        
        # -> Enter a second item description and amount, then verify that the Australian invoice preview and GST totals update.
        # Unit Price number field
        elem = page.locator("#item-price-1")
        await elem.wait_for(state="visible", timeout=10000)
        await elem.fill("200")
        
        # -> Download the Australian tax invoice using the “Download PDF” control.
        # Download: Download PDF button
        elem = page.get_by_role("button", name="Download PDF")
        async with page.expect_download(timeout=30000) as dl_info:
            await elem.click(timeout=10000)
        download = await dl_info.value
        assert download.suggested_filename  # verify file was downloaded
        await download.save_as(f"./downloads/{download.suggested_filename}")
        
        # --> Assertions to verify final state
        
        # --> The Australian tax invoice preview displays the entered invoice items.
        await page.get_by_role("row", name="Consulting services 1 $100.00 10% $").nth(0).scroll_into_view_if_needed()
        # Assert-outcome: not verified — the export-time check could not be evaluated
        # Assert: The invoice preview should display the entered items.
        await expect(page.get_by_role("row", name="Consulting services 1 $100.00 10% $").nth(0)).to_be_visible(timeout=15000), "The invoice preview should display the entered items."
        
        # --> The preview calculates GST of $30.00 on the entered invoice items.
        # Assert-outcome: not verified — the export-time check could not be evaluated
        # Assert: The preview should show $30.00 in calculated GST.
        await expect(page.locator("xpath=/html/body/main/main/div/div[2]/div[2]/div/article/section[3]/div[2]/div/div[3]/div/span[2]").nth(0)).to_have_text("$30.00", timeout=15000), "The preview should show $30.00 in calculated GST."
        await asyncio.sleep(5)

    finally:
        if context:
            await context.close()
        if browser:
            await browser.close()
        if pw:
            await pw.stop()

asyncio.run(run_test())
    