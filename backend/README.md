# Leftys Python Backend (MVP)

- Runs FastAPI on port 4000 with `/api` prefix to match the frontend.
- In-memory storage for postings and scans; swap with Mongo later.
- Auth0-secured endpoints — every request must include a valid bearer token.

## Setup

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
python -m uvicorn app.main:app --host 0.0.0.0 --port 4000 --reload
```

Health check: `GET http://localhost:4000/health`

## Required environment variables

| Name              | Purpose                                                        |
| ----------------- | -------------------------------------------------------------- |
| `AUTH0_DOMAIN`    | Your Auth0 tenant domain (e.g. `leftys-demo.us.auth0.com`).    |
| `AUTH0_AUDIENCE`  | API audience configured in Auth0 for this FastAPI backend.     |
| `AUTH0_ISSUER`    | Optional override for the expected issuer (defaults to `https://AUTH0_DOMAIN/`). |

These must be present before the server starts; otherwise it will raise a configuration error when the first authenticated request arrives.
