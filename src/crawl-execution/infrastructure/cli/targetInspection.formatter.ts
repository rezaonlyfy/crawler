import { Injectable } from '@nestjs/common';
import { TargetInspection } from 'src/crawl-execution/application/useCase/inspectTarget/targetInspection';

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
    if (inspection.finalUrlEvaluation) {
      lines.push(
        inspection.finalUrlEvaluation.allowed
          ? 'redirect target: ALLOWED by crawl target policy'
          : `redirect target: REJECTED by crawl target policy (${inspection.finalUrlEvaluation.reason})`,
      );
    }

    return lines;
  }
}
