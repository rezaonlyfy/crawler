import { Inject, Injectable, Logger } from '@nestjs/common';
import { TargetInspection } from 'src/crawl-execution/application/useCase/inspectTarget/targetInspection';
import { CrawlEnginePort } from 'src/crawl-execution/domain/ports/crawlEnginePort';
import { CrawlTargetPolicy } from 'src/crawl-execution/domain/services/crawlTargetPolicy';
import { CRAWL_EXECUTION_SYMBOLS } from 'src/crawl-execution/infrastructure/IoC/Symbols';
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
  ) {}

  async execute(url: string): Promise<TargetInspection> {
    Logger.debug({ url }, InspectTargetUseCase.name);

    const evaluation = this.crawlTargetPolicy.evaluate(url);
    if (!evaluation.allowed) {
      return { evaluation };
    }

    const pageVisit = await this.crawlEngine.visit(evaluation.url.value);

    return {
      evaluation,
      pageVisit,
      finalUrlEvaluation: this.evaluateRedirect(pageVisit),
    };
  }

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
