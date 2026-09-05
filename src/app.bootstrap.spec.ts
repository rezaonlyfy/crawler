import { Test } from '@nestjs/testing';
import { AppModule } from 'src/app.module';
import { InspectTargetUseCase } from 'src/crawl-execution/application/useCase/inspectTarget/inspectTarget.useCase';
import { PlanCrawlRunUseCase } from 'src/crawl-execution/application/useCase/planCrawlRun/planCrawlRun.useCase';

describe('AppModule bootstrap (CRAWL-P1-003/004)', () => {
  it('should bootstrap and resolve the application services via DI', async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    expect(moduleRef.get(PlanCrawlRunUseCase)).toBeInstanceOf(
      PlanCrawlRunUseCase,
    );
    expect(moduleRef.get(InspectTargetUseCase)).toBeInstanceOf(
      InspectTargetUseCase,
    );

    await moduleRef.close();
  });
});
