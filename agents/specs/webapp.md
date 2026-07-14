# Web app design

Design for `src/web`, built on [api.md](./api.md). User-facing only — no admin
screens in v0; admin actions continue to go through the API directly (curl,
or the seed script), per mvp.md's "Admin UI / tooling" future consideration.

## Session simulation

There's no real auth (per api.md), but the account-scoped endpoints still
need "which household is this" from the browser. The web app simulates a
session:

- On load, check `localStorage` for a stored `account_id`.
- If absent, show a welcome screen: enter an email to create a new household
  (`POST /accounts`) or an existing account id to resume one
  (`GET /accounts/:id`). The resulting id is written to `localStorage`.
- Every other page requires an account id to be present — if not, redirect to
  the welcome screen. (The underlying API doesn't actually require an account
  to browse programs, but the v0 web app gates on it anyway for simplicity,
  since every other page needs it.)
- A "Switch household" action in the layout clears `localStorage` and returns
  to the welcome screen.

## Routes

| Path | Page | Purpose |
|---|---|---|
| `/welcome` | Welcome | Create or resume a household; redirect target when no account id is stored |
| `/` | Browse | List visible programs with their visible sections nested (`GET /programs`), view-only |
| `/sections/:id` | Section detail | Section info, eligibility/discount summary, computed capacity (`GET /sections/:id`), and the enroll form |
| `/household` | Household | View household roster, add a participant (`GET /accounts/:id`, `POST /accounts/:id/participants`) |

Routing via `react-router-dom`. A shared layout renders the nav (Browse /
Household) plus the current household's email and a "switch household"
action, and redirects to `/welcome` when no account id is stored.

Enrollment *history* (a dedicated `/enrollments` page listing everything a
household has enrolled in, plus cancelling) is still out of scope for this
pass — see "Out of scope" below. The enroll flow itself (section detail →
bulk enroll) is in scope.

## Enroll flow (section detail page)

The enroll form lists the household's participants as checkboxes and submits
the selected `participant_ids` to `POST /sections/:id/enrollments` in one
bulk request.

The frontend does **not** re-implement eligibility or capacity checks — that
logic lives once, server-side (per api.md/schema.md's discount and
eligibility engines). The page just submits the selection and renders the
per-participant result array the API returns: enrolled (with price),
waitlisted (with position), ineligible (with reason), already_enrolled, or
waitlist_full. This keeps the business logic single-sourced and the web app
as a thin client over it.

There's no pre-enrollment status check (e.g. "you're already enrolled") —
without the enrollment-history endpoint in scope, the page doesn't know a
household's existing enrollments for a section ahead of time. If someone
resubmits, the `already_enrolled` result in the response communicates it
after the fact. Revisit once the history page brings that data into view.

## Data fetching

`TanStack Query` for server state (loading/error states, caching, and
refetch-after-mutation). Rough query key scheme:

- `["programs"]` — browse list
- `["sections", id]` — section detail (computed capacity counts)
- `["account", id]` — account + roster

Mutations: create participant invalidates `["account", id]`; a successful
enroll submission invalidates `["sections", id]` (capacity/waitlist counts
change) — it does not need to touch `["account", id]` since the roster
itself doesn't change.

## API client

A thin typed fetch wrapper in `src/web/src/lib/api.ts`, one function per
endpoint in api.md, built on the entity types already exported from
`src/shared/types.ts`.

That file currently only exports the raw Drizzle entity types (`Program`,
`Section`, etc.). The endpoints in scope for this pass need these
composite/response-only shapes, which don't exist yet as shared types and
should be added there rather than duplicated in the web app:

- `ProgramWithSections` (`Program & { sections: Section[] }`)
- `AccountWithParticipants` (`Account & { participants: Participant[] }`)
- `SectionWithCounts` (`Section & { enrolled_count, waitlisted_count, spots_remaining }`)
- `EnrollResult` (the discriminated per-participant result type currently
  defined inline in `src/api/enrollments/routes.ts` — move it to
  `src/shared/types.ts` and import it from both sides)

(`EnrollmentWithDetails` is only needed once the `/enrollments` history page
is back in scope — not added yet.)

## File layout

```
src/web/src/
  main.tsx                 # QueryClientProvider + RouterProvider
  App.tsx                  # route table
  layout/Layout.tsx         # nav, current household, switch-household action
  lib/
    api.ts                  # typed fetch wrapper functions
    account.ts               # localStorage get/set/clear + a useAccountId hook
  pages/
    WelcomePage.tsx
    BrowsePage.tsx
    SectionDetailPage.tsx
    HouseholdPage.tsx
```

No separate `components/` abstraction layer up front — pages own their own
markup until something is actually reused across two or more of them.

## Out of scope for v0

- Admin screens (program/section CRUD, eligibility rule and discount
  management) — API/curl/seed-script only, per mvp.md.
- **Enrollment history and cancellation**: a dedicated `/enrollments` page
  listing everything a household has enrolled/waitlisted in, and cancelling
  via `DELETE /enrollments/:id`, are deferred. (The enroll flow itself —
  section detail → bulk enroll — is in scope; see above.)
- Any visual design system beyond plain, functional CSS.
- Editing or removing a participant profile, or removing a household member
  entirely (not in the product requirements — see schema.md).
