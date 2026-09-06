import { Injectable } from '@nestjs/common';
import { load } from 'cheerio';
import type { Cheerio, CheerioAPI } from 'cheerio';
import type { AnyNode, Element } from 'domhandler';
import {
  JsonLdBlock,
  LinkScope,
  PageSnapshot,
  SnapshotHeading,
  SnapshotLink,
} from 'src/crawl-execution/domain/model/pageSnapshot';
import {
  PageSnapshotBuilderPort,
  SnapshotSource,
} from 'src/crawl-execution/domain/ports/pageSnapshotBuilderPort';

const HEADING_SELECTOR = 'h1,h2,h3,h4,h5,h6';
const NON_CONTENT_SELECTOR = 'script,style,noscript,template,iframe';
const SKIPPED_HREF_SCHEMES = ['mailto:', 'tel:', 'javascript:', 'data:'];
const SURROUNDING_TEXT_MAX_LENGTH = 240;
const SURROUNDING_ANCESTOR_LEVELS = 3;

const normalize = (text: string): string => text.replace(/\s+/g, ' ').trim();

@Injectable()
export class CheerioPageSnapshotBuilderAdapter implements PageSnapshotBuilderPort {
  build(source: SnapshotSource): PageSnapshot {
    const $ = load(source.html);
    const baseUrl = source.finalUrl || source.requestedUrl;

    return {
      requestedUrl: source.requestedUrl,
      finalUrl: baseUrl,
      canonicalUrl: this.canonicalUrl($, baseUrl),
      pageTitle: normalize($('title').first().text()) || undefined,
      visibleText: this.visibleText($),
      headings: this.headings($),
      links: this.links($, baseUrl),
      jsonLd: this.jsonLdBlocks($),
      metadata: this.metadata($),
    };
  }

  private canonicalUrl($: CheerioAPI, baseUrl: string): string | undefined {
    const href = $('link[rel="canonical"]').first().attr('href');
    return href ? this.resolveUrl(href, baseUrl)?.href : undefined;
  }

  private visibleText($: CheerioAPI): string {
    // cheerio's load() always normalizes fragments into a full document,
    // so <body> is guaranteed to exist.
    const clone = $('body').clone();
    clone.find(NON_CONTENT_SELECTOR).remove();
    return normalize(clone.text());
  }

  private headings($: CheerioAPI): SnapshotHeading[] {
    const headings: SnapshotHeading[] = [];
    $(HEADING_SELECTOR).each((_, el) => {
      const text = normalize($(el).text());
      if (text) {
        headings.push({ level: Number(el.name.charAt(1)), text });
      }
    });
    return headings;
  }

  // One pass over headings and anchors in document order, so every link
  // knows the nearest heading above it. An anchor sitting inside a heading
  // (job cards: <h2><a>…</a></h2>) gets the previous heading — its own
  // heading text is just the anchor text again.
  private links($: CheerioAPI, baseUrl: string): SnapshotLink[] {
    const links: SnapshotLink[] = [];
    let lastHeading: { text: string; el: Element } | undefined;
    let previousHeading: { text: string; el: Element } | undefined;

    $(`${HEADING_SELECTOR},a[href]`).each((_, el) => {
      if (el.name !== 'a') {
        const text = normalize($(el).text());
        if (text) {
          previousHeading = lastHeading;
          lastHeading = { text, el };
        }
        return;
      }

      const link = this.toLink($, el, baseUrl);
      if (!link) {
        return;
      }

      const containingHeading = $(el).closest(HEADING_SELECTOR);
      const insideLastHeading =
        containingHeading.length > 0 &&
        lastHeading !== undefined &&
        containingHeading[0] === lastHeading.el;
      const heading = insideLastHeading ? previousHeading : lastHeading;
      if (heading) {
        link.nearbyHeading = heading.text;
      }
      links.push(link);
    });

    return links;
  }

  private toLink(
    $: CheerioAPI,
    el: Element,
    baseUrl: string,
  ): SnapshotLink | undefined {
    const href = ($(el).attr('href') || '').trim();
    if (
      !href ||
      SKIPPED_HREF_SCHEMES.some((scheme) =>
        href.toLowerCase().startsWith(scheme),
      )
    ) {
      return undefined;
    }

    const resolved = this.resolveUrl(href, baseUrl);
    if (!resolved) {
      return undefined;
    }
    resolved.hash = '';

    const anchorText = this.anchorText($, el);
    const link: SnapshotLink = {
      url: resolved.toString().replace(/#$/, ''),
      anchorText,
      scope: this.scopeOf(resolved, baseUrl),
    };

    const title = $(el).attr('title');
    if (title) {
      link.title = title;
    }
    const surroundingText = this.surroundingText($, el, anchorText);
    if (surroundingText) {
      link.surroundingText = surroundingText;
    }
    return link;
  }

  private anchorText($: CheerioAPI, el: Element): string {
    return (
      normalize($(el).text()) ||
      normalize($(el).attr('aria-label') || '') ||
      normalize($(el).find('img[alt]').first().attr('alt') || '') ||
      normalize($(el).attr('title') || '')
    );
  }

  // Walk up a few ancestors until one adds context beyond the anchor text
  // itself (typically the surrounding job card). Ancestors are cloned and
  // stripped of script/style content — inline <style> blocks otherwise leak
  // CSS into the context text (seen on real Personio pages).
  private surroundingText(
    $: CheerioAPI,
    el: Element,
    anchorText: string,
  ): string | undefined {
    let ancestor: Cheerio<AnyNode> = $(el).parent();
    for (
      let level = 0;
      level < SURROUNDING_ANCESTOR_LEVELS && ancestor.length > 0;
      level += 1
    ) {
      const clone = ancestor.clone();
      clone.find(NON_CONTENT_SELECTOR).remove();
      const text = normalize(clone.text());
      if (text.length > anchorText.length + 3) {
        return text.slice(0, SURROUNDING_TEXT_MAX_LENGTH);
      }
      ancestor = ancestor.parent();
    }
    return undefined;
  }

  private jsonLdBlocks($: CheerioAPI): JsonLdBlock[] {
    const blocks: JsonLdBlock[] = [];
    $('script[type]').each((_, el) => {
      const type = ($(el).attr('type') || '').trim().toLowerCase();
      if (type !== 'application/ld+json') {
        return;
      }
      const raw = ($(el).text() || '').trim();
      if (!raw) {
        return;
      }
      try {
        blocks.push({ raw, data: JSON.parse(raw) as unknown });
      } catch (error) {
        blocks.push({
          raw,
          parseError: error instanceof Error ? error.message : String(error),
        });
      }
    });
    return blocks;
  }

  private metadata($: CheerioAPI): Record<string, string> {
    const metadata: Record<string, string> = {};
    $('meta').each((_, el) => {
      const key = $(el).attr('name') || $(el).attr('property');
      const content = $(el).attr('content');
      if (key && content !== undefined && metadata[key] === undefined) {
        metadata[key] = content;
      }
    });
    return metadata;
  }

  private resolveUrl(href: string, baseUrl: string): URL | undefined {
    try {
      const url = new URL(href, baseUrl);
      return url.protocol === 'http:' || url.protocol === 'https:'
        ? url
        : undefined;
    } catch {
      return undefined;
    }
  }

  // Internal = same host, or a subdomain relationship (careers.acme.com is
  // internal to acme.com and vice versa). No public-suffix handling in
  // Phase 1 — good enough for career sites, documented trade-off.
  private scopeOf(url: URL, baseUrl: string): LinkScope {
    const base = new URL(baseUrl).hostname.toLowerCase();
    const host = url.hostname.toLowerCase();
    const internal =
      host === base || host.endsWith(`.${base}`) || base.endsWith(`.${host}`);
    return internal ? LinkScope.INTERNAL : LinkScope.EXTERNAL;
  }
}
