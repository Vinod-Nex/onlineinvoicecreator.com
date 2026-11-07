import re
from urllib.parse import urljoin

import requests


def test_logo_upload_and_visual_branding():
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

    session = requests.Session()
    page_responses = {}

    try:
        for path in paths:
            response = session.get(urljoin(base_url, path), timeout=30)
            response.raise_for_status()
            assert response.status_code == 200, f"Unexpected status for {path}"
            page_responses[path] = response

        invoice_html = page_responses["/pt-br"].text
        assert invoice_html.strip(), "The Brazilian Portuguese invoice page is empty"

        app_content = invoice_html
        script_sources = re.findall(
            r"""<script\b[^>]*\bsrc=["']([^"']+)["'][^>]*>""",
            invoice_html,
            flags=re.IGNORECASE,
        )

        for source in script_sources:
            script_url = urljoin(page_responses["/pt-br"].url, source)
            script_response = session.get(script_url, timeout=30)
            script_response.raise_for_status()
            app_content += "\n" + script_response.text

        normalized_content = app_content.lower()

        assert "logo" in normalized_content, "Logo upload support was not found on the invoice page"
        assert (
            'type="file"' in normalized_content or "type='file'" in normalized_content
        ), "No file input for uploading a logo was found"
        assert any(
            token in normalized_content
            for token in ("preview", "pré-visual", "visualiza")
        ), "Live preview support was not found"
        assert any(
            token in normalized_content
            for token in ("remover", "remove", "excluir", "clearlogo")
        ), "Logo removal support was not found"
        assert "pdf" in normalized_content, "PDF export support was not found"

    except requests.RequestException as exc:
        raise AssertionError(f"HTTP request failed while testing logo branding: {exc}") from exc
    finally:
        session.close()


if __name__ == "__main__":
    test_logo_upload_and_visual_branding()