import requests

BASE_URL = "http://localhost:4321"
PT_BR_PATHS = [
    "/pt-br",
    "/pt-br/gerador-de-recibo",
    "/pt-br/gerador-de-recibo-de-aluguel",
    "/pt-br/modelo-de-recibo",
    "/pt-br/sobre",
    "/pt-br/contato",
    "/pt-br/privacidade",
    "/pt-br/termos",
]


def test_australiantaxinvoicetemplate():
    session = requests.Session()
    try:
        for path in PT_BR_PATHS:
            response = session.get(f"{BASE_URL}{path}", timeout=30)
            assert response.status_code == 200, (
                f"Expected HTTP 200 for {path}, got {response.status_code}"
            )
            assert response.text.strip(), f"Expected non-empty page content for {path}"
            assert "<html" in response.text.lower(), f"Expected HTML document for {path}"
    except requests.RequestException as exc:
        raise AssertionError(f"Request to the application failed: {exc}") from exc
    finally:
        session.close()


if __name__ == "__main__":
    test_australiantaxinvoicetemplate()