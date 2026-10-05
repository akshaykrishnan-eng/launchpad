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
