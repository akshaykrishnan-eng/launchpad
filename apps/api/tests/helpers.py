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
