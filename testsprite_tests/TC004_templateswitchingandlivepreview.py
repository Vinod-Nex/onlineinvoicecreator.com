import requests
from urllib.parse import urljoin

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


def test_templateswitchingandlivepreview():
    session = requests.Session()
    session.headers.update({"User-Agent": "Mozilla/5.0 (compatible; InvoiceTemplateTest/1.0)"})
    responses = {}

    try:
        for path in PT_BR_PAGES:
            response = session.get(urljoin(BASE_URL, path), timeout=30)
            assert response.status_code == 200, (
                f"Expected {path} to load successfully; got HTTP {response.status_code}"
            )
            assert "text/html" in response.headers.get("Content-Type", "").lower(), (
                f"Expected {path} to return HTML"
            )
            assert response.text.strip(), f"Expected {path} to return a non-empty page"
            responses[path] = response

        generator_html = responses["/pt-br/gerador-de-recibo"].text.lower()
        assert "viewport" in generator_html, (
            "The Brazilian Portuguese generator page should include a viewport declaration "
            "for mobile layouts"
        )

        template_html = responses["/pt-br/modelo-de-recibo"].text.lower()
        assert "viewport" in template_html, (
            "The Brazilian Portuguese template page should include a viewport declaration "
            "for mobile layouts"
        )

        assert (
            responses["/pt-br/gerador-de-recibo"].url
            != responses["/pt-br/modelo-de-recibo"].url
        ), "Generator and template pages should resolve to distinct pages"

        for path, response in responses.items():
            assert response.url.startswith(BASE_URL), f"Unexpected redirect outside the base URL for {path}"

    except requests.RequestException as exc:
        raise AssertionError(f"HTTP request failed while checking Brazilian Portuguese pages: {exc}") from exc


if __name__ == "__main__":
    test_templateswitchingandlivepreview()