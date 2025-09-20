# Leftys — Project Context (High‑Level)

> Read this first. It explains what Leftys is, who it serves, why it exists, and the core rules that shape implementation. Agentic systems should combine this with `agents.md` and the API contracts when generating code.

## One‑liner

**Leftys** is a lightweight, neighborhood food‑sharing app: people **post surplus packaged food**, nearby neighbors **claim and pick up**, and the app nudges everyone toward **less waste**.

## Problem & Insight

* **Problem:** Tons of edible food is discarded while people nearby could use it. There’s no ultra‑simple, safety‑conscious way for everyday neighbors to give/receive small surplus items quickly.
* **Insight:** If posting is camera‑first and claiming is map‑first—with clear pickup windows, privacy by default, and minimal rules—neighbors will actually use it. Lightweight nudges beat lectures.

## Target Users

* **Giver (Owner):** Has extra packaged food (e.g., snacks, sealed groceries), wants it gone quickly and safely.
* **Receiver (Claimer):** Nearby neighbor who wants free food with minimal friction.
* **Moderator (implicit):** Simple report/block tools; no heavy ops.

## Value Proposition

* **For givers:** Quick declutter; feel‑good impact; no awkward haggling; safe & simple rules.
* **For receivers:** Hyperlocal, low‑effort, real‑time access to useful items.
* **For the community:** Less food waste; small, frequent wins → habit formation.

## Core Experience (MVP)

1. **Create Post** (photo → title → allergens → pickup window → approx location → publish)
2. **Discover** (map/list with approximate pins; filters by distance and allergens)
3. **Claim** (request → owner accepts one; exact pickup revealed)
4. **Pickup & Close** (reminder near end; owner marks picked up; post disappears)
5. **Nudges** (simple stats like items shared, \$ saved)

## Non‑Goals (MVP)

* Fridge/expiry tracking; multi‑item image parsing; social feeds; complex gamification; marketplace payments; home‑cooked meals.

## Trust, Safety, and Privacy (must‑reads)

* **Allowed items (MVP):** Packaged/sealed food only. No home‑cooked items. No raw meat/fish. No baby food/formula. Items should be safe to transport and exchange in public.
* **Allergens:** User‑entered tags are the only source of truth. AI outputs are suggestions only and must be labeled as such.
* **Safety claims:** The app **never** certifies safety/freshness. Show a clear disclaimer before first post/claim.
* **Location privacy:** Show **approximate** location (geohash5) until a claim is **accepted**. Exact pickup is revealed only to the accepted claimer and the owner.
* **Meetup guidance:** Encourage public pickup locations. Provide quick suggestions (library, grocery entrance, etc.).
* **Abuse controls:** Report/Block; light strike system; rate limiting; auto‑hide if repeated issues.

## Business Rules (summary)

* Max **3 open** postings per user.
* A claimer may have **1 active reserved** item at a time.
* **Pickup window** required; `expires_at = pickup_window.end`.
* Auto‑release reserved items if no pickup by `claim_deadline` (e.g., +45m).
* Auto‑expire open items at `expires_at`.
* Nearby notifications radius default **2km** (configurable).

## Metrics (MVP)

* **Items shared** (count picked\_up)
* **Pickup rate** (% picked\_up vs. expired/canceled)
* **Estimated \$ saved** (static heuristic per category)
* **Time‑to‑claim**

## Architecture Overview

* **Mobile App (Expo/TS):** Screens for Map/List, Create Post, Details, Claims, Chat, Profile. Registers for push tokens.
* **Backend (Node/Express):** Auth middleware; REST endpoints for postings, claims, messages, uploads, notifications, AI extract. Emits events.
* **Database (MongoDB Atlas):** Collections for `accounts`, `postings`, `claims`, `messages`; 2dsphere index for geo; TTL/expiry strategy; unique phone index.
* **Storage (S3/R2/Supabase):** Presigned uploads; EXIF strip; serve optimized images.
* **Push (Expo):** Fan‑out on post create; claim/reminder notifications.
* **AI (Gemini):** Optional suggestions for title/allergens. Server‑side only; never expiry; confidence thresholds.

## Data Highlights

* **`postings.location`** stores exact coordinates; UI blurs via `approx_geohash5` until acceptance.
* **`status`**: `open | reserved | picked_up | expired | canceled`.
* **`claims`** are separate docs to support multi‑claimer queues.
* **Indexes:** `postings.location` (2dsphere), `postings.status+expires_at`, `accounts.phone` (unique).

## Error Philosophy

* **Predictable JSON errors** with `{ code, message }` (e.g., `VALIDATION_ERROR`, `RATE_LIMITED`).
* Fail fast on policy violations (home‑cooked, missing pickup window, unsafe items).

## Why this will demo well (hackathon)

* Clear story: waste → share → impact.
* Tangible mobile UX: camera post, map pins, claim flow, push reminders.
* Sponsor tech visible: Gemini assists; Mongo geospatial; Expo push.
* Safety/privacy handled with obvious defaults (blurred map, disclaimers).

## Future Roadmap (post‑MVP)

* Fridge/expiry tab; multi‑item parsing; clustering & server tiles; richer reputation; quiet hours & digests; image moderation; community stats & badges; suggested public pickup hubs.

## Glossary

* **Owner/Giver:** User who created the posting.
* **Claimer/Receiver:** User who requests and is accepted to pick up an item.
* **Reserved:** Posting accepted by an owner for a specific claimer; not yet picked up.
* **Claim deadline:** Time window after reserve before auto‑release.
* **Expire:** Auto‑close of an open posting when pickup window ends.

## Assumptions

* Users have smartphones and can meet at public locations.
* Neighborhood density is sufficient that a 2km radius produces useful matches.
* Packaged/sealed items reduce risk and cognitive load for both parties.

## Success Criteria (MVP demo)

* Create → discover (nearby) → claim → accept → pickup reminder → mark picked up → see impact stat.
* No crashes; clean error surfaces; privacy respected end‑to‑end.

