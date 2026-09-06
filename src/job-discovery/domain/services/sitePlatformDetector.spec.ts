import {
  LinkScope,
  PageSnapshot,
} from 'src/crawl-execution/domain/model/pageSnapshot';
import { CheerioPageSnapshotBuilderAdapter } from 'src/crawl-execution/infrastructure/snapshot/cheerioPageSnapshotBuilder.adapter';
import {
  DetectionConfidence,
  SitePlatform,
} from 'src/job-discovery/domain/model/platformDetection';
import { SitePlatformDetector } from 'src/job-discovery/domain/services/sitePlatformDetector';
import { FixtureLoader } from 'src/shared/testing/fixtures/fixtureLoader';

const emptySnapshot = (
  overrides: Partial<PageSnapshot> = {},
): PageSnapshot => ({
  requestedUrl: 'https://careers.acme.example/jobs',
  finalUrl: 'https://careers.acme.example/jobs',
  visibleText: '',
  headings: [],
  links: [],
  jsonLd: [],
  metadata: {},
  iframeSources: [],
  scriptSources: [],
  ...overrides,
});

const link = (url: string) => ({
  url,
  anchorText: 'Job',
  scope: LinkScope.EXTERNAL,
});

describe('SitePlatformDetector', () => {
  const detector = new SitePlatformDetector();
  const builder = new CheerioPageSnapshotBuilderAdapter();
  const loader = new FixtureLoader();

  const detectFixture = (name: string) => {
    const page = loader.load('ats-platform', name).entryPage();
    return detector.detect(
      builder.build({
        requestedUrl: page.url,
        finalUrl: page.url,
        html: page.html,
      }),
    );
  };

  describe('against ats-platform fixtures', () => {
    it.each([
      ['personio-hosted', SitePlatform.PERSONIO, DetectionConfidence.HIGH],
      [
        'greenhouse-embedded',
        SitePlatform.GREENHOUSE,
        DetectionConfidence.MEDIUM,
      ],
      ['lever-hosted', SitePlatform.LEVER, DetectionConfidence.HIGH],
      ['workday-hosted', SitePlatform.WORKDAY, DetectionConfidence.HIGH],
      ['recruitee-hosted', SitePlatform.RECRUITEE, DetectionConfidence.HIGH],
      [
        'smartrecruiters-links',
        SitePlatform.SMARTRECRUITERS,
        DetectionConfidence.MEDIUM,
      ],
    ])(
      'should classify %s as %s with %s confidence',
      (fixture, platform, confidence) => {
        const detection = detectFixture(fixture as string);

        expect(detection.platform).toBe(platform);
        expect(detection.confidence).toBe(confidence);
        expect(detection.signals.length).toBeGreaterThan(0);
      },
    );

    it('should retain hostname and marker evidence for a Personio-hosted board', () => {
      const detection = detectFixture('personio-hosted');

      const kinds = detection.signals.map((signal) => signal.signal);
      expect(kinds).toContain('hostname');
      expect(kinds).toContain('marker');
      expect(
        detection.signals.find((signal) => signal.signal === 'hostname')
          .evidence,
      ).toBe('acme-demo.jobs.personio.de');
    });

    it('should retain iframe and script evidence for an embedded Greenhouse board', () => {
      const detection = detectFixture('greenhouse-embedded');

      const kinds = detection.signals.map((signal) => signal.signal);
      expect(kinds).toContain('iframe');
      expect(kinds).toContain('script');
    });
  });

  it('should classify a plain career site as UNKNOWN with no signals', () => {
    const page = loader.load('basic-career-page', 'simple-listing').entryPage();
    const detection = detector.detect(
      builder.build({
        requestedUrl: page.url,
        finalUrl: page.url,
        html: page.html,
      }),
    );

    expect(detection.platform).toBe(SitePlatform.UNKNOWN);
    expect(detection.confidence).toBe(DetectionConfidence.NONE);
    expect(detection.signals).toEqual([]);
  });

  describe('conservative confidence', () => {
    it('should rate a single outbound ATS link as LOW', () => {
      const detection = detector.detect(
        emptySnapshot({
          links: [link('https://jobs.lever.co/acme/1111-engineer')],
        }),
      );

      expect(detection.platform).toBe(SitePlatform.LEVER);
      expect(detection.confidence).toBe(DetectionConfidence.LOW);
    });

    it('should rate a marker-only match as LOW', () => {
      const detection = detector.detect(
        emptySnapshot({ visibleText: 'Karriere Powered by Personio' }),
      );

      expect(detection.platform).toBe(SitePlatform.PERSONIO);
      expect(detection.confidence).toBe(DetectionConfidence.LOW);
    });

    it('should downgrade to LOW and flag ambiguity on equal evidence', () => {
      const detection = detector.detect(
        emptySnapshot({
          links: [
            link('https://jobs.personio.de/job/1'),
            link('https://boards.greenhouse.io/acme/jobs/2'),
          ],
        }),
      );

      expect(detection.confidence).toBe(DetectionConfidence.LOW);
      expect(
        detection.signals.some((signal) => signal.signal === 'ambiguous'),
      ).toBe(true);
    });
  });
});
