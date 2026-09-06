import { FixtureLoader } from 'src/shared/testing/fixtures/fixtureLoader';
import {
  FIXTURE_CATEGORIES,
  HtmlFixture,
} from 'src/shared/testing/fixtures/htmlFixture';

// Extracts the raw content of <script type="application/ld+json"> blocks.
// Test-only helper: the real JSON-LD extraction is owned by job-extraction.
const jsonLdBlocks = (html: string): string[] => {
  const pattern =
    /<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi;
  const blocks: string[] = [];
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(html)) !== null) {
    blocks.push(match[1].trim());
  }
  return blocks;
};

const parsesAsJobPosting = (block: string): boolean => {
  try {
    const parsed = JSON.parse(block) as { '@type'?: unknown; title?: unknown };
    return parsed['@type'] === 'JobPosting' && typeof parsed.title === 'string';
  } catch {
    return false;
  }
};

describe('Phase 1 fixture set', () => {
  const loader = new FixtureLoader();
  const fixturesOf = (category: (typeof FIXTURE_CATEGORIES)[number]) =>
    loader.loadAll(category);
  const allFixtures = (): HtmlFixture[] =>
    FIXTURE_CATEGORIES.flatMap((category) => fixturesOf(category));

  it('should provide at least one fixture per category', () => {
    for (const category of FIXTURE_CATEGORIES) {
      expect(loader.listFixtures(category).length).toBeGreaterThan(0);
    }
  });

  it('should load every fixture with non-empty pages and valid urls', () => {
    for (const fixture of allFixtures()) {
      expect(fixture.pages.length).toBeGreaterThan(0);
      for (const page of fixture.pages) {
        expect(page.html.trim().length).toBeGreaterThan(0);
        expect(() => new URL(page.url)).not.toThrow();
      }
    }
  });

  it('should contain every mustContain snippet declared in the manifests', () => {
    for (const fixture of allFixtures()) {
      for (const page of fixture.pages) {
        for (const snippet of page.mustContain) {
          expect(page.html).toContain(snippet);
        }
      }
    }
  });

  it('should provide a parseable JobPosting in every jsonld-job fixture', () => {
    for (const fixture of fixturesOf('jsonld-job')) {
      const blocks = jsonLdBlocks(fixture.entryPage().html);
      expect(blocks.length).toBeGreaterThan(0);
      expect(blocks.some(parsesAsJobPosting)).toBe(true);
    }
  });

  it('should keep every malformed-jsonld block unparseable', () => {
    for (const fixture of fixturesOf('malformed-jsonld')) {
      const blocks = jsonLdBlocks(fixture.entryPage().html);
      expect(blocks.length).toBeGreaterThan(0);
      for (const block of blocks) {
        expect(() => JSON.parse(block)).toThrow();
      }
    }
  });

  it('should keep html-job fixtures free of JSON-LD', () => {
    for (const fixture of fixturesOf('html-job')) {
      for (const page of fixture.pages) {
        expect(jsonLdBlocks(page.html)).toHaveLength(0);
      }
    }
  });

  it('should link from the first pagination page to the second', () => {
    for (const fixture of fixturesOf('pagination')) {
      expect(fixture.pages.length).toBeGreaterThanOrEqual(2);
      const secondPageUrl = new URL(fixture.pages[1].url);
      expect(fixture.entryPage().html).toContain(
        secondPageUrl.pathname + secondPageUrl.search,
      );
    }
  });

  it('should expose the exemplar expected result for the labeled html job', () => {
    const fixture = loader.load('html-job', 'labeled-detail');
    const expected = fixture.expectedResult<{ title: string }>();

    expect(fixture.entryPage().html).toContain(expected.title);
  });
});
