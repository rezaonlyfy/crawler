import {
  RejectionReason,
  CrawlTargetPolicy,
} from 'src/crawl-execution/domain/services/crawlTargetPolicy';
import { CrawlRunPlanner } from 'src/crawl-execution/domain/services/crawlRunPlanner';
import { TargetVerdict } from 'src/crawl-execution/domain/entities/CrawlRun';
import { ClockPort } from 'src/shared/domain/ports/clockPort';
import { IdGeneratorPort } from 'src/shared/domain/ports/idGeneratorPort';

const fixedClock: ClockPort = { now: () => new Date('2026-09-03T10:00:00Z') };

const sequentialIds = (): IdGeneratorPort => {
  let counter = 0;
  return { generate: () => `id-${++counter}` };
};

const makePlanner = (): CrawlRunPlanner =>
  new CrawlRunPlanner(
    new CrawlTargetPolicy({ allowPrivateNetworks: false }),
    sequentialIds(),
    fixedClock,
  );

describe('CrawlRunPlanner', () => {
  // The acceptance input from CRAWL-P1-004.
  it('should diagnose the ticket acceptance input as 1 valid / 1 duplicate / 3 rejected', () => {
    const crawlRun = makePlanner().plan([
      'https://example.com/jobs',
      'https://example.com/jobs',
      'file:///etc/passwd',
      'http://127.0.0.1',
      'invalid',
    ]);

    expect(crawlRun.getSummary()).toEqual({
      validTargets: 1,
      duplicates: 1,
      rejectedTargets: 3,
    });

    expect(crawlRun.getDiagnostics()).toEqual([
      {
        verdict: TargetVerdict.ACCEPTED,
        input: 'https://example.com/jobs',
        normalizedUrl: 'https://example.com/jobs',
        siteRunId: 'id-2',
      },
      {
        verdict: TargetVerdict.DUPLICATE,
        input: 'https://example.com/jobs',
        normalizedUrl: 'https://example.com/jobs',
        duplicateOfSiteRunId: 'id-2',
      },
      {
        verdict: TargetVerdict.REJECTED,
        input: 'file:///etc/passwd',
        reason: RejectionReason.UNSUPPORTED_SCHEME,
      },
      {
        verdict: TargetVerdict.REJECTED,
        input: 'http://127.0.0.1',
        reason: RejectionReason.LOOPBACK,
      },
      {
        verdict: TargetVerdict.REJECTED,
        input: 'invalid',
        reason: RejectionReason.MALFORMED_URL,
      },
    ]);
  });

  it('should assign a runId to the run and a siteRunId to every valid site', () => {
    const crawlRun = makePlanner().plan([
      'https://a.example.com/careers',
      'https://b.example.com/jobs',
    ]);

    expect(crawlRun.getRunId()).toEqual('id-1');
    expect(crawlRun.getCreatedAt()).toEqual(new Date('2026-09-03T10:00:00Z'));
    expect(crawlRun.getSiteRuns()).toEqual([
      { siteRunId: 'id-2', targetUrl: 'https://a.example.com/careers' },
      { siteRunId: 'id-3', targetUrl: 'https://b.example.com/jobs' },
    ]);
  });

  it('should continue with valid sites when other inputs are invalid (batch policy)', () => {
    const crawlRun = makePlanner().plan([
      'ftp://bad.example.com',
      'https://good.example.com/jobs',
    ]);

    expect(crawlRun.hasValidTargets()).toBe(true);
    expect(crawlRun.getSiteRuns()).toEqual([
      { siteRunId: 'id-2', targetUrl: 'https://good.example.com/jobs' },
    ]);
  });

  it('should deduplicate by normalized URL, not by raw string', () => {
    const crawlRun = makePlanner().plan([
      'https://Example.com/jobs',
      'https://example.com/jobs#team',
    ]);

    expect(crawlRun.getSummary().validTargets).toEqual(1);
    expect(crawlRun.getSummary().duplicates).toEqual(1);
  });
});
