import { Module } from '@nestjs/common';
import { SitePlatformDetector } from 'src/job-discovery/domain/services/sitePlatformDetector';
import { JOB_DISCOVERY_SYMBOLS } from 'src/job-discovery/infrastructure/IoC/Symbols';

@Module({
  providers: [
    {
      provide: JOB_DISCOVERY_SYMBOLS.SITE_PLATFORM_DETECTOR,
      useClass: SitePlatformDetector,
    },
  ],
  exports: [JOB_DISCOVERY_SYMBOLS.SITE_PLATFORM_DETECTOR],
})
export class JobDiscoveryModule {}
