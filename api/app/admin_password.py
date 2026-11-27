"""The admin password: how it is hashed for ADMIN_PASSWORD_HASH, and how a sign-in is checked against it.

Run `python -m app.admin_password` (in api/) to make the value. It asks twice and prints one line,
`scrypt$<n>$<r>$<p>$<salt>$<hash>`, for the owner to paste into Railway. The password itself is never
stored, printed or logged anywhere.

scrypt is in the standard library. N=2^14, r=8, p=5 is one of OWASP's equivalent minimums (16 MiB, five
passes), and the parameters travel inside the value, so raising them later needs no code change.
"""

from __future__ import annotations

import base64
import getpass
import hashlib
import hmac
import secrets
import sys
import unicodedata

N, R, P = 2**14, 8, 5
MIN_LENGTH = 15  # NIST SP 800-63B for a password used on its own
MAX_LENGTH = 256  # an input cap: a megabyte "password" must not cost a megabyte of hashing
KEY_LENGTH = 32


def _normal(password: str) -> bytes:
    return unicodedata.normalize("NFC", password).encode()


def _scrypt(password: str, salt: bytes, n: int, r: int, p: int) -> bytes:
    return hashlib.scrypt(_normal(password), salt=salt, n=n, r=r, p=p, maxmem=256 * 1024 * 1024, dklen=KEY_LENGTH)


def _b64(raw: bytes) -> str:
    return base64.b64encode(raw).decode()


def hash_password(password: str, *, salt: bytes | None = None, n: int = N, r: int = R, p: int = P) -> str:
    salt = salt or secrets.token_bytes(16)
    return f"scrypt${n}${r}${p}${_b64(salt)}${_b64(_scrypt(password, salt, n, r, p))}"


def parse(stored: str) -> tuple[int, int, int, bytes, bytes] | None:
    """The parameters, salt and hash in a stored value, or None when it is not one this module wrote."""
    parts = stored.split("$")
    if len(parts) != 6 or parts[0] != "scrypt":
        return None
    try:
        n, r, p = int(parts[1]), int(parts[2]), int(parts[3])
        salt, digest = base64.b64decode(parts[4], validate=True), base64.b64decode(parts[5], validate=True)
    except ValueError:
        return None
    if n < 2 or n & (n - 1) or not (1 <= r <= 64 and 1 <= p <= 64) or len(salt) < 8 or len(digest) != KEY_LENGTH:
        return None
    return n, r, p, salt, digest


# Checked when the username is wrong or the stored value unreadable, so a wrong name costs a full hash
# too and the time taken says nothing about which part was wrong.
_DUMMY = hash_password("not the password", salt=b"isaac.toys dummy")


def verify(password: str, stored: str | None) -> bool:
    parsed = parse(stored or "") or parse(_DUMMY)
    assert parsed is not None
    n, r, p, salt, digest = parsed
    candidate = _scrypt(password[:MAX_LENGTH], salt, n, r, p)
    return hmac.compare_digest(candidate, digest) and stored is not None and parse(stored) is not None


def problem_with(password: str) -> str | None:
    """Why a new password is refused, or None. No composition rules: length is what counts."""
    if len(password) < MIN_LENGTH:
        return f"Use at least {MIN_LENGTH} characters; a few unrelated words is easiest."
    if len(password) > MAX_LENGTH:
        return f"Use at most {MAX_LENGTH} characters."
    if len(set(password)) < 5:
        return "That is mostly one character repeated."
    return None


def main() -> int:  # pragma: no cover - interactive
    first = getpass.getpass("New admin password: ")
    refused = problem_with(first)
    if refused:
        print(refused, file=sys.stderr)
        return 1
    if getpass.getpass("Same again: ") != first:
        print("The two did not match.", file=sys.stderr)
        return 1
    print("Set this as ADMIN_PASSWORD_HASH on Railway (it is a hash, not the password):")
    print(hash_password(first))
    return 0


if __name__ == "__main__":  # pragma: no cover
    raise SystemExit(main())
