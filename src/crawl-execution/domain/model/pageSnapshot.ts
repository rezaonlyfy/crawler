// Crawler-owned representation of a fetched page (CRAWL-P1-007).
// Discovery/extraction operate on this — never on Playwright types or raw
// framework objects. Built from captured HTML by an infrastructure adapter.

export enum LinkScope {
  INTERNAL = 'internal',
  EXTERNAL = 'external',
}

export interface SnapshotLink {
  // Absolute URL, resolved against the page's final URL, fragment stripped.
  url: string;
  anchorText: string;
  title?: string;
  // Text of the closest ancestor that says more than the anchor itself
  // (e.g. the job card around the link), capped for prompt/report use.
  surroundingText?: string;
  // Text of the nearest heading above the link in document order.
  nearbyHeading?: string;
  scope: LinkScope;
}

export interface SnapshotHeading {
  level: number;
  text: string;
}

export interface JsonLdBlock {
  raw: string;
  // Parsed JSON when the block is valid; malformed blocks keep the raw text
  // and a parseError instead of crashing the crawl.
  data?: unknown;
  parseError?: string;
}

export interface PageSnapshot {
  requestedUrl: string;
  finalUrl: string;
  canonicalUrl?: string;
  pageTitle?: string;
  // Text content with script/style/noscript/template/iframe removed and
  // whitespace collapsed. "Visible" is approximated from markup — CSS
  // visibility cannot be judged from captured HTML.
  visibleText: string;
  // Document order. Duplicate links are kept on purpose: repeated,
  // structurally similar links are a discovery signal.
  headings: SnapshotHeading[];
  links: SnapshotLink[];
  jsonLd: JsonLdBlock[];
  // meta[name]/meta[property] → content, first occurrence wins.
  metadata: Record<string, string>;
}
