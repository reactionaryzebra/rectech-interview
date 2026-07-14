# Parks and Rec scheduling

## General domain information

Parks and recreation departments run **programs** (i.e. Tennis 3.5 clinic)

**programs** have one or more **sections**.  a section may is used to indicate a time window (i.e. Tennis 3.5 clinic monday & wednesday vs Tennis 3.5 clinic tuesday and thursday)

a **section** may occur one day a week or multiple (i.e. tennis 3.0 clinic may be on tuesdays and thursdays OR just tuesdays OR wednesdays and fridays)

**sections** have price, capacity limits as well as eligibility criteria which determine what kind and how many **participants** may be enrolled.  When capacity is met, a **waitlist** is opened for folks to join in the event a slot becomes available.  This **waitlist** also has a capacity.

multiple **participants** may belong to a **household**

**sections** become open and able to except new enrollment on a specified date.  Enrollment has a specific cost per **participant**

**sections** may have certain **discounts** applied to them that reduce their cost in certain scenarios.  For example there may be a discount if you enroll multiple **participants** in the same **household** in the same **section** (e.g. 10% off second child, 20% off third)

## Clarifications & decisions

These resolve ambiguities in the domain description above; schema design should follow them.

- **Household / user model**: a single account holder logs in per household and manages lightweight **participant** profiles for household members (kids do not have their own login). "Users" in the product requirements below refers to this account holder.
- **Section scheduling fields**: a section carries a full schedule, distinct from enrollment:
  - `enrollment_open_at` — date/time enrollment opens (existing "specified date" concept)
  - `run_start_date` / `run_end_date` — the date range the section actually meets over
  - `days_of_week[]` — which weekdays it meets
  - `start_time` / `end_time` — daily meeting time window
- **Age eligibility reference date**: a participant's age is evaluated as of the section's `run_start_date`, not enrollment date.
- **Waitlist promotion**: triggered by *any* capacity-affecting event — a participant dropping out, or an admin increasing a section's capacity. The (mocked) charge always succeeds in v0, so no failure/retry path is needed.
- **Discounts**: modeled as a general, extensible discount mechanism (not hardcoded to the sibling-tier case), even though the only rule active in v0 is the household multi-enrollment discount. Every participant is charged the section's same base price before discounts are applied; the specific tier/rank logic (e.g. "2nd household enrollment in this section") is evaluated by the discount engine at enrollment time, not encoded as a fixed schema field.
- **Visibility**: `visible` is an independent flag on both program and section, but a section may not be marked visible while its parent program is not visible — `section.visible = true` requires `program.visible = true`. This is enforced as a write-time constraint (rejecting the update), not just computed at read time. Effective visibility to end users = `program.visible AND section.visible`. A corollary: hiding a program does not need to cascade-unhide its sections' flags — if the program becomes visible again, previously-visible sections reappear without an admin having to re-flip them.

## Product requirements

- An admin can create programs and sections and decide whether they are visible or not to end users.  They can update capacities, create new sections, etc.
- An admin can set eligibility criteria based on participant age
- An admin can set up discounts for a section
- An admin can set the date and time on which a section becomes open for enrollment
- A user can browse all visible programs
- A user can create multiple users for their household 
- A user can enroll themselves or any number of members of their household in open sections
- A user can remove themselves or any number of members of their household from a section
- When a spot opens in a section, if their is a waitlist, the first person who added themselves to the waitlist should be admitted and charged

## Technical requirements
- Typescript end-to-end
- Monorepo
- SQLite db 
- NodeJS API
- Vite web app

## Things that can be mocked in v0
- Authentication
- Payment
- Email / confirmation / notification


