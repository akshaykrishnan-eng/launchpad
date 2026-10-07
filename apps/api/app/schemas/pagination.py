from pydantic import BaseModel

# Candidate-facing counterpart to app/schemas/admin.py's Page[T]: the
# same shape, kept in its own module so candidate routes (credits,
# resumes) never have to import from the admin schema module to reuse
# it (and admin.py is left untouched -- see PROJECT_STATUS.md Phase 10).
DEFAULT_PAGE_SIZE = 20
MAX_PAGE_SIZE = 50


class Page[T](BaseModel):
    items: list[T]
    total: int
    page: int
    page_size: int


def clamp_page_size(page_size: int) -> int:
    return max(1, min(page_size, MAX_PAGE_SIZE))
