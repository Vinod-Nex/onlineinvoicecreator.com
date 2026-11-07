import re
import requests
from playwright.sync_api import sync_playwright


def test_browser_draft_saving_and_reset():
    base_url = "http://localhost:4321"
    paths = [
        "/pt-br",
        "/pt-br/gerador-de-recibo",
        "/pt-br/gerador-de-recibo-de-aluguel",
        "/pt-br/modelo-de-recibo",
        "/pt-br/sobre",
        "/pt-br/contato",
        "/pt-br/privacidade",
        "/pt-br/termos",
    ]
    headers = {
        "Accept": "text/html,application/xhtml+xml",
        "User-Agent": "Mozilla/5.0 (compatible; DraftSavingTest/1.0)",
    }

    with requests.Session() as session:
        for path in paths:
            response = session.get(
                f"{base_url}{path}",
                headers=headers,
                timeout=30,
                allow_redirects=True,
            )
            assert response.status_code == 200, (
                f"Expected {path} to load successfully; received "
                f"{response.status_code}"
            )

    with sync_playwright() as playwright:
        browser = playwright.chromium.launch(headless=True)
        page = browser.new_page()
        try:
            response = page.goto(
                f"{base_url}/pt-br",
                wait_until="networkidle",
                timeout=30000,
            )
            assert response is not None and response.status == 200

            page.wait_for_timeout(1000)
            original_storage = page.evaluate(
                "() => JSON.stringify(Object.fromEntries(Object.entries(localStorage)))"
            )

            sentinel_values = []
            editable_fields = page.locator(
                "input:visible:not([type='hidden']), textarea:visible"
            )
            field_count = editable_fields.count()

            for index in range(field_count):
                field = editable_fields.nth(index)
                if not field.is_enabled():
                    continue

                field_type = field.get_attribute("type") or "text"
                if field_type in {"checkbox", "radio", "file", "button", "submit"}:
                    continue

                value = f"RascunhoTeste{index}2026"
                if field_type == "email":
                    value = f"rascunho{index}@example.com"
                elif field_type == "number":
                    value = str(index + 7)
                elif field_type == "date":
                    value = "2026-11-07"

                try:
                    field.fill(value)
                    sentinel_values.append(value)
                except Exception:
                    continue

                if len(sentinel_values) >= 3:
                    break

            assert sentinel_values, "No editable invoice fields were found"
            page.wait_for_timeout(1500)

            saved_storage = page.evaluate(
                "() => JSON.stringify(Object.fromEntries(Object.entries(localStorage)))"
            )
            assert saved_storage, "No draft data was saved to localStorage"
            assert saved_storage != original_storage, (
                "localStorage did not change after editing invoice fields"
            )
            assert any(value in saved_storage for value in sentinel_values), (
                "Edited invoice data was not found in localStorage"
            )

            page.reload(wait_until="networkidle", timeout=30000)
            page.wait_for_timeout(1000)

            restored_values = page.locator(
                "input:visible:not([type='hidden']), textarea:visible"
            ).evaluate_all(
                "(fields) => fields.map((field) => field.value)"
            )
            for value in sentinel_values:
                assert value in restored_values, (
                    f"Invoice value {value!r} was not restored after refresh"
                )

            reset_pattern = re.compile(
                r"limpar|reset|redefinir|apagar|clear",
                re.IGNORECASE,
            )
            reset_button = None
            buttons = page.locator("button:visible")
            for index in range(buttons.count()):
                button = buttons.nth(index)
                text = (button.inner_text() or "").strip()
                aria_label = button.get_attribute("aria-label") or ""
                title = button.get_attribute("title") or ""
                if reset_pattern.search(f"{text} {aria_label} {title}"):
                    reset_button = button
                    break

            assert reset_button is not None, (
                "Could not find a visible clear/reset button"
            )

            confirmation_received = {"value": False}

            def confirm_reset(dialog):
                confirmation_received["value"] = True
                dialog.accept()

            page.on("dialog", confirm_reset)
            reset_button.click()
            page.wait_for_timeout(1000)

            assert confirmation_received["value"], (
                "Reset did not request confirmation"
            )

            reset_values = page.locator(
                "input:visible:not([type='hidden']), textarea:visible"
            ).evaluate_all(
                "(fields) => fields.map((field) => field.value)"
            )
            for value in sentinel_values:
                assert value not in reset_values, (
                    f"Invoice field value {value!r} remained after reset"
                )

            reset_storage = page.evaluate(
                "() => JSON.stringify(Object.fromEntries(Object.entries(localStorage)))"
            )
            assert not any(value in reset_storage for value in sentinel_values), (
                "Reset did not clear the saved invoice draft"
            )
        finally:
            browser.close()


if __name__ == "__main__":
    test_browser_draft_saving_and_reset()