import { ExceptionsEnum } from 'src/shared/errors/exceptions.enum';
import {
  TargetListFileError,
  TargetListFileProblem,
} from 'src/crawl-execution/infrastructure/errors/TargetListFileError';

describe('TargetListFileError', () => {
  it('should create an instance with the correct code, problem and message', () => {
    const cause = new Error('test-error');

    const exception = new TargetListFileError(
      TargetListFileProblem.INVALID_JSON,
      'Input file "x.json" is not valid JSON.',
      cause,
    );

    expect(exception.code).toEqual(ExceptionsEnum.TARGET_LIST_FILE_ERROR);
    expect(exception.problem).toEqual(TargetListFileProblem.INVALID_JSON);
    expect(exception.message).toEqual('Input file "x.json" is not valid JSON.');
    expect(exception.cause).toEqual(cause);
    expect(exception.metadata).toEqual({
      problem: TargetListFileProblem.INVALID_JSON,
    });
  });
});
