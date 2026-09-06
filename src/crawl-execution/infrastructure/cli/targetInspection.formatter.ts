import { Injectable } from '@nestjs/common';
import { TargetInspection } from 'src/crawl-execution/application/useCase/inspectTarget/targetInspection';
import {
  LinkScope,
  PageSnapshot,
} from 'src/crawl-execution/domain/model/pageSnapshot';
import {
  PlatformDetection,
  SitePlatform,
} from 'src/job-discovery/domain/model/platformDetection';

@Injectable()
export class TargetInspectionFormatter {
  format(input: string, inspection: TargetInspection): string[] {
    if (!inspection.evaluation.allowed) {
      return [`REJECTED  ${input} (${inspection.evaluation.reason})`];
    }

    const visit = inspection.pageVisit;
    const lines = [
      `ALLOWED   ${inspection.evaluation.url.value}`,
      `requestedUrl: ${visit.requestedUrl}`,
      `finalUrl:     ${visit.finalUrl ?? '-'}`,
      `redirected:   ${visit.redirected ? 'yes' : 'no'}`,
      `title:        ${visit.title ?? '-'}`,
      `status:       ${visit.status}`,
      `httpStatus:   ${visit.httpStatus ?? '-'}`,
      `duration:     ${visit.durationMs}ms`,
      `retryCount:   ${visit.retryCount}`,
    ];

    if (visit.errorMessage) {
      lines.push(`error:        ${visit.errorMessage}`);
    }
    if (inspection.snapshot) {
      lines.push(...this.snapshotSummary(inspection.snapshot));
    }
    if (inspection.platformDetection) {
      lines.push(...this.platformSummary(inspection.platformDetection));
    }
    if (inspection.finalUrlEvaluation) {
      lines.push(
        inspection.finalUrlEvaluation.allowed
          ? 'redirect target: ALLOWED by crawl target policy'
          : `redirect target: REJECTED by crawl target policy (${inspection.finalUrlEvaluation.reason})`,
      );
    }

    return lines;
  }

  private platformSummary(detection: PlatformDetection): string[] {
    if (detection.platform === SitePlatform.UNKNOWN) {
      return ['platform:     unknown'];
    }
    const lines = [
      `platform:     ${detection.platform} (${detection.confidence} confidence)`,
    ];
    for (const signal of detection.signals) {
      lines.push(`  signal:     ${signal.signal}: ${signal.evidence}`);
    }
    return lines;
  }

  private snapshotSummary(snapshot: PageSnapshot): string[] {
    const internal = snapshot.links.filter(
      (link) => link.scope === LinkScope.INTERNAL,
    ).length;
    const malformed = snapshot.jsonLd.filter(
      (block) => block.parseError !== undefined,
    ).length;
    const lines = [
      `headings:     ${snapshot.headings.length}`,
      `links:        ${snapshot.links.length} (${internal} internal / ${
        snapshot.links.length - internal
      } external)`,
      `jsonLd:       ${snapshot.jsonLd.length} block(s), ${malformed} malformed`,
    ];
    if (snapshot.canonicalUrl) {
      lines.push(`canonicalUrl: ${snapshot.canonicalUrl}`);
    }
    return lines;
  }
}
