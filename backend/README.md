# Leftys Python Backend (MVP)

- Runs FastAPI on port 4000 with `/api` prefix to match the frontend.
- In-memory storage for postings and scans; swap with Mongo later.

## Setup

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
python -m uvicorn app.main:app --host 0.0.0.0 --port 4000 --reload
```

Health check: `GET http://localhost:4000/health`
