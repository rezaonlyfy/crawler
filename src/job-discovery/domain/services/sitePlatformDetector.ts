// Deterministic ATS/platform fingerprinting (CRAWL-P1-008). Pure domain
// logic over a PageSnapshot — no network, no AI. Confidence is deliberately
// conservative: HIGH only when the site is hosted on the ATS's own domain.
import { PageSnapshot } from 'src/crawl-execution/domain/model/pageSnapshot';
import {
  DetectionConfidence,
  PlatformDetection,
  PlatformSignal,
  SitePlatform,
} from 'src/job-discovery/domain/model/platformDetection';

const MAX_EVIDENCE_PER_SIGNAL = 3;

// Tier of the strongest evidence a candidate has. Maps to confidence.
const TIER_HOSTED = 3;
const TIER_EMBEDDED = 2;
const TIER_WEAK = 1;

interface Fingerprint {
  platform: SitePlatform;
  // Final hostname patterns — the site IS the ATS-hosted board.
  hosts: RegExp[];
  // Patterns matched against link/iframe/script URLs found on the page.
  urls: RegExp[];
  // Page markers matched against visible text.
  markers: RegExp[];
}

const FINGERPRINTS: Fingerprint[] = [
  {
    platform: SitePlatform.PERSONIO,
    hosts: [/(^|\.)jobs\.personio\.(de|com)$/],
    urls: [/jobs\.personio\.(de|com)\//i],
    markers: [/powered by personio/i],
  },
  {
    platform: SitePlatform.GREENHOUSE,
    hosts: [/^(job-)?boards(\.eu)?\.greenhouse\.io$/],
    urls: [/(job-)?boards(\.eu)?\.greenhouse\.io/i],
    markers: [],
  },
  {
    platform: SitePlatform.LEVER,
    hosts: [/^jobs(\.eu)?\.lever\.co$/],
    urls: [/(jobs|api)(\.eu)?\.lever\.co\//i],
    markers: [],
  },
  {
    platform: SitePlatform.WORKDAY,
    hosts: [/\.myworkday(jobs|site)\.com$/],
    urls: [/\.myworkday(jobs|site)\.com/i],
    markers: [],
  },
  {
    platform: SitePlatform.RECRUITEE,
    hosts: [/(^|\.)recruitee\.com$/],
    urls: [/\.recruitee\.com\//i],
    markers: [/powered by recruitee/i],
  },
  {
    platform: SitePlatform.SMARTRECRUITERS,
    hosts: [/^(careers|jobs)\.smartrecruiters\.com$/],
    urls: [/(jobs|careers|api)\.smartrecruiters\.com/i],
    markers: [],
  },
];

interface Candidate {
  platform: SitePlatform;
  tier: number;
  signals: PlatformSignal[];
}

export class SitePlatformDetector {
  detect(snapshot: PageSnapshot): PlatformDetection {
    const candidates = FINGERPRINTS.map((fingerprint) =>
      this.evaluate(fingerprint, snapshot),
    ).filter((candidate) => candidate.signals.length > 0);

    if (candidates.length === 0) {
      return {
        platform: SitePlatform.UNKNOWN,
        confidence: DetectionConfidence.NONE,
        signals: [],
      };
    }

    candidates.sort(
      (a, b) => b.tier - a.tier || b.signals.length - a.signals.length,
    );
    const [best, runnerUp] = candidates;

    if (
      runnerUp !== undefined &&
      runnerUp.tier === best.tier &&
      runnerUp.signals.length === best.signals.length
    ) {
      return {
        platform: best.platform,
        confidence: DetectionConfidence.LOW,
        signals: [
          ...best.signals,
          {
            signal: 'ambiguous',
            evidence: `equal evidence also matched ${runnerUp.platform}`,
          },
        ],
      };
    }

    return {
      platform: best.platform,
      confidence: this.confidenceOf(best.tier),
      signals: best.signals,
    };
  }

  private evaluate(
    fingerprint: Fingerprint,
    snapshot: PageSnapshot,
  ): Candidate {
    const signals: PlatformSignal[] = [];
    let tier = 0;

    const hostname = this.hostnameOf(snapshot.finalUrl);
    if (
      hostname &&
      fingerprint.hosts.some((pattern) => pattern.test(hostname))
    ) {
      signals.push({ signal: 'hostname', evidence: hostname });
      tier = TIER_HOSTED;
    }

    const iframeHits = this.matchUrls(snapshot.iframeSources, fingerprint);
    if (iframeHits.length > 0) {
      signals.push(...this.toSignals('iframe', iframeHits));
      tier = Math.max(tier, TIER_EMBEDDED);
    }

    const scriptHits = this.matchUrls(snapshot.scriptSources, fingerprint);
    if (scriptHits.length > 0) {
      signals.push(...this.toSignals('script', scriptHits));
      tier = Math.max(tier, TIER_EMBEDDED);
    }

    const linkHits = this.matchUrls(
      snapshot.links.map((link) => link.url),
      fingerprint,
    );
    if (linkHits.length > 0) {
      signals.push(...this.toSignals('link', linkHits));
      tier = Math.max(tier, linkHits.length >= 2 ? TIER_EMBEDDED : TIER_WEAK);
    }

    const marker = fingerprint.markers.find((pattern) =>
      pattern.test(snapshot.visibleText),
    );
    if (marker) {
      signals.push({ signal: 'marker', evidence: String(marker) });
      tier = Math.max(tier, TIER_WEAK);
    }

    return { platform: fingerprint.platform, tier, signals };
  }

  private matchUrls(urls: string[], fingerprint: Fingerprint): string[] {
    const hits = urls.filter((url) =>
      fingerprint.urls.some((pattern) => pattern.test(url)),
    );
    return [...new Set(hits)];
  }

  private toSignals(signal: string, hits: string[]): PlatformSignal[] {
    const evidence = hits
      .slice(0, MAX_EVIDENCE_PER_SIGNAL)
      .map((hit) => ({ signal, evidence: hit }));
    if (hits.length > MAX_EVIDENCE_PER_SIGNAL) {
      evidence.push({
        signal,
        evidence: `… and ${hits.length - MAX_EVIDENCE_PER_SIGNAL} more`,
      });
    }
    return evidence;
  }

  private confidenceOf(tier: number): DetectionConfidence {
    if (tier >= TIER_HOSTED) {
      return DetectionConfidence.HIGH;
    }
    if (tier >= TIER_EMBEDDED) {
      return DetectionConfidence.MEDIUM;
    }
    return DetectionConfidence.LOW;
  }

  private hostnameOf(url: string): string | undefined {
    try {
      return new URL(url).hostname.toLowerCase();
    } catch {
      return undefined;
    }
  }
}
