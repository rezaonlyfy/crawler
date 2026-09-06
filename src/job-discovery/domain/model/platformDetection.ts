// ATS/platform fingerprinting result (CRAWL-P1-008). Phase 1 only measures
// which platforms occur across the portfolio — no adapters, no routing.

export enum SitePlatform {
  PERSONIO = 'personio',
  GREENHOUSE = 'greenhouse',
  LEVER = 'lever',
  WORKDAY = 'workday',
  RECRUITEE = 'recruitee',
  SMARTRECRUITERS = 'smartrecruiters',
  UNKNOWN = 'unknown',
}

export enum DetectionConfidence {
  // The career site itself is hosted on the ATS's own domain.
  HIGH = 'high',
  // Strong embedded evidence: ATS iframe/script, or multiple job links
  // pointing at the ATS.
  MEDIUM = 'medium',
  // A single indirect hint, or ambiguous evidence across platforms.
  LOW = 'low',
  // UNKNOWN only — no signal at all.
  NONE = 'none',
}

export interface PlatformSignal {
  // What kind of evidence: hostname | iframe | script | link | marker | ambiguous
  signal: string;
  evidence: string;
}

export interface PlatformDetection {
  platform: SitePlatform;
  confidence: DetectionConfidence;
  signals: PlatformSignal[];
}
