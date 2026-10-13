# CLAUDE.md — conventions for AI agents (and humans)

## Commands (always use Task)
- `task ci` — lint + typecheck + tests. Run it before declaring work done.
- `task test` — Vitest (API domain, ingestion mapping, OpenF1 client).
- `task up` / `task logs -- <service>` / `task sync YEARS=2024` — Docker stack.
- `task dev:infra` then `task dev:api` / `task dev:web` for hot reload on the host.

## Architecture rules
- Screaming Architecture: code is grouped by business domain (`races/`, `performance/`, `ingestion/`). `platform/` is the only horizontal module.
- `apps/api/src/performance/domain/**` must stay pure: no imports from `platform/`, no I/O, no `Date.now()`. Add a test for every behaviour change.
- Every payload crossing a boundary is a Zod schema in `packages/contracts`. Change the contract first, then let the compiler guide API and app.
- SQL goes through Kysely in `*.repository.ts` (reads) or `ingestion/` (writes). New tables need a migration in `platform/db/migrations` registered in `migrator.ts`, and the `Database` interface updated.
- Exhaustive branching with `ts-pattern` (`match(...).exhaustive()` when possible).
- Background work = Graphile Worker job with a `jobKey`; jobs must be idempotent.
- Bump the cache prefix (`perf:v1` → `perf:v2`) in `performance.service.ts` when an analysis output changes.

## Style
- TypeScript strict, `noUncheckedIndexedAccess`; no `any`, no non-null assertions (Biome enforces it).
- Biome formats: single quotes, no semicolons, 110 columns. Run `task format`.
- UI copy is French; code, identifiers and comments are English.
- React Native: under `<Link asChild>` pass flattened styles — use `HoverPressable` for hover states.

## Decisions
Read `docs/adr/` before proposing structural changes; add an ADR for any new one.
