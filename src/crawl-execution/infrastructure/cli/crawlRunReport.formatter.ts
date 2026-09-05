import { Injectable } from '@nestjs/common';
import {
  CrawlRun,
  TargetDiagnostic,
  TargetVerdict,
} from 'src/crawl-execution/domain/entities/CrawlRun';

@Injectable()
export class CrawlRunReportFormatter {
  format(crawlRun: CrawlRun): string[] {
    const { validTargets, duplicates, rejectedTargets } = crawlRun.getSummary();
    return [
      `runId: ${crawlRun.getRunId()}`,
      ...crawlRun
        .getDiagnostics()
        .map((diagnostic) => this.formatLine(diagnostic)),
      `${validTargets} valid target(s), ${duplicates} duplicate(s), ` +
        `${rejectedTargets} rejected target(s)`,
    ];
  }

  private formatLine(diagnostic: TargetDiagnostic): string {
    switch (diagnostic.verdict) {
      case TargetVerdict.ACCEPTED:
        return `ACCEPTED  ${diagnostic.input} → siteRunId ${diagnostic.siteRunId}`;
      case TargetVerdict.DUPLICATE:
        return `DUPLICATE ${diagnostic.input} (already planned as siteRunId ${diagnostic.duplicateOfSiteRunId})`;
      case TargetVerdict.REJECTED:
        return `REJECTED  ${diagnostic.input} (${diagnostic.reason})`;
      default:
        return `UNKNOWN   ${JSON.stringify(diagnostic)}`;
    }
  }
}
