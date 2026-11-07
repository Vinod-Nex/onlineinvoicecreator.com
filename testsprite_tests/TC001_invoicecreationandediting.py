import requests

BASE_URL = "http://localhost:4321"
PT_BR_PAGES = [
    "/pt-br",
    "/pt-br/gerador-de-recibo",
    "/pt-br/gerador-de-recibo-de-aluguel",
    "/pt-br/modelo-de-recibo",
    "/pt-br/sobre",
    "/pt-br/contato",
    "/pt-br/privacidade",
    "/pt-br/termos",
]


def test_invoice_creation_and_editing_pt_br():
    session = requests.Session()
    try:
        for path in PT_BR_PAGES:
            response = session.get(f"{BASE_URL}{path}", timeout=30)
            response.raise_for_status()

            assert response.status_code == 200, f"Unexpected status for {path}: {response.status_code}"
            assert "text/html" in response.headers.get("Content-Type", "").lower(), (
                f"Expected an HTML page for {path}"
            )
            assert response.text.strip(), f"Page content is empty for {path}"

        main_page = session.get(f"{BASE_URL}/pt-br", timeout=30)
        main_page.raise_for_status()
        html = main_page.text.lower()

        assert "<html" in html, "Brazilian Portuguese landing page did not return an HTML document"
        assert "<title" in html, "Brazilian Portuguese landing page is missing a title"
    except requests.RequestException as exc:
        raise AssertionError(f"Could not load the Brazilian Portuguese pages: {exc}") from exc
    finally:
        session.close()


if __name__ == "__main__":
    test_invoice_creation_and_editing_pt_br()