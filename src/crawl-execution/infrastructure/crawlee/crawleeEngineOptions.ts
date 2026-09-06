import { CrawlEngineSettings } from 'src/crawl-execution/domain/ports/crawlEnginePort';

// Maps our engine settings onto Crawlee's PlaywrightCrawler options. Crawlee
// owns queueing, retries, concurrency, rate limits and robots.txt handling —
// we only configure them here. Kept pure so the politeness mapping is
// unit-testable without launching a browser.
export const buildCrawleeOptions = (settings: CrawlEngineSettings) => ({
  minConcurrency: 1,
  maxConcurrency: settings.maxConcurrency,
  maxRequestRetries: settings.maxRequestRetries,
  maxRequestsPerCrawl: settings.maxRequestsPerSite,
  maxRequestsPerMinute: settings.maxRequestsPerMinute,
  sameDomainDelaySecs: settings.sameDomainDelaySeconds,
  navigationTimeoutSecs: settings.navigationTimeoutSeconds,
  respectRobotsTxtFile: settings.respectRobotsTxt,
});
