import { withRetry } from '../lib/retry.js';
import { getCache, setCache } from '../lib/cache.js';
import { log } from '../lib/log.js';

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

export class BaseScraper {
  constructor(name, baseUrl) {
    this.name = name;
    this.baseUrl = baseUrl;
    this.delayMs = 1000; // polite delay between requests
    this.results = [];
  }

  async run() {
    log.info(this.name, `Starting scrape of ${this.baseUrl}`);
    try {
      const urls = await this.getProductUrls();
      log.info(this.name, `Found ${urls.length} product URLs`);

      for (let i = 0; i < urls.length; i++) {
        const url = urls[i];
        log.info(this.name, `[${i + 1}/${urls.length}] ${url}`);
        try {
          const product = await withRetry(
            () => this.scrapeProduct(url),
            { maxAttempts: 2, baseDelay: 2000, label: url }
          );
          if (product) this.results.push(product);
        } catch (err) {
          log.error(this.name, `Failed: ${url} — ${err.message}`);
        }
        if (i < urls.length - 1) await sleep(this.delayMs);
      }

      log.success(this.name, `Scraped ${this.results.length}/${urls.length} products`);
      return this.results;
    } catch (err) {
      log.error(this.name, `Scrape failed: ${err.message}`);
      return [];
    }
  }

  async scrapeProduct(url) {
    const cached = getCache(url);
    if (cached) {
      log.info(this.name, `  (cached)`);
      return this.extractProduct(JSON.parse(cached), url);
    }

    const raw = await this.fetchProduct(url);
    if (raw) setCache(url, JSON.stringify(raw));
    return this.extractProduct(raw, url);
  }

  // Subclasses implement these
  async getProductUrls() { throw new Error('implement getProductUrls()'); }
  async fetchProduct(url) { throw new Error('implement fetchProduct()'); }
  extractProduct(raw, url) { throw new Error('implement extractProduct()'); }
}

/**
 * Base class for Shopify stores. Uses the public JSON API.
 * No Playwright needed.
 */
export class ShopifyScraper extends BaseScraper {
  constructor(name, baseUrl, collections) {
    super(name, baseUrl);
    this.collections = collections; // e.g. ['brushless-motors', 'tinywhoop', 'aio-boards']
  }

  async getProductUrls() {
    const urls = [];
    for (const collection of this.collections) {
      let page = 1;
      while (true) {
        const apiUrl = `${this.baseUrl}/collections/${collection}/products.json?page=${page}&limit=30`;
        log.info(this.name, `Fetching collection: ${collection} page ${page}`);
        try {
          const res = await fetch(apiUrl);
          if (!res.ok) break;
          const data = await res.json();
          const products = data.products || [];
          if (!products.length) break;
          for (const p of products) {
            urls.push(`${this.baseUrl}/products/${p.handle}.json`);
          }
          page++;
          await sleep(500);
        } catch (err) {
          log.warn(this.name, `Collection fetch failed: ${collection} page ${page} — ${err.message}`);
          break;
        }
      }
    }
    // Deduplicate
    return [...new Set(urls)];
  }

  async fetchProduct(url) {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
    const data = await res.json();
    return data.product || null;
  }
}

/**
 * Base class for sites that need Playwright.
 * Import and extend this when adding non-Shopify scrapers.
 */
export class PlaywrightScraper extends BaseScraper {
  constructor(name, baseUrl) {
    super(name, baseUrl);
    this.browser = null;
    this.page = null;
  }

  async run() {
    const { launchBrowser, closeBrowser } = await import('../lib/browser.js');
    const { browser, page } = await launchBrowser();
    this.browser = browser;
    this.page = page;
    try {
      return await super.run();
    } finally {
      await closeBrowser(browser);
    }
  }

  async fetchProduct(url) {
    await this.page.goto(url, { waitUntil: 'domcontentloaded', timeout: 15000 });
    return await this.page.content();
  }
}
