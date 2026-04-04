import 'dotenv/config';
import { writeFileSync, mkdirSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { log } from '../lib/log.js';
import { normalizeProducts } from '../normalizer/normalize.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUTPUT_DIR = join(__dirname, '..', 'output');

// Registry of available scrapers
const SCRAPERS = {
  betafpv: () => import('../scrapers/betafpv.js').then(m => new m.BetaFPVScraper()),
  racedayquads: () => import('../scrapers/racedayquads.js').then(m => new m.RaceDayQuadsScraper()),
  newbeedrone: () => import('../scrapers/newbeedrone.js').then(m => new m.NewBeeDroneScraper()),
  tinywhoop: () => import('../scrapers/tinywhoop.js').then(m => new m.TinyWhoopScraper()),
  ummagawd: () => import('../scrapers/ummagawd.js').then(m => new m.UmmagawdScraper()),
};

const parseArgs = () => {
  const args = process.argv.slice(2);
  const opts = { sources: [], all: false };

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--source' && args[i + 1]) {
      opts.sources.push(args[++i]);
    } else if (args[i] === '--all') {
      opts.all = true;
    }
  }

  if (opts.all) opts.sources = Object.keys(SCRAPERS);
  return opts;
};

const main = async () => {
  const opts = parseArgs();

  if (!opts.sources.length) {
    console.log('Usage:');
    console.log('  node pipeline/bin/scrape.js --source betafpv');
    console.log('  node pipeline/bin/scrape.js --all');
    console.log('');
    console.log('Available sources:', Object.keys(SCRAPERS).join(', '));
    process.exit(0);
  }

  // Validate sources
  for (const s of opts.sources) {
    if (!SCRAPERS[s]) {
      console.error(`Unknown source: ${s}. Available: ${Object.keys(SCRAPERS).join(', ')}`);
      process.exit(1);
    }
  }

  // Run scrapers
  const allProducts = [];
  for (const source of opts.sources) {
    log.info('scrape', `\n--- ${source.toUpperCase()} ---`);
    const scraper = await SCRAPERS[source]();
    const products = await scraper.run();
    allProducts.push(...products);
  }

  if (!allProducts.length) {
    log.warn('scrape', 'No products scraped.');
    process.exit(0);
  }

  // Normalize
  log.info('scrape', `\n--- NORMALIZING ${allProducts.length} products ---`);
  const normalized = normalizeProducts(allProducts);

  // Write output
  if (!existsSync(OUTPUT_DIR)) mkdirSync(OUTPUT_DIR, { recursive: true });

  writeFileSync(
    join(OUTPUT_DIR, 'raw-scraped.json'),
    JSON.stringify(allProducts, null, 2),
    'utf-8'
  );

  writeFileSync(
    join(OUTPUT_DIR, 'variants.json'),
    JSON.stringify(normalized.variants, null, 2),
    'utf-8'
  );

  writeFileSync(
    join(OUTPUT_DIR, 'products.json'),
    JSON.stringify(normalized.products, null, 2),
    'utf-8'
  );

  if (normalized.unresolved.length) {
    writeFileSync(
      join(OUTPUT_DIR, 'unresolved.json'),
      JSON.stringify(normalized.unresolved, null, 2),
      'utf-8'
    );
  }

  // Summary
  const variantCount = Object.values(normalized.variants).reduce((sum, arr) => sum + arr.length, 0);
  console.log('');
  log.success('scrape', `Done. Results:`);
  log.info('scrape', `  Scraped: ${allProducts.length} products`);
  log.info('scrape', `  Variants resolved: ${variantCount}`);
  log.info('scrape', `  Product patterns: ${normalized.products.length}`);
  log.info('scrape', `  Unresolved: ${normalized.unresolved.length}`);
  log.info('scrape', `  Output: pipeline/output/`);
  console.log('');
  log.info('scrape', `Next: node pipeline/bin/apply.js --dry-run`);
};

main().catch(err => {
  console.error('Fatal:', err);
  process.exit(1);
});
