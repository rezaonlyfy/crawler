import { ValueObject } from 'src/shared/domain/ValueObjects/valueObject';
import { Result } from 'src/shared/domain/logic/Result';

interface TargetUrlProps {
  value: string;
  hostname: string;
}

export enum TargetUrlProblem {
  MALFORMED = 'malformed',
  UNSUPPORTED_SCHEME = 'unsupported_scheme',
  CONTAINS_CREDENTIALS = 'contains_credentials',
}


export class TargetUrlValueObject extends ValueObject<TargetUrlProps> {
  private constructor(props: TargetUrlProps) {
    super(props);
  }

  get value(): string {
    return this.props.value;
  }

  get hostname(): string {
    return this.props.hostname;
  }

  public static create(raw: string): Result<TargetUrlValueObject> {
    let url: URL;
    try {
      url = new URL(raw.trim());
    } catch {
      return Result.fail<TargetUrlValueObject>(TargetUrlProblem.MALFORMED);
    }

    if (url.protocol !== 'http:' && url.protocol !== 'https:') {
      return Result.fail<TargetUrlValueObject>(
        TargetUrlProblem.UNSUPPORTED_SCHEME,
      );
    }

    if (url.username !== '' || url.password !== '') {
      return Result.fail<TargetUrlValueObject>(
        TargetUrlProblem.CONTAINS_CREDENTIALS,
      );
    }

    url.hash = '';
    const value = url.toString().replace(/#$/, '');
    return Result.ok<TargetUrlValueObject>(
      new this({ value, hostname: url.hostname }),
    );
  }
}
