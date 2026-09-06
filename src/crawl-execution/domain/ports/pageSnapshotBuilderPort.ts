import { PageSnapshot } from 'src/crawl-execution/domain/model/pageSnapshot';

// Input is captured page state (already rendered where rendering was
// needed) — building from the HTML string keeps the builder usable against
// saved fixtures without a browser.
export interface SnapshotSource {
  requestedUrl: string;
  finalUrl: string;
  html: string;
}

export interface PageSnapshotBuilderPort {
  build(source: SnapshotSource): PageSnapshot;
}
