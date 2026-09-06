import { Configuration } from '@crawlee/core';
import { PlaywrightCrawler } from '@crawlee/playwright';
import { Injectable, Logger } from '@nestjs/common';
import {
  CrawlEnginePort,
  CrawlEngineSettings,
  PageVisit,
  PageVisitStatus,
} from 'src/crawl-execution/domain/ports/crawlEnginePort';
import { buildCrawleeOptions } from 'src/crawl-execution/infrastructure/crawlee/crawleeEngineOptions';

export const unvisitedPageVisit = (requestedUrl: string): PageVisit => ({
  requestedUrl,
  redirected: false,
  status: PageVisitStatus.NOT_VISITED,
  errorMessage:
    'Not visited: excluded by robots.txt or the per-site request limit.',
  retryCount: 0,
  durationMs: 0,
});

@Injectable()
export class CrawleePlaywrightCrawlEngine implements CrawlEnginePort {
  constructor(private readonly settings: CrawlEngineSettings) {}

  async visit(url: string): Promise<PageVisit> {
    const [visit] = await this.visitAll([url]);
    return visit;
  }

  async visitAll(urls: string[]): Promise<PageVisit[]> {
    const visits = new Map<string, PageVisit>();
    const crawler = this.createCrawler(visits);
    await crawler.run(urls);
    return urls.map((url) => visits.get(url) ?? unvisitedPageVisit(url));
  }

  private createCrawler(visits: Map<string, PageVisit>): PlaywrightCrawler {
    return new PlaywrightCrawler(
      {
        ...buildCrawleeOptions(this.settings),
        launchContext: {
          userAgent: this.settings.userAgent,
          launchOptions: { headless: true },
        },
        browserPoolOptions: {
          useFingerprints: false,
        },
        preNavigationHooks: [
          async ({ request }) => {
            request.userData.startedAt = Date.now();
            Logger.log(
              {
                event: 'request_started',
                url: request.url,
                retryCount: request.retryCount,
              },
              CrawleePlaywrightCrawlEngine.name,
            );
          },
        ],
        requestHandler: async ({ request, response, page }) => {
          const finalUrl = request.loadedUrl || page.url();
          const visit: PageVisit = {
            requestedUrl: request.url,
            finalUrl,
            redirected: finalUrl !== request.url,
            title: await page.title(),
            html: await page.content(),
            httpStatus: response?.status(),
            status: PageVisitStatus.SUCCESS,
            retryCount: request.retryCount,
            durationMs: this.durationOf(request.userData),
          };
          visits.set(request.url, visit);
          Logger.log(
            {
              event: 'request_completed',
              url: request.url,
              finalUrl,
              httpStatus: visit.httpStatus,
              retryCount: visit.retryCount,
              durationMs: visit.durationMs,
            },
            CrawleePlaywrightCrawlEngine.name,
          );
        },
        failedRequestHandler: async ({ request }, error) => {
          const visit: PageVisit = {
            requestedUrl: request.url,
            finalUrl: request.loadedUrl,
            redirected:
              Boolean(request.loadedUrl) && request.loadedUrl !== request.url,
            status: PageVisitStatus.FAILED,
            errorMessage: error.message,
            retryCount: request.retryCount,
            durationMs: this.durationOf(request.userData),
          };
          visits.set(request.url, visit);
          Logger.warn(
            {
              event: 'request_failed',
              url: request.url,
              error: error.message,
              retryCount: visit.retryCount,
              durationMs: visit.durationMs,
            },
            CrawleePlaywrightCrawlEngine.name,
          );
        },
      },
      new Configuration({ persistStorage: false }),
    );
  }

  private durationOf(userData: Record<string, unknown>): number {
    const startedAt = userData.startedAt;
    return typeof startedAt === 'number' ? Date.now() - startedAt : 0;
  }
}
