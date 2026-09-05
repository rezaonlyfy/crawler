import {
  TargetUrlProblem,
  TargetUrlValueObject,
} from 'src/crawl-execution/domain/valueObjects/targetUrl.valueObject';

describe('TargetUrlValueObject', () => {
  it('should normalize host casing and strip fragments', () => {
    const result = TargetUrlValueObject.create(
      'https://Example.com/jobs#apply',
    );

    expect(result.isSuccess).toBe(true);
    expect(result.getValue().value).toEqual('https://example.com/jobs');
    expect(result.getValue().hostname).toEqual('example.com');
  });

  it('should fail for malformed URLs', () => {
    expect(TargetUrlValueObject.create('invalid').errorValue()).toEqual(
      TargetUrlProblem.MALFORMED,
    );
    expect(TargetUrlValueObject.create('http://').errorValue()).toEqual(
      TargetUrlProblem.MALFORMED,
    );
  });

  it('should fail for non-http(s) schemes', () => {
    expect(
      TargetUrlValueObject.create('file:///etc/passwd').errorValue(),
    ).toEqual(TargetUrlProblem.UNSUPPORTED_SCHEME);
    expect(
      TargetUrlValueObject.create('javascript:alert(1)').errorValue(),
    ).toEqual(TargetUrlProblem.UNSUPPORTED_SCHEME);
  });

  it('should fail for embedded credentials', () => {
    expect(
      TargetUrlValueObject.create(
        'https://user:secret@example.com',
      ).errorValue(),
    ).toEqual(TargetUrlProblem.CONTAINS_CREDENTIALS);
    expect(
      TargetUrlValueObject.create('https://user@example.com').errorValue(),
    ).toEqual(TargetUrlProblem.CONTAINS_CREDENTIALS);
  });
});
