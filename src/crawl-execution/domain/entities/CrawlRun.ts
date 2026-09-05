import { RejectionReason } from 'src/crawl-execution/domain/services/crawlTargetPolicy';

export enum TargetVerdict {
  ACCEPTED = 'accepted',
  DUPLICATE = 'duplicate',
  REJECTED = 'rejected',
}

export type AcceptedTarget = {
  verdict: TargetVerdict.ACCEPTED;
  input: string;
  normalizedUrl: string;
  siteRunId: string;
};

export type DuplicateTarget = {
  verdict: TargetVerdict.DUPLICATE;
  input: string;
  normalizedUrl: string;
  duplicateOfSiteRunId: string;
};

export type RejectedTarget = {
  verdict: TargetVerdict.REJECTED;
  input: string;
  reason: RejectionReason;
};

export type TargetDiagnostic =
  AcceptedTarget | DuplicateTarget | RejectedTarget;

export type SiteRun = {
  siteRunId: string;
  targetUrl: string;
};

export type CrawlRunSummary = {
  validTargets: number;
  duplicates: number;
  rejectedTargets: number;
};

export type CrawlRunProps = {
  runId: string;
  createdAt: Date;
  diagnostics: TargetDiagnostic[];
  siteRuns: SiteRun[];
};

// Domain entity: identity is the runId. Not persisted yet — no database in
// Phase 1 (CRAWL-P1-003); a persistence base class comes only when runs are
// actually stored.
export class CrawlRun {
  private constructor(public readonly props: CrawlRunProps) {}

  public static create(props: CrawlRunProps): CrawlRun {
    return new this(props);
  }

  getRunId(): string {
    return this.props.runId;
  }

  getCreatedAt(): Date {
    return this.props.createdAt;
  }

  getDiagnostics(): TargetDiagnostic[] {
    return this.props.diagnostics;
  }

  getSiteRuns(): SiteRun[] {
    return this.props.siteRuns;
  }

  getSummary(): CrawlRunSummary {
    return {
      validTargets: this.count(TargetVerdict.ACCEPTED),
      duplicates: this.count(TargetVerdict.DUPLICATE),
      rejectedTargets: this.count(TargetVerdict.REJECTED),
    };
  }

  hasValidTargets(): boolean {
    return this.props.siteRuns.length > 0;
  }

  private count(verdict: TargetVerdict): number {
    return this.props.diagnostics.filter((d) => d.verdict === verdict).length;
  }
}
