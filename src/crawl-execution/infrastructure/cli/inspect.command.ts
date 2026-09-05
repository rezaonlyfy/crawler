import { Logger } from '@nestjs/common';
import { Command, CommandRunner } from 'nest-commander';
import { InspectTargetUseCase } from 'src/crawl-execution/application/useCase/inspectTarget/inspectTarget.useCase';
import { EXIT_CODES } from 'src/crawl-execution/infrastructure/cli/exitCodes';

@Command({
  name: 'inspect',
  arguments: '<url>',
  description: 'Evaluate one URL against the crawl target policy',
})
export class InspectCommand extends CommandRunner {
  constructor(private readonly inspectTargetUseCase: InspectTargetUseCase) {
    super();
  }

  async run([url]: string[]): Promise<void> {
    const evaluation = this.inspectTargetUseCase.execute(url);

    if (evaluation.allowed) {
      Logger.log(`ALLOWED  ${evaluation.url.value}`, InspectCommand.name);
      return;
    }

    Logger.warn(`REJECTED ${url} (${evaluation.reason})`, InspectCommand.name);
    process.exitCode = EXIT_CODES.TARGET_REJECTED;
  }
}
