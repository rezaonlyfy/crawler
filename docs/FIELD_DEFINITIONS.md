# Crawler Field Contract (Phase 1)

**Ticket:** CRAWL-P1-001
**Status:** Authoritative — all discovery, deterministic extraction, AI prompts, grounding, normalization and validation code MUST conform to this document.
**Reference model:** the kununu **jobs service** — the `JobPosting` entity (`services/src/Domain/Entity/JobPosting.php`) and the `CreateJobPosting` / `UpdateJobPosting` commands (`services/src/Application/UseCase/Command/{Create,Update}JobPosting/Command.php`). Field names below are the command property names.
**Scope:** Domain semantics only. This document does **not** define the downstream HTTP DTO; the API payload mapper adapts the export to the internal API (see [Appendix B](#appendix-b--downstream-mapping-notes-informative)).

---

## 1. The export schema

Each crawled job in the crawler's export JSON contains **exactly** these fields — no more, no less:

```json
{
  "externalJobId":   "REQ-2211",
  "title":           "Senior PHP Developer (m/w/d)",
  "applicationType": "url",
  "applicationValue":"https://careers.acme.de/de/jobs/8842/apply",
  "descriptionType": "html",
  "descriptionValue":"<p>Wir suchen…</p>",
  "location":        { "city": "Berlin", "countryCode": "DE", "zipCode": "10115", "street": null, "latitude": null, "longitude": null },
  "employmentTypes": ["FULL_TIME"],
  "salary":          { "rangeStart": 55000, "rangeEnd": 65000, "currency": "EUR", "interval": "yearly" },
  "activeUntil":     "2026-10-01T00:00:00+00:00",
  "paidType":        "crawler_paid"
}
```

| Export field | Maps to command property | Maps to `JobPosting` entity | Requirement | Kind |
|---|---|---|---|---|
| `externalJobId` | `externalJobId` | `externalJobId` | Required | Extracted/derived |
| `title` | `title` | `title` | Required | Extracted |
| `applicationType` | `applicationType` | `application` (VO `type`) | Required | Constant `"url"` in Phase 1 |
| `applicationValue` | `applicationValue` | `application` (VO `value`) | Required | Extracted, deterministic fallback |
| `descriptionType` | `descriptionType` | `description` (VO) | Required | Constant `"html"` in Phase 1 |
| `descriptionValue` | `descriptionValue` | `description` (VO) | Required | Extracted |
| `location` | `city`, `countryCode`, `locationData` | `location` (embeddable) | Required (`city`, `countryCode`) | Extracted |
| `employmentTypes` | `employmentTypes` | `employmentTypes` | Best effort | Extracted (deterministic normalization) |
| `salary` | `rangeStart`, `rangeEnd`, `currency`, `salaryInterval` | `salary` (VO) | Best effort | Extracted (deterministic normalization) |
| `activeUntil` | `activeUntil` | `activeUntil` | Optional | Extracted |
| `paidType` | `paidType` | `paidType` | Required | Configuration, never extracted |

**Deliberately NOT in the export:**

- **`publishedAt`** — the jobs service has no such field (neither entity nor commands; `activatedAt` is an internal lifecycle timestamp). Phase 1 does not collect it at all.
- **`sourceUrl`** — internal **crawl metadata**, not an export field (see §5). It is still mandatory internally: it anchors grounding, derives `externalJobId` tiers 4–5, and is the `applicationValue` fallback.
- **`kununuProfileUuid`, `creationType`** — added by the delivery/mapper layer from per-target configuration, not part of the per-job export.
- Everything the jobs service derives or enriches itself: `language`, `tags`, `skills`, `keywords`, `remoteOptions`, `careerLevels`, `discipline`, `kununuJobTitle`, `salary.type`, `location.region`/`stateCode`/kununu UUIDs, `status`, `indexingStatus`, `inputHash`, `descriptionText`, `descriptionSections`, `activatedAt`/`createdAt`/`updatedAt`/`enrichedAt`/`parkedAt`, `osDocId`, `requestPayload`, `failure`, `warnings`, `source`, `uuid`. The crawler MUST NOT attempt to produce any of these.

---

## 2. Conventions

### 2.1 Requirement levels

| Level | Meaning |
|---|---|
| **Required** | A job without a valid value is invalid. It MUST NOT be exported; it goes to the quarantine/review queue with a per-field failure reason. |
| **Optional** | Missing value is a legal, expected state. The field is exported as `null`; the job is still exported. |
| **Best effort** | Optional, and additionally: absence alone MUST NOT trigger any extra extraction work (in particular no AI call). |

### 2.2 Source tiers

Accepted sources are always named from this ladder (highest trust first):

| Tier | Source | Nature |
|---|---|---|
| **T0 — ATS** | Structured ATS feed/API (Personio XML, Greenhouse, Lever, SmartRecruiters, Recruitee, Workday cxs, …) | Deterministic |
| **T1 — JSON-LD** | `schema.org/JobPosting` structured data embedded in the page | Deterministic |
| **T2 — Recipe** | Per-site extraction recipe (CSS/XPath selectors, URL rules) executed deterministically. Recipes may be *authored* with AI at onboarding/repair time, but *execution* is deterministic. | Deterministic |
| **T3 — AI extraction** | LLM extracts a value from the fetched page content at crawl time | Non-deterministic, grounding required |

Source precedence per field is listed high→low. A lower tier is consulted only when every higher tier yields no value for that field. A higher-tier value is never overwritten by a lower-tier value.

### 2.3 AI terminology (used per field below)

- **AI extraction** — an LLM locates a value that is **present verbatim** in the fetched source content. Subject to grounding (§2.4).
- **AI inference** — an LLM produces a value that is **not present verbatim** in the source (guessing, summarising, deriving from world knowledge, "the company is in Berlin so the job is probably in Berlin"). Where a field says *AI inference: prohibited*, no such value may ever be emitted for it.
- **Deterministic derivation** — computing a value from other extracted values or from crawl facts by a fixed rule (e.g. hashing a URL, mapping a country name to an ISO code, resolving a relative URL). Never involves an LLM at crawl time.

### 2.4 Grounding requirement

Every AI-extracted value MUST pass a deterministic grounding check before it is accepted:

1. After applying the field's allowed normalization to both sides, the value MUST be locatable as a contiguous substring of the fetched source content (HTML text content, JSON-LD values, or ATS payload) of **this specific job's page/record**.
2. The extractor MUST record *where* (a DOM pointer, JSON pointer, or byte offset) the value was found.
3. A value that fails grounding is discarded and treated as **missing** — it never falls back to "keep it anyway".

Deterministic sources (T0–T2) are grounded by construction; they only record their source pointer.

### 2.5 AI usage summary

| Export field | Deterministic derivation | AI extraction | AI inference |
|---|---|---|---|
| `externalJobId` | ✅ (its tiers 4–5) | ✅ (labeled IDs only, grounded) | ❌ |
| `title` | ❌ | ✅ (grounded) | ❌ |
| `applicationType` | constant | ❌ | ❌ |
| `applicationValue` | ✅ (fallback to source URL) | ✅ (link selection, grounded) | ❌ |
| `descriptionType` | constant | ❌ | ❌ |
| `descriptionValue` | ❌ | ✅ (boundary location only, content verbatim) | ❌ |
| `location` | ✅ (name→code, splitting) | ✅ (grounded) | ❌ |
| `employmentTypes` | ✅ (mapping table only) | ⚠️ never *for this field alone* | ❌ |
| `salary` | ✅ (format/unit normalization) | ⚠️ never *for this field alone* | ❌ |
| `activeUntil` | ❌ (no computed defaults) | ✅ (explicit labeled dates only) | ❌ |
| `paidType` | configuration | ❌ | ❌ |

---

## 3. Field definitions

### 3.1 `externalJobId`

**Semantic meaning.** The stable identity of the job *at the source*, unique per employer/source. Together with the kununu profile (attached at delivery) it defines job identity downstream (`UNIQUE (external_job_id, kununu_profile_id)`): the same `externalJobId` on two crawls means "the same job" (update), a new one means "a new job" (create), a disappeared one means "the job was removed" (delete/park). It must therefore be **stable across crawls** even when the job's content changes — downstream rejects a changed `external_job_id` on update with 403.

**Required:** Yes. (In practice tier 5 always yields a value, so a job can only lack an `externalJobId` when no canonical job URL can be established — such a job is invalid.)

**Accepted sources & precedence** (use the highest tier that yields a value; once chosen for a job, the *tier* must remain sticky — do not switch a live job to a different ID tier between crawls unless the higher tier newly becomes available and a migration mapping is recorded):

1. ATS/source-native job ID (T0 — e.g. Greenhouse job `id`, Personio `<id>`, Lever posting id).
2. `schema.org/JobPosting.identifier` (T1 — `identifier.value` if a PropertyValue, else the literal).
3. Explicit job/requisition/reference ID on the page (T2 selector or T3 grounded extraction of a *labeled* value: "Job-ID", "Referenznummer", "Requisition ID", …).
4. Stable identifier extracted deterministically from the canonical job URL (e.g. `/jobs/4021991/...` → `4021991`), by a per-site or generic URL rule.
5. Deterministic hash of the canonical job URL (lowercase-hex SHA-256 of the normalized canonical URL, prefixed `url:`), as last resort.

**Normalization allowed.** Trim; collapse internal whitespace to none for pure IDs; strip a label prefix captured by accident ("Job-ID: 12345" → "12345"). Nothing else — no case-folding, no re-encoding. To keep IDs distinguishable across tiers/sites, tiers 4–5 SHOULD be emitted with a deterministic prefix (e.g. `url:`); tiers 1–3 are emitted verbatim. Max length 256 characters (downstream column limit); longer candidates fall through to the next tier.

**Deterministic derivation:** Allowed (that is what tiers 4–5 are).
**AI extraction:** Allowed only for tier 3 (explicitly labeled IDs), grounded per §2.4.
**AI inference:** Prohibited. An ID that is not verbatim in the source and not derived from the canonical URL by a fixed rule must never be emitted.

**Grounding.** Tiers 1–3: the value must appear verbatim in the source at the recorded pointer. Tiers 4–5: reproducible from the recorded canonical URL by the fixed rule.

**Behavior when missing.** Cannot normally be missing (tier 5). If no canonical job URL exists, the job is invalid → quarantine, reason `externalJobId:missing`.

**Identity rules (normative).**
- `externalJobId` defines **identity**. `contentHash` (§4) defines **content sameness**. These are separate concepts and MUST never substitute for each other.
- A content hash, or any value derived from the job's *content* (title, description, …), MUST NOT be used as `externalJobId`: content edits would then create phantom new jobs and orphan old ones.

**Examples.**
- Greenhouse ATS record `{"id": 4021991, ...}` → `4021991` (tier 1).
- JSON-LD `"identifier": {"@type": "PropertyValue", "name": "ACME", "value": "REQ-2211"}` → `REQ-2211` (tier 2).
- Page shows "Referenznummer: K-0815" and no ATS/JSON-LD id → `K-0815` (tier 3, grounded).
- Canonical URL `https://careers.acme.de/jobs/senior-php-8842` with URL rule `/jobs/.*-(\d+)$` → `url:8842` (tier 4).
- Canonical URL with no extractable token → `url:sha256(<normalized URL>)` (tier 5).

---

### 3.2 `title`

**Semantic meaning.** The job's headline as the employer published it — the name of the position, not a summary, not enriched ("(m/w/d)" suffixes and similar stay as-is). Downstream derives `kununuJobTitle` from it; the crawler never anticipates that mapping.

**Required:** Yes.

**Accepted sources & precedence.**
1. ATS title field (T0).
2. JSON-LD `JobPosting.title` (T1).
3. Recipe selector — typically the posting's `h1` (T2).
4. AI extraction from page content (T3, grounded).
`og:title`/`<title>` tags are NOT accepted sources — they are page chrome (often "Job title – Company – Portal") and routinely disagree with the posting title.

**Normalization allowed.** HTML-entity decode, strip any markup, collapse whitespace, trim. Nothing semantic: no truncation, no rewriting, no case changes, no removal of "(m/w/d)".

**Deterministic derivation:** Not applicable (a title is never computed from other fields).
**AI extraction:** Allowed (T3), grounded — the emitted title must be a verbatim (post-normalization) substring of the page.
**AI inference:** Prohibited. No paraphrasing, translating, shortening or generating titles.

**Grounding.** §2.4 verbatim-substring rule after normalization.

**Behavior when missing.** Job invalid → quarantine, reason `title:missing`. A normalized title outside 3–255 characters is invalid (downstream validation range) → quarantine `title:invalid_length`.

**Examples.**
- JSON-LD `"title": "Senior PHP Developer (m/w/d)"` → `Senior PHP Developer (m/w/d)`.
- `<h1>Pflegefachkraft&nbsp;(w/m/d) – Intensivstation</h1>` → `Pflegefachkraft (w/m/d) – Intensivstation`.
- Prohibited: emitting `Senior PHP-Entwickler` because the model translated an English title.

---

### 3.3 `applicationType`

**Semantic meaning.** The channel a candidate uses to apply. The jobs-service domain knows `url`, `email`, `xing_apply` (and `private_message`, not accepted inbound).

**Required:** Yes — **constant `"url"` in Phase 1.** The crawler only produces link-based applications; `email`/`xing_apply` are other products' channels.

**Accepted sources:** none — it is a constant, not extracted.
**Normalization / deterministic derivation / AI extraction / AI inference:** Not applicable; AI never touches it.
**Grounding:** Not applicable.
**Behavior when missing:** Cannot be missing (constant).

**Example.** Every exported job: `"applicationType": "url"`.

---

### 3.4 `applicationValue`

**Semantic meaning.** Because `applicationType` is `url`, this is the URL a candidate uses to apply for **this specific job** — the apply flow entry point (ATS apply page, form URL) or, at minimum, the job detail page from which application is possible.

**Required:** Yes (via the deterministic fallback below, it is only missing when even the source URL is unusable).

**Accepted sources & precedence.**
1. ATS apply URL field (T0).
2. JSON-LD apply URL where present (`JobPosting.url`, `directApply` context, `applicationContact.url`) (T1).
3. Recipe: `href` of the posting's apply button/link (T2).
4. AI extraction (T3): the LLM may pick which link in the page is the apply link; the URL string itself must exist in the fetched document (grounded).
5. **Deterministic fallback:** the job's canonical source URL (crawl metadata, §5) — the job page itself.

**Normalization allowed.** Resolve relative → absolute against the page URL; RFC-normalize (lowercase scheme/host, strip default port, strip fragment); strip *known tracking* query parameters (`utm_*`, `gclid`, `fbclid`) via a versioned list — never strip unknown parameters (ATS links carry meaningful tokens). Result must be an absolute `http(s)` URL. (Downstream appends its own `?utm_source=kununu`; the crawler never pre-applies it.)

**Deterministic derivation:** Allowed (fallback to the source URL, relative-URL resolution).
**AI extraction:** Allowed as link *selection* only (source 4).
**AI inference:** Prohibited. Never construct, repair or guess a URL (no "the apply URL is probably `/apply` appended").

**Grounding.** The chosen URL must appear in the fetched source (as an attribute value or structured-data value) — except the tier-5 fallback, which is grounded by being the crawl target itself.

**Behavior when missing.** Fall back to the canonical source URL. If that itself is not a valid absolute URL (cannot happen for a fetched page), the job is invalid → quarantine, reason `applicationValue:missing`.

**Examples.**
- Apply button `<a href="/de/jobs/8842/apply">Jetzt bewerben</a>` on `https://careers.acme.de/de/jobs/8842` → `https://careers.acme.de/de/jobs/8842/apply`.
- Greenhouse record `"absolute_url": "https://boards.greenhouse.io/acme/jobs/4021991"` → that URL.
- No apply link anywhere → `applicationValue` = the job page's canonical URL.
- Prohibited: emitting `https://careers.acme.de/apply?job=8842` when that URL never appears in the source.

---

### 3.5 `descriptionType`

**Semantic meaning.** The format discriminator for `descriptionValue`. The jobs service accepts `html` and `template_data`.

**Required:** Yes — **constant `"html"` in Phase 1.** `template_data` is reserved for template-based products, not crawling.

**Accepted sources:** none — constant, not extracted.
**Normalization / deterministic derivation / AI extraction / AI inference:** Not applicable; AI never touches it.
**Grounding:** Not applicable.
**Behavior when missing:** Cannot be missing (constant).

**Example.** Every exported job: `"descriptionType": "html"`.

---

### 3.6 `descriptionValue`

**Semantic meaning.** The full body of the posting as published: tasks, requirements, benefits, company blurb — in the employer's own words and structure, as sanitized HTML. It is a *reproduction*, never a summary or rewrite. (`descriptionText` and `descriptionSections` on the entity are derived downstream — never produced by the crawler.)

**Required:** Yes.

**Accepted sources & precedence.**
1. ATS description field (T0 — often already HTML).
2. JSON-LD `JobPosting.description` (T1 — HTML-encoded per schema.org convention; decode once).
3. Recipe selector for the posting's content container (T2).
4. AI-assisted boundary location (T3): the LLM may identify *which DOM region* is the posting body; the emitted content is then the **verbatim source markup/text of that region**, not LLM output.

**Normalization allowed.** HTML sanitization to the downstream purifier's allow-list (`h1,h2,h3,h4,h5,h6,pre,p,strong,b,em,u,ol,ul,li,div,span,br`; all attributes stripped), entity decoding, removal of empty tags, whitespace normalization, removal of page chrome (nav, cookie banners, apply widgets, "similar jobs").

**Deterministic derivation:** Not applicable.
**AI extraction:** Allowed **only** as boundary location (see source 4). The characters delivered must come from the source document.
**AI inference:** Prohibited. No summarising, no rewriting, no translation, no "cleaning up" of wording, no filling gaps.

**Grounding.** The emitted text content (after sanitization) must match the text content of the recorded DOM region.

**Behavior when missing.** Job invalid → quarantine, reason `descriptionValue:missing`. A normalized description shorter than 3 characters counts as missing. Truncating over-long descriptions (> 30 000 characters, the downstream `html` limit) is **not allowed** — it would silently corrupt content; such jobs go to quarantine, reason `descriptionValue:too_long`.

**Examples.**
- JSON-LD `"description": "&lt;p&gt;Wir suchen…&lt;/p&gt;"` → decode once → sanitize → `<p>Wir suchen…</p>`.
- HTML-only page: recipe selects `main .job-detail__content`; sanitized inner HTML is emitted.
- Prohibited: an LLM-generated "clean" 5-bullet summary of a 3-page posting.

---

### 3.7 `location`

**Semantic meaning.** Where the job is performed. One structured object in the export (the mapper splits it into the command's `city`, `countryCode` and `locationData`):

```
location = {
  city:        string   (required)
  countryCode: string   (required, ISO 3166-1 alpha-2, uppercase)
  zipCode:     string?  (optional)
  street:      string?  (optional)
  latitude:    number?  (optional, only together with longitude, −90..90)
  longitude:   number?  (optional, only together with latitude, −180..180)
}
```

The entity's `region`, `stateCode`, `kununuStateUuid`, `kununuCityUuid` are resolved by the service's location provider — never produced by the crawler. Phase 1 models a single primary location; multi-location postings emit the first/primary listed location (provenance records that others existed).

**Required:** `city` and `countryCode` yes; `zipCode`/`street`/coordinates optional.

**Accepted sources & precedence.**
1. ATS location fields (T0).
2. JSON-LD `JobPosting.jobLocation` → `address.addressLocality`, `address.addressCountry`, `address.postalCode`, `address.streetAddress`, `geo.latitude`/`geo.longitude` (T1).
3. Recipe selector on labeled location elements (T2).
4. AI extraction from page content (T3, grounded — every emitted component must appear in the source).

**Normalization allowed.**
- Trim, entity-decode, strip markup, collapse whitespace.
- Deterministic splitting of combined strings ("Berlin, Deutschland" → city `Berlin`; "10115 Berlin" → zip `10115`, city `Berlin`).
- Deterministic mapping of country *names* (localized) and alpha-3 codes to alpha-2 (`Deutschland`/`Germany`/`DEU` → `DE`); uppercase the result.
- Coordinates: numeric parsing and range validation only; drop both if either is missing or out of range (downstream requires the pair).
- NOT allowed: geocoding city text into coordinates (or coordinates into a city), "normalizing" district names to city names by lookup services, translating city names.

**Deterministic derivation:** Allowed only as the normalizations above (all inputs come from the source). Deriving `countryCode` from anything *not* on the job page/record — site TLD, company HQ, portal language — is inference and prohibited.
**AI extraction:** Allowed (T3), each component grounded individually.
**AI inference:** Prohibited. Never guess a city from the company name, never default a country.

**Grounding.** Each component verbatim in source (country code additionally allowed to be the deterministic mapping of a grounded country name).

**Behavior when missing.** Missing `city` or un-mappable/missing country → job invalid → quarantine, reason `location:city_missing` / `location:country_missing`. Remote-only postings with no city in the source are Phase 1 quarantine cases (no silent defaults). Missing `zipCode`/`street`/coordinates → `null`, no consequence. A normalized `city` outside 2–255 characters counts as invalid.

**Examples.**
- JSON-LD `"jobLocation":{"address":{"addressLocality":"Wien","postalCode":"1010","addressCountry":"AT"}}` → `{city:"Wien", countryCode:"AT", zipCode:"1010"}`.
- Page shows only "Standort: 80331 München" → `{city:"München", countryCode:?}` — if no country appears anywhere on the page/record, quarantine (`location:country_missing`); the zip alone does not prove `DE`.
- Prohibited: emitting `countryCode:"DE"` because the site is a `.de` domain.

---

### 3.8 `employmentTypes`

**Semantic meaning.** The engagement model(s) of the position, as a **set** of canonical values from the downstream `EmploymentType` enum (case-sensitive):

```
FULL_TIME | PART_TIME | INTERN | TEMPORARY | CONTRACTOR | SEASONAL | VOLUNTARY
```

"Voll- oder Teilzeit" is `[FULL_TIME, PART_TIME]`.

**Required:** No — **best effort**. Downstream enrichment already derives employment type; the crawler only passes through what the source states explicitly.

**Phase 1 policy (from the ticket):**

```
JSON-LD / ATS explicit value
        ↓
preserve
        ↓
deterministic normalization
```

**Accepted sources & precedence.**
1. ATS explicit employment-type field (T0).
2. JSON-LD `JobPosting.employmentType` (T1 — string or array).
3. Recipe selector on an explicitly labeled value ("Anstellungsart: Vollzeit") (T2).
There is **no T3 for this field**: do not invoke AI *because* employment type is missing. If a broader T3 extraction of the whole posting happens anyway (because *required* fields needed it), an employment-type value it returns may be kept only if it is grounded and maps under the normalization table below; otherwise it is dropped.

**Normalization allowed.** Deterministic mapping table only, e.g.: schema.org values map 1:1 (`FULL_TIME`→`FULL_TIME`, `PART_TIME`→`PART_TIME`, `INTERNSHIP`→`INTERN`, `TEMPORARY`→`TEMPORARY`, `CONTRACTOR`→`CONTRACTOR`, `PER_DIEM`/`OTHER`→ drop); common source literals map by exact (case/diacritic-insensitive) lookup (`Vollzeit`→`FULL_TIME`, `Teilzeit`→`PART_TIME`, `Praktikum`→`INTERN`, `Werkstudent`→`PART_TIME`, `befristet`→`TEMPORARY`, `Freelance`→`CONTRACTOR`, …). The mapping table is versioned config; an unmapped literal is **dropped** (recorded in provenance for table maintenance), never guessed. Emitted values must match the enum exactly — downstream validation is case-sensitive with no normalization of its own.

**Deterministic derivation:** Only the mapping above. No derivation from weekly hours, salary interval, or title.
**AI extraction:** Never triggered for this field alone (see sources).
**AI inference:** Prohibited (e.g. "senior role, so probably full-time").

**Grounding.** The pre-normalization literal must be present in the source at the recorded pointer.

**Behavior when missing.** Export `null`. The job remains valid. No retries, no AI call, no default value — in particular the crawler MUST NOT default to `FULL_TIME` (the downstream hash generator applies that default itself; a crawler default would masquerade as source data).

**Examples.**
- JSON-LD `"employmentType": ["FULL_TIME","PART_TIME"]` → `["FULL_TIME", "PART_TIME"]`.
- Page label "Anstellungsart: Werkstudent (20h/Woche)" via recipe → literal `Werkstudent` → `["PART_TIME"]`.
- Page mentions hours only in prose, no explicit field → `null`. Correct; do not extract.

---

### 3.9 `salary`

**Semantic meaning.** The compensation the employer explicitly states for this position. One object in the export (the mapper splits it into the command's `rangeStart`, `rangeEnd`, `currency`, `salaryInterval`):

```
salary = {
  rangeStart: int?     (integer amount, e.g. 55000)
  rangeEnd:   int?     (≥ rangeStart)
  currency:   string   (required if any amount present; one of the downstream Currency enum:
                        EUR USD CHF GBP JPY DKK HUF CNY BRL KPW KRW PLN RON RUB SEK TRY)
  interval:   string   (yearly | monthly | weekly | hourly)
}
```

A fixed salary is emitted as `rangeStart = rangeEnd`. The salary VO's `type` (fixed vs range) is derived downstream from the range values — never emitted by the crawler.

**Required:** No — **best effort**, same discipline as `employmentTypes`: the crawler passes through explicitly stated amounts only. It never estimates market salaries.

**Accepted sources & precedence.**
1. ATS salary fields (T0).
2. JSON-LD `JobPosting.baseSalary` (`MonetaryAmount`/`QuantitativeValue`: `value`/`minValue`/`maxValue`, `currency`, `unitText`) (T1).
3. Recipe selector on an explicitly labeled salary ("Gehalt: 55.000–65.000 € brutto/Jahr") (T2).
There is **no T3 for this field alone**: do not invoke AI because salary is missing. A grounded salary returned by a broader T3 extraction may be kept only if it normalizes cleanly under the rules below; otherwise it is dropped.

**Normalization allowed.** Deterministic parsing only: thousands/decimal separators per page locale; currency symbols/names to the enum (`€`→`EUR`, `Fr.`/`SFr.`→`CHF`); `unitText`/interval literals to the four canonical intervals (`YEAR`/`p.a.`/`jährlich`→`yearly`, `HOUR`/`pro Stunde`→`hourly`, …); rounding decimal amounts to int. If any component fails to normalize (unknown currency, unmappable interval, non-numeric amount), the **whole salary is dropped** — never a partial or guessed salary. Amounts are emitted as stated; no gross/net conversion, no interval conversion (do not turn `4 500 €/Monat` into a yearly figure).

**Deterministic derivation:** Only the parsing/mapping above. No derivation from title, seniority, or collective-agreement references ("Bezahlung nach TVöD" is **not** a salary).
**AI extraction:** Never triggered for this field alone (see sources).
**AI inference:** Prohibited. No market estimates, no ranges "typical for the role".

**Grounding.** The pre-normalization amount/currency/interval literals must be present in the source at the recorded pointer.

**Behavior when missing.** Export `null`. The job remains valid. No AI call, no estimation.

**Examples.**
- JSON-LD `"baseSalary":{"currency":"EUR","value":{"minValue":55000,"maxValue":65000,"unitText":"YEAR"}}` → `{rangeStart:55000, rangeEnd:65000, currency:"EUR", interval:"yearly"}`.
- Page label "Stundenlohn: 18,50 €" → `{rangeStart:19, rangeEnd:19, currency:"EUR", interval:"hourly"}` (rounded int, fixed = same start/end).
- "Vergütung nach TVöD-P8" → `null` (reference to a pay scale, not a stated amount).

---

### 3.10 `activeUntil`

**Semantic meaning.** The instant the *source* states the posting expires / applications close (schema.org `validThrough` semantics). Employer-asserted, never a crawler observation.

**Required:** No — optional.

**Policy (normative):**

```
explicit source value → accept
missing              → null
AI guess             → prohibited
crawl timestamp      → prohibited
computed default     → prohibited
```

**Accepted sources & precedence.**
1. ATS expiry/close date (T0).
2. JSON-LD `JobPosting.validThrough` (T1).
3. Recipe selector on an explicitly labeled deadline ("Bewerbungsfrist: 30.09.2026") (T2).
4. AI extraction of an explicitly labeled deadline literal (T3, grounded — the date string must be verbatim in the source and unambiguously labeled as the expiry/deadline).

**Normalization allowed.** Parse the explicit literal into ISO-8601 UTC. Date-only values are preserved as date-only (`2026-09-30`) — do not invent a time of day. Locale-aware parsing (`30.09.2026` → `2026-09-30`) is allowed only when the format is unambiguous for the page's locale; ambiguous literals (e.g. `03/04/2026` with unknown locale) are treated as missing.

**Deterministic derivation:** Prohibited. The crawler MUST NOT compute a default (`now + N`), reuse the crawl timestamp, resolve relative phrases ("noch 5 Tage"), or extend/derive expiry from re-observation. (Downstream applies its own default of *now + 1 year* when the field is absent — that is the API's decision, not the crawler's; a crawler-computed default would masquerade as an employer-asserted fact.)
**AI extraction:** Allowed per source 4 only.
**AI inference:** Prohibited. No estimating from freshness cues or badges.

**Grounding.** Date literal verbatim in source.

**Behavior when missing.** Export `null`. The job is valid. A value in the past is emitted as-is (it is a source fact); delivery-time handling of already-expired postings is a pipeline policy decision, not a field-contract concern.

**Examples.**
- `"validThrough": "2026-09-30T23:59:59+02:00"` → `2026-09-30T23:59:59+02:00` (normalized to UTC on emission).
- No expiry stated → `null`. Never `crawlTime + 1 year`.

---

### 3.11 `paidType`

**Semantic meaning.** The commercial classification of the posting: whether this crawl target is a paying customer's job (`crawler_paid`) or organic/non-paid content (`crawler_non_paid`). Downstream requires it whenever `creation_type` is `crawler`.

**Required:** Yes — from **per-target crawler configuration** (the customer's contract state, set at onboarding). It is stamped onto every job exported for that target.

**Accepted sources:** configuration only. It is never extracted from pages.
**Normalization / deterministic derivation:** none — the config value is one of the two literals above.
**AI extraction / AI inference:** Prohibited. AI never touches it.
**Grounding:** Not applicable (not source content).

**Behavior when missing.** A crawl target without a configured `paidType` is a **configuration error**: the target is not crawled at all. It is never defaulted per job and never inferred.

**Example.** All jobs from the ACME target (paying customer) → `"paidType": "crawler_paid"`.

---

## 4. Identity vs. content hash (normative)

Two deliberately separate concepts:

| Concept | Field | Question it answers | May change between crawls? |
|---|---|---|---|
| **Identity** | `externalJobId` (+ the target's kununu profile, attached at delivery) | "Is this the same job?" | **Never** (for the same source job) |
| **Content sameness** | `contentHash` (internal metadata, §5) | "Did this job's content change?" | Yes — that is its purpose |

Rules:

1. `contentHash` MUST NOT define, contribute to, or tiebreak job identity. Two jobs with identical content are still two jobs; one job whose content changed is still one job.
2. `contentHash` is computed deterministically over the **normalized** content fields: `title`, `descriptionValue`, `employmentTypes`, `location.city`, `location.countryCode` (lowercase-hex SHA-256 over a canonical JSON encoding with fixed key order and sorted `employmentTypes`). It intentionally excludes `externalJobId`, `applicationValue`, `salary`, `activeUntil` and `paidType` — URL/tracking churn and re-crawls must not read as content changes.
3. Uses of `contentHash`: change detection (skip no-op updates), shadow-diffing against the legacy pipeline. Nothing else in Phase 1. It is not part of the export schema.
4. The jobs service computes its **own** `input_hash` (entity property `inputHash`, similar field set, its own normalization) for change detection. The crawler's `contentHash` is a crawler-internal optimization; it is never sent downstream, never compared against `inputHash`, and never used as identity by either side.

---

## 5. Internal crawl metadata (not exported)

The crawler keeps these per job internally — for auditing, identity derivation and change detection. They are **not** part of the export JSON:

| Metadata | Purpose |
|---|---|
| `sourceUrl` | Canonical URL of the crawled job page/record (final URL after redirects, replaced by same-domain `rel="canonical"` when it resolves to the same posting; RFC-normalized, tracking params stripped, **stable across crawls**). Anchors all grounding; input to `externalJobId` tiers 4–5; fallback for `applicationValue`. AI never touches it. |
| `contentHash` | §4. |
| Provenance | Per exported field: `{tier, pointer}` — which tier produced it and where in the source (§2.4/§2.5). |
| Crawl timestamps | When fetched / first seen / last seen. Crawler facts — MUST never leak into `activeUntil` or any other export field. |

`publishedAt` is deliberately **not** collected in Phase 1: the jobs service has no publish-date field (neither entity nor commands), and a crawl-derived "first seen" is not a publish date.

---

## 6. Missing-value behavior — consolidated

| Export field | When missing |
|---|---|
| `externalJobId` | Quarantine (only possible when no canonical URL exists) |
| `title` | Quarantine |
| `applicationType` | Impossible (constant `url`) |
| `applicationValue` | Deterministic fallback to `sourceUrl`; quarantine only if that fails |
| `descriptionType` | Impossible (constant `html`) |
| `descriptionValue` | Quarantine |
| `location.city` / `location.countryCode` | Quarantine |
| `location.zipCode` / `.street` / coordinates | `null` |
| `employmentTypes` | `null` — job valid; MUST NOT trigger AI |
| `salary` | `null` — job valid; MUST NOT trigger AI; partial/unparseable salary → drop whole object |
| `activeUntil` | `null` — job valid; never a computed default, never crawl time, never AI |
| `paidType` | Configuration error — target not crawled at all; never defaulted per job |

Quarantined jobs are never partially exported, never silently dropped: each carries machine-readable reasons for the review queue.

---

## Appendix A — Acceptance evidence: three reference pages

Per the ticket, two engineers independently derive the expected export JSON from this document alone; results must agree. Reference scenarios (all from a target configured `paidType: crawler_paid`):

**A1 — Full JSON-LD page** (`https://careers.acme.de/de/jobs/8842`, JSON-LD with `identifier`, `title`, `description`, `jobLocation`, `employmentType: "FULL_TIME"`, `baseSalary`, `validThrough: "2026-10-01"`, apply link in JSON-LD `url`):
→ every extracted field from T1; `externalJobId` = identifier value (tier 2); `salary` and `activeUntil` populated; `applicationType: "url"`, `descriptionType: "html"`, `paidType: "crawler_paid"`; no AI involved.

**A2 — HTML-only page** (no JSON-LD, no ATS; `h1` title, content div, "Standort: Berlin, Deutschland", apply button, "Referenznummer: K-0815", no salary/employment labels):
→ `externalJobId` = `K-0815` (tier 3); `title`/`descriptionValue` via recipe or grounded T3; `location` = `{city:"Berlin", countryCode:"DE"}` (name→code mapping); `employmentTypes` = `null`, `salary` = `null` (not explicitly labeled — no AI call for them); `activeUntil` = `null`; `applicationValue` = apply button href.

**A3 — Missing dates** (JSON-LD without `validThrough`, page shows "vor 3 Tagen online" and "noch 5 Tage bewerbbar"):
→ `activeUntil = null`. Relative phrases are not resolved; the crawl timestamp is not used; no default expiry is computed. (No publish date is collected at all — see §5.)

---

## Appendix B — Downstream mapping notes (informative)

Non-normative. The internal jobs-service API (`POST /job-postings`, `creation_type: "crawler"`; `PUT /job-postings/{uuid}` for updates) is the current consumer; its payload mapper translates the export. Facts the mapper must respect (as of 2026-09, verified in the jobs repo):

| Export field | API payload | Notes |
|---|---|---|
| `externalJobId` | `external_job_id` | `UNIQUE (external_job_id, kununu_profile_id)`; column 256 chars; duplicate create → 409; changed on update → 403 |
| `title` | `title` | 3–255 chars; HTML stripped downstream |
| `applicationType` | `application_type` | inbound accepts `url`, `email`, `xing_apply`; crawler sends `url` |
| `applicationValue` | `application_value` | must pass URL validation; downstream appends `?utm_source=kununu` |
| `descriptionType` | `description_type` | `html` \| `template_data`; crawler sends `html` |
| `descriptionValue` | `description_value` | 3–30 000 chars (html); purified to `h1..h6, pre, p, strong, b, em, u, ol, ul, li, div, span, br`, attributes removed |
| `location.city` / `.countryCode` | `city` / `country_code` | city 2–255 chars; country validated against the service's ISO list, uppercased |
| `location.zipCode` / `.street` / coords | `location {zip_code, street, latitude, longitude}` | optional object; coordinates only as a pair |
| `employmentTypes` | `employment_types` | exact enum match, case-sensitive; `null`/`[]` accepted |
| `salary` | `salary {range_start, range_end, currency, interval}` | currency uppercased against `Currency::SUPPORTED_VALUES`; interval ∈ yearly/monthly/weekly/hourly; start ≤ end |
| `activeUntil` | `active_until` | optional ISO-8601 `DATE_ATOM`; absent → downstream defaults to now + 1 year |
| `paidType` | `paid_type` | `crawler_paid` \| `crawler_non_paid`; mandatory when `creation_type=crawler` |
| — (delivery config) | `kununu_profile_uuid` | required UUID, from per-target config |
| — (delivery config) | `creation_type` | constant `crawler` |

Also relevant: on DELETE, crawler-created postings are **parked** (`to_be_deleted` status, hidden from reads) rather than moved offline — the unique key keeps blocking re-creation of the same `external_job_id`, consistent with §3.1 identity stability.
