import { Module } from '@nestjs/common';
import { AppModule } from 'src/app.module';
import { HeartbeatService } from 'src/shared/infrastructure/services/Heartbeat.service';

// Worker runtime concerns only. The CLI boots AppModule directly and
// therefore never starts the heartbeat.
@Module({
  imports: [AppModule],
  providers: [HeartbeatService],
})
export class WorkerModule {}
