# Leftys — Project Context (Personal Inventory MVP)

> Read this first. It explains what Leftys is, who it serves, why it exists, and the core rules that shape implementation. Agentic systems should combine this with `agents.md` and the API contracts when generating code.

## One‑liner

**Leftys** helps you reduce food waste by tracking what you have, auto‑estimating expiry, and nudging you at the right time with simple meal ideas.

## Problem & Insight

- **Problem:** People forget what’s in the fridge and let items expire. Tracking is tedious; reminders arrive at the wrong time.
- **Insight:** If entry is lightweight, expiry is auto‑estimated (but overridable), and nudges arrive near lunch/dinner, people will act and waste less.

## Target Users

- **Individual user (single account):** Personal pantry/fridge tracking. No sharing, no geo.

## Value Proposition

- **Save food, save money:** Use items on time.
- **Just‑in‑time nudges:** Lunch and dinner suggestions that fit your preferences.
- **Positive reinforcement:** Friendly stats to keep momentum.

## Core Experience (MVP)

1. **Add item** (name, quantity, unit, input date, estimated expiry [auto, overridable], estimated cost [optional]).
2. **See stats** (all‑time items rescued; estimated food waste reduced).
3. **Get nudges**: Notifications scheduled for lunch (11:30–13:30) and dinner (17:30–19:30) in the user’s timezone, with quiet hours respected (21:00–08:00). We schedule earlier and re‑check right before sending.
4. **Partial consumption**: Reduce remaining quantity with decimals; item remains until fully used or discarded.

## Non‑Goals (MVP)

- No neighborhood sharing, maps, geo, claims, chat.
- No image storage or uploads.
- No complex recipe flows; suggestions are simple and optional.

## Trust, Safety, and Privacy

- **No safety claims:** The app never certifies food safety/freshness. Suggestions are ideas only; users must verify freshness.
- **Privacy:** No exact location sharing; single‑user account. No special PII constraints beyond Auth0.
- **Dietary preferences:** Collected during onboarding (preferences and allergens) and respected in suggestions.

## Business Rules (summary)

- **Auto‑estimate expiry:** Derived from category heuristics; user can override before saving.
- **Units (MVP):** `g, kg, oz, lb, ml, L, pieces`; decimals allowed for quantities.
- **Save definition:** A “saved/rescued” item is one the user marks as used on its last estimated day. Used earlier counts as used but not rescued.
- **Notifications:** Lunch 11:30–13:30; Dinner 17:30–19:30; Quiet hours 21:00–08:00; daily cap 2. Schedule ahead; re‑validate urgency before send.
- **Dietary guardrails:** Suggestions must avoid user‑marked allergens and respect dietary restrictions.

## Metrics (MVP)

- **Items rescued (all‑time)** — count of items used on their last day.
- **Estimated food waste reduced (all‑time)** — category‑based weight heuristics × rescued items.

## Architecture Overview

- **Mobile App (Expo/TS):** Tabs remain; primary experiences are Stats and Scan/Add. Settings available as a modal/route. Bright, friendly UI (green primary), modern yet playful typography, light and performant animations.
- **Backend (Python/FastAPI):** Auth0 JWT; endpoints for inventory CRUD, partial consumption, stats, and push token registration. Emits events for analytics and notification scheduling.
- **Microservice (Suggestions/Notifications):** REST/JSON. Generates simple meal ideas based on inventory and user profile; plans notifications within lunch/dinner windows and re‑checks right before send.
- **Database (MongoDB Atlas):** Collections: `accounts`, `inventory_items`, `suggestions`, `notifications`, `analytics_daily`.
- **Push (Expo):** Local‑time scheduling, receipts handling, quiet hours.

## Data Highlights

- **`inventory_items`**: `{ _id, owner_id, name, quantity, unit, input_date, est_expiry_date, est_cost, dietary_tags?, allergens?, remaining_quantity }`.
- **`accounts`**: `{ _id, auth0_id, dietary_preferences[], allergens[] }`.
- **Indexes:** `inventory_items.owner_id+est_expiry_date`, `accounts.auth0_id` (unique).

## Error Philosophy

- Predictable JSON errors `{ code, message }` (e.g., `VALIDATION_ERROR`, `RATE_LIMITED`).
- Validate units, positive quantities, and future‑dated expiries (unless explicitly overridden earlier).

## Why this will demo well (hackathon)

- Simple story: track → nudge → rescue → feel good.
- Tangible UX: add an item, get a timely nudge, mark as used, watch stats grow.
- Sponsor tech visible: Auth0, Mongo, Expo push, Gemini‑backed suggestions (via microservice).

## Future Roadmap (post‑MVP)

- Barcode and receipt OCR ingestion; richer price heuristics and “money saved”.
- Households/shared inventory; digests; badges and milestones.
- Deeper recipes (steps, pantry substitutions), storage tips, category auto‑classification.

## Glossary

- **Rescued:** Item used on its last estimated day.
- **Quiet hours:** Times when we will not send push notifications.
- **Nudge:** A suggestion or reminder to use items soon.

## Assumptions

- Users have smartphones and cook lunch/dinner on most days.
- Auto‑estimate heuristics are “good enough” and improved over time.

## Success Criteria (MVP demo)

- Add an item → receive a lunch/dinner nudge → mark used on last day → stats show increased “items rescued” and “waste reduced”.
- No crashes; clean error surfaces; quiet hours respected end‑to‑end.
