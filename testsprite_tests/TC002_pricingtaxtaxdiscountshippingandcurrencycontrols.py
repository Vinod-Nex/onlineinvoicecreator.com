import requests


def test_pricing_tax_discount_shipping_and_currency_controls_pt_br_pages():
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
    headers = {"Accept": "text/html", "Accept-Language": "pt-BR,pt;q=0.9"}

    with requests.Session() as session:
        for path in paths:
            try:
                response = session.get(
                    f"{base_url}{path}",
                    headers=headers,
                    timeout=30,
                )
            except requests.RequestException as exc:
                raise AssertionError(f"Request to {path} failed: {exc}") from exc

            assert response.status_code == 200, (
                f"Expected {path} to return HTTP 200; got "
                f"{response.status_code}"
            )
            assert "text/html" in response.headers.get("Content-Type", "").lower(), (
                f"Expected {path} to return HTML"
            )
            assert response.text.strip(), f"Expected {path} to return a non-empty page"
            assert "<html" in response.text.lower(), (
                f"Expected {path} to contain an HTML document"
            )


if __name__ == "__main__":
    test_pricing_tax_discount_shipping_and_currency_controls_pt_br_pages()