import {
  IpAddressValueObject,
  NetworkClassification,
} from 'src/crawl-execution/domain/valueObjects/ipAddress.valueObject';

const classify = (candidate: string): NetworkClassification | null => {
  const result = IpAddressValueObject.create(candidate);
  return result.isSuccess ? result.getValue().classification : null;
};

describe('IpAddressValueObject', () => {
  it('should fail for DNS names', () => {
    expect(IpAddressValueObject.create('example.com').isFailure).toBe(true);
    expect(IpAddressValueObject.create('999.1.1.1').isFailure).toBe(true);
  });

  it('should classify loopback addresses', () => {
    expect(classify('127.0.0.1')).toEqual(NetworkClassification.LOOPBACK);
    expect(classify('127.8.9.10')).toEqual(NetworkClassification.LOOPBACK);
    expect(classify('0.0.0.0')).toEqual(NetworkClassification.LOOPBACK);
    expect(classify('::1')).toEqual(NetworkClassification.LOOPBACK);
    expect(classify('[::1]')).toEqual(NetworkClassification.LOOPBACK);
  });

  it('should classify link-local addresses', () => {
    expect(classify('169.254.169.254')).toEqual(
      NetworkClassification.LINK_LOCAL,
    );
    expect(classify('fe80::1')).toEqual(NetworkClassification.LINK_LOCAL);
    expect(classify('fe80::1%eth0')).toEqual(NetworkClassification.LINK_LOCAL);
  });

  it('should classify private network addresses', () => {
    expect(classify('10.0.0.5')).toEqual(NetworkClassification.PRIVATE_NETWORK);
    expect(classify('172.16.0.1')).toEqual(
      NetworkClassification.PRIVATE_NETWORK,
    );
    expect(classify('172.31.255.1')).toEqual(
      NetworkClassification.PRIVATE_NETWORK,
    );
    expect(classify('192.168.1.1')).toEqual(
      NetworkClassification.PRIVATE_NETWORK,
    );
    expect(classify('fc00::1')).toEqual(NetworkClassification.PRIVATE_NETWORK);
  });

  it('should classify IPv4-mapped IPv6 in dotted and hex form', () => {
    expect(classify('::ffff:192.168.0.1')).toEqual(
      NetworkClassification.PRIVATE_NETWORK,
    );
    expect(classify('::ffff:c0a8:1')).toEqual(
      NetworkClassification.PRIVATE_NETWORK,
    );
    expect(classify('::ffff:808:808')).toEqual(NetworkClassification.PUBLIC);
  });

  it('should classify public addresses', () => {
    expect(classify('8.8.8.8')).toEqual(NetworkClassification.PUBLIC);
    expect(classify('172.32.0.1')).toEqual(NetworkClassification.PUBLIC);
    expect(classify('2606:4700::1111')).toEqual(NetworkClassification.PUBLIC);
  });
});
