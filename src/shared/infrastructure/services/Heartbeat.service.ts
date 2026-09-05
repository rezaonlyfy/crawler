import {
  Injectable,
  Logger,
  OnApplicationBootstrap,
  OnApplicationShutdown,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class HeartbeatService
  implements OnApplicationBootstrap, OnApplicationShutdown
{
  private heartbeat: NodeJS.Timeout | null = null;

  constructor(private readonly configService: ConfigService) {}

  onApplicationBootstrap(): void {
    Logger.log(
      `job-crawler skeleton started (env: ${this.configService.get<string>(
        'environment',
      )})`,
      HeartbeatService.name,
    );
    Logger.log(
      'Modules loaded: crawl-execution, job-discovery, job-extraction, job-normalization, crawl-reporting, shared',
      HeartbeatService.name,
    );
    Logger.log(
      'No crawl logic yet (CRAWL-P1-003). CLI bootstrap: node dist/cli',
      HeartbeatService.name,
    );
    this.heartbeat = setInterval(
      () =>
        Logger.log(
          'job-crawler idle — waiting for work (heartbeat)',
          HeartbeatService.name,
        ),
      this.configService.get<number>('heartbeatIntervalMs'),
    );
  }

  onApplicationShutdown(): void {
    if (this.heartbeat !== null) {
      clearInterval(this.heartbeat);
      this.heartbeat = null;
    }
  }
}
