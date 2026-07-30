# [Project name]

_Replace the heading above with the project's name, and this line with one sentence describing what this app does for users._

## Run & Operate

- `bun run dev` — run the API and chatbot together
- `bun run --filter @workspace/api-server dev` — run the API server (port 8080)
- `bun run typecheck` — full typecheck across all packages
- `bun run build` — typecheck + build all packages
- `bun run --filter @workspace/api-spec codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `bun run --filter @workspace/db push` — push DB schema changes (dev only)
- Optional env: `DB_FILE_NAME` — SQLite database path (defaults to `data/ella.sqlite`)
- Optional env: `OPENAI_API_KEY`, or Replit's `AI_INTEGRATIONS_OPENAI_API_KEY` and `AI_INTEGRATIONS_OPENAI_BASE_URL`, for AI features

## Stack

- Bun workspaces, Node.js 24, TypeScript 5.9
- API: Express 5
- DB: SQLite + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)

## Where things live

_Populate as you build — short repo map plus pointers to the source-of-truth file for DB schema, API contracts, theme files, etc._

## Architecture decisions

_Populate as you build — non-obvious choices a reader couldn't infer from the code (3-5 bullets)._

## Product

_Describe the high-level user-facing capabilities of this app once they exist._

## User preferences

_Populate as you build — explicit user instructions worth remembering across sessions._

## Gotchas

_Populate as you build — sharp edges, "always run X before Y" rules._

## Pointers

- Root `package.json` defines the workspace structure and shared dependency catalog.
