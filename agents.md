# Leftys — Agents Specification (Personal Inventory MVP)

> Defines which agents exist, what they own, how they talk (JSON), and which guardrails to enforce. Complements `context.md` and API contracts.

## Conventions

- **Single source of truth:** Business rules in `context.md`.
- **Message format:** All inter‑agent messages are JSON.
- **Time:** All timestamps are ISO 8601 UTC.
- **IDs:** MongoDB ObjectId strings.
- **Enums:** Explicit, fail‑closed; reject unknown values.

## Global Tools (available to all agents)

- **HTTP client** with retry (exponential backoff, jitter).
- **MongoDB client** (pooled) with typed repos for `accounts`, `inventory_items`, `suggestions`, `notifications`, `analytics_daily`.
- **Time utils:** timezone conversion; lunch/dinner window helpers; quiet hours checks.
- **Push:** Expo Push API client with receipts handling & dedupe.
- **Logger:** structured logs; correlation id propagated across agents.
- **Auth:** JWT verifier for Auth0 (iss, aud) and user extraction.

---

## Orchestrator (Planner/Router)

**Owns:** Workflow plans; event routing; policy enforcement.
**Receives:** User intents (e.g., `Inventory.AddItem`, `Inventory.Consume`, `Stats.Get`), system events (e.g., `inventory_item_due_soon`, `item_rescued`).
**Sends:** Subtasks to functional agents; aggregates results.
**Must enforce:**

- Read `context.md` business rules (expiry auto‑estimate, units, dietary/allergen guardrails).
- Respect **quiet hours** and **daily push cap**.
- Schedule notifications into lunch/dinner windows and **re‑validate** right before sending.

### Example plan: Add item and schedule nudges

1. Auth → validate JWT, get `account` and dietary prefs/allergens.
2. Inventory → create item; if no `est_expiry_date`, call expiry estimation and set it.
3. Notifications → schedule lunch/dinner reminders near last days; store `pending` jobs.
4. Return item summary; Stats screen may refresh.

### Example plan: Daily scheduling and pre‑send check

1. Notifications → compute today’s lunch/dinner windows in user’s timezone; enforce quiet hours and daily cap.
2. Suggestions → generate simple ideas for items expiring soon.
3. Before send: re‑query Inventory to ensure items are still present/urgent; skip if not.
4. Notifications → send push; Analytics → record event.

---

## Auth Agent

**Owns:** Verifying bearer tokens; resolving current user; reading dietary preferences/allergens.
**Input:** `{ "type": "auth.verify", "token": "…" }`
**Output:** `{ "ok": true, "user": { "_id": "…", "dietary_preferences": [], "allergens": [] } }`
**Errors:** `UNAUTHORIZED`, `FORBIDDEN`.

---

## Inventory Agent

**Owns:** CRUD for inventory items; partial consumption; expiry estimation heuristics.

**Create input:**

```json
{
  "type": "inventory.create",
  "owner_id": "…",
  "name": "Greek yogurt",
  "quantity": 4.0,
  "unit": "pieces",
  "input_date": "2025-09-20T01:23:45Z",
  "est_expiry_date": null,
  "est_cost": 6.99
}
```

**Create behavior:** If `est_expiry_date` is null, auto‑estimate based on category heuristic; store overridable date.

**Create output:** persisted item: `{ _id, status: "active", remaining_quantity, ... }`.

**Consume input:**

```json
{
  "type": "inventory.consume",
  "item_id": "…",
  "quantity_delta": 1.0,
  "reason": "used"
}
```

**Rules:**

- Decimals allowed; unit from enum; remaining cannot drop below 0.
- When remaining hits 0 → mark `completed` with `used_at` or `discarded_at`.
- If `reason == "used"` and usage date is the item’s last estimated day → emit `item_rescued`.

**Estimate expiry input:** `{ "type": "inventory.estimateExpiry", "name": "…" }`
**Output:** `{ "est_expiry_date": "2025-09-24T00:00:00Z", "basis": "dairy-default-7d" }`

---

## Suggestions Agent (Microservice)

**Owns:** Generating simple meal ideas from inventory and user profile.
**Interface:** REST/JSON; service‑to‑service auth (JWT/shared secret).

**Input:**

```json
{
  "type": "suggestions.generate",
  "user_id": "…",
  "inventory": [{ "_id": "…", "name": "Spinach", "est_expiry_date": "…" }],
  "dietary_preferences": ["vegetarian"],
  "allergens": ["nuts"]
}
```

**Output (minimal):**

```json
{
  "suggestions": [
    { "title": "Spinach omelette", "items_to_use": ["Spinach", "Eggs"] }
  ]
}
```

**Guardrails:**

- Avoid user allergens; respect dietary preferences.
- No safety/freshness claims; do not compute expiry.
- No images.

---

## Notifications Agent

**Owns:** Push token registry; schedule; pre‑send revalidation; send; receipts.

**Register token:** `{ "type": "push.register", "account_id": "…", "token": "ExponentPushToken[…]" }`

**Schedule daily windows:**

```json
{
  "type": "notifications.scheduleDaily",
  "account_id": "…",
  "timezone": "America/Los_Angeles",
  "windows": {
    "lunch": ["11:30", "13:30"],
    "dinner": ["17:30", "19:30"],
    "quiet": ["21:00", "08:00"]
  },
  "daily_cap": 2
}
```

**Pre‑send check:** Before sending, re‑fetch urgent items (due today/soon) and skip if none or cap reached.

**Send:**

```json
{
  "type": "push.send",
  "to": ["ExponentPushToken[…]"],
  "title": "Use your spinach tonight",
  "body": "Try a spinach omelette for dinner",
  "data": { "type": "nudge", "suggestion_id": "…" }
}
```

---

## Analytics Agent

**Owns:** Impact metrics: items rescued; estimated food waste reduced.
**Compute:**

- On `item_rescued` → increment counters; add estimated weight (category heuristic).
- On `inventory.discarded` → optional counter.

**Input:** periodic or event‑driven.
**Output:** upsert into `analytics_daily` for dashboards.

---

## DevOps Agent

**Owns:** Environment validation; OpenAPI generation; seed data.
**Tasks:**

- Verify required env vars present.
- Generate `/openapi.json` from route decorators.
- Seed 10 sample inventory items with estimated expiries.

---

## Event Bus (in‑process or lightweight queue)

**Event schema:**

```json
{
  "event": "item_rescued",
  "ts": "2025-09-20T01:23:45Z",
  "data": { "item_id": "…", "owner_id": "…" },
  "correlation_id": "req-abc123"
}
```

**Subscriptions:**

- `inventory_item_added` → Notifications (scheduling), Suggestions (optionally warm cache)
- `inventory_item_due_soon` → Notifications (ensure in next window)
- `item_rescued` → Analytics

---

## Shared Validation Schemas (JSON Schema excerpts)

- `Unit` enum: `g,kg,oz,lb,ml,L,pieces`.
- `Allergen` enum: `gluten,dairy,nuts,peanuts,soy,eggs,fish,shellfish,sesame`.
- `InventoryItem`:

```json
{
  "type": "object",
  "required": ["name", "quantity", "unit", "input_date", "est_expiry_date"],
  "properties": {
    "name": { "type": "string", "minLength": 1 },
    "quantity": { "type": "number", "exclusiveMinimum": 0 },
    "unit": {
      "type": "string",
      "enum": ["g", "kg", "oz", "lb", "ml", "L", "pieces"]
    },
    "input_date": { "type": "string", "format": "date-time" },
    "est_expiry_date": { "type": "string", "format": "date-time" },
    "est_cost": { "type": "number", "minimum": 0 },
    "remaining_quantity": { "type": "number", "minimum": 0 }
  }
}
```

- `NotificationWindows`:

```json
{
  "type": "object",
  "properties": {
    "lunch": {
      "type": "array",
      "items": { "type": "string", "pattern": "^\\d{2}:\\d{2}$" },
      "minItems": 2,
      "maxItems": 2
    },
    "dinner": {
      "type": "array",
      "items": { "type": "string", "pattern": "^\\d{2}:\\d{2}$" },
      "minItems": 2,
      "maxItems": 2
    },
    "quiet": {
      "type": "array",
      "items": { "type": "string", "pattern": "^\\d{2}:\\d{2}$" },
      "minItems": 2,
      "maxItems": 2
    }
  }
}
```

---

## Guardrails (all agents)

- Never claim food safety/freshness.
- Avoid user allergens and respect dietary preferences in all suggestions.
- Do not store or handle images in MVP.
- Enforce rate limits and daily notification cap; return structured errors.

---

## Observability

- Correlated structured logs `{ level, ts, agent, event, correlation_id, details }`.
- Health endpoints for readiness/liveness (server).
- Push receipts monitoring: retry on `DeviceNotRegistered` by removing token.

---

## Happy‑path & failure‑path recipes

**Happy:** Add item → Lunch/Dinner schedule → Pre‑send recheck → Push sent → User uses item on last day → Mark used → Analytics update.

**Failures:**

- Unknown expiry heuristic → default; allow user override.
- Nothing urgent at send time → skip push.
- Daily cap reached → defer to next window/day.

---

## Test hooks

- `X-Debug-SkipPush: true` to bypass sends in staging.
- `?dryRun=true` on notifications to preview recipients.

---

## TODO (post‑MVP)

- Barcode/receipt OCR ingestion; price heuristics and "money saved" metrics.
- Households/shared inventory; digest mode; badges/milestones.
- Storage tips and category auto‑classification.
