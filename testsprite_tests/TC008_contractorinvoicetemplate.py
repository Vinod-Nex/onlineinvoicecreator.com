import requests

BASE_URL = "http://localhost:4321"
TIMEOUT = 30


def test_contractor_invoice_template():
    pages = [
        "/pt-br",
        "/pt-br/gerador-de-recibo",
        "/pt-br/gerador-de-recibo-de-aluguel",
        "/pt-br/modelo-de-recibo",
        "/pt-br/sobre",
        "/pt-br/contato",
        "/pt-br/privacidade",
        "/pt-br/termos",
        "/contractor-invoice-template",
    ]

    try:
        with requests.Session() as session:
            responses = {}
            for path in pages:
                response = session.get(
                    f"{BASE_URL}{path}",
                    headers={"Accept": "text/html"},
                    timeout=TIMEOUT,
                )
                responses[path] = response
                assert response.status_code == 200, (
                    f"Expected HTTP 200 for {path}, got {response.status_code}"
                )
                assert response.text.strip(), f"Expected non-empty page content for {path}"

            contractor_html = responses["/contractor-invoice-template"].text.lower()
            assert "contractor" in contractor_html, "Contractor template content was not found"
            assert "labor" in contractor_html, "Labor billing content was not found"
            assert "material" in contractor_html, "Material billing content was not found"
            assert "pdf" in contractor_html, "PDF download functionality was not indicated"

    except requests.RequestException as exc:
        raise AssertionError(f"HTTP request failed: {exc}") from exc


if __name__ == "__main__":
    test_contractor_invoice_template()