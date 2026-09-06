import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { Logger } from '@nestjs/common';
import { Command, CommandRunner, Option } from 'nest-commander';
import { InspectTargetUseCase } from 'src/crawl-execution/application/useCase/inspectTarget/inspectTarget.useCase';
import { PageVisitStatus } from 'src/crawl-execution/domain/ports/crawlEnginePort';
import { EXIT_CODES } from 'src/crawl-execution/infrastructure/cli/exitCodes';
import { TargetInspectionFormatter } from 'src/crawl-execution/infrastructure/cli/targetInspection.formatter';

interface InspectOptions {
  debug?: boolean;
}

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

  @Option({
    flags: '-d, --debug',
    description: 'Write the full PageSnapshot to snapshot.json',
  })
  parseDebug(): boolean {
    return true;
  }

  async run([url]: string[], options?: InspectOptions): Promise<void> {
    const inspection = await this.inspectTargetUseCase.execute(url);

    for (const line of this.formatter.format(url, inspection)) {
      Logger.log(line, InspectCommand.name);
    }

    if (options?.debug && inspection.snapshot) {
      const path = resolve('snapshot.json');
      writeFileSync(path, JSON.stringify(inspection.snapshot, null, 2));
      Logger.log(`snapshot written to ${path}`, InspectCommand.name);
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
