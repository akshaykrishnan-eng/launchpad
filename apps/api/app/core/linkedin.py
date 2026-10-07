import re
from urllib.parse import urlparse

# Structural validation only -- this never fetches the URL, scrapes
# LinkedIn, or calls any LinkedIn API. It only checks that the string
# *looks like* a LinkedIn personal profile URL.
_PROFILE_PATH_RE = re.compile(r"^/in/[^/]+/?$")

LINKEDIN_REVIEW_CREDIT_COST = 1


class InvalidLinkedInUrlError(Exception):
    def __init__(self, message: str) -> None:
        self.message = message
        super().__init__(message)


def normalize_linkedin_url(raw: str) -> str:
    """Accepts the usual harmless variations (missing scheme, missing/
    present "www.", trailing slash) and returns one canonical form.
    Raises InvalidLinkedInUrlError for anything that isn't a LinkedIn
    personal-profile URL shape."""
    value = raw.strip()
    if not value:
        raise InvalidLinkedInUrlError("Please enter your LinkedIn profile URL.")

    # A bare "linkedin.com/in/..." has no scheme; urlparse would treat
    # the whole thing as a path in that case, so add one before parsing.
    if "://" not in value:
        value = f"https://{value}"

    parsed = urlparse(value)

    if parsed.scheme not in ("http", "https"):
        raise InvalidLinkedInUrlError("Please enter a valid LinkedIn profile URL.")

    host = parsed.netloc.lower()
    if host.startswith("www."):
        host = host[len("www."):]
    if host != "linkedin.com":
        raise InvalidLinkedInUrlError("Please enter a linkedin.com profile URL.")

    if not _PROFILE_PATH_RE.match(parsed.path):
        raise InvalidLinkedInUrlError(
            "That doesn't look like a LinkedIn profile URL "
            "(expected something like linkedin.com/in/your-name)."
        )

    identifier = parsed.path.strip("/").split("/", 1)[1]
    return f"https://linkedin.com/in/{identifier}"
