# PennApps2025 — Leftys

Leftys is a sustainability-first surplus sharing platform optimized for mobile. The refreshed experience bundles real-time impact telemetry, AI-powered nudges, and a frictionless posting flow designed for quick demos and hackathon judging.

This repository contains three main areas:

- backend/ — FastAPI Python backend (API, auth, database integration)
- frontend/ — Expo React Native app (TypeScript, Expo Router)
- cv_text_extract/ — computer-vision helper scripts (OCR, barcode detection prototypes)

---

## Getting started (overview)

This README gives a short, practical guide to run the app locally and explains how the pieces fit together. It keeps the project description and non-technical info intact while providing up-to-date, reproducible developer steps.

Prerequisites
- macOS or Linux (development machine)
- Python 3.10+ (for backend) and a virtual environment
- Node.js and npm (for the Expo frontend)
- Homebrew (recommended for installing native native dependencies like `zbar`)

Optional (for OCR / CV features)
- Install the native libraries used by the CV scripts:
  - `brew install zbar` (required for `pyzbar`)
  - `brew install tesseract` (required for `pytesseract`)

Note: After installing native libraries with Homebrew, recreate your Python virtualenv or reinstall Python packages inside the venv so that Python bindings can locate the newly installed binaries.

---

## Backend (FastAPI)

Location: `backend/`

Overview
- FastAPI application providing the REST API under the prefix `/api`.
- Auth0 integration for user identity (JWT verification). See `backend/app/auth.py`.
- Persistent data stored in MongoDB (see `backend/MONGODB_SETUP.md`).

Quick start

1. Create and activate a Python virtualenv and install deps:

```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

2. Create a `.env` file in `backend/` (see `backend/.env.example` if present) and set required variables. Minimal env vars used by the app:

- `MONGODB_URI` — MongoDB connection string
- `MONGODB_DB_NAME` — logical DB name (defaults to `leftys`)
- `AUTH0_DOMAIN` — Auth0 tenant domain (for JWT verification)
- `AUTH0_AUDIENCE` — expected audience for tokens

3. Run the API (development mode):

```bash
cd backend
source .venv/bin/activate
uvicorn app.main:app --host 0.0.0.0 --port 4000 --reload
```

Key endpoints
- `POST /api/scans` — existing endpoint for uploading scans (image upload). See `backend/app/main.py`.
- `POST /api/scans/barcode` — suggested place to add barcode detection (not created by default). See integration notes in this repo.
- `GET /api/postings` — listing discovery
- `POST /api/postings` — create a posting
- `GET /api/impact` — impact telemetry
- `POST /api/ai/listing-assistant` — listing assist (AI)

Testing
- The backend includes seed helpers in `backend/app/seed_data.py` used during dev startup.

---

## Frontend (Expo / React Native)

Location: `frontend/`

Overview
- Expo app written in TypeScript using Expo Router and file-based routing.
- Auth flow uses Auth0 and `expo-web-browser` for Universal Login; look at `frontend/context/AuthContext.tsx`.
- API client utilities live in `frontend/services/api.ts`.

Quick start

```bash
cd frontend
npm install
npx expo start
```

Environment for frontend
- The app reads runtime configuration from Expo public environment variables. You can set these in your shell or in a `.env` file used by your local workflow. The important keys the app expects are:
  - `EXPO_PUBLIC_API_BASE_URL` — e.g. `http://localhost:4000/api`
  - `EXPO_PUBLIC_AUTH0_DOMAIN`
  - `EXPO_PUBLIC_AUTH0_CLIENT_ID`
  - `EXPO_PUBLIC_AUTH0_AUDIENCE`

Tip: Expo exposes `EXPO_PUBLIC_*` variables to your app; prefix values with `EXPO_PUBLIC_` so they are bundled into the client at runtime. If you're using CI, secrets managers, or a different env strategy, ensure the same values are available to the running client.

Notes
- If you see web bundling errors due to native-only modules (for example `react-native-maps`), the repo includes web shims and a webpack alias (`frontend/web-shims/` + `frontend/webpack.config.js`). Restart Expo with `npx expo start -c` to clear cache.

---

## CV utilities (OCR & barcode)

Location: `cv_text_extract/`

This folder contains prototype scripts for computer vision tasks used during demos:
- `extract_text.py` — OCR helpers (pytesseract / tesserocr / easyocr fallbacks)
- `object_detection.py` — barcode detection prototype using `pyzbar` + OpenCV/Pillow
- `demo.py` — quick demo script that annotates images using OpenCV

Notes about native dependencies
- `pyzbar` requires the `zbar` native library. On macOS: `brew install zbar`.
- `pytesseract` requires the Tesseract binary: `brew install tesseract`.

If you plan to run CV scripts from the backend virtual environment, install the CV Python packages into the same venv (for example, `pip install -r backend/requirements.txt`) after you install the Homebrew binaries. Recreating the venv after installing the native libraries can avoid runtime linking issues.

Usage examples

```bash
# Run barcode detection against the example image (uses repo example image by default)
python cv_text_extract/object_detection.py

# Run demo annotation that displays the image with OpenCV
python cv_text_extract/demo.py
```

Integration notes
- For production or consistent behavior, run detection on the backend where native dependencies can be installed centrally and kept consistent across environments. See integration steps in this repo for adding `/api/scans/barcode`.

---

## Development notes & troubleshooting

- If Python imports can't find native libs on macOS, ensure Homebrew locations are in your dynamic loader path (rarely needed when using system Python):

```bash
export DYLD_LIBRARY_PATH=/opt/homebrew/lib:$DYLD_LIBRARY_PATH
```

-- If `react-native-maps` causes web errors: restart Expo with cleared cache and ensure `frontend/webpack.config.js` is present. Use `npx expo start -c` to clear Metro's cache.

-- If Auth0 returns "Callback URL mismatch", open the app and look for the debug logs printed by `AuthContext` which show the exact redirect URI the client sends (the log is labeled `🔗 DEBUG: Redirect URI =`). Add that exact URI to your Auth0 application's Allowed Callback URLs. Common development-style callback URIs you may need to add (examples only — copy the exact value from the debug log):

- `exp://127.0.0.1:19000/--/auth/callback` — Expo local dev on device
- `https://auth.expo.io/@your-username/your-app-slug` — Expo AuthSession redirect (managed Expo)
- Custom scheme: `myapp://auth/callback` or similar if you configured a deep link scheme

Always prefer the exact URI printed in the debug logs rather than guessing; small differences (trailing slashes, host/port) will cause mismatches.

---

## Feature highlights (project description preserved)

- Tap-to-rotate nudges — the Today tab hero cycles through AI nudges on every tap, surfacing behavioral science cues without extra taps.
- Quick post composer — a mobile-first form (headline + quantity) that publishes in two steps, with optional AI autofill and impact tagging.
- Live impact telemetry — `Impact nudges` reflect MongoDB data once your API key + DB are connected.
- Scan-to-post AI assist — uploading a label triggers the listing assistant to produce ready-to-paste listing defaults and impact blurbs for demos.

---

## Contributing & next steps

- Add a backend `/api/scans/barcode` endpoint to call the barcode detection module for consistent server-side behavior.
- Add unit tests that POST the example image to the endpoint and assert detection results.

Small note on Python versions

The repository documentation currently states Python 3.10+. If you depend on newer language features or third-party wheels built specifically for Python 3.11+, consider updating this requirement. If you'd like, I can inspect `backend/requirements.txt` and the codebase for any 3.11-specific usages and pin a more exact minimum.

---

If you'd like, I can commit the backend endpoint and the frontend wiring to call it (small changes to `backend/app/main.py` and `frontend/services/api.ts`). Say which part you want implemented and I'll open a PR-style patch.

---

## Developer quick commands & notes (non-destructive add-on)

These commands are intended to make local development friction-free. They are additive — the section above remains the authoritative project description.

Backend (fast dev loop)

```bash
# from repository root
cd backend
python -m venv .venv            # create venv once
source .venv/bin/activate       # activate for dev work
pip install -r requirements.txt # install required Python packages
uvicorn app.main:app --reload --host 0.0.0.0 --port 4000
```

Frontend (Expo)

```bash
# from repository root
cd frontend
npm install
npx expo start                 # use -c to clear cache if web shims change
```

CV utilities (quick sanity)

```bash
# zbar and tesseract are native deps used by pyzbar/pytesseract
brew install zbar tesseract
pip install -r backend/requirements.txt  # ensures pyzbar/pillow if in same venv
python cv_text_extract/object_detection.py
```

Auth0 common fix (Callback URL mismatch)

1. Open the app and trigger login.
2. Check the Expo/Metro console — `frontend/context/AuthContext.tsx` logs the redirect URI with the label `🔗 DEBUG: Redirect URI =`.
3. Copy that exact URI and add it to your Auth0 Application's Allowed Callback URLs.

Contact & next steps
- If you'd like me to implement the backend endpoint and frontend wiring, tell me which file you want changed first and I'll create a PR-style patch.
