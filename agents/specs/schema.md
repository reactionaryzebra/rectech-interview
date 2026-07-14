# Schema design

Logical schema for the Parks & Rec scheduling MVP, derived from [mvp.md](./mvp.md).
Target: SQLite, defined via Drizzle ORM.

## Tables

### accounts
The login-capable household head (auth is mocked in v0). **An account *is* the household** — there is no separate `households` table; `accounts.id` is the household identifier, and all of a household's participants hang off one account via `participants.account_id`. This relies on the v0 assumption of a single login per household (see [mvp.md](./mvp.md)); if multi-caregiver access to one household is ever needed, this table would need to split into `accounts` + `households`.

| column | type | notes |
|---|---|---|
| id | integer, PK | |
| email | text | unique |
| created_at | text (ISO 8601) | |

### participants
Household members who can be enrolled in sections. The account holder is typically also represented by a participant row.

| column | type | notes |
|---|---|---|
| id | integer, PK | |
| account_id | integer, FK → accounts.id | |
| name | text | |
| birth_date | text (ISO date) | used for age-eligibility checks |

### programs

| column | type | notes |
|---|---|---|
| id | integer, PK | |
| name | text | |
| description | text | nullable |
| visible | integer (bool) | default false |
| created_at | text (ISO 8601) | |

### sections

| column | type | notes |
|---|---|---|
| id | integer, PK | |
| program_id | integer, FK → programs.id | |
| name | text | e.g. "Mon/Wed 4pm" |
| capacity | integer | enrolled-slot limit |
| waitlist_capacity | integer | |
| price | integer (cents) | base price per participant, pre-discount |
| visible | integer (bool) | default false; **write-time constraint**: cannot be set true unless parent program.visible = true |
| enrollment_open_at | text (ISO 8601) | when registration opens |
| run_start_date | text (ISO date) | first day the section meets; age-eligibility reference date |
| run_end_date | text (ISO date) | last day the section meets |
| days_of_week | text (JSON int array, 0=Sun..6=Sat) | |
| start_time | text (HH:MM) | daily meeting start |
| end_time | text (HH:MM) | daily meeting end |

### eligibility_rules
General eligibility engine, shaped like `discounts`: a `type` discriminator with a rule-specific `config`. Only `age_range` is implemented/evaluated in v0; the shape exists so other rule types don't require a migration later (see "Future eligibility rule types" below).

| column | type | notes |
|---|---|---|
| id | integer, PK | |
| section_id | integer, FK → sections.id | |
| type | text | discriminator; only `age_range` implemented in v0 |
| config | text (JSON) | rule-specific params, e.g. `{"min_age":8,"max_age":12}` for `age_range` |
| active | integer (bool) | default true |

### discounts
General discount engine. `config` shape is defined by `type`.

| column | type | notes |
|---|---|---|
| id | integer, PK | |
| section_id | integer, FK → sections.id | |
| type | text | discriminator, e.g. `household_multi_enrollment` |
| config | text (JSON) | rule-specific params, e.g. `{"tiers":[{"nth":2,"percent_off":10},{"nth":3,"percent_off":20}]}` |
| active | integer (bool) | default true |

### enrollments
One row per participant/section relationship; covers enrolled, waitlisted, and cancelled via `status`.

| column | type | notes |
|---|---|---|
| id | integer, PK | |
| section_id | integer, FK → sections.id | |
| participant_id | integer, FK → participants.id | |
| status | text enum: `enrolled`, `waitlisted`, `cancelled` | |
| position | integer | waitlist order; null when status = enrolled/cancelled |
| price_charged | integer (cents) | nullable until charged (waitlisted rows have none yet) |
| discount_id | integer, FK → discounts.id | nullable |
| created_at | text (ISO 8601) | drives FIFO waitlist ordering and enrollment history |

## Relationships

- accounts 1—N participants
- programs 1—N sections
- sections 1—N eligibility_rules
- sections 1—N discounts
- sections 1—N enrollments
- participants 1—N enrollments

## Future eligibility rule types (not built in v0)

The `eligibility_rules` shape (type + config) can hold these without a schema change to the table itself, but each needs supporting data that doesn't exist yet:

- **gender** — needs a `gender` column on `participants`
- **qualification** (e.g. "blue belt in karate") — needs a new concept of qualifications a participant can hold (e.g. a `participant_qualifications` table), not just a rule config
- **prior program/section completion** (e.g. swim level 2 before level 3) — needs a notion of "completed" that `enrollments.status` doesn't currently express (today: `enrolled`/`waitlisted`/`cancelled`); the rule config would reference the prerequisite section/program
- **non-simultaneous enrollment** (can't be in both Tue/Thu and Mon/Fri sections) — structurally different from the others: evaluated against a participant's *other current enrollments*, not static attributes. Would need either explicit section-conflict links or a runtime check of `days_of_week`/`start_time`/`end_time` overlap against the participant's existing `enrolled`/`waitlisted` rows

## Notes carried over from mvp.md clarifications

- Effective section visibility to end users = `program.visible AND section.visible`; enforced at write time for the section side (see `sections.visible` above), not just computed at read time.
- Age eligibility is evaluated against `sections.run_start_date`, not enrollment time.
- Waitlist promotion is triggered by any capacity-affecting event (a cancellation, or an admin raising `sections.capacity`); the mocked charge always succeeds, so no retry/failure path is modeled.
- Discount tier/rank logic (e.g. "this is the household's 2nd enrollment in this section") is evaluated by application logic at enrollment time using `discounts.config`, not stored as a fixed schema field.
