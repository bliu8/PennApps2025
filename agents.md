# Leftys — Agents Specification (MVP)

> This document tells an agentic coding system exactly **which agents exist**, **what they own**, **how they talk**, and **which guardrails** to enforce. It complements `context.md` and the API contracts in the PRD supplement.

## Conventions

* **Single source of truth:** Business rules in `context.md` and the PRD supplement.
* **Message format:** All inter‑agent messages are JSON.
* **Time:** All timestamps are ISO 8601 UTC.
* **IDs:** MongoDB ObjectId strings.
* **Enums:** Explicit, fail‑closed; reject unknown values.

## Global Tools (available to all agents)

* **HTTP client** with retry (exponential backoff, jitter).
* **MongoDB client** (pooled) with typed repos for `accounts`, `postings`, `claims`, `messages`.
* **Geo utils:** geohash5 encode/decode; haversine distance; 2dsphere queries.
* **Storage:** presigned upload creation; EXIF strip; image constraints (≤ 4MB, jpeg/png/webp).
* **Push:** Expo Push API client with receipts handling & dedupe.
* **Logger:** structured logs; correlation id propagated across agents.
* **Auth:** JWT verifier for Auth0 (iss, aud) and user extraction.

## Orchestrator (Planner/Router)

**Owns:** Workflow plans; event routing; policy enforcement.
**Receives:** User intents (e.g., “CreatePost”), system events (e.g., `posting_created`).
**Sends:** Subtasks to functional agents; aggregates results.
**Must enforce:**

* Read `context.md` business rules (allowed items, privacy, allergens handling).
* Do **not** reveal exact coordinates until claim is accepted.
* Do **not** auto‑fill expiry.

### Example plan: Create & publish posting

1. Auth → validate JWT, get `account`.
2. Uploads → presign URL; client uploads; verify `finalUrl` reachable.
3. AI Extractor (optional) → title/allergen **suggestions** only.
4. Postings → create posting (status `open`), compute `approx_geohash5`, set indexes.
5. Notifications → fan‑out "new nearby" within R km.
6. Return posting summary (blurred location for non‑owners).

---

## Auth Agent

**Owns:** Verifying bearer tokens; resolving current user; phone verification status.
**Input:** `{ "type": "auth.verify", "token": "…" }`
**Output:** `{ "ok": true, "user": { "_id": "…", "phone_verified": true } }`
**Errors:** `UNAUTHORIZED`, `FORBIDDEN`.

---

## Uploads Agent

**Owns:** Presigned URLs; EXIF stripping policy; MIME enforcement.
**Input:** `{ "type": "uploads.presign", "contentType": "image/jpeg", "ext": "jpg" }`
**Output:** `{ "url": "…", "finalUrl": "…", "fields": { } }`
**Rules:**

* Max 4MB; only jpeg/png/webp; strip EXIF; long edge ≤ 4096px.
* Fail with `VALIDATION_ERROR` if constraints violated.

---

## AI Extractor Agent (Gemini)

**Owns:** Non‑authoritative suggestions from an image.
**Input:** `{ "type": "ai.extractFood", "image_url": "…" }`
**Output schema:**

```json
{
  "title_suggestion": "Leftover pepperoni pizza",
  "allergen_suggestions": { "values": ["gluten","dairy"], "confidence": 0.62 },
  "notes": "Label suggests dairy; expiry not detected"
}
```

**Guardrails:**

* Never output expiry.
* If `confidence < 0.7`, present allergens as suggestions only; do not auto‑fill.
* Allergen enum (strict): `gluten,dairy,nuts,peanuts,soy,eggs,fish,shellfish,sesame`.

**Prompt skeleton (server‑side):**

* Identify a single shareable food item (short name). If unsure, leave blank.
* If visible, infer common allergens from the fixed enum with one confidence value.
* Do not claim safety or freshness.

---

## Postings Agent

**Owns:** CRUD for postings, geo indices, TTL/expiry logic.
**Create input:**

```json
{
  "type": "postings.create",
  "owner_id": "…",
  "title": "Leftover pizza (4 slices)",
  "allergens": ["gluten","dairy"],
  "picture_url": "https://…",
  "pickup_window": { "start": "2025-09-20T02:00:00Z", "end": "2025-09-20T03:30:00Z" },
  "location": { "lat": 47.61, "lng": -122.33 },
  "expires_at": "2025-09-20T03:30:00Z"
}
```

**Create output:** persisted posting (with `_id`, `status: "open"`, `approx_geohash5`).

**Nearby query:**

```json
{ "type": "postings.nearby", "lat": 47.61, "lng": -122.33, "r_km": 2, "status": "open", "limit": 50 }
```

**Rules:**

* Return blurred location unless requester is `owner_id` or `claimed_by`.
* Enforce max 3 open postings per user.
* Validate pickup windows per `context.md`.

**State transitions:**

* `open → reserved` (set `claimed_by`, `claim_deadline = now + 45m`).
* `reserved → picked_up` (owner marks done).
* `reserved → open` (auto on `now > claim_deadline`).
* `open → expired` (auto on `now > expires_at`).
* `open|reserved → canceled` (owner cancels).

**Emits events:** `posting_created`, `posting_reserved`, `posting_picked_up`, `posting_expired`, `posting_canceled`.

---

## Claims Agent

**Owns:** Claim queueing; accept/expire; single active reserved per claimer.
**Create claim input:** `{ "type": "claims.create", "posting_id": "…", "claimer_id": "…" }`
**Accept claim input:** `{ "type": "claims.accept", "claim_id": "…", "owner_id": "…" }`
**Rules:**

* A claimer may have only 1 `reserved` posting at a time.
* On accept: switch posting to `reserved`, set `claimed_by`, start `claim_deadline`.
* On timeout: revert to `open`, clear `claimed_by`, mark claim `expired`.

**Emits:** `claim_created`, `claim_accepted`, `claim_expired`.

---

## Messaging Agent

**Owns:** Per‑posting chat thread.
**Create:** `{ "type": "messages.create", "posting_id": "…", "sender_id": "…", "text": "Meet at 2:15?" }`
**List:** `{ "type": "messages.list", "posting_id": "…", "cursor": null }`
**Rules:** text‑only; profanity filter optional; pagination by time.

---

## Notifications Agent

**Owns:** Expo token registry; fan‑out; templates; receipts.
**Register token:** `{ "type": "push.register", "account_id": "…", "token": "ExponentPushToken[…]" }`
**Send:**

```json
{
  "type": "push.send",
  "to": ["ExponentPushToken[…]"],
  "title": "New nearby: Leftover pizza",
  "body": "Pick up before 3:30 PM",
  "data": { "type": "posting_created", "posting_id": "…" }
}
```

**Templates:**

* `posting_created` → nearby fans.
* `claim_accepted` → claimer.
* `pickup_reminder` → 15m before `pickup_window.end` while `reserved`.
* `claim_expired` → claimer.

**Quiet hours (optional):** configurable; otherwise send immediately.

---

## Moderation Agent

**Owns:** Report/Block; strikes; auto‑hide.
**Report:** `{ "type": "tands.report", "posting_id": "…", "reason": "spoiled" }`
**Rules:**

* +1 strike on confirmed issues; at 3 strikes auto‑ban.
* Prohibited items list from `context.md`.

---

## Analytics Agent

**Owns:** Impact metrics; leaderboards (optional).
**Compute:** items shared, pickup rate, estimated \$ saved, time‑to‑claim.
**Input:** periodic or on event `posting_picked_up`.
**Output:** upsert into `analytics_daily` for dashboards.

---

## DevOps Agent

**Owns:** Environment validation; OpenAPI generation; seed data.
**Tasks:**

* Verify required env vars present.
* Generate `/openapi.json` from route decorators.
* Seed 10 sample postings around a given lat/lng.

---

## Event Bus (in‑process or lightweight queue)

**Event schema:**

```json
{
  "event": "posting_created",
  "ts": "2025-09-20T01:23:45Z",
  "data": { "posting_id": "…", "owner_id": "…", "location": { "lat": 47.61, "lng": -122.33 } },
  "correlation_id": "req-abc123"
}
```

**Subscriptions:**

* `posting_created` → Notifications (nearby fan‑out), Analytics
* `claim_accepted` → Notifications (accepted), Postings (state)
* `posting_reserved` → Notifications (reminder scheduling)
* `posting_expired` → Analytics

---

## Shared Validation Schemas (JSON Schema excerpts)

* `Allergen` enum: as above.
* `PickupWindow`:

```json
{
  "type": "object",
  "required": ["start","end"],
  "properties": {
    "start": { "type": "string", "format": "date-time" },
    "end": { "type": "string", "format": "date-time" }
  }
}
```

* `Location`:

```json
{ "type": "object", "required": ["lat","lng"], "properties": { "lat": { "type": "number", "minimum": -90, "maximum": 90 }, "lng": { "type": "number", "minimum": -180, "maximum": 180 } } }
```

---

## Guardrails (all agents)

* Never claim food safety/freshness.
* Never reveal exact coordinates to non‑owners/non‑claimers.
* Block home‑cooked items in MVP (packaged/sealed only).
* Strip EXIF from all uploads.
* Enforce rate limits; return structured errors.

---

## Observability

* Correlated structured logs `{ level, ts, agent, event, correlation_id, details }`.
* Health endpoints for readiness/liveness (server).
* Push receipts monitoring: retry on `DeviceNotRegistered` by removing token.

---

## Happy‑path & failure‑path recipes

**Happy:** Create → Nearby fan‑out → Claim → Accept → Location reveal → Reminder → Picked‑up → Analytics update.

**Failures:**

* Upload too large → show client error; allow re‑upload.
* AI low confidence → suggestions only; user must fill required fields.
* Claimer no‑show → auto‑release at `claim_deadline` and notify waitlist/nearby.

---

## Test hooks

* `X-Debug-SkipPush: true` to bypass sends in staging.
* `?dryRun=true` on fan‑out to preview recipients.

---

## TODO (post‑MVP)

* Reputation weights (successful pickups → higher priority in fan‑out).
* Quiet hours; digest mode.
* Map clustering and server‑side tiles.
* Content moderation for images.

