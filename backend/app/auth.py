"""Auth0 integration helpers for the FastAPI backend."""
from __future__ import annotations

import json
import os
import time
from dataclasses import dataclass
from functools import lru_cache
from typing import Any, Dict, List, Optional

import requests
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError, jwt


class AuthSettingsError(RuntimeError):
    """Raised when the Auth0 environment configuration is missing."""


@dataclass
class Auth0Settings:
    """Auth0 configuration loaded from environment variables."""

    domain: str
    audience: str
    issuer: str

    @classmethod
    def from_env(cls) -> "Auth0Settings":
        domain = os.getenv("AUTH0_DOMAIN")
        audience = os.getenv("AUTH0_AUDIENCE")
        issuer = os.getenv("AUTH0_ISSUER")

        if not domain or not audience:
            raise AuthSettingsError("AUTH0_DOMAIN and AUTH0_AUDIENCE must be configured")

        issuer = issuer or f"https://{domain}/"
        return cls(domain=domain, audience=audience, issuer=issuer)


@dataclass
class Auth0User:
    """Represents the currently authenticated Auth0 principal."""

    sub: str
    scope: Optional[str] = None
    permissions: Optional[List[str]] = None
    email: Optional[str] = None
    name: Optional[str] = None


class Auth0Verifier:
    """Verifies Auth0-issued JWT access tokens using the JWKS endpoint."""

    def __init__(self, settings: Auth0Settings) -> None:
        self._settings = settings
        self._jwks: Optional[Dict[str, Any]] = None
        self._jwks_loaded_at: float = 0.0

    @property
    def issuer(self) -> str:
        return self._settings.issuer

    @property
    def audience(self) -> str:
        return self._settings.audience

    def _jwks_url(self) -> str:
        return f"https://{self._settings.domain}/.well-known/jwks.json"

    def _load_jwks(self, force: bool = False) -> Dict[str, Any]:
        ttl_seconds = 60 * 60  # 1 hour cache
        if not force and self._jwks and (time.time() - self._jwks_loaded_at) < ttl_seconds:
            return self._jwks

        response = requests.get(self._jwks_url(), timeout=5)
        response.raise_for_status()
        self._jwks = response.json()
        self._jwks_loaded_at = time.time()
        return self._jwks

    def _get_signing_key(self, token: str) -> Dict[str, Any]:
        try:
            header = jwt.get_unverified_header(token)
        except JWTError as exc:  # pragma: no cover - jose raises JWTError for malformed tokens
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token header") from exc

        kid = header.get("kid")
        if not kid:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Missing token kid")

        jwks = self._load_jwks()
        keys: List[Dict[str, Any]] = jwks.get("keys", [])
        for key in keys:
            if key.get("kid") == kid:
                return key

        # Refresh JWKS once in case the signing keys rotated recently.
        jwks = self._load_jwks(force=True)
        keys = jwks.get("keys", [])
        for key in keys:
            if key.get("kid") == kid:
                return key

        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Unable to find a matching signing key")

    def verify(self, token: str) -> Auth0User:
        key = self._get_signing_key(token)
        try:
            public_key = jwt.algorithms.RSAAlgorithm.from_jwk(json.dumps(key))
            payload = jwt.decode(
                token,
                public_key,
                algorithms=[key.get("alg", "RS256")],
                audience=self.audience,
                issuer=self.issuer,
            )
        except JWTError as exc:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid or expired token") from exc

        return Auth0User(
            sub=str(payload.get("sub")),
            scope=payload.get("scope"),
            permissions=payload.get("permissions"),
            email=payload.get("email"),
            name=payload.get("name"),
        )


@lru_cache()
def get_verifier() -> Auth0Verifier:
    settings = Auth0Settings.from_env()
    return Auth0Verifier(settings)


_bearer_scheme = HTTPBearer(auto_error=False)


def get_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(_bearer_scheme),
) -> Auth0User:
    if credentials is None or not credentials.credentials:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Authorization header missing")

    try:
        verifier = get_verifier()
    except AuthSettingsError as exc:  # pragma: no cover - configuration errors are operational
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(exc)) from exc

    return verifier.verify(credentials.credentials)
