

export enum PageVisitStatus {
  SUCCESS = 'success',
  FAILED = 'failed',
  NOT_VISITED = 'not_visited',
}

export interface PageVisit {
  requestedUrl: string;
  finalUrl?: string;
  redirected: boolean;
  title?: string;
  html?: string;
  httpStatus?: number;
  status: PageVisitStatus;
  errorMessage?: string;
  retryCount: number;
  durationMs: number;
}


export interface CrawlEngineSettings {
  userAgent: string;
  maxConcurrency: number;
  maxRequestsPerSite: number;
  maxRequestsPerMinute: number;
  sameDomainDelaySeconds: number;
  navigationTimeoutSeconds: number;
  maxRequestRetries: number;
  respectRobotsTxt: boolean;
}

export interface CrawlEnginePort {
  visit(url: string): Promise<PageVisit>;
  visitAll(urls: string[]): Promise<PageVisit[]>;
}
