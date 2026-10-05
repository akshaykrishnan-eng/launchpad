from fastapi.testclient import TestClient

DEFAULT_PASSWORD = "correct-horse-battery-staple"


def register(client: TestClient, email: str, password: str = DEFAULT_PASSWORD):
    return client.post("/api/v1/auth/register", json={"email": email, "password": password})


def login(client: TestClient, email: str, password: str = DEFAULT_PASSWORD):
    return client.post("/api/v1/auth/login", json={"email": email, "password": password})


def register_and_login(client: TestClient, email: str, password: str = DEFAULT_PASSWORD) -> dict:
    register(client, email, password)
    response = login(client, email, password)
    return response.json()


def auth_headers(tokens: dict) -> dict:
    return {"Authorization": f"Bearer {tokens['access_token']}"}


def candidate_client(client: TestClient, email: str, password: str = DEFAULT_PASSWORD) -> dict:
    """Registers+logs in a fresh candidate and returns ready-to-use
    Authorization headers for it."""
    tokens = register_and_login(client, email, password)
    return auth_headers(tokens)


# Minimal genuinely-valid file bytes for each supported resume format,
# for exercising the magic-byte check with real signatures rather than
# an empty/arbitrary payload.
VALID_PDF_BYTES = b"%PDF-1.4\n%fake pdf content for testing\n"
VALID_DOCX_BYTES = b"PK\x03\x04" + b"fake docx content" * 5
VALID_DOC_BYTES = b"\xd0\xcf\x11\xe0\xa1\xb1\x1a\xe1" + b"fake doc content" * 5


def upload_resume(
    client: TestClient, headers: dict, filename: str, content: bytes, content_type: str
):
    return client.post(
        "/api/v1/candidate/resumes",
        headers=headers,
        files={"file": (filename, content, content_type)},
    )
