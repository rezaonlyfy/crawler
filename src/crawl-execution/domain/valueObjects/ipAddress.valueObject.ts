import { ValueObject } from 'src/shared/domain/ValueObjects/valueObject';
import { Result } from 'src/shared/domain/logic/Result';

export enum NetworkClassification {
  LOOPBACK = 'loopback',
  LINK_LOCAL = 'link_local',
  PRIVATE_NETWORK = 'private_network',
  PUBLIC = 'public',
}

interface IpAddressProps {
  value: string;
  classification: NetworkClassification;
}

const IPV4_PATTERN = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/;
const IPV6_HEX_GROUP = /^[0-9a-f]{1,4}$/;
const NOT_AN_IP_LITERAL = 'not an IP literal';

// An IP literal with its network classification. `create` fails for
// anything that is not an IP literal (e.g. a DNS name).
export class IpAddressValueObject extends ValueObject<IpAddressProps> {
  private constructor(props: IpAddressProps) {
    super(props);
  }

  get value(): string {
    return this.props.value;
  }

  get classification(): NetworkClassification {
    return this.props.classification;
  }

  public static create(candidate: string): Result<IpAddressValueObject> {
    const plain = candidate
      .replace(/^\[|\]$/g, '')
      .split('%')[0]
      .toLowerCase();
    const classification = plain.includes(':')
      ? this.classifyV6(plain)
      : this.classifyV4(plain);
    if (classification === null) {
      return Result.fail<IpAddressValueObject>(NOT_AN_IP_LITERAL);
    }
    return Result.ok<IpAddressValueObject>(
      new this({ value: plain, classification }),
    );
  }

  private static classifyV4(address: string): NetworkClassification | null {
    const match = IPV4_PATTERN.exec(address);
    if (!match) {
      return null;
    }
    const octets = match.slice(1).map(Number);
    if (octets.some((octet) => octet > 255)) {
      return null;
    }
    const [a, b] = octets;
    if (a === 127 || a === 0) {
      return NetworkClassification.LOOPBACK;
    }
    if (a === 169 && b === 254) {
      return NetworkClassification.LINK_LOCAL;
    }
    if (
      a === 10 ||
      (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && b === 168)
    ) {
      return NetworkClassification.PRIVATE_NETWORK;
    }
    return NetworkClassification.PUBLIC;
  }

  private static classifyV6(address: string): NetworkClassification | null {
    if (address === '::1' || address === '::') {
      return NetworkClassification.LOOPBACK;
    }
    if (/^fe[89ab]/.test(address)) {
      return NetworkClassification.LINK_LOCAL;
    }
    if (/^f[cd]/.test(address)) {
      return NetworkClassification.PRIVATE_NETWORK;
    }
    const mapped = this.unmapV4(address);
    if (mapped !== null) {
      return this.classifyV4(mapped);
    }
    return NetworkClassification.PUBLIC;
  }

  // IPv4-mapped addresses appear dotted (::ffff:192.168.0.1) or in the hex
  // form URL parsers normalize to (::ffff:c0a8:1).
  private static unmapV4(address: string): string | null {
    if (!address.startsWith('::ffff:')) {
      return null;
    }
    const mapped = address.slice('::ffff:'.length);
    if (IPV4_PATTERN.test(mapped)) {
      return mapped;
    }
    const groups = mapped.split(':');
    if (groups.length === 2 && groups.every((g) => IPV6_HEX_GROUP.test(g))) {
      const [high, low] = groups.map((group) => parseInt(group, 16));
      return `${high >> 8}.${high & 255}.${low >> 8}.${low & 255}`;
    }
    return null;
  }
}
