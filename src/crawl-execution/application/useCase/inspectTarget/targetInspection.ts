import { PageVisit } from 'src/crawl-execution/domain/ports/crawlEnginePort';
import { TargetEvaluation } from 'src/crawl-execution/domain/services/crawlTargetPolicy';

// Result of inspecting one URL: the policy verdict, and — when the target
// was allowed — the live page visit. A redirect's destination is re-checked
// against the same policy (the fetch-time hook from CRAWL-P1-004).
export interface TargetInspection {
  evaluation: TargetEvaluation;
  pageVisit?: PageVisit;
  finalUrlEvaluation?: TargetEvaluation;
}
