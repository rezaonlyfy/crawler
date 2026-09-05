import { Logger } from '@nestjs/common';
import { Command, CommandRunner } from 'nest-commander';
import { PlanCrawlRunUseCase } from 'src/crawl-execution/application/useCase/planCrawlRun/planCrawlRun.useCase';
import { TargetListFileReaderAdapter } from 'src/crawl-execution/infrastructure/adapters/targetListFile/targetListFileReader.adapter';
import { CrawlRunReportFormatter } from 'src/crawl-execution/infrastructure/cli/crawlRunReport.formatter';
import { EXIT_CODES } from 'src/crawl-execution/infrastructure/cli/exitCodes';
import { TargetListFileError } from 'src/crawl-execution/infrastructure/errors/TargetListFileError';

@Command({
  name: 'run',
  arguments: '<input-file>',
  description:
    'Plan a crawl run from a JSON file containing an array of career page URLs',
})
export class RunCommand extends CommandRunner {
  constructor(
    private readonly planCrawlRunUseCase: PlanCrawlRunUseCase,
    private readonly targetListFileReader: TargetListFileReaderAdapter,
    private readonly crawlRunReportFormatter: CrawlRunReportFormatter,
  ) {
    super();
  }

  async run([inputFile]: string[]): Promise<void> {
    let inputUrls: string[];
    try {
      inputUrls = await this.targetListFileReader.read(inputFile);
    } catch (error) {
      if (error instanceof TargetListFileError) {
        Logger.error(error.message, RunCommand.name);
        process.exitCode = EXIT_CODES.INVALID_INPUT;
        return;
      }
      throw error;
    }

    const crawlRun = this.planCrawlRunUseCase.execute(inputUrls);

    for (const line of this.crawlRunReportFormatter.format(crawlRun)) {
      Logger.log(line, RunCommand.name);
    }

    if (!crawlRun.hasValidTargets()) {
      Logger.warn('No valid targets — nothing to crawl.', RunCommand.name);
      process.exitCode = EXIT_CODES.NO_VALID_TARGETS;
    }
  }
}
