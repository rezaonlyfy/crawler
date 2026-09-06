// Jest auto-mock for `@crawlee/playwright` (applied to every spec because it
// sits in <rootDir>/__mocks__). Unit tests must never launch a browser —
// specs exercise our pure mapping/handler logic instead. Real-site behavior
// is verified via `npm run cli -- inspect <url>`.

export class PlaywrightCrawler {
  constructor(_options?: unknown, _configuration?: unknown) {}

  run(): Promise<never> {
    return Promise.reject(
      new Error(
        '@crawlee/playwright is mocked in unit tests — the real engine only runs outside jest',
      ),
    );
  }
}
