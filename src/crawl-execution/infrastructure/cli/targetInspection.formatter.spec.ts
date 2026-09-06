import { PageVisitStatus } from 'src/crawl-execution/domain/ports/crawlEnginePort';
import {
  CrawlTargetPolicy,
  RejectionReason,
} from 'src/crawl-execution/domain/services/crawlTargetPolicy';
import { TargetInspectionFormatter } from 'src/crawl-execution/infrastructure/cli/targetInspection.formatter';

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
