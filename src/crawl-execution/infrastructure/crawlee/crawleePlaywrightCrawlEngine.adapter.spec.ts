import { PageVisitStatus } from 'src/crawl-execution/domain/ports/crawlEnginePort';
import { unvisitedPageVisit } from 'src/crawl-execution/infrastructure/crawlee/crawleePlaywrightCrawlEngine.adapter';

describe('unvisitedPageVisit', () => {
  it('should mark a never-fetched URL as not_visited with an explanation', () => {
    const visit = unvisitedPageVisit('https://blocked.example/jobs');

    expect(visit.requestedUrl).toBe('https://blocked.example/jobs');
    expect(visit.status).toBe(PageVisitStatus.NOT_VISITED);
    expect(visit.redirected).toBe(false);
    expect(visit.retryCount).toBe(0);
    expect(visit.errorMessage).toContain('robots.txt');
  });
});
