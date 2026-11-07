import re
from urllib.parse import urljoin

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


def test_pdf_download_and_printing():
    session = requests.Session()
    session.headers.update({"Accept": "text/html,application/xhtml+xml"})

    try:
        responses = {}
        for path in PT_BR_PATHS:
            response = session.get(
                urljoin(BASE_URL, path),
                timeout=30,
                allow_redirects=True,
            )
            assert response.status_code == 200, (
                f"Expected {path} to return HTTP 200, got {response.status_code}"
            )
            assert "html" in response.headers.get("Content-Type", "").lower(), (
                f"Expected an HTML response for {path}"
            )
            assert response.text.strip(), f"Expected non-empty page content for {path}"
            responses[path] = response

        receipt_page = responses["/pt-br/gerador-de-recibo"]
        page_and_script_content = receipt_page.text.lower()

        script_sources = re.findall(
            r"""<script\b[^>]*\bsrc\s*=\s*["']([^"']+)["']""",
            receipt_page.text,
            flags=re.IGNORECASE,
        )
        for script_src in script_sources:
            script_url = urljoin(receipt_page.url, script_src)
            script_response = session.get(script_url, timeout=30)
            assert script_response.status_code == 200, (
                f"Failed to load page script {script_url}: "
                f"HTTP {script_response.status_code}"
            )
            page_and_script_content += "\n" + script_response.text.lower()

        assert "pdf" in page_and_script_content, (
            "The receipt generator page does not expose PDF download functionality"
        )
        assert any(
            term in page_and_script_content
            for term in ("window.print", "imprimir", "print")
        ), "The receipt generator page does not expose printing functionality"

    except requests.RequestException as exc:
        raise AssertionError(f"HTTP request failed during the test: {exc}") from exc


if __name__ == "__main__":
    test_pdf_download_and_printing()