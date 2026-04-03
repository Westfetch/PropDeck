import { lookupParts } from '../../lib/fpv/lookup-parts.js';
import partLibrary from '../../lib/fpv/part-library.json' with { type: 'json' };
import aliasRules from '../../lib/fpv/fpv-alias-rules.json' with { type: 'json' };
import { log } from '../lib/log.js';

// Reuse the signal extractors from the brain's alias rules
const extractSignals = (text) => {
  const signals = {};
  for (const extractor of aliasRules.signal_extractors) {
    const flags = extractor.case_insensitive ? 'gi' : 'g';
    const regex = new RegExp(extractor.pattern, flags);
    const match = regex.exec(text);
    if (match) signals[extractor.signal] = match[1] || match[0];
  }
  return signals;
};

// Map part_type from scraper to canonical part_type names
const PART_TYPE_MAP = {
  motor: 'motor',
  aio: 'aio',
  frame: 'frame',
  camera: 'camera',
  vtx: 'vtx',
  rx: 'rx',
  propeller: 'propeller',
  battery: 'battery',
  charger: 'charger',
  radio: 'radio',
  goggles: 'goggles',
  antenna: 'antenna',
};

// Build variant object with only the fields relevant to this part type
const buildVariantFields = (partType, variant) => {
  const fields = {
    variant_id: variant.variant_id,
    product_name: variant.product_name,
    brand: variant.brand,
  };

  switch (partType) {
    case 'motor':
      if (variant.kv) fields.kv = variant.kv;
      if (variant.weight_g) fields.weight_g = variant.weight_g;
      if (variant.shaft) fields.shaft = variant.shaft;
      break;
    case 'aio':
      if (variant.protocol) fields.protocol = variant.protocol;
      if (variant.firmware) fields.firmware = variant.firmware;
      if (variant.amperage) fields.amperage = variant.amperage;
      if (variant.receiver) fields.receiver = variant.receiver;
      break;
    case 'frame':
      if (variant.weight_g) fields.weight_g = variant.weight_g;
      if (variant.frame_size) fields.size = variant.frame_size;
      break;
    case 'camera':
      if (variant.sensor) fields.sensor = variant.sensor;
      if (variant.fov) fields.fov = variant.fov;
      if (variant.video) fields.video = variant.video;
      break;
    case 'vtx':
      if (variant.power) fields.power = variant.power;
      if (variant.video) fields.video = variant.video;
      break;
    case 'rx':
      if (variant.protocol) fields.protocol = variant.protocol;
      break;
    case 'propeller':
      break;
    case 'battery':
      if (variant.capacity_mah) fields.capacity_mah = variant.capacity_mah;
      if (variant.connector) fields.connector = variant.connector;
      if (variant.cell_count) fields.cell_count = variant.cell_count;
      break;
    case 'charger':
      break;
    case 'radio':
      if (variant.protocol) fields.protocol = variant.protocol;
      break;
  }

  return fields;
};

// Map frame product names to canonical sizes
const FRAME_SIZE_MAP = {
  '65': '65mm whoop frame',
  '75': '75mm whoop frame',
  'pico': '65mm whoop frame',
  'femto': '65mm whoop frame',
  'pavo20': '2 inch frame',
  'pavo25': '2 inch frame',
  'pavo35': '3.5 inch cinewhoop frame',
};

const resolveFrameCanonical = (title) => {
  const lower = title.toLowerCase();
  // Try size in mm first
  const sizeMatch = lower.match(/(\d{2,3})\s*mm/);
  if (sizeMatch) {
    const size = sizeMatch[1];
    if (size === '65') return '65mm whoop frame';
    if (size === '75') return '75mm whoop frame';
  }
  // Try product name patterns
  for (const [key, canonical] of Object.entries(FRAME_SIZE_MAP)) {
    if (lower.includes(key)) return canonical;
  }
  // Try extracting from names like "Air65", "Air75", "Meteor65"
  const nameSize = lower.match(/(?:air|meteor|mobula)\s*(\d{2})/);
  if (nameSize) {
    if (nameSize[1] === '65') return '65mm whoop frame';
    if (nameSize[1] === '75') return '75mm whoop frame';
  }
  return null;
};

// Map prop dimensions to canonical sizes
const PROP_SIZE_MAP = {
  '31': '31mm propeller',
  '35': '31mm propeller',   // 35mm close to 31mm whoop class
  '40': '40mm propeller',
  '45': '40mm propeller',   // 45mm close to 40mm class
  '65': '2 inch propeller', // 65mm = ~2.5 inch
  '90': '3 inch propeller', // D90 = 3 inch class
};

const resolvePropCanonical = (title) => {
  const lower = title.toLowerCase();
  // Direct mm match
  const mmMatch = lower.match(/(\d{2,3})\s*mm/);
  if (mmMatch) {
    const mm = mmMatch[1];
    if (PROP_SIZE_MAP[mm]) return PROP_SIZE_MAP[mm];
    const num = parseInt(mm);
    if (num <= 35) return '31mm propeller';
    if (num <= 45) return '40mm propeller';
    if (num <= 65) return '2 inch propeller';
    if (num <= 90) return '3 inch propeller';
  }
  // Blade size in format like "1207" "1219" "1614" "2020" "2218"
  const bladeMatch = lower.match(/\b(\d{4})\b/);
  if (bladeMatch) {
    const code = bladeMatch[1];
    const diameter = parseInt(code.slice(0, 2));
    if (diameter <= 15) return '31mm propeller';
    if (diameter <= 22) return '40mm propeller';
  }
  return null;
};

// Try to match a scraped product to a canonical family
const resolveCanonical = (product, variant) => {
  const searchText = `${product.title} ${variant.product_name || ''}`;
  const signals = extractSignals(searchText);
  const partType = PART_TYPE_MAP[product.part_type] || product.part_type;

  // Filter: chargers should not match as batteries
  if (partType === 'charger' || searchText.toLowerCase().includes('charger')) {
    const chargerResult = lookupParts('LiPo charger', partLibrary);
    if (chargerResult.matched) {
      return {
        canonical_name: chargerResult.best.part,
        canonical_part_type: chargerResult.best.part_type,
        match_score: chargerResult.best.score,
        substituted: false,
      };
    }
    return null;
  }

  // Frames: use product name heuristics since BetaFPV names don't contain "65mm"
  if (partType === 'frame') {
    const canonical = resolveFrameCanonical(searchText);
    if (canonical) {
      return {
        canonical_name: canonical,
        canonical_part_type: 'frame',
        match_score: 80,
        substituted: false,
      };
    }
  }

  // Props: use size mapping since BetaFPV uses unusual prop naming
  if (partType === 'propeller') {
    const canonical = resolvePropCanonical(searchText);
    if (canonical) {
      return {
        canonical_name: canonical,
        canonical_part_type: 'propeller',
        match_score: 75,
        substituted: false,
      };
    }
  }

  // Standard lookup for everything else
  let query = product.title;

  if (partType === 'motor' && signals.stator_size) {
    query = `${signals.stator_size} motor`;
  } else if (partType === 'aio' && signals.cell_count) {
    query = `${signals.cell_count} AIO`;
  } else if (partType === 'battery' && signals.cell_count) {
    const connector = signals.connector || '';
    // Detect BT2.0/BT3.0 from product name
    const btMatch = searchText.match(/BT(\d)\.0/i);
    if (btMatch) {
      query = `BT${btMatch[1]}.0 ${signals.cell_count} battery`;
    } else {
      query = connector ? `${connector} ${signals.cell_count} battery` : `${signals.cell_count} battery`;
    }
  }

  const result = lookupParts(query, partLibrary);
  if (result.matched && result.best.score >= 50) {
    return {
      canonical_name: result.best.part,
      canonical_part_type: result.best.part_type,
      match_score: result.best.score,
      substituted: result.substituted,
    };
  }

  return null;
};

/**
 * Normalize an array of scraped products into brain-ready format.
 * Returns { variants: { [canonical_name]: variant[] }, products: productPattern[], unresolved: [] }
 */
export const normalizeProducts = (scrapedProducts) => {
  const variants = {};   // canonical_name -> array of variant objects
  const products = [];    // product patterns (for complete quads)
  const unresolved = [];  // products that couldn't match a canonical family

  for (const product of scrapedProducts) {
    if (!product?.brain_variants?.length) continue;

    for (const variant of product.brain_variants) {
      // Complete quads become product patterns
      if (variant.is_quad) {
        products.push({
          source: product.source,
          source_url: product.source_url,
          scraped_at: product.scraped_at,
          brand: variant.brand,
          model: variant.product_name.replace(`${variant.brand} `, ''),
          build_type: variant.build_type || 'BNF',
          raw_specs: product.raw_specs,
          // fan_out would need deeper analysis of the product description
          // For now, flag it for manual review
          needs_fan_out: true,
        });
        continue;
      }

      // Parts: resolve to canonical family
      const match = resolveCanonical(product, variant);
      if (!match) {
        unresolved.push({
          source: product.source,
          source_url: product.source_url,
          title: product.title,
          part_type: product.part_type,
          variant_name: variant.product_name,
        });
        log.warn('normalize', `No canonical match: ${variant.product_name} (${product.part_type})`);
        continue;
      }

      const canonName = match.canonical_name;
      if (!variants[canonName]) variants[canonName] = [];

      // Check for duplicate variant_id
      const existing = variants[canonName].find(v => v.variant_id === variant.variant_id);
      if (existing) continue;

      const fields = buildVariantFields(match.canonical_part_type, variant);
      fields._source = product.source;
      fields._source_url = product.source_url;
      fields._scraped_at = product.scraped_at;
      fields._match_score = match.match_score;

      variants[canonName].push(fields);
      log.success('normalize', `${variant.product_name} -> ${canonName} (score: ${match.match_score})`);
    }
  }

  return { variants, products, unresolved };
};
