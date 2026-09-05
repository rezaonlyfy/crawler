import { mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { TargetListFileReaderAdapter } from 'src/crawl-execution/infrastructure/adapters/targetListFile/targetListFileReader.adapter';
import {
  TargetListFileError,
  TargetListFileProblem,
} from 'src/crawl-execution/infrastructure/errors/TargetListFileError';

describe('TargetListFileReaderAdapter', () => {
  const adapter = new TargetListFileReaderAdapter();
  let dir: string;

  beforeAll(async () => {
    dir = await mkdtemp(join(tmpdir(), 'target-list-'));
  });

  const writeFixture = async (
    name: string,
    content: string,
  ): Promise<string> => {
    const path = join(dir, name);
    await writeFile(path, content, 'utf8');
    return path;
  };

  const problemOf = async (path: string): Promise<TargetListFileProblem> => {
    try {
      await adapter.read(path);
    } catch (error) {
      if (error instanceof TargetListFileError) {
        return error.problem;
      }
      throw error;
    }
    throw new Error('expected TargetListFileError');
  };

  it('should read a JSON array of URL strings', async () => {
    const path = await writeFixture('valid.json', '["https://a", "https://b"]');

    await expect(adapter.read(path)).resolves.toEqual([
      'https://a',
      'https://b',
    ]);
  });

  it('should report an unreadable file', async () => {
    await expect(problemOf(join(dir, 'missing.json'))).resolves.toEqual(
      TargetListFileProblem.UNREADABLE,
    );
  });

  it('should report invalid JSON', async () => {
    const path = await writeFixture('broken.json', '{not json');

    await expect(problemOf(path)).resolves.toEqual(
      TargetListFileProblem.INVALID_JSON,
    );
  });

  it('should report content that is not a string array', async () => {
    const path = await writeFixture('wrong.json', '[{"url": "https://a"}]');

    await expect(problemOf(path)).resolves.toEqual(
      TargetListFileProblem.NOT_A_STRING_ARRAY,
    );
  });
});
