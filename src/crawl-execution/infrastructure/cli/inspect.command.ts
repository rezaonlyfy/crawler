import { Logger } from '@nestjs/common';
import { Command, CommandRunner } from 'nest-commander';
import { InspectTargetUseCase } from 'src/crawl-execution/application/useCase/inspectTarget/inspectTarget.useCase';
import { PageVisitStatus } from 'src/crawl-execution/domain/ports/crawlEnginePort';
import { EXIT_CODES } from 'src/crawl-execution/infrastructure/cli/exitCodes';
import { TargetInspectionFormatter } from 'src/crawl-execution/infrastructure/cli/targetInspection.formatter';

@Command({
  name: 'inspect',
  arguments: '<url>',
  description:
    'Evaluate one URL against the crawl target policy and fetch/render it',
})
export class InspectCommand extends CommandRunner {
  constructor(
    private readonly inspectTargetUseCase: InspectTargetUseCase,
    private readonly formatter: TargetInspectionFormatter,
  ) {
    super();
  }

  async run([url]: string[]): Promise<void> {
    const inspection = await this.inspectTargetUseCase.execute(url);

    for (const line of this.formatter.format(url, inspection)) {
      Logger.log(line, InspectCommand.name);
    }

    process.exitCode = this.exitCodeFor(inspection);
  }

  private exitCodeFor(inspection: {
    evaluation: { allowed: boolean };
    finalUrlEvaluation?: { allowed: boolean };
    pageVisit?: { status: PageVisitStatus };
  }): number {
    if (!inspection.evaluation.allowed) {
      return EXIT_CODES.TARGET_REJECTED;
    }
    if (inspection.finalUrlEvaluation?.allowed === false) {
      return EXIT_CODES.TARGET_REJECTED;
    }
    if (inspection.pageVisit?.status !== PageVisitStatus.SUCCESS) {
      return EXIT_CODES.CRAWL_FAILED;
    }
    return EXIT_CODES.SUCCESS;
  }
}
