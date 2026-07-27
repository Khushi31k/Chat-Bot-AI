---
name: ELLA app architecture
description: Full-stack AI companion app structure, key design decisions, and TypeScript quirks.
---

# ELLA App Architecture

## Structure
- **Frontend**: `artifacts/chatbot` (React + Vite, Tailwind v4, Framer Motion)
- **Backend**: `artifacts/api-server` (Express/Fastify API)
- **API client**: `lib/api-client-react` (generated, TypeScript project reference)

## Key design decisions
- Dark-only app (`#0d0d0f` background), Instrument Serif + Inter fonts, lavender/indigo primary (`hsl(239 84% 67%)`)
- Glass card utility class `.glass-card`, `.glass-nav`, `.liquid-glass` in `artifacts/chatbot/src/index.css`
- All protected routes use `<Layout>` wrapper which renders sidebar nav

## TypeScript quirks (important)
- `lib/api-client-react` uses **TypeScript project references** — `dist/` must be rebuilt with `cd lib/api-client-react && pnpm tsc --build` whenever the generated API changes. The chatbot reads from `dist/`, not `src/` directly.
- `UseQueryOptions` (tanstack-query v5) requires `queryKey` field — always pass `queryKey: getXxxQueryKey(params)` alongside `enabled`
- `useRef<T>()` with 0 args fails strict TS — use `useRef<T | undefined>(undefined)` 
- Framer Motion `Variants` with spring transition needs `type: 'spring' as const`

## API schema notes
- `MoodLogInput`: only has `userId`, `mood`, `note`, `date` — no `energy`/`stress` fields
- `MeditationPreset`: has `theme` (not `category`), `id` is string
- `MemoryUpdate`: requires `userId` along with optional `title`, `content`, `pinned`
- `deleteMemory.mutate({ id, params: { userId } })` — needs params object

## Pages added (not in original)
- `/` → `landing.tsx` (public marketing page)
- `/memory` → `memory.tsx` (ELLA memory cards)
- `/insights` → `insights.tsx` (AI-generated insights)
- `/settings` → `settings.tsx` (voice/personality/data)

## react-markdown
Installed in `artifacts/chatbot` for chat page markdown rendering (with `remark-gfm`).
