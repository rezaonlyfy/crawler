// Turns a raw list of input URLs into a planned CrawlRun.
// Batch-input policy (CRAWL-P1-004): continue-on-invalid — invalid and
// duplicate inputs are diagnosed and skipped; every valid target gets its
// own SiteRun. Duplicates are detected on the normalized URL.
import {
  CrawlRun,
  SiteRun,
  TargetDiagnostic,
  TargetVerdict,
} from 'src/crawl-execution/domain/entities/CrawlRun';
import { CrawlTargetPolicy } from 'src/crawl-execution/domain/services/crawlTargetPolicy';
import { ClockPort } from 'src/shared/domain/ports/clockPort';
import { IdGeneratorPort } from 'src/shared/domain/ports/idGeneratorPort';

export class CrawlRunPlanner {
  constructor(
    private readonly crawlTargetPolicy: CrawlTargetPolicy,
    private readonly idGenerator: IdGeneratorPort,
    private readonly clock: ClockPort,
  ) {}

  plan(inputUrls: string[]): CrawlRun {
    const runId = this.idGenerator.generate();
    const diagnostics: TargetDiagnostic[] = [];
    const siteRuns: SiteRun[] = [];
    const plannedByUrl = new Map<string, string>();

    for (const input of inputUrls) {
      diagnostics.push(this.diagnose(input, plannedByUrl, siteRuns));
    }

    return CrawlRun.create({
      runId,
      createdAt: this.clock.now(),
      diagnostics,
      siteRuns,
    });
  }

  private diagnose(
    input: string,
    plannedByUrl: Map<string, string>,
    siteRuns: SiteRun[],
  ): TargetDiagnostic {
    const evaluation = this.crawlTargetPolicy.evaluate(input);

    if (!evaluation.allowed) {
      return {
        verdict: TargetVerdict.REJECTED,
        input,
        reason: evaluation.reason,
      };
    }

    const normalizedUrl = evaluation.url.value;
    const duplicateOfSiteRunId = plannedByUrl.get(normalizedUrl);
    if (duplicateOfSiteRunId !== undefined) {
      return {
        verdict: TargetVerdict.DUPLICATE,
        input,
        normalizedUrl,
        duplicateOfSiteRunId,
      };
    }

    const siteRunId = this.idGenerator.generate();
    plannedByUrl.set(normalizedUrl, siteRunId);
    siteRuns.push({ siteRunId, targetUrl: normalizedUrl });
    return {
      verdict: TargetVerdict.ACCEPTED,
      input,
      normalizedUrl,
      siteRunId,
    };
  }
}
