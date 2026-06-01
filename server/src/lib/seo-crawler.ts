/**
 * SEO Self-Crawler Engine
 * Crawls a site, extracts all SEO data, detects issues.
 */

// ── Logger ──
function log(level: string, msg: string, data?: any) {
  const ts = new Date().toISOString();
  const line = `[${ts}] [SEO] [${level}] ${msg}${data ? ' ' + JSON.stringify(data) : ''}`;
  console.log(line);
}

// ── Crawl progress callback type ──
export type CrawlProgressCallback = (done: number, total: number, url: string) => void;

// ── Types ──
export interface CrawlPage {
  url: string;
  path: string;
  httpStatus: number;
  responseTimeMs: number;
  pageSizeBytes: number;
  contentType: string;
  title: string;
  titleLength: number;
  metaDescription: string;
  metaDescLength: number;
  h1: string;
  h1Count: number;
  h2Count: number;
  h3Count: number;
  h4Count: number;
  h5Count: number;
  h6Count: number;
  canonical: string;
  isSelfCanonical: boolean;
  robotsMeta: string;
  hasNoindex: boolean;
  hasNofollow: boolean;
  htmlLang: string;
  viewportMeta: boolean;
  wordCount: number;
  ogTitle: string;
  ogDescription: string;
  ogImage: string;
  ogUrl: string;
  ogType: string;
  ogLocale: string;
  twitterCard: string;
  twitterTitle: string;
  twitterDescription: string;
  twitterImage: string;
  twitterCreator: string;
  hasStructuredData: boolean;
  structuredDataTypes: string[];
  links: LinkEntry[];
  images: ImageEntry[];
  hreflangs: HreflangEntry[];
}

export interface LinkEntry {
  url: string;
  anchorText: string;
  isInternal: boolean;
  isNofollow: boolean;
}

export interface ImageEntry {
  url: string;
  altText: string;
  hasAlt: boolean;
  isLazyLoaded: boolean;
  format: string;
}

export interface HreflangEntry {
  lang: string;
  url: string;
}

export interface CrawlIssue {
  pageUrl: string;
  category: string;
  severity: 'critical' | 'high' | 'medium' | 'low' | 'notice';
  title: string;
  description: string;
  recommendation: string;
}

export interface CrawlResult {
  pages: CrawlPage[];
  issues: CrawlIssue[];
  sitemapUrls: string[];
  robotsContent: string | null;
  redirects: RedirectChain[];
}

export interface RedirectChain {
  sourceUrl: string;
  chain: { url: string; status: number }[];
  chainLength: number;
  finalUrl: string;
  finalStatus: number;
  isLoop: boolean;
}

// ── Constants ──
const MAX_PAGES = 200;
const MAX_REDIRECT_HOPS = 5;
const REQUEST_DELAY_MS = 500;  // reduced from 1000 since we filter junk URLs now
const REQUEST_TIMEOUT_MS = 15000;  // reduced from 30000 — most pages respond fast

// ── Helpers ──

function normalizeUrl(baseUrl: string, href: string): string {
  if (!href || href.startsWith('#') || href.startsWith('javascript:') || href.startsWith('mailto:') || href.startsWith('tel:')) return '';
  try {
    if (href.startsWith('//')) return new URL(`https:${href}`).href;
    if (href.startsWith('/')) return new URL(href, baseUrl).href;
    if (href.startsWith('http')) return href;
    return new URL(href, baseUrl).href;
  } catch {
    return '';
  }
}

function isInternalUrl(url: string, baseOrigin: string): boolean {
  try {
    return new URL(url).origin === baseOrigin;
  } catch {
    return false;
  }
}

function getPath(url: string): string {
  try {
    return new URL(url).pathname;
  } catch {
    return url;
  }
}

function getOrigin(url: string): string {
  try {
    return new URL(url).origin;
  } catch {
    return url;
  }
}

function htmlDecode(text: string): string {
  return text
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ');
}

function extractAttr(html: string, selector: string): string {
  const match = html.match(selector);
  return match ? htmlDecode(match[1] || match[2] || '') : '';
}

function extractAllMatches(html: string, pattern: string): string[] {
  const matches: string[] = [];
  const regex = new RegExp(pattern, 'gi');
  let m;
  while ((m = regex.exec(html)) !== null) {
    matches.push(htmlDecode(m[1] || ''));
  }
  return matches;
}

function countMatches(html: string, tag: string): number {
  const regex = new RegExp(`<${tag}[\\s>]`, 'gi');
  const matches = html.match(regex);
  return matches ? matches.length : 0;
}

// ── HTML Parser ──

function parseHtml(html: string, pageUrl: string, baseOrigin: string): CrawlPage {
  const url = pageUrl;
  const path = getPath(url);

  // Title
  const title = extractAttr(html, /<title[^>]*>([\s\S]*?)<\/title>/i).trim();
  const titleLength = title.length;

  // Meta description
  const metaDescription = extractAttr(html, /<meta\s+(?:name|property)=["']?description["']?\s+content=["']?([^"'>]+)/i).trim();
  const metaDescLength = metaDescription.length;

  // Canonical
  const canonical = extractAttr(html, /<link\s+rel=["']?canonical["']?\s+href=["']?([^"'>]+)/i);
  const isSelfCanonical = canonical ? (normalizeUrl(baseOrigin, canonical) === url || canonical === url || canonical === path || canonical === '/') : false;

  // Robots meta
  const robotsMeta = extractAttr(html, /<meta\s+name=["']?robots["']?\s+content=["']?([^"'>]+)/i).toLowerCase();
  const hasNoindex = robotsMeta.includes('noindex');
  const hasNofollow = robotsMeta.includes('nofollow');

  // HTML lang
  const htmlLangMatch = html.match(/<html[^>]*\slang=["']?([^"'> ]+)/i);
  const htmlLang = htmlLangMatch ? htmlLangMatch[1].toLowerCase() : '';

  // Viewport
  const viewportMeta = /<meta\s+name=["']viewport["']/i.test(html);

  // H1
  const h1Matches = extractAllMatches(html, /<h1[^>]*>([\s\S]*?)<\/h1>/i).map(s => s.replace(/<[^>]+>/g, '').trim());
  const h1 = h1Matches[0] || '';
  const h1Count = h1Matches.length;

  const h2Count = countMatches(html, 'h2');
  const h3Count = countMatches(html, 'h3');
  const h4Count = countMatches(html, 'h4');
  const h5Count = countMatches(html, 'h5');
  const h6Count = countMatches(html, 'h6');

  // Word count — strip tags, count words
  const textContent = html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  const wordCount = textContent.split(/\s+/).filter(w => w.length > 0).length;

  // Open Graph
  const ogTitle = extractAttr(html, /<meta\s+property=["']og:title["']\s+content=["']?([^"'>]+)/i);
  const ogDescription = extractAttr(html, /<meta\s+property=["']og:description["']\s+content=["']?([^"'>]+)/i);
  const ogImage = extractAttr(html, /<meta\s+property=["']og:image["']\s+content=["']?([^"'>]+)/i);
  const ogUrl = extractAttr(html, /<meta\s+property=["']og:url["']\s+content=["']?([^"'>]+)/i);
  const ogType = extractAttr(html, /<meta\s+property=["']og:type["']\s+content=["']?([^"'>]+)/i);
  const ogLocale = extractAttr(html, /<meta\s+property=["']og:locale["']\s+content=["']?([^"'>]+)/i);

  // Twitter Card
  const twitterCard = extractAttr(html, /<meta\s+name=["']twitter:card["']\s+content=["']?([^"'>]+)/i);
  const twitterTitle = extractAttr(html, /<meta\s+name=["']twitter:title["']\s+content=["']?([^"'>]+)/i);
  const twitterDescription = extractAttr(html, /<meta\s+name=["']twitter:description["']\s+content=["']?([^"'>]+)/i);
  const twitterImage = extractAttr(html, /<meta\s+name=["']twitter:image["']\s+content=["']?([^"'>]+)/i);
  const twitterCreator = extractAttr(html, /<meta\s+name=["']twitter:creator["']\s+content=["']?([^"'>]+)/i);

  // Structured data
  const jsonLdMatches = extractAllMatches(html, /<script\s+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/i);
  let hasStructuredData = jsonLdMatches.length > 0;
  const structuredDataTypes: string[] = [];
  for (const ld of jsonLdMatches) {
    try {
      const parsed = JSON.parse(ld.trim());
      const types = Array.isArray(parsed) ? parsed.map((item: any) => item?.['@type'] || '').filter(Boolean) : [parsed?.['@type'] || ''];
      structuredDataTypes.push(...types);
    } catch {
      hasStructuredData = true;
      structuredDataTypes.push('invalid-json');
    }
  }

  // Links
  const linkRegex = /<a\s+([^>]*?)href=["']?([^"'> ]+)["']?([^>]*?)>([\s\S]*?)<\/a>/gi;
  const links: LinkEntry[] = [];
  let linkMatch;
  while ((linkMatch = linkRegex.exec(html)) !== null) {
    const attrs = (linkMatch[1] + ' ' + linkMatch[3]).toLowerCase();
    const href = linkMatch[2];
    const anchorText = linkMatch[4].replace(/<[^>]+>/g, '').trim();
    const resolved = normalizeUrl(baseOrigin, href);
    if (!resolved) continue;
    links.push({
      url: resolved,
      anchorText,
      isInternal: isInternalUrl(resolved, baseOrigin),
      isNofollow: attrs.includes('rel=') && attrs.includes('nofollow'),
    });
  }

  // Images
  const imgRegex = /<img\s+([^>]*?)\/?>/gi;
  const images: ImageEntry[] = [];
  let imgMatch;
  while ((imgMatch = imgRegex.exec(html)) !== null) {
    const attrs = imgMatch[1];
    const srcMatch = attrs.match(/\bsrc=["']?([^"'> ]+)/i);
    const altMatch = attrs.match(/\balt=["']?([^"'>]*)/i);
    const src = srcMatch ? srcMatch[1] : '';
    const altText = altMatch ? htmlDecode(altMatch[1]).trim() : '';
    const resolved = normalizeUrl(baseOrigin, src);
    if (!resolved) continue;
    const formatMatch = resolved.match(/\.(webp|avif|png|jpg|jpeg|gif|svg|ico)(\?|$)/i);
    images.push({
      url: resolved,
      altText,
      hasAlt: altMatch !== null && altText.length > 0,
      isLazyLoaded: /\bloading=["']?lazy["']?/i.test(attrs) || /\bdata-src=/i.test(attrs),
      format: formatMatch ? formatMatch[1].toLowerCase() : '',
    });
  }

  // Hreflang
  const hreflangRegex = /<link\s+rel=["']?alternate["']?\s+hreflang=["']?([^"'> ]+)["']?\s+href=["']?([^"'> ]+)["']?/gi;
  const hreflangs: HreflangEntry[] = [];
  let hlMatch;
  while ((hlMatch = hreflangRegex.exec(html)) !== null) {
    const lang = hlMatch[1].toLowerCase();
    const resolved = normalizeUrl(baseOrigin, hlMatch[2]);
    if (resolved) {
      hreflangs.push({ lang, url: resolved });
    }
  }

  return {
    url, path,
    httpStatus: 200,
    responseTimeMs: 0,
    pageSizeBytes: html.length,
    contentType: '',
    title, titleLength,
    metaDescription, metaDescLength,
    h1, h1Count,
    h2Count, h3Count, h4Count, h5Count, h6Count,
    canonical, isSelfCanonical,
    robotsMeta, hasNoindex, hasNofollow,
    htmlLang, viewportMeta,
    wordCount,
    ogTitle, ogDescription, ogImage, ogUrl, ogType, ogLocale,
    twitterCard, twitterTitle, twitterDescription, twitterImage, twitterCreator,
    hasStructuredData, structuredDataTypes,
    links, images, hreflangs,
  };
}

// ── Issue Detection ──

function detectIssues(page: CrawlPage, baseOrigin: string): CrawlIssue[] {
  const issues: CrawlIssue[] = [];
  const url = page.url;

  // Critical: 4xx/5xx
  if (page.httpStatus >= 500) {
    issues.push({ pageUrl: url, category: 'technical', severity: 'critical', title: `Server error ${page.httpStatus}`, description: `Page returns HTTP ${page.httpStatus}`, recommendation: 'Fix server-side error. Check server logs.' });
  } else if (page.httpStatus === 404) {
    issues.push({ pageUrl: url, category: 'technical', severity: 'critical', title: 'Page not found (404)', description: 'Page returns HTTP 404', recommendation: 'Restore the page or set up a 301 redirect to a relevant page.' });
  } else if (page.httpStatus >= 400) {
    issues.push({ pageUrl: url, category: 'technical', severity: 'high', title: `Client error ${page.httpStatus}`, description: `Page returns HTTP ${page.httpStatus}`, recommendation: 'Fix the client error or redirect to a valid page.' });
  }

  // Critical: redirect loop
  if (page.httpStatus >= 300 && page.httpStatus < 400) {
    // handled by redirect chain detector
  }

  // High: Missing title
  if (!page.title) {
    issues.push({ pageUrl: url, category: 'content', severity: 'high', title: 'Missing page title', description: 'No <title> tag found', recommendation: 'Add a unique, descriptive title tag (50-60 characters).' });
  } else if (page.titleLength < 20) {
    issues.push({ pageUrl: url, category: 'content', severity: 'high', title: 'Title too short', description: `Title is ${page.titleLength} characters (recommended: 50-60)`, recommendation: 'Expand the title to 50-60 characters with relevant keywords.' });
  } else if (page.titleLength > 70) {
    issues.push({ pageUrl: url, category: 'content', severity: 'high', title: 'Title too long', description: `Title is ${page.titleLength} characters (recommended: 50-60)`, recommendation: 'Shorten the title to 50-60 characters to avoid truncation in SERPs.' });
  }

  // High: Missing meta description
  if (!page.metaDescription) {
    issues.push({ pageUrl: url, category: 'content', severity: 'high', title: 'Missing meta description', description: 'No meta description found', recommendation: 'Add a compelling meta description (150-160 characters).' });
  } else if (page.metaDescLength < 70) {
    issues.push({ pageUrl: url, category: 'content', severity: 'medium', title: 'Meta description too short', description: `Meta description is ${page.metaDescLength} characters (recommended: 150-160)`, recommendation: 'Expand the meta description to 150-160 characters.' });
  } else if (page.metaDescLength > 170) {
    issues.push({ pageUrl: url, category: 'content', severity: 'medium', title: 'Meta description too long', description: `Meta description is ${page.metaDescLength} characters (recommended: 150-160)`, recommendation: 'Shorten the meta description to 150-160 characters.' });
  }

  // High: Missing H1
  if (!page.h1) {
    issues.push({ pageUrl: url, category: 'content', severity: 'high', title: 'Missing H1 tag', description: 'No H1 heading found on the page', recommendation: 'Add a single H1 tag that describes the page content.' });
  } else if (page.h1Count > 1) {
    issues.push({ pageUrl: url, category: 'content', severity: 'high', title: 'Multiple H1 tags', description: `Found ${page.h1Count} H1 tags (should be exactly 1)`, recommendation: 'Consolidate into a single H1 tag. Use H2-H6 for subheadings.' });
  }

  // High: Thin content
  if (page.wordCount < 300) {
    issues.push({ pageUrl: url, category: 'content', severity: 'high', title: 'Thin content', description: `Page has only ${page.wordCount} words (recommended: 300+)`, recommendation: 'Add more valuable content to reach at least 300 words.' });
  }

  // High: Missing canonical
  if (!page.canonical && page.httpStatus === 200) {
    issues.push({ pageUrl: url, category: 'technical', severity: 'high', title: 'Missing canonical tag', description: 'No rel=canonical link found', recommendation: 'Add a self-referencing canonical tag to prevent duplicate content issues.' });
  }

  // High: Canonical points elsewhere
  if (page.canonical && !page.isSelfCanonical && page.httpStatus === 200) {
    issues.push({ pageUrl: url, category: 'technical', severity: 'high', title: 'Canonical points to different page', description: `Canonical URL (${page.canonical}) does not match current page`, recommendation: 'Ensure the canonical tag points to the preferred version of this page.' });
  }

  // Medium: Noindex
  if (page.hasNoindex) {
    issues.push({ pageUrl: url, category: 'technical', severity: 'medium', title: 'Page has noindex directive', description: 'Robots meta tag includes noindex', recommendation: 'Remove noindex if you want this page to be indexed by search engines.' });
  }

  // Medium: Missing OG tags
  if (!page.ogTitle) issues.push({ pageUrl: url, category: 'social', severity: 'medium', title: 'Missing og:title', description: 'No Open Graph title tag', recommendation: 'Add og:title meta tag for better social sharing.' });
  if (!page.ogDescription) issues.push({ pageUrl: url, category: 'social', severity: 'medium', title: 'Missing og:description', description: 'No Open Graph description tag', recommendation: 'Add og:description meta tag.' });
  if (!page.ogImage) issues.push({ pageUrl: url, category: 'social', severity: 'medium', title: 'Missing og:image', description: 'No Open Graph image tag', recommendation: 'Add og:image meta tag (1200x630px recommended).' });
  if (!page.ogUrl) issues.push({ pageUrl: url, category: 'social', severity: 'low', title: 'Missing og:url', description: 'No Open Graph URL tag', recommendation: 'Add og:url meta tag.' });

  // Medium: Missing Twitter Card
  if (!page.twitterCard) issues.push({ pageUrl: url, category: 'social', severity: 'medium', title: 'Missing twitter:card', description: 'No Twitter Card type specified', recommendation: 'Add twitter:card meta tag (summary or summary_large_image).' });
  if (!page.twitterTitle) issues.push({ pageUrl: url, category: 'social', severity: 'low', title: 'Missing twitter:title', description: 'No Twitter title tag', recommendation: 'Add twitter:title meta tag.' });
  if (!page.twitterDescription) issues.push({ pageUrl: url, category: 'social', severity: 'low', title: 'Missing twitter:description', description: 'No Twitter description tag', recommendation: 'Add twitter:description meta tag.' });
  if (!page.twitterImage) issues.push({ pageUrl: url, category: 'social', severity: 'low', title: 'Missing twitter:image', description: 'No Twitter image tag', recommendation: 'Add twitter:image meta tag.' });

  // Medium: Missing viewport
  if (!page.viewportMeta) {
    issues.push({ pageUrl: url, category: 'technical', severity: 'medium', title: 'Missing viewport meta tag', description: 'No viewport meta tag found', recommendation: 'Add <meta name="viewport" content="width=device-width, initial-scale=1"> for mobile responsiveness.' });
  }

  // Medium: Missing HTML lang
  if (!page.htmlLang) {
    issues.push({ pageUrl: url, category: 'technical', severity: 'medium', title: 'Missing HTML lang attribute', description: 'No lang attribute on <html> tag', recommendation: 'Add lang attribute (e.g., lang="en") to the <html> tag.' });
  }

  // Medium: Missing structured data
  if (!page.hasStructuredData) {
    issues.push({ pageUrl: url, category: 'technical', severity: 'low', title: 'No structured data', description: 'No JSON-LD structured data found', recommendation: 'Add schema.org structured data (Article, WebPage, etc.) for rich snippets.' });
  }

  // Medium: Slow response time
  if (page.responseTimeMs > 2500) {
    issues.push({ pageUrl: url, category: 'performance', severity: 'medium', title: 'Slow page load', description: `Response time: ${page.responseTimeMs}ms (recommended: < 2500ms)`, recommendation: 'Optimize server response time, enable caching, reduce page size.' });
  }

  // Medium: Large page size
  if (page.pageSizeBytes > 500000) {
    issues.push({ pageUrl: url, category: 'performance', severity: 'medium', title: 'Large page size', description: `Page size: ${(page.pageSizeBytes / 1024).toFixed(0)}KB`, recommendation: 'Reduce page size by compressing images, minifying CSS/JS, and removing unnecessary content.' });
  }

  // Low: URL structure
  if (/[A-Z]/.test(page.path) && page.path !== '/') {
    issues.push({ pageUrl: url, category: 'technical', severity: 'low', title: 'URL contains uppercase letters', description: `Path: ${page.path}`, recommendation: 'Use lowercase URLs for consistency.' });
  }
  if (page.path.includes('_')) {
    issues.push({ pageUrl: url, category: 'technical', severity: 'low', title: 'URL contains underscores', description: `Path: ${page.path}`, recommendation: 'Use hyphens instead of underscores in URLs.' });
  }

  // Images without alt
  const imgsWithoutAlt = page.images.filter(img => !img.hasAlt);
  if (imgsWithoutAlt.length > 0) {
    issues.push({ pageUrl: url, category: 'images', severity: 'medium', title: `${imgsWithoutAlt.length} images missing alt text`, description: `${imgsWithoutAlt.length} of ${page.images.length} images have no alt attribute`, recommendation: 'Add descriptive alt text to all images for accessibility and SEO.' });
  }

  // Images not lazy loaded
  const imgsNotLazy = page.images.filter(img => !img.isLazyLoaded);
  if (imgsNotLazy.length > 3) {
    issues.push({ pageUrl: url, category: 'images', severity: 'low', title: `${imgsNotLazy.length} images not lazy loaded`, description: 'Images below the fold should use loading="lazy"', recommendation: 'Add loading="lazy" to images that are not immediately visible.' });
  }

  // Hreflang issues
  if (page.hreflangs.length > 0) {
    const hasSelfRef = page.hreflangs.some(hl => normalizeUrl(baseOrigin, hl.url) === url);
    if (!hasSelfRef) {
      issues.push({ pageUrl: url, category: 'hreflang', severity: 'high', title: 'Missing self-referencing hreflang', description: 'Page has hreflang but none points to itself', recommendation: 'Add a self-referencing hreflang annotation.' });
    }
    const hasXDefault = page.hreflangs.some(hl => hl.lang === 'x-default');
    if (!hasXDefault) {
      issues.push({ pageUrl: url, category: 'hreflang', severity: 'medium', title: 'Missing x-default hreflang', description: 'No x-default hreflang found', recommendation: 'Add x-default hreflang for pages with multiple language versions.' });
    }
  }

  // Broken internal links (detected later after all pages are crawled)
  // Orphan pages (detected later)

  return issues;
}

// ── Redirect Chain Detector ──

async function detectRedirectChain(url: string, baseOrigin: string): Promise<RedirectChain | null> {
  const chain: { url: string; status: number }[] = [];
  const visited = new Set<string>();
  let current = url;
  let hops = 0;

  while (hops < MAX_REDIRECT_HOPS) {
    if (visited.has(current)) {
      return {
        sourceUrl: url,
        chain,
        chainLength: hops,
        finalUrl: current,
        finalStatus: 0,
        isLoop: true,
      };
    }
    visited.add(current);

    try {
      const resp = await fetch(current, {
        method: 'HEAD',
        redirect: 'manual',
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
        headers: { 'User-Agent': 'Mozilla/5.0 (compatible; SEOAuditBot/1.0)' },
      });

      chain.push({ url: current, status: resp.status });

      if (resp.status >= 300 && resp.status < 400) {
        const location = resp.headers.get('location');
        if (!location) break;
        current = normalizeUrl(baseOrigin, location) || new URL(location, current).href;
        hops++;
        continue;
      }

      // Final destination
      return {
        sourceUrl: url,
        chain,
        chainLength: hops,
        finalUrl: current,
        finalStatus: resp.status,
        isLoop: false,
      };
    } catch {
      return {
        sourceUrl: url,
        chain,
        chainLength: hops,
        finalUrl: current,
        finalStatus: 0,
        isLoop: false,
      };
    }
  }

  return {
    sourceUrl: url,
    chain,
    chainLength: hops,
    finalUrl: current,
    finalStatus: 0,
    isLoop: false,
  };
}

// ── Sitemap Parser ──

async function fetchSitemap(siteUrl: string): Promise<string[]> {
  const origin = getOrigin(siteUrl);
  const sitemapUrls: string[] = [];

  const sitemapLocations = [
    `${origin}/sitemap.xml`,
    `${origin}/sitemap_index.xml`,
    `${origin}/sitemap/sitemap.xml`,
  ];

  for (const loc of sitemapLocations) {
    try {
      log('INFO', `Fetching sitemap`, { url: loc });
      const resp = await fetch(loc, {
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
        headers: { 'User-Agent': 'Mozilla/5.0 (compatible; SEOAuditBot/1.0)' },
      });
      log('INFO', `Sitemap response`, { url: loc, status: resp.status, ok: resp.ok });
      if (!resp.ok) continue;
      const text = await resp.text();
      log('INFO', `Sitemap content length`, { url: loc, length: text.length });

      // Check if it's a sitemap index
      if (text.includes('<sitemapindex')) {
        const subSitemaps = extractAllMatches(text, /<loc>([^<]+)<\/loc>/i);
        log('INFO', `Sitemap index found`, { subSitemapCount: subSitemaps.length });
        for (const sub of subSitemaps) {
          try {
            const subResp = await fetch(sub, {
              signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
              headers: { 'User-Agent': 'Mozilla/5.0 (compatible; SEOAuditBot/1.0)' },
            });
            if (subResp.ok) {
              const subText = await subResp.text();
              const urls = extractAllMatches(subText, /<loc>([^<]+)<\/loc>/i);
              sitemapUrls.push(...urls);
            }
          } catch (e: any) {
            log('WARN', `Failed to fetch sub-sitemap`, { url: sub, error: e.message });
          }
        }
      } else {
        const urls = extractAllMatches(text, /<loc>([^<]+)<\/loc>/i);
        sitemapUrls.push(...urls);
      }

      if (sitemapUrls.length > 0) break;
    } catch (e: any) {
      log('WARN', `Failed to fetch sitemap`, { url: loc, error: e.message });
    }
  }

  const unique = [...new Set(sitemapUrls)];
  log('INFO', `Sitemap parsing complete`, { totalUrls: unique.length });
  return unique;
}

// ── Robots.txt Parser ──

async function fetchRobots(siteUrl: string): Promise<string | null> {
  try {
    const origin = getOrigin(siteUrl);
    const resp = await fetch(`${origin}/robots.txt`, {
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; SEOAuditBot/1.0)' },
    });
    if (resp.ok) return await resp.text();
  } catch {}
  return null;
}

// ── Main Crawl Function ──

export async function crawlSite(
  siteUrl: string,
  onProgress?: (done: number, total: number, currentUrl: string) => void,
): Promise<CrawlResult> {
  const baseOrigin = getOrigin(siteUrl);
  log('INFO', `Starting crawl`, { siteUrl, baseOrigin, maxPages: MAX_PAGES });

  const pages: CrawlPage[] = [];
  const allIssues: CrawlIssue[] = [];
  const visited = new Set<string>();
  const toVisit: string[] = [siteUrl];

  // Fetch sitemap and robots in parallel
  log('INFO', 'Fetching sitemap and robots.txt...');
  const [sitemapUrls, robotsContent] = await Promise.all([
    fetchSitemap(siteUrl),
    fetchRobots(siteUrl),
  ]);
  log('INFO', 'Sitemap/robots fetched', { sitemapUrlCount: sitemapUrls.length, hasRobots: !!robotsContent });

  // Filter sitemap URLs: skip email-protection, CDN junk, non-HTML paths
  const JUNK_PATTERNS = [
    '/cdn-cgi/l/email-protection',
    '/cdn-cgi/',
    '.xml',
    '.json',
    '.css',
    '.js',
    '.png',
    '.jpg',
    '.jpeg',
    '.gif',
    '.svg',
    '.ico',
    '.woff',
    '.woff2',
    '.ttf',
    '.eot',
    '.webp',
    '.avif',
    '.pdf',
    '.zip',
    '.gz',
  ];

  function shouldCrawl(url: string): boolean {
    try {
      const u = new URL(url);
      // Skip non-HTTP
      if (!u.protocol.startsWith('http')) return false;
      // Skip junk paths
      for (const p of JUNK_PATTERNS) {
        if (u.pathname.includes(p)) return false;
      }
      // Skip URLs with excessive query params (likely tracking)
      if (u.search.length > 200) return false;
      return true;
    } catch {
      return false;
    }
  }

  const filteredSitemapUrls = sitemapUrls.filter(shouldCrawl);
  log('INFO', 'Sitemap URLs filtered', {
    original: sitemapUrls.length,
    filtered: filteredSitemapUrls.length,
    removed: sitemapUrls.length - filteredSitemapUrls.length,
  });
  if (filteredSitemapUrls.length > 0) {
    log('DEBUG', 'First sitemap URLs', { urls: filteredSitemapUrls.slice(0, 10) });
  }

  // Add filtered sitemap URLs to crawl queue
  for (const su of filteredSitemapUrls) {
    if (!visited.has(su) && isInternalUrl(su, baseOrigin)) {
      toVisit.push(su);
    }
  }

  const totalPages = Math.min(toVisit.length, MAX_PAGES);
  let crawled = 0;
  log('INFO', `Crawl queue initialized`, { totalPages, queueSize: toVisit.length });

  // Crawl pages
  while (toVisit.length > 0 && pages.length < MAX_PAGES) {
    const url = toVisit.shift()!;
    if (visited.has(url)) continue;
    visited.add(url);

    onProgress?.(crawled, totalPages, url);
    log('INFO', `Crawling [${crawled + 1}/${totalPages}]`, { url });

    try {
      const start = Date.now();
      const resp = await fetch(url, {
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; SEOAuditBot/1.0)',
          'Accept': 'text/html,application/xhtml+xml',
        },
      });
      const responseTimeMs = Date.now() - start;
      const contentType = resp.headers.get('content-type') || '';
      log('INFO', `Fetched`, { url, status: resp.status, responseTimeMs, contentType: contentType.split(';')[0] });

      // Handle redirects
      if (resp.status >= 300 && resp.status < 400) {
        const location = resp.headers.get('location');
        if (location) {
          const resolved = normalizeUrl(baseOrigin, location);
          if (resolved && isInternalUrl(resolved, baseOrigin) && !visited.has(resolved)) {
            toVisit.push(resolved);
            log('INFO', `Redirect -> adding to queue`, { from: url, to: resolved });
          }
        }
        const page: CrawlPage = {
          url, path: getPath(url),
          httpStatus: resp.status,
          responseTimeMs,
          pageSizeBytes: 0,
          contentType,
          title: '', titleLength: 0,
          metaDescription: '', metaDescLength: 0,
          h1: '', h1Count: 0, h2Count: 0, h3Count: 0, h4Count: 0, h5Count: 0, h6Count: 0,
          canonical: '', isSelfCanonical: false,
          robotsMeta: '', hasNoindex: false, hasNofollow: false,
          htmlLang: '', viewportMeta: false,
          wordCount: 0,
          ogTitle: '', ogDescription: '', ogImage: '', ogUrl: '', ogType: '', ogLocale: '',
          twitterCard: '', twitterTitle: '', twitterDescription: '', twitterImage: '', twitterCreator: '',
          hasStructuredData: false, structuredDataTypes: [],
          links: [], images: [], hreflangs: [],
        };
        pages.push(page);
        crawled++;
        continue;
      }

      if (!resp.ok) {
        log('WARN', `Non-OK response`, { url, status: resp.status });
        const page: CrawlPage = {
          url, path: getPath(url),
          httpStatus: resp.status,
          responseTimeMs,
          pageSizeBytes: 0,
          contentType,
          title: '', titleLength: 0,
          metaDescription: '', metaDescLength: 0,
          h1: '', h1Count: 0, h2Count: 0, h3Count: 0, h4Count: 0, h5Count: 0, h6Count: 0,
          canonical: '', isSelfCanonical: false,
          robotsMeta: '', hasNoindex: false, hasNofollow: false,
          htmlLang: '', viewportMeta: false,
          wordCount: 0,
          ogTitle: '', ogDescription: '', ogImage: '', ogUrl: '', ogType: '', ogLocale: '',
          twitterCard: '', twitterTitle: '', twitterDescription: '', twitterImage: '', twitterCreator: '',
          hasStructuredData: false, structuredDataTypes: [],
          links: [], images: [], hreflangs: [],
        };
        pages.push(page);
        allIssues.push(...detectIssues(page, baseOrigin));
        crawled++;
        continue;
      }

      const html = await resp.text();
      const page = parseHtml(html, url, baseOrigin);
      page.httpStatus = resp.status;
      page.responseTimeMs = responseTimeMs;
      page.contentType = contentType;

      log('INFO', `Parsed page`, {
        url,
        title: page.title?.slice(0, 60),
        titleLength: page.titleLength,
        h1Count: page.h1Count,
        wordCount: page.wordCount,
        linksFound: page.links.length,
        imagesFound: page.images.length,
        hreflangsFound: page.hreflangs.length,
        hasCanonical: !!page.canonical,
        hasRobotsMeta: !!page.robotsMeta,
        hasOgTags: !!(page.ogTitle && page.ogDescription),
        hasTwitterTags: !!page.twitterCard,
      });

      // Add internal links to queue (filtered)
      const newLinks = page.links.filter(l => l.isInternal && !visited.has(l.url) && !toVisit.includes(l.url) && shouldCrawl(l.url));
      for (const link of newLinks) {
        toVisit.push(link.url);
      }
      if (newLinks.length > 0) {
        log('INFO', `Added internal links to queue`, { count: newLinks.length, queueSize: toVisit.length });
      }

      pages.push(page);
      const pageIssues = detectIssues(page, baseOrigin);
      allIssues.push(...pageIssues);
      log('INFO', `Issues detected for page`, { url, issueCount: pageIssues.length });
      crawled++;

      // Delay between requests
      if (toVisit.length > 0) {
        await new Promise(r => setTimeout(r, REQUEST_DELAY_MS));
      }
    } catch (err: any) {
      log('ERROR', `Failed to crawl page`, { url, error: err.message, code: err.code });
      const page: CrawlPage = {
        url, path: getPath(url),
        httpStatus: 0,
        responseTimeMs: 0,
        pageSizeBytes: 0,
        contentType: '',
        title: '', titleLength: 0,
        metaDescription: '', metaDescLength: 0,
        h1: '', h1Count: 0, h2Count: 0, h3Count: 0, h4Count: 0, h5Count: 0, h6Count: 0,
        canonical: '', isSelfCanonical: false,
        robotsMeta: '', hasNoindex: false, hasNofollow: false,
        htmlLang: '', viewportMeta: false,
        wordCount: 0,
        ogTitle: '', ogDescription: '', ogImage: '', ogUrl: '', ogType: '', ogLocale: '',
        twitterCard: '', twitterTitle: '', twitterDescription: '', twitterImage: '', twitterCreator: '',
        hasStructuredData: false, structuredDataTypes: [],
        links: [], images: [], hreflangs: [],
      };
      pages.push(page);
      allIssues.push({
        pageUrl: url,
        category: 'technical',
        severity: 'critical',
        title: 'Failed to fetch page',
        description: `Error: ${err.message || 'Unknown error'}`,
        recommendation: 'Check if the URL is accessible and the server is responding.',
      });
      crawled++;
    }
  }

  log('INFO', `Crawl loop finished`, { pagesCrawled: crawled, totalIssues: allIssues.length, queueRemaining: toVisit.length });

  // Post-crawl analysis: detect broken internal links, orphan pages
  const crawledUrls = new Set(pages.map(p => p.url));
  const incomingLinks = new Map<string, number>();

  for (const page of pages) {
    for (const link of page.links) {
      if (link.isInternal) {
        incomingLinks.set(link.url, (incomingLinks.get(link.url) || 0) + 1);
      }
    }
  }

  // Check for broken internal links
  for (const page of pages) {
    for (const link of page.links) {
      if (link.isInternal && !crawledUrls.has(link.url)) {
        allIssues.push({
          pageUrl: page.url,
          category: 'links',
          severity: 'high',
          title: 'Broken internal link',
          description: `Links to ${link.url} which was not found during crawl`,
          recommendation: 'Fix or remove the broken link.',
        });
      }
    }
  }

  // Detect orphan pages (in sitemap but no internal links)
  for (const su of filteredSitemapUrls) {
    if (crawledUrls.has(su) && !incomingLinks.has(su)) {
      allIssues.push({
        pageUrl: su,
        category: 'links',
        severity: 'medium',
        title: 'Orphan page',
        description: 'Page is in sitemap but has no internal links pointing to it',
        recommendation: 'Add internal links to this page from other pages on the site.',
      });
    }
  }

  // Pages crawled but not in sitemap
  const sitemapSet = new Set(filteredSitemapUrls);
  for (const page of pages) {
    if (page.httpStatus === 200 && !sitemapSet.has(page.url) && page.url !== siteUrl) {
      allIssues.push({
        pageUrl: page.url,
        category: 'sitemap',
        severity: 'medium',
        title: 'Page not in sitemap',
        description: 'Page was crawled but is not listed in sitemap.xml',
        recommendation: 'Add this page to your sitemap.xml for better indexing.',
      });
    }
  }

  // Robots.txt issues
  if (robotsContent) {
    if (!robotsContent.toLowerCase().includes('sitemap:')) {
      allIssues.push({
        pageUrl: siteUrl,
        category: 'technical',
        severity: 'medium',
        title: 'No sitemap directive in robots.txt',
        description: 'robots.txt does not contain a Sitemap directive',
        recommendation: 'Add "Sitemap: https://yoursite.com/sitemap.xml" to robots.txt.',
      });
    }
  } else {
    allIssues.push({
      pageUrl: siteUrl,
      category: 'technical',
      severity: 'high',
      title: 'Missing robots.txt',
      description: 'No robots.txt file found',
      recommendation: 'Create a robots.txt file to control crawler access.',
    });
  }

  // Detect redirect chains for pages that returned redirects
  const redirects: RedirectChain[] = [];
  const redirectPages = pages.filter(p => p.httpStatus >= 300 && p.httpStatus < 400);
  log('INFO', `Checking redirect chains`, { redirectPageCount: redirectPages.length });
  for (const rp of redirectPages.slice(0, 20)) {
    const chain = await detectRedirectChain(rp.url, baseOrigin);
    if (chain && chain.chainLength > 0) {
      redirects.push(chain);
      if (chain.isLoop) {
        allIssues.push({
          pageUrl: rp.url,
          category: 'redirects',
          severity: 'critical',
          title: 'Redirect loop detected',
          description: `Redirect chain loops back to itself after ${chain.chainLength} hops`,
          recommendation: 'Fix the redirect loop by pointing directly to the final destination.',
        });
      } else if (chain.chainLength > 2) {
        allIssues.push({
          pageUrl: rp.url,
          category: 'redirects',
          severity: 'medium',
          title: `Long redirect chain (${chain.chainLength} hops)`,
          description: `Redirect chain: ${chain.map(c => c.url).join(' → ')}`,
          recommendation: 'Reduce redirect chain to a single hop for better crawl efficiency.',
        });
      }
    }
    await new Promise(r => setTimeout(r, 500));
  }

  onProgress?.(crawled, totalPages, '');

  log('INFO', `CRAWL COMPLETE`, {
    pagesCrawled: pages.length,
    totalIssues: allIssues.length,
    sitemapUrlsFound: sitemapUrls.length,
    hasRobotsTxt: !!robotsContent,
    redirectsDetected: redirects.length,
    issueBreakdown: {
      critical: allIssues.filter(i => i.severity === 'critical').length,
      high: allIssues.filter(i => i.severity === 'high').length,
      medium: allIssues.filter(i => i.severity === 'medium').length,
      low: allIssues.filter(i => i.severity === 'low').length,
      notice: allIssues.filter(i => i.severity === 'notice').length,
    },
  });

  return { pages, issues: allIssues, sitemapUrls, robotsContent, redirects };
}
