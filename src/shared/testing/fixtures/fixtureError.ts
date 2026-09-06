import { ExceptionBase } from 'src/shared/errors/exceptionBase';
import { ExceptionsEnum } from 'src/shared/errors/exceptions.enum';

export enum FixtureProblem {
  CATEGORY_UNKNOWN = 'category_unknown',
  FIXTURE_NOT_FOUND = 'fixture_not_found',
  INVALID_MANIFEST = 'invalid_manifest',
  PAGE_FILE_MISSING = 'page_file_missing',
  PAGE_NOT_FOUND = 'page_not_found',
  EXPECTED_RESULT_MISSING = 'expected_result_missing',
}

export class FixtureError extends ExceptionBase {
  public readonly code = ExceptionsEnum.FIXTURE_ERROR;

  constructor(
    public readonly problem: FixtureProblem,
    message: string,
    cause?: Error,
  ) {
    super(message, undefined, cause, { problem });
  }
}
