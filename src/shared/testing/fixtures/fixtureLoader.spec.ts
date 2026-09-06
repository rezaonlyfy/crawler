import { mkdir, mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  FixtureError,
  FixtureProblem,
} from 'src/shared/testing/fixtures/fixtureError';
import { FixtureLoader } from 'src/shared/testing/fixtures/fixtureLoader';

const problemOf = (run: () => unknown): FixtureProblem => {
  try {
    run();
  } catch (error) {
    if (error instanceof FixtureError) {
      return error.problem;
    }
    throw error;
  }
  throw new Error('expected FixtureError');
};

describe('FixtureLoader', () => {
  describe('against the shipped fixture set', () => {
    const loader = new FixtureLoader();

    it('should list the fixtures of a category', () => {
      expect(loader.listFixtures('basic-career-page')).toContain(
        'simple-listing',
      );
    });

    it('should load a fixture with manifest data and page html', () => {
      const fixture = loader.load('pagination', 'query-param-listing');

      expect(fixture.description.length).toBeGreaterThan(0);
      expect(fixture.pages).toHaveLength(2);
      expect(fixture.entryPage().id).toBe('listing');
      expect(fixture.page('page-2').url).toContain('?page=2');
      expect(fixture.entryPage().html).toContain('<html');
    });

    it('should throw PAGE_NOT_FOUND for an unknown page id', () => {
      const fixture = loader.load('pagination', 'query-param-listing');

      expect(problemOf(() => fixture.page('page-99'))).toBe(
        FixtureProblem.PAGE_NOT_FOUND,
      );
    });

    it('should load expected.json when present', () => {
      const fixture = loader.load('html-job', 'labeled-detail');

      expect(fixture.hasExpectedResult()).toBe(true);
      expect(fixture.expectedResult<{ title: string }>().title).toBe(
        'Junior Marketing Manager',
      );
    });

    it('should report a missing expected result', () => {
      const fixture = loader.load('basic-career-page', 'simple-listing');

      expect(fixture.hasExpectedResult()).toBe(false);
      expect(problemOf(() => fixture.expectedResult())).toBe(
        FixtureProblem.EXPECTED_RESULT_MISSING,
      );
    });
  });

  describe('against a broken fixture tree', () => {
    let root: string;
    let loader: FixtureLoader;

    const writeFixture = async (
      name: string,
      manifest: string,
      pages: Record<string, string> = {},
    ): Promise<void> => {
      const dir = join(root, 'jsonld-job', name);
      await mkdir(dir, { recursive: true });
      await writeFile(join(dir, 'fixture.json'), manifest, 'utf8');
      for (const [file, html] of Object.entries(pages)) {
        await writeFile(join(dir, file), html, 'utf8');
      }
    };

    beforeAll(async () => {
      root = await mkdtemp(join(tmpdir(), 'crawler-fixtures-'));
      loader = new FixtureLoader(root);
      await mkdir(join(root, 'jsonld-job'), { recursive: true });

      await writeFixture('broken-json', '{ not json');
      await writeFixture('no-pages', '{"description":"x","pages":[]}');
      await writeFixture(
        'bad-url',
        '{"description":"x","pages":[{"id":"job","url":"not a url","file":"job.html"}]}',
        { 'job.html': '<html></html>' },
      );
      await writeFixture(
        'missing-page-file',
        '{"description":"x","pages":[{"id":"job","url":"https://a.example/job","file":"gone.html"}]}',
      );
    });

    it('should throw CATEGORY_UNKNOWN for a category without a directory', () => {
      expect(problemOf(() => loader.listFixtures('pagination'))).toBe(
        FixtureProblem.CATEGORY_UNKNOWN,
      );
    });

    it('should throw FIXTURE_NOT_FOUND for an unknown fixture name', () => {
      expect(problemOf(() => loader.load('jsonld-job', 'does-not-exist'))).toBe(
        FixtureProblem.FIXTURE_NOT_FOUND,
      );
    });

    it('should throw INVALID_MANIFEST for unparseable manifest JSON', () => {
      expect(problemOf(() => loader.load('jsonld-job', 'broken-json'))).toBe(
        FixtureProblem.INVALID_MANIFEST,
      );
    });

    it('should throw INVALID_MANIFEST for a manifest without pages', () => {
      expect(problemOf(() => loader.load('jsonld-job', 'no-pages'))).toBe(
        FixtureProblem.INVALID_MANIFEST,
      );
    });

    it('should throw INVALID_MANIFEST for an unparseable page url', () => {
      expect(problemOf(() => loader.load('jsonld-job', 'bad-url'))).toBe(
        FixtureProblem.INVALID_MANIFEST,
      );
    });

    it('should throw PAGE_FILE_MISSING for a missing page file', () => {
      expect(
        problemOf(() => loader.load('jsonld-job', 'missing-page-file')),
      ).toBe(FixtureProblem.PAGE_FILE_MISSING);
    });
  });
});
