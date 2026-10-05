from enum import StrEnum
from pathlib import PurePosixPath

from app.core.config import get_settings

settings = get_settings()


class ResumeStatus(StrEnum):
    """Simple, candidate-facing state. Mirrors (but is coarser than)
    ReviewRequestStatus: REQUESTED and IN_REVIEW both read as
    UNDER_REVIEW from the resume's point of view."""

    UPLOADED = "UPLOADED"
    UNDER_REVIEW = "UNDER_REVIEW"
    COMPLETED = "COMPLETED"


# --- Upload validation ------------------------------------------------
#
# The extension alone is never trusted: every accepted extension also
# has an expected Content-Type and a magic-byte signature, both of
# which are checked against the actual uploaded bytes. Renaming an
# arbitrary file to "resume.pdf" fails the signature check below.

ALLOWED_CONTENT_TYPES: dict[str, set[str]] = {
    ".pdf": {"application/pdf"},
    ".doc": {"application/msword"},
    ".docx": {"application/vnd.openxmlformats-officedocument.wordprocessingml.document"},
}

# DOC (legacy OLE2 compound file) and DOCX (zip) have distinct
# container formats; PDF has its own. Checked against the first bytes
# of the actual file content, not the filename.
_MAGIC_SIGNATURES: dict[str, bytes] = {
    ".pdf": b"%PDF",
    ".docx": b"PK\x03\x04",
    ".doc": b"\xd0\xcf\x11\xe0\xa1\xb1\x1a\xe1",
}


class InvalidResumeFileError(Exception):
    def __init__(self, message: str) -> None:
        self.message = message
        super().__init__(message)


class ResumeTooLargeError(Exception):
    pass


def validate_resume_file(filename: str, content_type: str | None, content: bytes) -> None:
    extension = PurePosixPath(filename).suffix.lower()

    if extension not in ALLOWED_CONTENT_TYPES:
        raise InvalidResumeFileError(
            "Unsupported file type. Please upload a PDF, DOC, or DOCX file."
        )

    if content_type and content_type not in ALLOWED_CONTENT_TYPES[extension]:
        raise InvalidResumeFileError(
            "The file's content type does not match its extension."
        )

    signature = _MAGIC_SIGNATURES[extension]
    if not content.startswith(signature):
        raise InvalidResumeFileError(
            "The file's content does not match its extension. "
            "Please upload a genuine PDF, DOC, or DOCX file."
        )

    max_bytes = settings.resume_max_size_mb * 1024 * 1024
    if len(content) > max_bytes:
        raise ResumeTooLargeError(
            f"File exceeds the maximum allowed size of {settings.resume_max_size_mb}MB."
        )
