import { Inject, Injectable, Logger } from '@nestjs/common';
import { CrawlRun } from 'src/crawl-execution/domain/entities/CrawlRun';
import { CrawlRunPlanner } from 'src/crawl-execution/domain/services/crawlRunPlanner';
import { CRAWL_EXECUTION_SYMBOLS } from 'src/crawl-execution/infrastructure/IoC/Symbols';
import { UseCase } from 'src/shared/domain/UseCase';
import { CatchErrorWithLogger } from 'src/shared/errors/decorator/catchError.decorator';

@Injectable()
@CatchErrorWithLogger()
export class PlanCrawlRunUseCase implements UseCase<CrawlRun> {
  constructor(
    @Inject(CRAWL_EXECUTION_SYMBOLS.CRAWL_RUN_PLANNER)
    private readonly crawlRunPlanner: CrawlRunPlanner,
  ) {}

  execute(inputUrls: string[]): CrawlRun {
    Logger.debug({ inputUrls }, PlanCrawlRunUseCase.name);
    return this.crawlRunPlanner.plan(inputUrls);
  }
}
