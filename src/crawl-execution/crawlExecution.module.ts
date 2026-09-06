import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InspectTargetUseCase } from 'src/crawl-execution/application/useCase/inspectTarget/inspectTarget.useCase';
import { PlanCrawlRunUseCase } from 'src/crawl-execution/application/useCase/planCrawlRun/planCrawlRun.useCase';
import { CrawlRunPlanner } from 'src/crawl-execution/domain/services/crawlRunPlanner';
import { CrawlTargetPolicy } from 'src/crawl-execution/domain/services/crawlTargetPolicy';
import { CrawlEngineSettings } from 'src/crawl-execution/domain/ports/crawlEnginePort';
import { CRAWL_EXECUTION_SYMBOLS } from 'src/crawl-execution/infrastructure/IoC/Symbols';
import { TargetListFileReaderAdapter } from 'src/crawl-execution/infrastructure/adapters/targetListFile/targetListFileReader.adapter';
import { CrawlRunReportFormatter } from 'src/crawl-execution/infrastructure/cli/crawlRunReport.formatter';
import { InspectCommand } from 'src/crawl-execution/infrastructure/cli/inspect.command';
import { RunCommand } from 'src/crawl-execution/infrastructure/cli/run.command';
import { TargetInspectionFormatter } from 'src/crawl-execution/infrastructure/cli/targetInspection.formatter';
import { CrawleePlaywrightCrawlEngine } from 'src/crawl-execution/infrastructure/crawlee/crawleePlaywrightCrawlEngine.adapter';
import { CheerioPageSnapshotBuilderAdapter } from 'src/crawl-execution/infrastructure/snapshot/cheerioPageSnapshotBuilder.adapter';
import { JobDiscoveryModule } from 'src/job-discovery/jobDiscovery.module';
import { ClockPort } from 'src/shared/domain/ports/clockPort';
import { IdGeneratorPort } from 'src/shared/domain/ports/idGeneratorPort';
import { SHARED_SYMBOLS } from 'src/shared/infrastructure/IoC/Symbols';
import { SharedModule } from 'src/shared/shared.module';

@Module({
  imports: [SharedModule, JobDiscoveryModule],
  providers: [
    {
      provide: CRAWL_EXECUTION_SYMBOLS.CRAWL_TARGET_POLICY,
      useFactory: (configService: ConfigService): CrawlTargetPolicy =>
        new CrawlTargetPolicy({
          allowPrivateNetworks: configService.get<boolean>(
            'allowPrivateNetworkTargets',
          ),
        }),
      inject: [ConfigService],
    },
    {
      provide: CRAWL_EXECUTION_SYMBOLS.CRAWL_RUN_PLANNER,
      useFactory: (
        crawlTargetPolicy: CrawlTargetPolicy,
        idGenerator: IdGeneratorPort,
        clock: ClockPort,
      ): CrawlRunPlanner =>
        new CrawlRunPlanner(crawlTargetPolicy, idGenerator, clock),
      inject: [
        CRAWL_EXECUTION_SYMBOLS.CRAWL_TARGET_POLICY,
        SHARED_SYMBOLS.ID_GENERATOR_PORT,
        SHARED_SYMBOLS.CLOCK_PORT,
      ],
    },
    {
      provide: CRAWL_EXECUTION_SYMBOLS.CRAWL_ENGINE,
      useFactory: (
        configService: ConfigService,
      ): CrawleePlaywrightCrawlEngine =>
        new CrawleePlaywrightCrawlEngine(
          configService.get<CrawlEngineSettings>('crawlEngine'),
        ),
      inject: [ConfigService],
    },
    {
      provide: CRAWL_EXECUTION_SYMBOLS.PAGE_SNAPSHOT_BUILDER,
      useClass: CheerioPageSnapshotBuilderAdapter,
    },
    PlanCrawlRunUseCase,
    InspectTargetUseCase,
    TargetListFileReaderAdapter,
    CrawlRunReportFormatter,
    TargetInspectionFormatter,
    RunCommand,
    InspectCommand,
  ],
  exports: [PlanCrawlRunUseCase, InspectTargetUseCase],
})
export class CrawlExecutionModule {}
