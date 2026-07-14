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
3. Start the API (Express, on http://localhost:3001):
   ```
   npm run dev:api
   ```
4. In a separate terminal, start the web app (Vite, on http://localhost:5173):
   ```
   npm run dev:web
   ```
5. Open http://localhost:5173 in a browser. The web app calls the API through the dev server's `/api` proxy.

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