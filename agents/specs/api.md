# API design

Endpoint design for the Parks & Rec scheduling MVP, built on [schema.md](./schema.md).

## Conventions

- JSON request/response bodies throughout. Dates/times are ISO 8601 strings; money is integer cents (matches schema.md).
- **No auth, no authorization in v0.** There is no session/login concept and no ownership checks — endpoints trust whatever IDs are passed in (e.g. `account_id`, `participant_id`). Anyone can act on any household or flip any admin flag. This is a deliberate v0 scope cut, not an oversight; real auth would add an identity layer on top of these same routes later.
- Admin and end-user actions share the same resource routes (e.g. `POST /programs` to create, `GET /programs` to browse) rather than a separate `/admin/*` namespace — there's no identity to gate on anyway in v0.
- Errors: non-2xx responses return `{ "error": string, "details"?: unknown }`.
- Standard status codes: `201` on create, `200` on read/update/action, `204` on delete, `400` validation errors, `404` not found, `409` conflict (e.g. duplicate enrollment).

## Accounts & participants

| Method & path | Purpose | Body | Response |
|---|---|---|---|
| `POST /accounts` | Create an account (household). Mocked "signup" — no credential/password concept. | `{ email }` | `201` Account |
| `GET /accounts/:id` | Fetch an account with its household roster nested. | — | `200` Account with `participants: Participant[]` |
| `POST /accounts/:id/participants` | Add a household member. | `{ name, birth_date }` | `201` Participant |
| `GET /accounts/:id/enrollments` | Household's enrollment history (all participants, all statuses). | — | `200` Enrollment[] (each with nested `participant` and `section` summary) |

Editing/removing a participant profile isn't in the product requirements (only creating household members and enrolling/removing them from sections), so it's out of scope for v0.

## Programs

| Method & path | Purpose | Body | Response |
|---|---|---|---|
| `GET /programs` | Browse programs. Defaults to `visible=true` programs with only their `visible=true` sections nested. Pass `?all=true` for the admin view (all programs, all sections, regardless of visibility) — no identity to gate this on in v0, so it's just a query flag. | — | `200` Program[] with `sections: Section[]` nested |
| `GET /programs/:id` | Single program, same visibility rule (and `?all=true` override) as above. | — | `200` Program with `sections: Section[]` nested |
| `POST /programs` | Create a program. `visible` defaults to `false`. | `{ name, description? }` | `201` Program |
| `PATCH /programs/:id` | Update a program (name, description, visible). | `{ name?, description?, visible? }` | `200` Program |

## Sections

| Method & path | Purpose | Body | Response |
|---|---|---|---|
| `POST /programs/:programId/sections` | Create a section under a program. `visible` defaults to `false`. | `{ name, capacity, waitlist_capacity, price, enrollment_open_at, run_start_date, run_end_date, days_of_week, start_time, end_time, visible? }` | `201` Section |
| `GET /sections/:id` | Section detail, including computed `enrolled_count`, `waitlisted_count`, and `spots_remaining`. | — | `200` Section + counts |
| `PATCH /sections/:id` | Update a section. **Constraint**: rejects `visible: true` with `409` if the parent program is not visible (see schema.md). Increasing `capacity` triggers waitlist promotion (see below). | `{ name?, capacity?, waitlist_capacity?, price?, visible?, enrollment_open_at?, run_start_date?, run_end_date?, days_of_week?, start_time?, end_time? }` | `200` Section |

## Eligibility rules

Only `type: "age_range"` (`config: { min_age?, max_age? }`) is implemented/evaluated in v0; see schema.md's "Future eligibility rule types" for what's deferred. Unsupported types are rejected with `400`.

| Method & path | Purpose | Body | Response |
|---|---|---|---|
| `POST /sections/:id/eligibility-rules` | Add an eligibility rule to a section. | `{ type, config }` | `201` EligibilityRule |
| `PATCH /eligibility-rules/:id` | Update a rule's config or active flag. | `{ config?, active? }` | `200` EligibilityRule |
| `DELETE /eligibility-rules/:id` | Remove a rule. | — | `204` |

## Discounts

Only `type: "household_multi_enrollment"` is implemented in v0 (config shape per schema.md, e.g. `{"tiers":[{"nth":2,"percent_off":10}]}`). Unsupported types are rejected with `400`.

| Method & path | Purpose | Body | Response |
|---|---|---|---|
| `POST /sections/:id/discounts` | Add a discount rule to a section. | `{ type, config }` | `201` Discount |
| `PATCH /discounts/:id` | Update a discount's config or active flag. | `{ config?, active? }` | `200` Discount |
| `DELETE /discounts/:id` | Remove a discount. | — | `204` |

## Enrollments

| Method & path | Purpose | Body | Response |
|---|---|---|---|
| `POST /sections/:id/enrollments` | Enroll one or more household participants into a section in one call (a single participant is just an array of length 1 — no separate single-enroll endpoint). | `{ participant_ids: number[] }` (min 1) | `200` — array of per-participant results (see below) |
| `DELETE /enrollments/:id` | Cancel an enrollment (sets `status: "cancelled"`; works for both `enrolled` and `waitlisted` rows). Cancelling an `enrolled` row triggers waitlist promotion (see below). | — | `204` |

### `POST /sections/:id/enrollments` response shape

Processed independently per participant in the request (one participant's outcome doesn't block another's), returned as:

```json
[
  { "participant_id": 12, "result": "enrolled", "enrollment": { "id": 501, "price_charged": 4500, "discount_id": 3 } },
  { "participant_id": 13, "result": "waitlisted", "enrollment": { "id": 502, "position": 1 } },
  { "participant_id": 14, "result": "ineligible", "reason": "Does not meet age_range rule (min_age: 8)" },
  { "participant_id": 15, "result": "already_enrolled" }
]
```

`result` is one of: `enrolled`, `waitlisted`, `ineligible` (fails an active eligibility rule), `already_enrolled` (participant already has an `enrolled` or `waitlisted` row for this section), `waitlist_full` (section and waitlist both at capacity). Only `enrolled`/`waitlisted` create an `enrollments` row.

### Enrollment processing algorithm (per participant, in request order)

1. Reject with `already_enrolled` if the participant already has an active (`enrolled`/`waitlisted`) row for this section.
2. Reject with `ineligible` if any active eligibility rule on the section fails (v0: `age_range` evaluated against `sections.run_start_date`, per schema.md).
3. If `enrolled_count < capacity`: compute price by evaluating the section's active discounts against the household's current enrollment state for this section (per schema.md, this rank/tier logic is application logic reading `discounts.config`, not a stored field) → insert `enrollments` row with `status: "enrolled"`, `price_charged` set.
4. Else if `waitlisted_count < waitlist_capacity`: insert `enrollments` row with `status: "waitlisted"`, `position` set to next available (FIFO by `created_at`), `price_charged` left null (not charged until promoted).
5. Else: `waitlist_full`.

### Waitlist promotion (side effect, not a standalone endpoint)

Triggered by any capacity-affecting event, per mvp.md:
- A `DELETE /enrollments/:id` that cancels an `enrolled` row.
- A `PATCH /sections/:id` that increases `capacity`.

For each newly-available slot, promote the oldest `waitlisted` row (lowest `position`) to `enrolled`: compute `price_charged` via the same discount evaluation as step 3 above, clear `position`. The mocked charge always succeeds (per mvp.md), so there's no failure/retry path.

After each promotion, decrement `position` by 1 for every remaining `waitlisted` row in that section (i.e. close the gap left by the promoted row) so positions stay a gapless 1-based sequence and the next promotion can still just pick `position = 1`.
