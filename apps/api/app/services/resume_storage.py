import asyncio
from pathlib import Path
from typing import Protocol

from app.core.config import get_settings

settings = get_settings()


class ResumeStorage(Protocol):
    """Keeps resume business logic (app/services/resume.py) decoupled
    from *how* bytes are persisted, so a future S3/object-storage
    implementation can replace LocalFileStorage without touching
    anything that calls this interface."""

    async def save(self, key: str, content: bytes) -> None: ...
    async def open(self, key: str) -> bytes: ...
    async def delete(self, key: str) -> None: ...


class LocalFileStorage:
    """Local-disk implementation, suitable for development. `key` is
    always a server-generated, non-user-controlled string (see
    app/services/resume.py::_generate_storage_key) -- never the
    original filename -- so there is no path-traversal surface even
    though we join it directly onto base_dir."""

    def __init__(self, base_dir: str | Path | None = None) -> None:
        self._base_dir = Path(base_dir or settings.resume_storage_dir)

    def _resolve(self, key: str) -> Path:
        path = (self._base_dir / key).resolve()
        if self._base_dir.resolve() not in path.parents and path != self._base_dir.resolve():
            # Defense in depth: `key` is always server-generated and
            # never contains path separators, but refuse to escape the
            # storage root regardless.
            raise ValueError("Invalid storage key")
        return path

    async def save(self, key: str, content: bytes) -> None:
        path = self._resolve(key)
        await asyncio.to_thread(self._write, path, content)

    @staticmethod
    def _write(path: Path, content: bytes) -> None:
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_bytes(content)

    async def open(self, key: str) -> bytes:
        path = self._resolve(key)
        return await asyncio.to_thread(path.read_bytes)

    async def delete(self, key: str) -> None:
        path = self._resolve(key)
        await asyncio.to_thread(path.unlink, True)


_storage: ResumeStorage | None = None


def get_resume_storage() -> ResumeStorage:
    global _storage
    if _storage is None:
        _storage = LocalFileStorage()
    return _storage
