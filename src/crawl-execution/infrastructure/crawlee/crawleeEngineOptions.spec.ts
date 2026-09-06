import { CrawlEngineSettings } from 'src/crawl-execution/domain/ports/crawlEnginePort';
import { buildCrawleeOptions } from 'src/crawl-execution/infrastructure/crawlee/crawleeEngineOptions';

const settings: CrawlEngineSettings = {
  userAgent: 'kununu-job-crawler/0.1 (+https://www.kununu.com)',
  maxConcurrency: 3,
  maxRequestsPerSite: 50,
  maxRequestsPerMinute: 30,
  sameDomainDelaySeconds: 2,
  navigationTimeoutSeconds: 20,
  maxRequestRetries: 1,
  respectRobotsTxt: true,
};

describe('buildCrawleeOptions', () => {
  it('should map every politeness setting onto Crawlee options', () => {
    expect(buildCrawleeOptions(settings)).toEqual({
      minConcurrency: 1,
      maxConcurrency: 3,
      maxRequestRetries: 1,
      maxRequestsPerCrawl: 50,
      maxRequestsPerMinute: 30,
      sameDomainDelaySecs: 2,
      navigationTimeoutSecs: 20,
      respectRobotsTxtFile: true,
    });
  });

  it('should pass a disabled robots.txt policy through', () => {
    expect(
      buildCrawleeOptions({ ...settings, respectRobotsTxt: false })
        .respectRobotsTxtFile,
    ).toBe(false);
  });
});
