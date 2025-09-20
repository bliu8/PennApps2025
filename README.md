# PennApps2025

Leftys is a sustainability-first surplus sharing platform optimised for iOS. The refreshed experience bundles real-time impact telemetry, Gemini-powered nudges, and a frictionless posting flow tuned for hackathon judging.

## Running the platform

### API (Node + Express)

```bash
cd server
cp .env.example .env  # update with your secrets
npm install
npm run dev
```

**Required environment variables**

| Name                    | Purpose                                                           |
| ----------------------- | ----------------------------------------------------------------- |
| `MONGODB_URI`           | Connection string for your MongoDB deployment                     |
| `MONGODB_DB_NAME`       | Logical database name (defaults to `leftys`)                      |
| `GOOGLE_VISION_API_KEY` | Optional: powers label OCR for scan uploads                       |
| `GOOGLE_GEMINI_API_KEY` | Optional: enables live Gemini nudges + listing coach              |
| `GOOGLE_GEMINI_MODEL`   | Optional: override model (defaults to `gemini-2.5-flash-preview`) |
| `SEED_DATABASE`         | Set to `true` **only** when you want demo data inserted           |

> :bulb: When you point the app at a real database (Atlas, DocumentDB, etc.), leave `SEED_DATABASE` unset or `false` to avoid placeholder content.

New API endpoints:

- `POST /api/postings` — create live postings with AI-enhanced defaults.
- `GET /api/impact` — aggregated climate metrics sourced from MongoDB.
- `GET /api/nudges` — Gemini-generated behavioural nudges (falls back gracefully when the key is missing).
- `POST /api/ai/listing-assistant` — request listing copy, pickup defaults, and climate blurbs from Gemini.

### Expo app

```bash
cd frontend
npm install
expo start --ios
```

Configure the Expo client with `EXPO_PUBLIC_API_BASE_URL` so the app can talk to your API instance.

## Feature highlights

- **Tap-to-rotate nudges** — the Today tab hero cycles through Gemini nudges on every tap, surfacing behavioural science cues without extra taps.
- **Quick post composer** — a mobile-first form (headline + quantity) that publishes in two steps, with optional Gemini autofill and impact tagging.
- **Live impact telemetry** — `Impact nudges` now reflects actual MongoDB data; once your API key + database are connected the placeholder metrics disappear automatically.
- **Scan-to-post AI assist** — uploading a label now triggers Gemini to produce ready-to-paste listing defaults and impact blurbs, perfect for hackathon demos.

## Sustainability pitch

- Proactively highlights CO₂ avoidance and waste diverted, ideal for PennApps sustainability judging.
- Encourages public handoffs and allergen clarity by default.
- Showcases Google Gemini for smart nudges, copy suggestions, and contextual sustainability storytelling.
