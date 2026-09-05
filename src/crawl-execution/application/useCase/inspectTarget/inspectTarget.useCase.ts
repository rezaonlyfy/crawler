import { Inject, Injectable, Logger } from '@nestjs/common';
import {
  CrawlTargetPolicy,
  TargetEvaluation,
} from 'src/crawl-execution/domain/services/crawlTargetPolicy';
import { CRAWL_EXECUTION_SYMBOLS } from 'src/crawl-execution/infrastructure/IoC/Symbols';
import { UseCase } from 'src/shared/domain/UseCase';
import { CatchErrorWithLogger } from 'src/shared/errors/decorator/catchError.decorator';

@Injectable()
@CatchErrorWithLogger()
export class InspectTargetUseCase implements UseCase<TargetEvaluation> {
  constructor(
    @Inject(CRAWL_EXECUTION_SYMBOLS.CRAWL_TARGET_POLICY)
    private readonly crawlTargetPolicy: CrawlTargetPolicy,
  ) {}

  execute(url: string): TargetEvaluation {
    Logger.debug({ url }, InspectTargetUseCase.name);
    return this.crawlTargetPolicy.evaluate(url);
  }
}
