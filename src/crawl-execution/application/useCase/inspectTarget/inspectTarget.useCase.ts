import { Inject, Injectable, Logger } from '@nestjs/common';
import { TargetInspection } from 'src/crawl-execution/application/useCase/inspectTarget/targetInspection';
import {
  CrawlEnginePort,
  PageVisit,
  PageVisitStatus,
} from 'src/crawl-execution/domain/ports/crawlEnginePort';
import { PageSnapshotBuilderPort } from 'src/crawl-execution/domain/ports/pageSnapshotBuilderPort';
import { CrawlTargetPolicy } from 'src/crawl-execution/domain/services/crawlTargetPolicy';
import { CRAWL_EXECUTION_SYMBOLS } from 'src/crawl-execution/infrastructure/IoC/Symbols';
import { SitePlatformDetector } from 'src/job-discovery/domain/services/sitePlatformDetector';
import { JOB_DISCOVERY_SYMBOLS } from 'src/job-discovery/infrastructure/IoC/Symbols';
import { UseCase } from 'src/shared/domain/UseCase';
import { CatchErrorWithLogger } from 'src/shared/errors/decorator/catchError.decorator';

@Injectable()
@CatchErrorWithLogger()
export class InspectTargetUseCase implements UseCase<TargetInspection> {
  constructor(
    @Inject(CRAWL_EXECUTION_SYMBOLS.CRAWL_TARGET_POLICY)
    private readonly crawlTargetPolicy: CrawlTargetPolicy,
    @Inject(CRAWL_EXECUTION_SYMBOLS.CRAWL_ENGINE)
    private readonly crawlEngine: CrawlEnginePort,
    @Inject(CRAWL_EXECUTION_SYMBOLS.PAGE_SNAPSHOT_BUILDER)
    private readonly pageSnapshotBuilder: PageSnapshotBuilderPort,
    @Inject(JOB_DISCOVERY_SYMBOLS.SITE_PLATFORM_DETECTOR)
    private readonly sitePlatformDetector: SitePlatformDetector,
  ) {}

  async execute(url: string): Promise<TargetInspection> {
    Logger.debug({ url }, InspectTargetUseCase.name);

    const evaluation = this.crawlTargetPolicy.evaluate(url);
    if (!evaluation.allowed) {
      return { evaluation };
    }

    const pageVisit = await this.crawlEngine.visit(evaluation.url.value);
    const snapshot = this.buildSnapshot(pageVisit);

    return {
      evaluation,
      pageVisit,
      snapshot,
      platformDetection: snapshot
        ? this.sitePlatformDetector.detect(snapshot)
        : undefined,
      finalUrlEvaluation: this.evaluateRedirect(pageVisit),
    };
  }

  private buildSnapshot(pageVisit: PageVisit) {
    if (pageVisit.status !== PageVisitStatus.SUCCESS || !pageVisit.html) {
      return undefined;
    }
    return this.pageSnapshotBuilder.build({
      requestedUrl: pageVisit.requestedUrl,
      finalUrl: pageVisit.finalUrl || pageVisit.requestedUrl,
      html: pageVisit.html,
    });
  }

  // Redirect destinations must pass the same target policy as the input URL.
  private evaluateRedirect(pageVisit: {
    redirected: boolean;
    finalUrl?: string;
  }) {
    if (!pageVisit.redirected || !pageVisit.finalUrl) {
      return undefined;
    }
    return this.crawlTargetPolicy.evaluate(pageVisit.finalUrl);
  }
}
