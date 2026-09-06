import {
  LinkScope,
  PageSnapshot,
} from 'src/crawl-execution/domain/model/pageSnapshot';
import { PageVisitStatus } from 'src/crawl-execution/domain/ports/crawlEnginePort';
import {
  CrawlTargetPolicy,
  RejectionReason,
} from 'src/crawl-execution/domain/services/crawlTargetPolicy';
import { TargetInspectionFormatter } from 'src/crawl-execution/infrastructure/cli/targetInspection.formatter';

const snapshot: PageSnapshot = {
  requestedUrl: 'https://careers.acme.example/jobs',
  finalUrl: 'https://careers.acme.example/en/jobs',
  canonicalUrl: 'https://careers.acme.example/en/jobs',
  pageTitle: 'Careers at Acme',
  visibleText: 'Careers',
  headings: [{ level: 1, text: 'Careers' }],
  links: [
    {
      url: 'https://careers.acme.example/jobs/1',
      anchorText: 'Engineer',
      scope: LinkScope.INTERNAL,
    },
    {
      url: 'https://www.linkedin.com/company/acme',
      anchorText: 'LinkedIn',
      scope: LinkScope.EXTERNAL,
    },
  ],
  jsonLd: [
    { raw: '{}', data: {} },
    { raw: '{oops', parseError: 'bad' },
  ],
  metadata: {},
};

describe('TargetInspectionFormatter', () => {
  const formatter = new TargetInspectionFormatter();
  const policy = new CrawlTargetPolicy({ allowPrivateNetworks: false });

  it('should format a rejected target as a single line', () => {
    const lines = formatter.format('http://localhost/jobs', {
      evaluation: {
        allowed: false,
        reason: RejectionReason.LOOPBACK,
      },
    });

    expect(lines).toEqual(['REJECTED  http://localhost/jobs (loopback)']);
  });

  it('should format a successful visit with every acceptance field', () => {
    const lines = formatter.format('https://careers.acme.example/jobs', {
      evaluation: policy.evaluate('https://careers.acme.example/jobs'),
      pageVisit: {
        requestedUrl: 'https://careers.acme.example/jobs',
        finalUrl: 'https://careers.acme.example/en/jobs',
        redirected: true,
        title: 'Careers at Acme',
        httpStatus: 200,
        status: PageVisitStatus.SUCCESS,
        retryCount: 1,
        durationMs: 1234,
      },
      snapshot,
      finalUrlEvaluation: policy.evaluate(
        'https://careers.acme.example/en/jobs',
      ),
    });

    const output = lines.join('\n');
    expect(output).toContain('requestedUrl: https://careers.acme.example/jobs');
    expect(output).toContain(
      'finalUrl:     https://careers.acme.example/en/jobs',
    );
    expect(output).toContain('redirected:   yes');
    expect(output).toContain('title:        Careers at Acme');
    expect(output).toContain('status:       success');
    expect(output).toContain('httpStatus:   200');
    expect(output).toContain('duration:     1234ms');
    expect(output).toContain('retryCount:   1');
    expect(output).toContain('redirect target: ALLOWED');
  });

  it('should summarize the snapshot when present', () => {
    const lines = formatter.format('https://careers.acme.example/jobs', {
      evaluation: policy.evaluate('https://careers.acme.example/jobs'),
      pageVisit: {
        requestedUrl: 'https://careers.acme.example/jobs',
        finalUrl: 'https://careers.acme.example/en/jobs',
        redirected: false,
        status: PageVisitStatus.SUCCESS,
        retryCount: 0,
        durationMs: 500,
      },
      snapshot,
    });

    const output = lines.join('\n');
    expect(output).toContain('headings:     1');
    expect(output).toContain('links:        2 (1 internal / 1 external)');
    expect(output).toContain('jsonLd:       2 block(s), 1 malformed');
    expect(output).toContain(
      'canonicalUrl: https://careers.acme.example/en/jobs',
    );
  });

  it('should include the error and a rejected redirect verdict on failure', () => {
    const lines = formatter.format('https://careers.acme.example/jobs', {
      evaluation: policy.evaluate('https://careers.acme.example/jobs'),
      pageVisit: {
        requestedUrl: 'https://careers.acme.example/jobs',
        finalUrl: 'http://localhost/internal',
        redirected: true,
        status: PageVisitStatus.FAILED,
        errorMessage: 'navigation timeout',
        retryCount: 2,
        durationMs: 30000,
      },
      finalUrlEvaluation: policy.evaluate('http://localhost/internal'),
    });

    const output = lines.join('\n');
    expect(output).toContain('status:       failed');
    expect(output).toContain('error:        navigation timeout');
    expect(output).toContain('redirect target: REJECTED');
    expect(output).toContain('loopback');
  });
});
