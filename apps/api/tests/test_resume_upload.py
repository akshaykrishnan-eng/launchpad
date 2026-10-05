import asyncio

from fastapi.testclient import TestClient
from sqlalchemy import delete, select

from app.db.session import AsyncSessionLocal
from app.models.role import Role
from app.models.user import User
from app.models.user_role import UserRole
from app.services import resume as resume_service
from app.services.candidate_profile import get_or_create_profile
from app.services.resume_storage import get_resume_storage
from tests.helpers import (
    VALID_DOC_BYTES,
    VALID_DOCX_BYTES,
    VALID_PDF_BYTES,
    auth_headers,
    candidate_client,
    register_and_login,
    upload_resume,
)


def test_unauthenticated_upload_is_rejected(client: TestClient) -> None:
    response = client.post(
        "/api/v1/candidate/resumes",
        files={"file": ("resume.pdf", VALID_PDF_BYTES, "application/pdf")},
    )

    assert response.status_code == 401


async def test_non_candidate_role_cannot_upload(client: TestClient) -> None:
    email = "resume.interviewer@example.com"
    register_and_login(client, email)

    async with AsyncSessionLocal() as db:
        user = (await db.execute(select(User).where(User.email == email))).scalar_one()
        await db.execute(delete(UserRole).where(UserRole.user_id == user.id))
        interviewer_role = (
            await db.execute(select(Role).where(Role.name == "INTERVIEWER"))
        ).scalar_one()
        db.add(UserRole(user_id=user.id, role_id=interviewer_role.id))
        await db.commit()

    tokens = client.post(
        "/api/v1/auth/login",
        json={"email": email, "password": "correct-horse-battery-staple"},
    ).json()

    response = upload_resume(
        client, auth_headers(tokens), "resume.pdf", VALID_PDF_BYTES, "application/pdf"
    )

    assert response.status_code == 403


def test_valid_pdf_upload_succeeds(client: TestClient) -> None:
    headers = candidate_client(client, "upload.pdf@example.com")

    response = upload_resume(client, headers, "resume.pdf", VALID_PDF_BYTES, "application/pdf")

    assert response.status_code == 201
    body = response.json()
    assert body["version"] == 1
    assert body["original_filename"] == "resume.pdf"
    assert body["status"] == "UPLOADED"
    assert body["is_latest"] is True


def test_valid_docx_upload_succeeds(client: TestClient) -> None:
    headers = candidate_client(client, "upload.docx@example.com")

    response = upload_resume(
        client,
        headers,
        "resume.docx",
        VALID_DOCX_BYTES,
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    )

    assert response.status_code == 201


def test_valid_doc_upload_succeeds(client: TestClient) -> None:
    headers = candidate_client(client, "upload.doc@example.com")

    response = upload_resume(client, headers, "resume.doc", VALID_DOC_BYTES, "application/msword")

    assert response.status_code == 201


def test_unsupported_extension_is_rejected(client: TestClient) -> None:
    headers = candidate_client(client, "upload.badext@example.com")

    response = upload_resume(client, headers, "resume.txt", b"plain text content", "text/plain")

    assert response.status_code == 422


def test_content_not_matching_extension_is_rejected(client: TestClient) -> None:
    """The extension says .pdf, but the bytes aren't actually a PDF --
    this is the "don't trust the extension alone" check."""
    headers = candidate_client(client, "upload.forged@example.com")

    response = upload_resume(
        client, headers, "resume.pdf", b"NOT ACTUALLY A PDF FILE", "application/pdf"
    )

    assert response.status_code == 422


def test_mismatched_content_type_is_rejected(client: TestClient) -> None:
    headers = candidate_client(client, "upload.wrongmime@example.com")

    response = upload_resume(client, headers, "resume.pdf", VALID_PDF_BYTES, "image/png")

    assert response.status_code == 422


def test_oversized_file_is_rejected(client: TestClient) -> None:
    headers = candidate_client(client, "upload.toobig@example.com")
    oversized = b"%PDF-1.4\n" + b"0" * (6 * 1024 * 1024)  # over the 5MB default

    response = upload_resume(client, headers, "resume.pdf", oversized, "application/pdf")

    assert response.status_code == 413


def test_second_upload_creates_version_two(client: TestClient) -> None:
    headers = candidate_client(client, "upload.versioning@example.com")
    upload_resume(client, headers, "resume_v1.pdf", VALID_PDF_BYTES, "application/pdf")

    response = upload_resume(client, headers, "resume_v2.pdf", VALID_PDF_BYTES, "application/pdf")

    assert response.status_code == 201
    assert response.json()["version"] == 2


def test_previous_version_remains_after_new_upload(client: TestClient) -> None:
    headers = candidate_client(client, "upload.history@example.com")
    upload_resume(client, headers, "resume_v1.pdf", VALID_PDF_BYTES, "application/pdf")
    upload_resume(client, headers, "resume_v2.pdf", VALID_PDF_BYTES, "application/pdf")

    response = client.get("/api/v1/candidate/resumes", headers=headers)

    versions = {r["version"] for r in response.json()}
    assert versions == {1, 2}


def test_latest_version_is_correctly_identified(client: TestClient) -> None:
    headers = candidate_client(client, "upload.latest@example.com")
    upload_resume(client, headers, "resume_v1.pdf", VALID_PDF_BYTES, "application/pdf")
    upload_resume(client, headers, "resume_v2.pdf", VALID_PDF_BYTES, "application/pdf")

    resumes = client.get("/api/v1/candidate/resumes", headers=headers).json()

    by_version = {r["version"]: r["is_latest"] for r in resumes}
    assert by_version == {1: False, 2: True}


def test_version_numbers_are_independent_per_candidate(client: TestClient) -> None:
    headers_a = candidate_client(client, "upload.independent.a@example.com")
    headers_b = candidate_client(client, "upload.independent.b@example.com")
    upload_resume(client, headers_a, "a.pdf", VALID_PDF_BYTES, "application/pdf")

    response_b = upload_resume(client, headers_b, "b.pdf", VALID_PDF_BYTES, "application/pdf")

    assert response_b.json()["version"] == 1


async def test_concurrent_uploads_never_produce_duplicate_versions(client: TestClient) -> None:
    """Exercises the actual row-lock in upload_resume (see
    app/services/resume.py), not just sequential app-level calls: two
    separate DB sessions upload for the same candidate at the same time
    via asyncio.gather, genuinely overlapping at the database."""
    email = "upload.concurrent@example.com"
    register_and_login(client, email)

    storage = get_resume_storage()

    async def do_upload() -> int:
        async with AsyncSessionLocal() as db:
            user = (await db.execute(select(User).where(User.email == email))).scalar_one()
            profile = await get_or_create_profile(db, user.id)
            resume = await resume_service.upload_resume(
                db,
                storage,
                profile,
                original_filename="resume.pdf",
                content_type="application/pdf",
                content=VALID_PDF_BYTES,
            )
            return resume.version

    versions = await asyncio.gather(do_upload(), do_upload())

    assert sorted(versions) == [1, 2]
