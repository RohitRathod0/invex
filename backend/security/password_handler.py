"""
security/password_handler.py

Uses the `bcrypt` library directly — avoids passlib's internal
detect_wrap_bug() which itself exceeds the 72-byte limit and crashes.
"""

import bcrypt

# bcrypt hard-limits passwords to 72 bytes (UTF-8 encoded).
_MAX_BYTES = 72


def _to_bytes(password: str) -> bytes:
    """Encode and truncate to bcrypt's 72-byte limit."""
    encoded = password.encode("utf-8")
    return encoded[:_MAX_BYTES]


def hash_password(password: str) -> str:
    """Hash a plain-text password with bcrypt. Returns a str hash."""
    hashed = bcrypt.hashpw(_to_bytes(password), bcrypt.gensalt(rounds=12))
    return hashed.decode("utf-8")


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a plain-text password against a stored bcrypt hash."""
    try:
        return bcrypt.checkpw(
            _to_bytes(plain_password),
            hashed_password.encode("utf-8"),
        )
    except Exception:
        return False
