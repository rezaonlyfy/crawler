# Crawling policy (Phase 1)

How the crawl engine (CRAWL-P1-006) behaves toward the sites it fetches, and
where each behavior is configured. The engine is `CrawleePlaywrightCrawlEngine`
behind the `CrawlEnginePort`; Crawlee owns queueing, retries, uniqueness,
concurrency, rate limits and robots.txt handling — none of that is
reimplemented in our code.

## Identification

The crawler always sends an identifiable User-Agent, never a spoofed browser
one. Browser-fingerprint generation is explicitly disabled — Phase 1 crawls
transparently.

- Default UA: `kununu-job-crawler/0.1 (+https://www.kununu.com)`
- Override: `CRAWLER_USER_AGENT`

## robots.txt — Phase 1 policy

**robots.txt is respected by default.** Crawlee fetches and evaluates the
site's robots.txt (`respectRobotsTxtFile`); a disallowed URL is never fetched
and surfaces in results as `status: not_visited` — visible, not silent.

- `CRAWLER_RESPECT_ROBOTS_TXT=false` disables this globally. It exists for
  controlled experiments only and must not be used against sites that have
  not consented. Per-site consent-based overrides are a later-phase feature
  (site registry), not a Phase 1 knob.

## Politeness limits

All configurable via environment, validated at startup (`config/validation.ts`):

| Behavior | Setting | Default |
| --- | --- | --- |
| Concurrent pages | `CRAWLER_MAX_CONCURRENCY` | 2 |
| Requests per site (hard cap) | `CRAWLER_MAX_REQUESTS_PER_SITE` | 100 |
| Requests per minute | `CRAWLER_MAX_REQUESTS_PER_MINUTE` | 60 |
| Delay between same-domain requests | `CRAWLER_SAME_DOMAIN_DELAY_SECONDS` | 1 |
| Navigation timeout | `CRAWLER_NAVIGATION_TIMEOUT_SECONDS` | 30 |
| Retries per request | `CRAWLER_MAX_REQUEST_RETRIES` | 2 |

Phase 1 processes one site at a time, so `CRAWLER_MAX_CONCURRENCY` is
effectively the per-domain concurrency.

## Target policy (recap, CRAWL-P1-004)

Only `http`/`https` URLs without credentials; loopback, link-local and
private-network hosts are rejected (`ALLOW_PRIVATE_NETWORK_TARGETS=true` for
local development only). **Redirect destinations are re-evaluated against the
same policy** after the visit (`finalUrlEvaluation` in the inspect result).

## Local prerequisite

Playwright needs a browser once per machine:

```
npx playwright install chromium
```

CI skips the browser download (`PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1`) because
unit tests never launch one; real-site checks run locally via
`npm run cli -- inspect <url>`.
