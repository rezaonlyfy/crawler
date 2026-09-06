/* eslint-disable no-process-env */
export const configuration = () => ({
  allowPrivateNetworkTargets:
    process.env.ALLOW_PRIVATE_NETWORK_TARGETS === 'true',
  environment: process.env.NODE_ENV || 'development',
  evaluationSitesFile:
    process.env.EVALUATION_SITES_FILE || 'evaluation/phase1-sites.json',
  heartbeatIntervalMs: Number(process.env.HEARTBEAT_INTERVAL_MS || 30000),
  logLevel: process.env.LOG_LEVEL || 'info',
  crawlEngine: {
    // Identifiable crawler UA (CRAWL-P1-006 politeness requirement).
    userAgent:
      process.env.CRAWLER_USER_AGENT ||
      'kununu-job-crawler/0.1 (+https://www.kununu.com)',
    maxConcurrency: Number(process.env.CRAWLER_MAX_CONCURRENCY || 2),
    maxRequestsPerSite: Number(
      process.env.CRAWLER_MAX_REQUESTS_PER_SITE || 100,
    ),
    maxRequestsPerMinute: Number(
      process.env.CRAWLER_MAX_REQUESTS_PER_MINUTE || 60,
    ),
    sameDomainDelaySeconds: Number(
      process.env.CRAWLER_SAME_DOMAIN_DELAY_SECONDS || 1,
    ),
    navigationTimeoutSeconds: Number(
      process.env.CRAWLER_NAVIGATION_TIMEOUT_SECONDS || 30,
    ),
    maxRequestRetries: Number(process.env.CRAWLER_MAX_REQUEST_RETRIES || 2),
    // Phase 1 policy: robots.txt is respected. See docs/CRAWLING_POLICY.md.
    respectRobotsTxt: process.env.CRAWLER_RESPECT_ROBOTS_TXT !== 'false',
  },
});
