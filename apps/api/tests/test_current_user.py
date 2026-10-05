from fastapi.testclient import TestClient

from tests.helpers import register_and_login


def test_me_returns_safe_user_information(client: TestClient) -> None:
    tokens = register_and_login(client, "me.safe@example.com")

    response = client.get(
        "/api/v1/auth/me", headers={"Authorization": f"Bearer {tokens['access_token']}"}
    )

    assert response.status_code == 200
    body = response.json()
    assert set(body.keys()) == {"id", "email", "roles", "is_active"}
    assert body["email"] == "me.safe@example.com"


def test_me_never_returns_password_hash(client: TestClient) -> None:
    tokens = register_and_login(client, "me.nohash@example.com")

    response = client.get(
        "/api/v1/auth/me", headers={"Authorization": f"Bearer {tokens['access_token']}"}
    )

    body_text = response.text
    assert "password" not in body_text.lower()
    assert "$argon2" not in body_text
