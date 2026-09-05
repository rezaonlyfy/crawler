import { ExceptionBase } from 'src/shared/errors/exceptionBase';
import { ExceptionsEnum } from 'src/shared/errors/exceptions.enum';

export enum TargetListFileProblem {
  UNREADABLE = 'unreadable',
  INVALID_JSON = 'invalid_json',
  NOT_A_STRING_ARRAY = 'not_a_string_array',
}

export class TargetListFileError extends ExceptionBase {
  public readonly code = ExceptionsEnum.TARGET_LIST_FILE_ERROR;

  constructor(
    public readonly problem: TargetListFileProblem,
    message: string,
    cause?: Error,
  ) {
    super(message, undefined, cause, { problem });
  }
}
