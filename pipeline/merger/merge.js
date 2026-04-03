import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { log } from '../lib/log.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PART_LIBRARY_PATH = join(__dirname, '..', '..', 'lib', 'fpv', 'part-library.json');
const ALIAS_RULES_PATH = join(__dirname, '..', '..', 'lib', 'fpv', 'fpv-alias-rules.json');

const loadJSON = (path) => JSON.parse(readFileSync(path, 'utf-8'));

/**
 * Diff normalized pipeline output against current brain files.
 * Returns what's new, what's updated, what already exists.
 */
export const diffWithBrain = (normalizedVariants, normalizedProducts) => {
  const partLibrary = loadJSON(PART_LIBRARY_PATH);
  const aliasRules = loadJSON(ALIAS_RULES_PATH);

  const diff = {
    new_variants: {},       // canonical_name -> variant[] (not in brain yet)
    existing_variants: {},  // canonical_name -> variant[] (already in brain, skipped)
    unknown_families: [],   // canonical names from pipeline that don't exist in brain
    new_products: [],       // product patterns not in brain yet
    existing_products: [],  // product patterns already in brain
    summary: { new_variant_count: 0, existing_variant_count: 0, new_product_count: 0 },
  };

  // Build lookup of existing variants by variant_id
  const existingVariantIds = new Set();
  for (const family of partLibrary) {
    for (const v of family.common_variants || []) {
      existingVariantIds.add(v.variant_id);
    }
  }

  // Build lookup of existing product patterns by model name
  const existingModels = new Set(
    (aliasRules.product_patterns || []).map(p => `${p.brand} ${p.model}`.toLowerCase())
  );

  // Diff variants
  for (const [canonName, variants] of Object.entries(normalizedVariants)) {
    const family = partLibrary.find(p => p.canonical_name === canonName);
    if (!family) {
      diff.unknown_families.push(canonName);
      continue;
    }

    for (const variant of variants) {
      // Strip internal metadata before comparison
      const { _source, _source_url, _scraped_at, _match_score, ...cleanVariant } = variant;

      if (existingVariantIds.has(variant.variant_id)) {
        if (!diff.existing_variants[canonName]) diff.existing_variants[canonName] = [];
        diff.existing_variants[canonName].push(cleanVariant);
        diff.summary.existing_variant_count++;
      } else {
        if (!diff.new_variants[canonName]) diff.new_variants[canonName] = [];
        diff.new_variants[canonName].push(cleanVariant);
        diff.summary.new_variant_count++;
      }
    }
  }

  // Diff products
  for (const product of normalizedProducts) {
    const key = `${product.brand} ${product.model}`.toLowerCase();
    if (existingModels.has(key)) {
      diff.existing_products.push(product);
    } else {
      diff.new_products.push(product);
      diff.summary.new_product_count++;
    }
  }

  return diff;
};

/**
 * Apply new variants and products to the brain files.
 * Only adds new entries, never overwrites existing ones.
 */
export const applyToBrain = (diff) => {
  const partLibrary = loadJSON(PART_LIBRARY_PATH);

  let applied = 0;

  // Add new variants to their canonical families
  for (const [canonName, variants] of Object.entries(diff.new_variants)) {
    const family = partLibrary.find(p => p.canonical_name === canonName);
    if (!family) continue;
    if (!family.common_variants) family.common_variants = [];

    for (const variant of variants) {
      family.common_variants.push(variant);
      applied++;
      log.success('apply', `Added ${variant.product_name} to ${canonName}`);
    }
  }

  return { partLibrary, applied };
};
