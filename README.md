# Rec interview program

## HOWTO

### Prerequisites
* Node.js 24+ and npm 11+

### Setup
1. Install dependencies:
   ```
   npm install
   ```
2. Apply the database migrations (creates a local `dev.db` SQLite file at the repo root):
   ```
   npm run db:migrate
   ```
3. Seed the database with sample data (5 programs, 2 sections each — some with age eligibility rules and/or a sibling discount, with varying capacities so you can exercise the waitlist):
   ```
   npm run db:seed
   ```
   Safe to re-run — it wipes and recreates the seeded programs/sections/rules each time.
4. Start the API (Express, on http://localhost:3001):
   ```
   npm run dev:api
   ```
5. In a separate terminal, start the web app (Vite, on http://localhost:5173):
   ```
   npm run dev:web
   ```
6. Open http://localhost:5173 in a browser. The web app calls the API through the dev server's `/api` proxy.

Auth, payment, and email/notifications are mocked in v0 per the MVP spec, so no additional credentials or services are needed to run locally.

If you change `src/api/db/schema.ts`, regenerate a migration before applying it:
```
npm run db:generate
npm run db:migrate
```

## Tools & Process

* Tools used: Claude code, Cursor

### Process
1. Hand write a basic spec (mvp.md) for what we want to build
2. Have Claude review and ask clarifying questions, update doc as we discuss and refine
3. Move on to discuss schema design with Claude - have it write and update schema.md as we write and refine

**Interaction note** 
At this point in the schema design I had to encourage claude to build flexibly both in the discount and eligibility rules space.  It had designed schema which would satisfy our current use cases (age gating and sibling discounts) only and I had to work with the agent to build a more flexible system.  Having built similar admin level tooling before I know how quickly folks want to extend these rules engines and so my instinct is to build them as flexibly as possible upfront even if that means some more admin work for engineering to create the specific rules in the beginning.

4. Have Claude agent implement all scaffolding and basic schema creation

5. Follow similar steps 3 and 4 for the API - have Claude write a doc, discuss and refine, and then start implementing

**Interaction note** 
It was at this point that I decided to de-scope any authentication and authorization.  The agent wanted specific authorization per route and I just didn't feel it was worth the time investment

6. For the complicated engine logic around discounts, eligibility, and waitlist I had the agent start by writing the unit tests.  I then read, updated, and approved the unit tests and used that suite passing as the definition of "done" for the agent.  I find this is the easiest way to verify it has done what I expect

**Interaction note** 
Something I try and do frequently is have Claude write scripts that mimic it's work.  So at this point I had it create the script for adding seed data to the db so that another user can easily mimic the smoke tests it was doing to test the application

7.  Follow similar steps 3 and 4 for the web app

## Future considerations

- Authentication / Authorization - we would need some role based auth to allow admins to CRUD programs and sections and only allow end-users to enroll/unenroll etc.  While this is obviously an incredibly important aspect of any system, i think it makes sense to descope here in the service of spending more time on functional requirements.  This is also not a horribly complex thing to add in later before we "go online"

- Payment - similar to above the effort / reward for setting this up makes it not worth doing in an exercise like this even though it is something that would be needed to go live

- Improved household enrollment - offer the option for all-or-nothing where the members of a household are only enrolled if there are spots for all of them

- Admin UI / tooling - a separate UI for CRUDL-ing programs for the admins.  Simply done via API for now

- Enrollment views - Right now a household cannot view and manage its active enrollments, it can only enroll.  This was a time consideration and was just descoped to allow building out core functionality


## What I would do differently next time

2 hours is less time than I thought :eek: 

I would have deferred the discounting and eligibility logic to be fast-follows.  Those are the least mission-critical aspects of what we are trying to do and included the most ambiguity and time for discussion and refinement with the agent.  The other resource models are pretty straightforward and easy to implement.