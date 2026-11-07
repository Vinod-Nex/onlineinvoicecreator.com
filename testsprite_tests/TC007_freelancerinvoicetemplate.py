import requests

BASE_URL = "http://localhost:4321"
TIMEOUT = 30


def test_freelancer_invoice_template():
    paths = [
        "/pt-br",
        "/pt-br/gerador-de-recibo",
        "/pt-br/gerador-de-recibo-de-aluguel",
        "/pt-br/modelo-de-recibo",
        "/pt-br/sobre",
        "/pt-br/contato",
        "/pt-br/privacidade",
        "/pt-br/termos",
        "/invoice-generator-for-freelancers",
    ]

    session = requests.Session()
    try:
        for path in paths:
            response = session.get(
                f"{BASE_URL}{path}",
                headers={"Accept": "text/html"},
                timeout=TIMEOUT,
            )
            response.raise_for_status()

            assert response.status_code == 200, (
                f"Expected HTTP 200 for {path}, got {response.status_code}"
            )
            assert "text/html" in response.headers.get("Content-Type", "").lower(), (
                f"Expected an HTML response for {path}"
            )
            assert response.text.strip(), f"Expected non-empty page content for {path}"

        freelancer_response = session.get(
            f"{BASE_URL}/invoice-generator-for-freelancers",
            headers={"Accept": "text/html"},
            timeout=TIMEOUT,
        )
        freelancer_response.raise_for_status()
        page = freelancer_response.text.lower()

        assert any(
            term in page
            for term in ("freelancer", "invoice", "payment", "download")
        ), "Freelancer invoice page does not contain expected page content"
    except requests.RequestException as exc:
        raise AssertionError(f"HTTP request failed: {exc}") from exc
    finally:
        session.close()


if __name__ == "__main__":
    test_freelancer_invoice_template()