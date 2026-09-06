import {
  FixtureError,
  FixtureProblem,
} from 'src/shared/testing/fixtures/fixtureError';

// Fixture categories established by CRAWL-P1-005. Later tickets extend this
// list together with a matching directory under test/fixtures/.
export const FIXTURE_CATEGORIES = [
  'basic-career-page',
  'jsonld-job',
  'html-job',
  'pagination',
  'malformed-jsonld',
] as const;

export type FixtureCategory = (typeof FIXTURE_CATEGORIES)[number];

export interface FixturePage {
  id: string;
  url: string;
  file: string;
  html: string;
  mustContain: string[];
}

// A loaded fixture: one saved "site" (one or more pages) plus an optional
// expected result authored next to it. Specs consume this instead of the
// filesystem layout.
export class HtmlFixture {
  constructor(
    public readonly category: FixtureCategory,
    public readonly name: string,
    public readonly description: string,
    public readonly pages: FixturePage[],
    private readonly expected?: unknown,
  ) {}

  entryPage(): FixturePage {
    return this.pages[0];
  }

  page(id: string): FixturePage {
    const page = this.pages.find((candidate) => candidate.id === id);
    if (!page) {
      throw new FixtureError(
        FixtureProblem.PAGE_NOT_FOUND,
        `Fixture "${this.category}/${this.name}" has no page "${id}".`,
      );
    }
    return page;
  }

  hasExpectedResult(): boolean {
    return this.expected !== undefined;
  }

  expectedResult<T>(): T {
    if (this.expected === undefined) {
      throw new FixtureError(
        FixtureProblem.EXPECTED_RESULT_MISSING,
        `Fixture "${this.category}/${this.name}" has no expected.json.`,
      );
    }
    return this.expected as T;
  }
}
