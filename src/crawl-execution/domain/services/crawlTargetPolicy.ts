import {
  IpAddressValueObject,
  NetworkClassification,
} from 'src/crawl-execution/domain/valueObjects/ipAddress.valueObject';
import {
  TargetUrlProblem,
  TargetUrlValueObject,
} from 'src/crawl-execution/domain/valueObjects/targetUrl.valueObject';

export enum RejectionReason {
  MALFORMED_URL = 'malformed_url',
  UNSUPPORTED_SCHEME = 'unsupported_scheme',
  CREDENTIALS_IN_URL = 'credentials_in_url',
  LOOPBACK = 'loopback',
  LINK_LOCAL = 'link_local',
  PRIVATE_NETWORK = 'private_network',
}

export type TargetEvaluation = {
  allowed: boolean;
  url?: TargetUrlValueObject;
  reason?: RejectionReason;
};

export interface CrawlTargetPolicyOptions {
  allowPrivateNetworks: boolean;
}

const PROBLEM_TO_REASON: Record<string, RejectionReason> = {
  [TargetUrlProblem.MALFORMED]: RejectionReason.MALFORMED_URL,
  [TargetUrlProblem.UNSUPPORTED_SCHEME]: RejectionReason.UNSUPPORTED_SCHEME,
  [TargetUrlProblem.CONTAINS_CREDENTIALS]: RejectionReason.CREDENTIALS_IN_URL,
};

export class CrawlTargetPolicy {
  constructor(private readonly options: CrawlTargetPolicyOptions) {}

  evaluate(rawUrl: string): TargetEvaluation {
    const urlResult = TargetUrlValueObject.create(rawUrl);
    if (urlResult.isFailure) {
      return {
        allowed: false,
        reason: PROBLEM_TO_REASON[urlResult.errorValue()],
      };
    }

    const url = urlResult.getValue();
    const reason = this.classifyHostname(url.hostname);
    if (reason !== null) {
      return { allowed: false, reason };
    }

    return { allowed: true, url };
  }


  classifyAddress(address: string): RejectionReason | null {
    const ipResult = IpAddressValueObject.create(address);
    if (ipResult.isFailure) {
      return null;
    }
    return this.gate(ipResult.getValue().classification);
  }

  private classifyHostname(hostname: string): RejectionReason | null {
    const name = hostname.toLowerCase();
    if (name === 'localhost' || name.endsWith('.localhost')) {
      return RejectionReason.LOOPBACK;
    }
    return this.classifyAddress(name);
  }

  private gate(classification: NetworkClassification): RejectionReason | null {
    switch (classification) {
      case NetworkClassification.LOOPBACK:
        return RejectionReason.LOOPBACK;
      case NetworkClassification.LINK_LOCAL:
        return RejectionReason.LINK_LOCAL;
      case NetworkClassification.PRIVATE_NETWORK:
        return this.options.allowPrivateNetworks
          ? null
          : RejectionReason.PRIVATE_NETWORK;
      case NetworkClassification.PUBLIC:
        return null;
      default:
        return RejectionReason.PRIVATE_NETWORK;
    }
  }
}
