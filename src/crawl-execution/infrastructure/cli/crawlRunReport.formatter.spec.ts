import {
  CrawlRun,
  TargetVerdict,
} from 'src/crawl-execution/domain/entities/CrawlRun';
import { RejectionReason } from 'src/crawl-execution/domain/services/crawlTargetPolicy';
import { CrawlRunReportFormatter } from 'src/crawl-execution/infrastructure/cli/crawlRunReport.formatter';

describe('CrawlRunReportFormatter', () => {
  it('should format the run report with one line per diagnostic and a summary', () => {
    const crawlRun = CrawlRun.create({
      runId: 'run-1',
      createdAt: new Date('2026-09-03T10:00:00Z'),
      diagnostics: [
        {
          verdict: TargetVerdict.ACCEPTED,
          input: 'https://example.com/jobs',
          normalizedUrl: 'https://example.com/jobs',
          siteRunId: 'site-1',
        },
        {
          verdict: TargetVerdict.DUPLICATE,
          input: 'https://example.com/jobs',
          normalizedUrl: 'https://example.com/jobs',
          duplicateOfSiteRunId: 'site-1',
        },
        {
          verdict: TargetVerdict.REJECTED,
          input: 'invalid',
          reason: RejectionReason.MALFORMED_URL,
        },
      ],
      siteRuns: [
        { siteRunId: 'site-1', targetUrl: 'https://example.com/jobs' },
      ],
    });

    expect(new CrawlRunReportFormatter().format(crawlRun)).toEqual([
      'runId: run-1',
      'ACCEPTED  https://example.com/jobs → siteRunId site-1',
      'DUPLICATE https://example.com/jobs (already planned as siteRunId site-1)',
      'REJECTED  invalid (malformed_url)',
      '1 valid target(s), 1 duplicate(s), 1 rejected target(s)',
    ]);
  });
});
