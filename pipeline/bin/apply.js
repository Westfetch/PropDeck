import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { diffWithBrain, applyToBrain } from '../merger/merge.js';
import { log } from '../lib/log.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUTPUT_DIR = join(__dirname, '..', 'output');
const PART_LIBRARY_PATH = join(__dirname, '..', '..', 'lib', 'fpv', 'part-library.json');

const parseArgs = () => {
  const args = process.argv.slice(2);
  return {
    dryRun: args.includes('--dry-run'),
    apply: args.includes('--apply'),
  };
};

const main = () => {
  const opts = parseArgs();

  if (!opts.dryRun && !opts.apply) {
    console.log('Usage:');
    console.log('  node pipeline/bin/apply.js --dry-run    Show what would change');
    console.log('  node pipeline/bin/apply.js --apply       Merge into brain files');
    process.exit(0);
  }

  // Load pipeline output
  const variantsPath = join(OUTPUT_DIR, 'variants.json');
  const productsPath = join(OUTPUT_DIR, 'products.json');

  if (!existsSync(variantsPath)) {
    console.error('No pipeline output found. Run scrape first: node pipeline/bin/scrape.js --source betafpv');
    process.exit(1);
  }

  const variants = JSON.parse(readFileSync(variantsPath, 'utf-8'));
  const products = existsSync(productsPath) ? JSON.parse(readFileSync(productsPath, 'utf-8')) : [];

  // Diff against current brain
  const diff = diffWithBrain(variants, products);

  // Report
  console.log('');
  console.log('=== BRAIN DIFF ===');
  console.log('');

  if (diff.summary.new_variant_count === 0 && diff.summary.new_product_count === 0) {
    console.log('Nothing new to add. Brain is up to date with pipeline output.');
    process.exit(0);
  }

  // New variants
  if (diff.summary.new_variant_count > 0) {
    console.log(`NEW VARIANTS (${diff.summary.new_variant_count}):`);
    for (const [canonName, vars] of Object.entries(diff.new_variants)) {
      console.log(`  ${canonName}:`);
      for (const v of vars) {
        console.log(`    + ${v.product_name} (${v.variant_id})`);
      }
    }
    console.log('');
  }

  // Existing variants (already in brain)
  if (diff.summary.existing_variant_count > 0) {
    console.log(`ALREADY IN BRAIN (${diff.summary.existing_variant_count} variants skipped)`);
    console.log('');
  }

  // Unknown families
  if (diff.unknown_families.length) {
    console.log(`UNKNOWN FAMILIES (${diff.unknown_families.length} — no canonical match):`);
    for (const f of diff.unknown_families) {
      console.log(`  ? ${f}`);
    }
    console.log('');
  }

  // New products
  if (diff.summary.new_product_count > 0) {
    console.log(`NEW PRODUCTS (${diff.summary.new_product_count} — need manual fan_out):`);
    for (const p of diff.new_products) {
      console.log(`  + ${p.brand} ${p.model} (${p.build_type})`);
    }
    console.log('');
  }

  // Existing products
  if (diff.existing_products.length) {
    console.log(`EXISTING PRODUCTS (${diff.existing_products.length} skipped)`);
    console.log('');
  }

  // Dry run stops here
  if (opts.dryRun) {
    console.log('--- DRY RUN — no files modified ---');
    console.log('Run with --apply to merge into brain files.');
    process.exit(0);
  }

  // Apply
  if (opts.apply) {
    const { partLibrary, applied } = applyToBrain(diff);

    writeFileSync(PART_LIBRARY_PATH, JSON.stringify(partLibrary, null, 2) + '\n', 'utf-8');
    log.success('apply', `Applied ${applied} new variants to part-library.json`);

    // Save the diff for reference
    writeFileSync(
      join(OUTPUT_DIR, 'diff.json'),
      JSON.stringify(diff, null, 2),
      'utf-8'
    );
    log.info('apply', 'Diff saved to pipeline/output/diff.json');
  }
};

main();
