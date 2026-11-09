# TARIK ELER TARNAK — project memory

## Project
- `site/`: Next.js 16.3.4, React 19, Tailwind 4, Puck, Supabase, pg, Vitest, HeroUI/Ant Design/Lobehub.
- Repo: tarikelertarnak/Tarnak-Site, master. Inspect current status; older commit IDs are not authoritative.
- Last verified production: Vercel `mxngo.dev`; `mangoapi.dev` redirects there. Cloudflare worker `tarikelertarnak` had no custom-domain route. Recheck before deployment work.
- Credentials live in ignored `.env.local`; never print or record values. Previously exposed credentials require rotation, not republication.
- GitHub username: `tarikelertarnak`, not `TARIKELER-TARNAK`.

## Outstanding backend checks
- Earlier content/admin writes used local files, unsafe on read-only/ephemeral deployments. Check current persistence before claiming backend completion.
- Last recorded missing schema: `messages.phone`, ads tables. Inspect actual schema; do not assume missing tables have zero rows.
- Ads use signed duration tokens and unique nonce; fallbacks must be identified as fallbacks.

## Engineering conventions
- Visible text must use proper Turkish; comments may be ASCII. Preserve existing translations and user edits.
- Concurrent sessions have modified files. Inspect git status/diffs; never reset unrelated changes or stop all Node/browser processes.
- Guard optional postinstall/prebuild scripts. GitHub snapshot fetch failures must not destroy the committed fallback.
- Ignore `scripts/*` with explicit exceptions, not the whole directory; keep secret-bearing scripts ignored.
- Windows URL paths require `fileURLToPath`, not `.pathname`.
- Test after changes: typecheck, relevant/full tests, build and real-browser checks. Check test FILE totals, not just individual passing tests.
- Mock Lobehub-dependent UI in component tests; call `afterEach(cleanup)` with Vitest globals disabled.
- Normalize Turkish search/slugs (NFD + combining-mark removal, explicit dotless-i handling).
- Supabase: distinguish missing columns (`42703`, `PGRST204`) from tables (`42P01`, `PGRST205`); null counts are unknown. Shared helpers: `src/lib/postgrest.ts`.
- Validate write results and real row counts. A local fallback does not prove durable persistence. Include new fields in schema and round-trip tests.
- Next route/page module caches may differ; verify invalidation end to end. Never expose backend secrets or raw sensitive errors.
- Keep server authorization authoritative; create-only and never-writable fields differ.

## UI decisions
- Contact methods/social links live in searchable ContactQuickMenu with copy actions; no duplicate Follow column or hidden-game footer button.
- User requests downward opening, no unwanted page scroll, available-space sizing. Test footer/mobile, keyboard and copy behavior.
- Topbar/sidebar TARNAK should use primary blue, not cyan gradient.
- Server-resolved locale and client provider should share one source.
- Further workflow details live in installed tarnak-site-ui / tarnak-admin-resource skills and daily logs.
