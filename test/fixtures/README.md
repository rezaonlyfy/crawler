# Crawler HTML fixtures

Saved HTML pages for deterministic, offline crawler tests (CRAWL-P1-005).
Fixture tests must never touch the network — every URL uses a reserved
`.example` domain, and pages reference no external assets.

## Layout

```
test/fixtures/<category>/<fixture-name>/
  fixture.json     manifest (required)
  *.html           one file per saved page
  expected.json    optional expected result for extraction assertions
```

Categories are declared in `src/shared/testing/fixtures/htmlFixture.ts`
(`FIXTURE_CATEGORIES`) and must have a matching directory here. Current
categories: `basic-career-page`, `jsonld-job`, `html-job`, `pagination`,
`malformed-jsonld`, `ats-platform`.

Exception to the `.example`-domain rule: `ats-platform` fixtures use the
real ATS hostnames (with fake tenants, e.g. `acme-demo.jobs.personio.de`)
because the hostname itself is the fingerprint under test. Tests never fetch
fixture URLs, so nothing real is ever crawled.

## Manifest (`fixture.json`)

```json
{
  "description": "What this fixture represents and which behavior it pins.",
  "pages": [
    {
      "id": "listing",
      "url": "https://careers.acme-analytics.example/jobs",
      "file": "listing.html",
      "mustContain": ["optional smoke-test snippets"]
    }
  ]
}
```

- `pages[0]` is the entry page (`fixture.entryPage()`); multi-page fixtures
  (pagination, load-more states) add further pages with stable `id`s.
- `mustContain` snippets are asserted by the fixture smoke suite — use them to
  pin the parts of the page a test depends on, so an accidental edit fails CI.
- `expected.json` holds the expected result a consuming spec asserts against
  (`fixture.expectedResult<T>()`); its shape is owned by the ticket that adds
  the fixture.

## Using fixtures in specs

```ts
const loader = new FixtureLoader();
const fixture = loader.load('jsonld-job', 'complete-posting');
const html = fixture.entryPage().html; // hand to discovery/extraction services
```

## Adding a fixture (every later ticket adds its own)

1. Create `test/fixtures/<category>/<your-fixture>/` with `fixture.json` and
   the HTML file(s). Strip trackers, external scripts, images and fonts from
   saved real pages; keep the markup that matters.
2. Use a `.example` domain in `url` (never a real customer domain).
3. Add `mustContain` snippets for the content your test depends on.
4. Run `npm run test:fixtures` — the smoke suite validates the new fixture
   automatically.

A new category additionally needs an entry in `FIXTURE_CATEGORIES` and, if it
has structural invariants, a check in `fixtureSet.smoke.spec.ts`.
