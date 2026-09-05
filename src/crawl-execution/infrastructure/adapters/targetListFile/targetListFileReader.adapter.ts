import { readFile } from 'node:fs/promises';
import { Injectable } from '@nestjs/common';
import {
  TargetListFileError,
  TargetListFileProblem,
} from 'src/crawl-execution/infrastructure/errors/TargetListFileError';

// Reads a crawl input file: a JSON array of URL strings.
@Injectable()
export class TargetListFileReaderAdapter {
  async read(path: string): Promise<string[]> {
    const content = await this.readContent(path);
    const parsed = this.parseJson(path, content);

    if (
      !Array.isArray(parsed) ||
      !parsed.every((entry): entry is string => typeof entry === 'string')
    ) {
      throw new TargetListFileError(
        TargetListFileProblem.NOT_A_STRING_ARRAY,
        `Input file "${path}" must be a JSON array of URL strings.`,
      );
    }

    return parsed;
  }

  private async readContent(path: string): Promise<string> {
    try {
      return await readFile(path, 'utf8');
    } catch (error) {
      throw new TargetListFileError(
        TargetListFileProblem.UNREADABLE,
        `Cannot read input file "${path}": ${
          error instanceof Error ? error.message : String(error)
        }`,
        error instanceof Error ? error : undefined,
      );
    }
  }

  private parseJson(path: string, content: string): unknown {
    try {
      return JSON.parse(content) as unknown;
    } catch {
      throw new TargetListFileError(
        TargetListFileProblem.INVALID_JSON,
        `Input file "${path}" is not valid JSON.`,
      );
    }
  }
}
