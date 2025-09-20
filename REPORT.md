# Leftys Mobile + API — Implementation Report

## Overview
- Reworked the Expo client into a light-mode, premium-feeling interface that keeps the visual system consistent across screens.
- Introduced a production-ready Node/Express API (`server/`) with MongoDB persistence for postings and scanned label data.
- Enabled camera / library uploads with Google Vision integration hooks so label text, allergens, and expiry data flow straight into MongoDB.
- Brought the Discover experience to life with a real map backed by live coordinates, including graceful fallbacks when location permissions are denied.

## New Functionality
### Light, Minimal UI
- Forced the entire app into a refined light palette and tuned the design tokens (`constants/theme.ts`) to feel premium yet calm.
- Updated every tab to use the refreshed palette, elevation, and typography so cards, pills, and CTAs feel cohesive.

### Image Scanning → Database Pipeline
- Added a dedicated **Scan** tab that captures or uploads packaging labels, sends them to the new API, and stores parsed results in MongoDB (`/api/scans`).
- Surface scan history inside the app so users can reuse parsed records when posting new items.
- The server will call the Google Vision API when `GOOGLE_VISION_API_KEY` is present; otherwise it saves a filename-based stub so the flow still works during setup.

### Map-First Discovery
- Swapped the static Discover mock for `react-native-maps`, live markers, and optional user location centering.
- The API seeds starter postings (with geo coordinates) on first run and serves them via `/api/postings` so both Today and Discover draw from the same live data.

## Backend Setup (MongoDB Atlas)
1. Create a free MongoDB Atlas cluster and database named `leftys` (or adjust `MONGODB_DB_NAME`).
2. Create a database user with read/write privileges and allow your IP (or 0.0.0.0/0 for development).
3. Copy `server/.env.example` to `server/.env` and fill in:
   - `MONGODB_URI` — your Atlas connection string.
   - `MONGODB_DB_NAME` — optional override.
   - `GOOGLE_VISION_API_KEY` — required for real OCR (leave commented to use filename fallback).
4. Install dependencies and run the API:
   ```bash
   cd server
   npm install
   npm run build
   npm start
   ```
   The server listens on `http://localhost:4000` and exposes `GET /api/postings`, `GET /api/scans`, and `POST /api/scans`.
5. Seed data automatically populates if the `postings` collection is empty; set `SEED_DATABASE=false` to disable.

## Frontend Environment
- Install client deps and run the Expo app:
  ```bash
  cd frontend
  npm install
  npm run start
  ```
- Provide `EXPO_PUBLIC_API_BASE_URL` (defaults to `http://localhost:4000/api`) in your Expo env for remote deployments.
- Google Maps API keys: update `app.json` placeholders (`YOUR_IOS_GOOGLE_MAPS_API_KEY`, `YOUR_ANDROID_GOOGLE_MAPS_API_KEY`) before shipping to stores.
- Expo plugins request the right permissions for camera, photo library, and location usage copy.

## Required API Keys
- **Google Cloud Vision API** (`GOOGLE_VISION_API_KEY`) for production-grade OCR when scanning labels.
- **Google Maps SDK** keys for Android and iOS builds (placeholders live in `app.json`).

## Suggested Next Steps
- Add Auth0-backed authentication so scans and postings are scoped per user.
- Promote scans into draft postings automatically and provide an edit/review flow before publishing.
- Implement push notifications for claim updates and integrate Expo Location for background region monitoring once keys are issued.
