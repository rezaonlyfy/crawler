import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { configuration } from 'src/config/configuration';
import { validationSchema } from 'src/config/validation';
import { CrawlExecutionModule } from 'src/crawl-execution/crawlExecution.module';
import { CrawlReportingModule } from 'src/crawl-reporting/crawlReporting.module';
import { JobDiscoveryModule } from 'src/job-discovery/jobDiscovery.module';
import { JobExtractionModule } from 'src/job-extraction/jobExtraction.module';
import { JobNormalizationModule } from 'src/job-normalization/jobNormalization.module';
import { SharedModule } from 'src/shared/shared.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
      validationSchema,
    }),
    SharedModule,
    CrawlExecutionModule,
    JobDiscoveryModule,
    JobExtractionModule,
    JobNormalizationModule,
    CrawlReportingModule,
  ],
})
export class AppModule {}
