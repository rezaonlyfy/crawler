import { InspectTargetUseCase } from 'src/crawl-execution/application/useCase/inspectTarget/inspectTarget.useCase';
import { PageSnapshot } from 'src/crawl-execution/domain/model/pageSnapshot';
import {
  CrawlEnginePort,
  PageVisit,
  PageVisitStatus,
} from 'src/crawl-execution/domain/ports/crawlEnginePort';
import { PageSnapshotBuilderPort } from 'src/crawl-execution/domain/ports/pageSnapshotBuilderPort';
import {
  CrawlTargetPolicy,
  RejectionReason,
} from 'src/crawl-execution/domain/services/crawlTargetPolicy';
import {
  DetectionConfidence,
  SitePlatform,
} from 'src/job-discovery/domain/model/platformDetection';
import { SitePlatformDetector } from 'src/job-discovery/domain/services/sitePlatformDetector';

const successVisit = (overrides: Partial<PageVisit> = {}): PageVisit => ({
  requestedUrl: 'https://careers.acme.example/jobs',
  finalUrl: 'https://careers.acme.example/jobs',
  redirected: false,
  title: 'Careers',
  html: '<html><body><h1>Careers</h1></body></html>',
  status: PageVisitStatus.SUCCESS,
  retryCount: 0,
  durationMs: 100,
  ...overrides,
});

const fakeSnapshot = {
  requestedUrl: 'https://careers.acme.example/jobs',
  finalUrl: 'https://careers.acme.example/jobs',
  visibleText: 'Careers',
  headings: [],
  links: [],
  jsonLd: [],
  metadata: {},
  iframeSources: [],
  scriptSources: [],
} as PageSnapshot;

describe('InspectTargetUseCase', () => {
  const policy = new CrawlTargetPolicy({ allowPrivateNetworks: false });
  const detector = new SitePlatformDetector();
  let engine: jest.Mocked<CrawlEnginePort>;
  let snapshotBuilder: jest.Mocked<PageSnapshotBuilderPort>;
  let useCase: InspectTargetUseCase;

  beforeEach(() => {
    engine = { visit: jest.fn(), visitAll: jest.fn() };
    snapshotBuilder = { build: jest.fn().mockReturnValue(fakeSnapshot) };
    useCase = new InspectTargetUseCase(
      policy,
      engine,
      snapshotBuilder,
      detector,
    );
  });

  it('should not fetch a target the policy rejects', async () => {
    const inspection = await useCase.execute('http://localhost/jobs');

    expect(inspection.evaluation.allowed).toBe(false);
    expect(inspection.evaluation.reason).toBe(RejectionReason.LOOPBACK);
    expect(inspection.pageVisit).toBeUndefined();
    expect(engine.visit).not.toHaveBeenCalled();
    expect(snapshotBuilder.build).not.toHaveBeenCalled();
  });

  it('should fetch an allowed target and return visit plus snapshot', async () => {
    engine.visit.mockResolvedValue(successVisit());

    const inspection = await useCase.execute(
      'https://careers.acme.example/jobs',
    );

    expect(inspection.evaluation.allowed).toBe(true);
    expect(engine.visit).toHaveBeenCalledWith(
      'https://careers.acme.example/jobs',
    );
    expect(inspection.pageVisit.status).toBe(PageVisitStatus.SUCCESS);
    expect(inspection.snapshot).toBe(fakeSnapshot);
    expect(snapshotBuilder.build).toHaveBeenCalledWith({
      requestedUrl: 'https://careers.acme.example/jobs',
      finalUrl: 'https://careers.acme.example/jobs',
      html: '<html><body><h1>Careers</h1></body></html>',
    });
    expect(inspection.platformDetection).toEqual({
      platform: SitePlatform.UNKNOWN,
      confidence: DetectionConfidence.NONE,
      signals: [],
    });
    expect(inspection.finalUrlEvaluation).toBeUndefined();
  });

  it('should detect the platform from the snapshot', async () => {
    engine.visit.mockResolvedValue(successVisit());
    snapshotBuilder.build.mockReturnValue({
      ...fakeSnapshot,
      finalUrl: 'https://acme.jobs.personio.de/',
    });

    const inspection = await useCase.execute(
      'https://careers.acme.example/jobs',
    );

    expect(inspection.platformDetection.platform).toBe(SitePlatform.PERSONIO);
    expect(inspection.platformDetection.confidence).toBe(
      DetectionConfidence.HIGH,
    );
  });

  it('should not build a snapshot for a failed visit', async () => {
    engine.visit.mockResolvedValue(
      successVisit({
        status: PageVisitStatus.FAILED,
        html: undefined,
        errorMessage: 'navigation timeout',
      }),
    );

    const inspection = await useCase.execute(
      'https://careers.acme.example/jobs',
    );

    expect(inspection.snapshot).toBeUndefined();
    expect(inspection.platformDetection).toBeUndefined();
    expect(snapshotBuilder.build).not.toHaveBeenCalled();
  });

  it('should re-evaluate a redirect destination against the policy', async () => {
    engine.visit.mockResolvedValue(
      successVisit({
        finalUrl: 'https://jobs.other.example/openings',
        redirected: true,
      }),
    );

    const inspection = await useCase.execute(
      'https://careers.acme.example/jobs',
    );

    expect(inspection.finalUrlEvaluation.allowed).toBe(true);
  });

  it('should flag a redirect into a rejected destination', async () => {
    engine.visit.mockResolvedValue(
      successVisit({
        finalUrl: 'http://localhost/internal',
        redirected: true,
      }),
    );

    const inspection = await useCase.execute(
      'https://careers.acme.example/jobs',
    );

    expect(inspection.finalUrlEvaluation.allowed).toBe(false);
    expect(inspection.finalUrlEvaluation.reason).toBe(RejectionReason.LOOPBACK);
  });
});
