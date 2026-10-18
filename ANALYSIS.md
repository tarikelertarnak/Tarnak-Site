# Initial project analysis

## Stack and structure

- Next.js 16.4.0 App Router, React 19.1.0, strict TypeScript 5.9.3; Tailwind CSS v4 plus Ant Design, HeroUI, LobeHub UI, Emotion, Iconify, and Motion.
- Theme is light/dark, initialized by `ThemeInitScript`, with shared CSS tokens in `src/app/tokens.css` and `src/app/globals.css`. The master button lives in `src/components/ui/button.tsx`.
- Routes live in `src/app/`; shared UI in `src/components/`; services, schemas, and Supabase helpers in `src/lib/`; locale dictionaries in `src/i18n/`; static content snapshots in `data/`; SQL in `supabase/` and `scripts/`.
- UI locale selection is cookie/Accept-Language based, with 25 selectable locales and translated content currently covering tr/en/de/es/fr/ja/pt/ru. There is no locale-prefixed routing.
- Auth has both a signed `admin_session` flow and Supabase Auth. `src/proxy.ts` handles host checks and conditional Supabase session refresh. Admin API authorization is server-side.

## Data, files, and realtime

- Supabase JS and SSR are installed. Shared browser/server/middleware clients exist under `src/lib/supabase/`; service-role construction is now centralized in `admin.ts` and accepts `SUPABASE_SERVICE_ROLE_KEY` with the old name as a compatibility fallback.
- Content starts from `data/content.json` and is merged with Supabase. Chat persistence uses Supabase in `src/lib/chat-db.ts`; legacy JSON persistence code remains in `src/lib/chat.ts`. Visits, permissions, quotas, ads, GitHub, and admin resources each have dedicated modules.
- SQL is split among `supabase/*.sql` and `scripts/schema-*.sql`; an ordered `supabase/migrations/` directory now contains a migration that archives and clears the unverified About copy. Repo instructions documented older schema gaps, but the `site_content` table was live and the about-page data was confirmed by the local runtime.
- Public assets and CVs are currently in `public/`; the repo contains `public/uploads/profile.png` and one legacy chat attachment. Profile photo uploads use Supabase Storage, while legacy chat uploads and polling remain. Chat has no Supabase Realtime channel subscription yet.
- Cloudflare Workers deployment is configured through OpenNext. Filesystem writes are not durable there; `content.ts` still has disk fallbacks. This is a known persistence risk when the live `site_content` table is absent.

## Existing work relevant to the request

- Existing shared button, scroll, tab strip, visibility switch, admin panel grouping, chat reply/tick/emoji/group features, icon sanitization, and credits list tests indicate several requested features are already implemented. These are not assumed complete until source/runtime checks confirm them.
- `rg` found `Math.random()` in ad selection and temporary chat IDs; other `setTimeout` matches are mostly UI timers/debounce/typing behavior, not necessarily fake loading. Mock references are primarily test mocks.
- No `.codegraph/` index or `TaskCreate` tool is available in this checkout/session.

## Baseline checks (Windows, 2026-10-18)

- `npx tsc --noEmit`: passed before edits and after the service-role refactor.
- `npx eslint . --max-warnings 0`: failed on one test title capitalization at `src/components/admin/admin-panel.test.tsx:147` (`test/prefer-lowercase-title`). Repo-wide lint health may differ from the older count in `AGENTS.md`.
- `npx vitest run`: 78 files and 1,022 tests passed. Stderr includes expected EROFS logs from tests exercising read-only filesystem handling and Node localStorage warnings; one test also emitted a mocked HTTP 500 stack.
- `npx next build`: passed with Node's `DEP0205` deprecation warning.
- BrowserOS snapshots loaded `/`, `/projects`, `/blog`, `/about`, `/chat`, and `/credits`; the logged-out `/chat` first displayed its loading status. A Next.js Issues panel was not present in the sampled page DOM; browser console events were not available from the read-only page snapshot.
- The live About copy was archived outside the repository at `%TEMP%/tarnak-about-page-backup-20261018.json` and cleared from `site_content`, preserving all other site content fields. `supabase/migrations/202610180001_clear_unverified_about_page.sql` retains an idempotent private archive before clearing for other environments.

## Open concerns before implementation

- Confirm which schema scripts are applied in the actual Supabase project before writing migrations or changing existing data.
- Do not replace existing content with fabricated profile/project/blog data. The current repo already contains real content snapshots and user-managed records whose provenance must be preserved.
- UI runtime checks need the user's `localhost:3000` app or a fresh local server; browser errors are not inferable from static tests.
