import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import {
  FixtureError,
  FixtureProblem,
} from 'src/shared/testing/fixtures/fixtureError';
import {
  FixtureCategory,
  FixturePage,
  HtmlFixture,
} from 'src/shared/testing/fixtures/htmlFixture';

const MANIFEST_FILE = 'fixture.json';
const EXPECTED_FILE = 'expected.json';

// src/shared/testing/fixtures → repository root → test/fixtures
const DEFAULT_FIXTURES_ROOT = resolve(__dirname, '../../../../test/fixtures');

interface ManifestPage {
  id: string;
  url: string;
  file: string;
  mustContain?: string[];
}

interface Manifest {
  description: string;
  pages: ManifestPage[];
}

// Loads saved HTML fixtures for deterministic, offline crawler tests.
// Layout: test/fixtures/<category>/<name>/{fixture.json, *.html, expected.json?}
export class FixtureLoader {
  constructor(private readonly rootDir: string = DEFAULT_FIXTURES_ROOT) {}

  listFixtures(category: FixtureCategory): string[] {
    return readdirSync(this.categoryDir(category), { withFileTypes: true })
      .filter((entry) => entry.isDirectory())
      .map((entry) => entry.name)
      .sort();
  }

  loadAll(category: FixtureCategory): HtmlFixture[] {
    return this.listFixtures(category).map((name) => this.load(category, name));
  }

  load(category: FixtureCategory, name: string): HtmlFixture {
    const fixtureDir = join(this.categoryDir(category), name);
    if (!existsSync(fixtureDir)) {
      throw new FixtureError(
        FixtureProblem.FIXTURE_NOT_FOUND,
        `Fixture "${category}/${name}" does not exist under ${this.rootDir}.`,
      );
    }

    const manifest = this.readManifest(category, name, fixtureDir);
    const pages = manifest.pages.map((page) =>
      this.loadPage(category, name, fixtureDir, page),
    );

    return new HtmlFixture(
      category,
      name,
      manifest.description,
      pages,
      this.readExpected(category, name, fixtureDir),
    );
  }

  private categoryDir(category: FixtureCategory): string {
    const dir = join(this.rootDir, category);
    if (!existsSync(dir)) {
      throw new FixtureError(
        FixtureProblem.CATEGORY_UNKNOWN,
        `Fixture category "${category}" has no directory under ${this.rootDir}.`,
      );
    }
    return dir;
  }

  private readManifest(
    category: FixtureCategory,
    name: string,
    fixtureDir: string,
  ): Manifest {
    const parsed = this.readJsonFile(
      category,
      name,
      join(fixtureDir, MANIFEST_FILE),
    ) as Partial<Manifest>;

    if (typeof parsed.description !== 'string' || !parsed.description) {
      throw this.invalidManifest(category, name, 'missing "description"');
    }
    if (!Array.isArray(parsed.pages) || parsed.pages.length === 0) {
      throw this.invalidManifest(category, name, '"pages" must be non-empty');
    }
    parsed.pages.forEach((page) => this.assertValidPage(category, name, page));

    return parsed as Manifest;
  }

  private assertValidPage(
    category: FixtureCategory,
    name: string,
    page: Partial<ManifestPage>,
  ): void {
    if (
      typeof page.id !== 'string' ||
      typeof page.url !== 'string' ||
      typeof page.file !== 'string'
    ) {
      throw this.invalidManifest(
        category,
        name,
        'every page needs string "id", "url" and "file"',
      );
    }
    try {
      new URL(page.url);
    } catch {
      throw this.invalidManifest(
        category,
        name,
        `page "${page.id}" has an unparseable url "${page.url}"`,
      );
    }
  }

  private loadPage(
    category: FixtureCategory,
    name: string,
    fixtureDir: string,
    page: ManifestPage,
  ): FixturePage {
    const path = join(fixtureDir, page.file);
    if (!existsSync(path)) {
      throw new FixtureError(
        FixtureProblem.PAGE_FILE_MISSING,
        `Fixture "${category}/${name}" references missing page file "${page.file}".`,
      );
    }
    return {
      id: page.id,
      url: page.url,
      file: page.file,
      html: readFileSync(path, 'utf8'),
      mustContain: page.mustContain ?? [],
    };
  }

  private readExpected(
    category: FixtureCategory,
    name: string,
    fixtureDir: string,
  ): unknown {
    const path = join(fixtureDir, EXPECTED_FILE);
    if (!existsSync(path)) {
      return undefined;
    }
    return this.readJsonFile(category, name, path);
  }

  private readJsonFile(
    category: FixtureCategory,
    name: string,
    path: string,
  ): unknown {
    let content: string;
    try {
      content = readFileSync(path, 'utf8');
    } catch (error) {
      throw this.invalidManifest(
        category,
        name,
        `cannot read "${path}"`,
        error instanceof Error ? error : undefined,
      );
    }
    try {
      return JSON.parse(content) as unknown;
    } catch (error) {
      throw this.invalidManifest(
        category,
        name,
        `"${path}" is not valid JSON`,
        error instanceof Error ? error : undefined,
      );
    }
  }

  private invalidManifest(
    category: FixtureCategory,
    name: string,
    reason: string,
    cause?: Error,
  ): FixtureError {
    return new FixtureError(
      FixtureProblem.INVALID_MANIFEST,
      `Fixture "${category}/${name}" is invalid: ${reason}.`,
      cause,
    );
  }
}
