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
        
        # -> Change a business detail in the invoice editor and confirm the invoice preview reflects the populated draft.
        # e.g. Acme Creative Studio text field
        elem = page.get_by_role("textbox", name="Business or Full Name *")
        await elem.wait_for(state="visible", timeout=10000)
        await elem.fill("QA Reset Test Business")
        
        # -> Click the editor’s “Reset” control to clear the populated invoice draft.
        # Reset button
        elem = page.get_by_role("button", name="Reset")
        await elem.click(timeout=10000)
        
        # -> Use the invoice editor’s “Reset” control once more and verify whether the editor and preview return to the starter state.
        # Reset button
        elem = page.get_by_role("button", name="Reset")
        await elem.click(timeout=10000)
        
        # --> Assertions to verify final state
        
        # --> The business name field returns to blank after Reset.
        # Assert-outcome: not verified — the export-time check could not be evaluated
        # Assert: Expected the business name field to be blank after reset.
        await expect(page.get_by_role("textbox", name="Business or Full Name *").nth(0)).to_have_value("", timeout=15000), "Expected the business name field to be blank after reset."
        
        # --> The invoice preview returns to an empty starter state.
        # Assert-outcome: not verified — the export-time check could not be evaluated
        # Assert: Expected the invoice preview to contain no line items after reset.
        await expect(page.locator("xpath=/html/body/main/main/div/div[2]/div[2]/div/article/section[2]/table/tbody/tr")).to_have_count(0, timeout=15000), "Expected the invoice preview to contain no line items after reset."
        await asyncio.sleep(5)

    finally:
        if context:
            await context.close()
        if browser:
            await browser.close()
        if pw:
            await pw.stop()

asyncio.run(run_test())
    