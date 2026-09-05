# job-crawler

Internal AI-assisted job crawler (Phase 1). NestJS modular monolith around
domain capabilities, following DDD/Clean Architecture (CRAWL-P1-003).

## Structure (conventions follow messaging-service)

```
src/
  crawl-execution/
    domain/            entities/ valueObjects/ services/
    application/       useCase/<name>/<name>.useCase.ts
    infrastructure/    IoC/Symbols.ts  adapters/  cli/  errors/
    crawlExecution.module.ts
  job-discovery/       domain/ application/ infrastructure/
  job-extraction/      domain/ application/ infrastructure/
  job-normalization/   domain/ application/ infrastructure/
  crawl-reporting/     application/ infrastructure/   (no domain layer on purpose)
  shared/              domain/ (UseCase, Result, ValueObject, Entity, ports)
                       errors/ (ExceptionBase, ExceptionsEnum, CatchErrorWithLogger)
                       infrastructure/ (IoC/Symbols.ts, adapters, Heartbeat.service)
  config/              configuration.ts + Joi validation
  app.module.ts        feature modules (CLI + tests boot this)
  worker.module.ts     AppModule + HeartbeatService (main.ts boots this)
```

House conventions (mirroring messaging-service): string DI tokens in
`infrastructure/IoC/Symbols.ts`; ports as `XxxPort` interfaces in
`domain/ports`; value objects extend `ValueObject` with `static create()`
returning `Result`; entities extend `Entity<Props>`; errors extend
`ExceptionBase` with an `ExceptionsEnum` code; use cases implement
`UseCase<T>` with `()`; static `Logger.log(msg, Ctx)`
calls; absolute `src/...` imports.
```

The modules are intentionally empty skeletons — boundaries first, crawler
logic in later tickets. Infrastructure technology lands at fixed seams:
`crawl-execution/infrastructure/crawlee/`, `job-discovery/infrastructure/playwright/`,
`job-extraction/infrastructure/ai/`.

## Architecture rules (enforced by ESLint)

Dependency direction: `Domain ← Application ← Infrastructure`.

- `domain/` and `application/` must not import Crawlee, Playwright, AI SDKs
  (`@anthropic-ai/*`, `openai`, `ai`, `@ai-sdk/*`), TypeORM, mysql or Prisma.
- `domain/` must additionally stay framework-free (no `@nestjs/*`).
- Lower layers must not import from higher layers
  (`import/no-restricted-paths` zones in `.eslintrc.js`).

Try it: add a file with `import { chromium } from 'playwright';` under any
`domain/` folder and run `npm run lint` — it fails.

## Commands

```
npm install
npm run lint          # ESLint incl. architecture rules
npm test              # Jest unit tests
npm run build         # compile to dist/
npm run start:dev     # worker-style app context with heartbeat logs
```

## CLI (CRAWL-P1-004)

```
node dist/cli run <input-file>   # plan a crawl run from a JSON array of URLs
node dist/cli inspect <url>      # evaluate one URL against the target policy
```

The input file is a JSON array of career-page URLs (see
`evaluation/test-targets.json`). Every run gets a `runId`; every accepted
target gets its own `siteRunId`. Batch-input policy: continue-on-invalid —
invalid and duplicate inputs are diagnosed, valid targets proceed.
Exit codes: 0 = at least one valid target, 1 = none / rejected inspect,
2 = unreadable input file.

### Crawl target policy

Only `http`/`https` targets are allowed. Rejected: malformed URLs, URLs
with embedded credentials, loopback (127.0.0.0/8, ::1, localhost),
link-local (169.254.0.0/16, fe80::/10) and private networks (10/8,
172.16/12, 192.168/16, fc00::/7, IPv4-mapped IPv6) — private networks can
be allowed via `ALLOW_PRIVATE_NETWORK_TARGETS=true` (environment policy).
The policy lives in `crawl-execution/domain/services/crawl-target-policy.ts`,
independent of Playwright; redirect destinations and DNS-resolved
addresses must be re-evaluated through it at fetch time.

## Docker

```
docker compose up --build
```

Builds the production image (Docker/Dockerfile) and starts the worker; it
logs the loaded modules and a heartbeat.

## Field contract & evaluation sites

- `docs/FIELD_DEFINITIONS.md` — the authoritative field contract (CRAWL-P1-001).
- `evaluation/phase1-sites.json` — the stable evaluation portfolio (CRAWL-P1-002).
