import re
import html
import requests


def test_receiptgenerator():
    base_url = "http://localhost:4321"
    pages = [
        "/pt-br",
        "/pt-br/gerador-de-recibo",
        "/pt-br/gerador-de-recibo-de-aluguel",
        "/pt-br/modelo-de-recibo",
        "/pt-br/sobre",
        "/pt-br/contato",
        "/pt-br/privacidade",
        "/pt-br/termos",
    ]

    with requests.Session() as session:
        for path in pages:
            try:
                response = session.get(
                    f"{base_url}{path}",
                    headers={"Accept": "text/html"},
                    timeout=30,
                )
            except requests.RequestException as exc:
                raise AssertionError(f"Request failed for {path}: {exc}") from exc

            assert response.status_code == 200, (
                f"Expected HTTP 200 for {path}, got {response.status_code}"
            )
            assert response.text.strip(), f"Expected non-empty page content for {path}"
            assert "text/html" in response.headers.get("Content-Type", "").lower(), (
                f"Expected an HTML response for {path}"
            )

            if path == "/pt-br/gerador-de-recibo":
                page_text = html.unescape(response.text).lower()
                visible_text = re.sub(r"<[^>]+>", " ", page_text)
                visible_text = re.sub(r"\s+", " ", visible_text)

                assert "recibo" in visible_text, (
                    "The Brazilian Portuguese receipt generator page should identify "
                    "itself as a receipt generator"
                )
                assert any(
                    term in visible_text
                    for term in ("pagamento", "dinheiro", "cartão", "transferência")
                ), "The receipt generator page should expose payment-related content"
                assert any(
                    term in visible_text
                    for term in ("pdf", "baixar", "download")
                ), "The receipt generator page should expose PDF download content"


if __name__ == "__main__":
    test_receiptgenerator()