import { LinkScope } from 'src/crawl-execution/domain/model/pageSnapshot';
import { CheerioPageSnapshotBuilderAdapter } from 'src/crawl-execution/infrastructure/snapshot/cheerioPageSnapshotBuilder.adapter';
import { FixtureLoader } from 'src/shared/testing/fixtures/fixtureLoader';

const TICKET_FIXTURE_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
  <title>Careers — Acme</title>
  <link rel="canonical" href="https://careers.acme.example/jobs">
  <meta name="description" content="Open roles at Acme">
  <meta property="og:title" content="Careers at Acme">
  <script type="application/ld+json">{"@type":"JobPosting","title":"Senior Backend Engineer"}</script>
</head>
<body>
  <h1>Careers</h1>
  <p>Join us.</p>
  <h2>Engineering</h2>
  <article class="card">
    <h3><a href="/jobs/123" title="Open role">Senior Backend Engineer</a></h3>
    <p>Vienna · Full-time</p>
  </article>
  <a href="https://www.linkedin.com/company/acme">LinkedIn</a>
  <a href="mailto:jobs@acme.example">Mail us</a>
  <script>var hidden = 'not visible text';</script>
</body>
</html>`;

describe('CheerioPageSnapshotBuilderAdapter', () => {
  const builder = new CheerioPageSnapshotBuilderAdapter();
  const loader = new FixtureLoader();

  describe('ticket fixture', () => {
    const snapshot = builder.build({
      requestedUrl: 'http://careers.acme.example/jobs',
      finalUrl: 'https://careers.acme.example/jobs',
      html: TICKET_FIXTURE_HTML,
    });

    it('should preserve requested and final url', () => {
      expect(snapshot.requestedUrl).toBe('http://careers.acme.example/jobs');
      expect(snapshot.finalUrl).toBe('https://careers.acme.example/jobs');
    });

    it('should resolve the canonical url and capture the title', () => {
      expect(snapshot.canonicalUrl).toBe('https://careers.acme.example/jobs');
      expect(snapshot.pageTitle).toBe('Careers — Acme');
    });

    it('should preserve headings in document order with levels', () => {
      expect(snapshot.headings).toEqual([
        { level: 1, text: 'Careers' },
        { level: 2, text: 'Engineering' },
        { level: 3, text: 'Senior Backend Engineer' },
      ]);
    });

    it('should resolve relative links to absolute urls with context', () => {
      const jobLink = snapshot.links[0];

      expect(jobLink.url).toBe('https://careers.acme.example/jobs/123');
      expect(jobLink.anchorText).toBe('Senior Backend Engineer');
      expect(jobLink.title).toBe('Open role');
      expect(jobLink.scope).toBe(LinkScope.INTERNAL);
      expect(jobLink.surroundingText).toContain('Vienna · Full-time');
    });

    it('should use the previous heading when the link sits inside a heading', () => {
      expect(snapshot.links[0].nearbyHeading).toBe('Engineering');
    });

    it('should classify offsite links as external and skip mailto links', () => {
      expect(snapshot.links).toHaveLength(2);
      expect(snapshot.links[1].url).toBe(
        'https://www.linkedin.com/company/acme',
      );
      expect(snapshot.links[1].scope).toBe(LinkScope.EXTERNAL);
    });

    it('should expose parsed JSON-LD separately', () => {
      expect(snapshot.jsonLd).toHaveLength(1);
      expect(snapshot.jsonLd[0].parseError).toBeUndefined();
      expect(snapshot.jsonLd[0].data).toMatchObject({
        '@type': 'JobPosting',
        title: 'Senior Backend Engineer',
      });
    });

    it('should collect metadata from meta name and property tags', () => {
      expect(snapshot.metadata.description).toBe('Open roles at Acme');
      expect(snapshot.metadata['og:title']).toBe('Careers at Acme');
    });

    it('should keep page text visible and exclude script content', () => {
      expect(snapshot.visibleText).toContain('Join us.');
      expect(snapshot.visibleText).toContain('Senior Backend Engineer');
      expect(snapshot.visibleText).not.toContain('not visible text');
    });

    it('should collect no sources when scripts are inline and no iframe exists', () => {
      expect(snapshot.scriptSources).toEqual([]);
      expect(snapshot.iframeSources).toEqual([]);
    });
  });

  it('should collect resolved, deduplicated iframe and script sources', () => {
    const snapshot = builder.build({
      requestedUrl: 'https://careers.acme.example/jobs',
      finalUrl: 'https://careers.acme.example/jobs',
      html: `<body>
        <script src="https://boards.greenhouse.io/embed/job_board/js?for=acme"></script>
        <script src="/assets/app.js"></script>
        <script src="/assets/app.js"></script>
        <iframe src="https://boards.greenhouse.io/embed/job_board?for=acme"></iframe>
      </body>`,
    });

    expect(snapshot.scriptSources).toEqual([
      'https://boards.greenhouse.io/embed/job_board/js?for=acme',
      'https://careers.acme.example/assets/app.js',
    ]);
    expect(snapshot.iframeSources).toEqual([
      'https://boards.greenhouse.io/embed/job_board?for=acme',
    ]);
  });

  it('should keep inline style content out of surrounding text', () => {
    const snapshot = builder.build({
      requestedUrl: 'https://careers.acme.example/jobs',
      finalUrl: 'https://careers.acme.example/jobs',
      html: `<body><div>
        <style>.career-btn { color: #fff; }</style>
        <a href="/jobs/9">Warehouse Manager</a>
        <span>Graz · Vollzeit</span>
      </div></body>`,
    });

    expect(snapshot.links[0].surroundingText).toContain('Graz · Vollzeit');
    expect(snapshot.links[0].surroundingText).not.toContain('career-btn');
  });

  describe('against saved fixtures', () => {
    it('should resolve every job link on the listing fixture and keep repetition', () => {
      const page = loader
        .load('basic-career-page', 'simple-listing')
        .entryPage();
      const snapshot = builder.build({
        requestedUrl: page.url,
        finalUrl: page.url,
        html: page.html,
      });

      const jobLinks = snapshot.links.filter((link) =>
        link.url.includes('/jobs/'),
      );
      expect(jobLinks).toHaveLength(3);
      expect(jobLinks[0].url).toBe(
        'https://careers.acme-analytics.example/jobs/senior-php-developer-4711',
      );
      expect(jobLinks.every((link) => link.scope === LinkScope.INTERNAL)).toBe(
        true,
      );
      expect(jobLinks[0].nearbyHeading).toBe('Careers at Acme Analytics');
      expect(
        snapshot.links.find((link) => link.url.includes('linkedin.com'))?.scope,
      ).toBe(LinkScope.EXTERNAL);
    });

    it('should parse the JobPosting block of the jsonld fixture', () => {
      const page = loader.load('jsonld-job', 'complete-posting').entryPage();
      const snapshot = builder.build({
        requestedUrl: page.url,
        finalUrl: page.url,
        html: page.html,
      });

      expect(snapshot.jsonLd).toHaveLength(1);
      expect(snapshot.jsonLd[0].data).toMatchObject({
        '@type': 'JobPosting',
        title: 'Senior PHP Developer (m/w/d)',
      });
    });

    it('should keep malformed JSON-LD as raw text with a parse error', () => {
      const page = loader
        .load('malformed-jsonld', 'broken-posting')
        .entryPage();
      const snapshot = builder.build({
        requestedUrl: page.url,
        finalUrl: page.url,
        html: page.html,
      });

      expect(snapshot.jsonLd).toHaveLength(1);
      expect(snapshot.jsonLd[0].data).toBeUndefined();
      expect(snapshot.jsonLd[0].parseError).toBeDefined();
      expect(snapshot.jsonLd[0].raw).toContain('JobPosting');
    });
  });
});
