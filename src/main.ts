import { NestFactory } from '@nestjs/core';
import { WorkerModule } from 'src/worker.module';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(WorkerModule);
  app.enableShutdownHooks();
}

bootstrap();
