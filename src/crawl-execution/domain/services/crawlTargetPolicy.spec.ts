import {
  CrawlTargetPolicy,
  RejectionReason,
} from 'src/crawl-execution/domain/services/crawlTargetPolicy';

const policy = new CrawlTargetPolicy({ allowPrivateNetworks: false });

const rejectionOf = (url: string): RejectionReason | null => {
  const evaluation = policy.evaluate(url);
  return evaluation.allowed ? null : evaluation.reason;
};

describe('CrawlTargetPolicy', () => {
  it('should accept public http(s) URLs and expose the normalized URL', () => {
    const evaluation = policy.evaluate('https://Example.com/jobs#apply');

    expect(evaluation).toMatchObject({
      allowed: true,
      url: { value: 'https://example.com/jobs' },
    });
  });

  it('should map URL problems to rejection reasons', () => {
    expect(rejectionOf('invalid')).toEqual(RejectionReason.MALFORMED_URL);
    expect(rejectionOf('file:///etc/passwd')).toEqual(
      RejectionReason.UNSUPPORTED_SCHEME,
    );
    expect(rejectionOf('https://user:secret@example.com')).toEqual(
      RejectionReason.CREDENTIALS_IN_URL,
    );
  });

  it('should reject loopback destinations including localhost names', () => {
    expect(rejectionOf('http://127.0.0.1')).toEqual(RejectionReason.LOOPBACK);
    expect(rejectionOf('http://localhost:3000')).toEqual(
      RejectionReason.LOOPBACK,
    );
    expect(rejectionOf('http://app.localhost')).toEqual(
      RejectionReason.LOOPBACK,
    );
    expect(rejectionOf('http://[::1]/jobs')).toEqual(RejectionReason.LOOPBACK);
  });

  it('should reject link-local and private destinations by default', () => {
    expect(rejectionOf('http://169.254.169.254/latest/meta-data')).toEqual(
      RejectionReason.LINK_LOCAL,
    );
    expect(rejectionOf('http://10.0.0.5')).toEqual(
      RejectionReason.PRIVATE_NETWORK,
    );
    expect(rejectionOf('http://[::ffff:192.168.0.1]/')).toEqual(
      RejectionReason.PRIVATE_NETWORK,
    );
  });

  it('should allow private networks only under the environment policy', () => {
    const permissive = new CrawlTargetPolicy({ allowPrivateNetworks: true });

    expect(permissive.evaluate('http://192.168.1.1/jobs').allowed).toBe(true);
    // Loopback and link-local stay rejected even then.
    expect(permissive.evaluate('http://127.0.0.1').allowed).toBe(false);
    expect(permissive.evaluate('http://169.254.0.1').allowed).toBe(false);
  });

  it('should classify redirect/DNS addresses via classifyAddress', () => {
    expect(policy.classifyAddress('127.0.0.1')).toEqual(
      RejectionReason.LOOPBACK,
    );
    expect(policy.classifyAddress('10.1.2.3')).toEqual(
      RejectionReason.PRIVATE_NETWORK,
    );
    expect(policy.classifyAddress('93.184.216.34')).toBeNull();
  });
});
