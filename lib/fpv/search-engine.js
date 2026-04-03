import aliasRules from './fpv-alias-rules.json' with { type: 'json' };
import partLibrary from './part-library.json' with { type: 'json' };
import expertRules from './fpv-expert-rules.json' with { type: 'json' };
import { lookupParts } from './lookup-parts.js';
import { PRICE_MAP } from './swap-engine.js';

const allRules = Object.values(expertRules.categories).flat();

/**
 * Extract signals from raw text using alias rule regex patterns.
 */
const extractSignals = (text) => {
  const signals = {};
  for (const extractor of aliasRules.signal_extractors) {
    const flags = extractor.case_insensitive ? 'gi' : 'g';
    const regex = new RegExp(extractor.pattern, flags);
    const match = regex.exec(text);
    if (match) {
      signals[extractor.signal] = match[1] || match[0];
    }
  }
  return signals;
};

/**
 * Strip noise from input text using noise stripper rules.
 */
const stripNoise = (text) => {
  let cleaned = text;
  const extracted = {};

  for (const stripper of aliasRules.noise_strippers) {
    const flags = stripper.case_insensitive ? 'gi' : 'g';
    const regex = new RegExp(stripper.pattern, flags);

    if (stripper.action === 'extract_then_strip') {
      const match = regex.exec(cleaned);
      if (match && stripper.extract_to) {
        extracted[stripper.extract_to] = match[1] || match[0];
      }
      cleaned = cleaned.replace(regex, ' ');
    } else if (stripper.action === 'strip') {
      cleaned = cleaned.replace(regex, ' ');
    } else if (stripper.action === 'flag_and_strip') {
      if (regex.test(cleaned)) extracted[stripper.flag] = true;
      cleaned = cleaned.replace(regex, ' ');
    } else if (stripper.action === 'collapse') {
      cleaned = cleaned.replace(regex, stripper.replace_with || ' ');
    }
  }

  return { cleaned: cleaned.trim(), extracted };
};

/**
 * Normalise extracted values using normalisation rules.
 */
const normalise = (signals) => {
  const normalised = { ...signals };
  for (const rule of aliasRules.normalisation_rules) {
    for (const [key, val] of Object.entries(normalised)) {
      if (typeof val === 'string' && val.toLowerCase() === rule.from.toLowerCase()) {
        normalised[key] = rule.to;
      }
    }
  }
  return normalised;
};

/**
 * Match against known product patterns.
 * Supports exact match AND fuzzy/partial match.
 */
const matchProductPattern = (text) => {
  const lower = text.toLowerCase().trim();

  // Exact regex match first
  for (const product of aliasRules.product_patterns) {
    const flags = product.case_insensitive ? 'i' : '';
    const regex = new RegExp(product.pattern, flags);
    if (regex.test(text)) return { product, exact: true };
  }

  // Fuzzy: check if the input is a prefix/substring of brand or model
  for (const product of aliasRules.product_patterns) {
    const brand = (product.brand || '').toLowerCase();
    const model = (product.model || '').toLowerCase();
    if (brand.includes(lower) || model.includes(lower) || lower.includes(brand) || lower.includes(model)) {
      return { product, exact: false };
    }
    // Also try without spaces: "cetus" matches "Cetus X"
    const modelNoSpace = model.replace(/\s+/g, '');
    if (modelNoSpace.startsWith(lower) || lower.startsWith(modelNoSpace)) {
      return { product, exact: false };
    }
  }

  return null;
};

/**
 * Get relevant expert tips for a set of parts.
 */
const getExpertContext = (parts) => {
  const tips = [];
  const partNames = parts.map(p => p.canonical_name || p);

  for (const rule of allRules) {
    if (rule.action !== 'info' && rule.action !== 'recommend') continue;
    if (!rule.applies_to?.length) continue;

    const relevant = rule.applies_to.some(target => partNames.includes(target));
    if (relevant) {
      tips.push({
        rule_id: rule.rule_id,
        summary: rule.summary,
        message: rule.message_beginner
      });
    }
  }

  return tips.slice(0, 5);
};

/**
 * Resolve a variant_id against the part library's common_variants.
 */
const resolveVariant = (canonicalName, variantId) => {
  if (!variantId) return null;
  const libEntry = partLibrary.find(p => p.canonical_name === canonicalName);
  if (!libEntry?.common_variants?.length) return null;
  return libEntry.common_variants.find(v => v.variant_id === variantId) || null;
};

/**
 * Build a product result from a matched pattern.
 */
const buildProductResult = (productMatch, raw) => {
  const product = productMatch.product;

  const result = {
    brand: product.brand,
    model: product.model,
    build_type: product.build_type,
    is_rtf_kit: product.is_rtf_kit || false,
    fuzzy: !productMatch.exact
  };

  // Fan out to canonical parts
  const fanOutParts = product.fan_out.map(f => {
    const libEntry = partLibrary.find(p => p.canonical_name === f.canonical_name);
    const entry = {
      canonical_name: f.canonical_name,
      evidence_weight: f.evidence_weight,
      quantity: f.quantity,
      part_type: libEntry?.part_type || 'unknown',
      specs: libEntry?.specs || {},
      price: PRICE_MAP[f.canonical_name] || null
    };
    const variant = resolveVariant(f.canonical_name, f.variant_id);
    if (variant) entry.variant = variant;
    return entry;
  });

  const estimatedValue = fanOutParts.reduce((sum, p) =>
    sum + ((p.price || 0) * (p.quantity || 1)), 0
  );

  // Check for version variants
  if (product.version_variants) {
    const { extracted } = stripNoise(raw);
    const year = extracted['variant.year'];
    if (year) {
      const versionVariant = product.version_variants.find(v => v.year === year);
      if (versionVariant) {
        result.year = year;
        result.variant_notes = versionVariant.overrides;
        // Apply variant overrides to fan_out parts
        for (const [key, override] of Object.entries(versionVariant.overrides)) {
          if (!override || typeof override !== 'object' || !override.canonical_name) continue;
          const existing = fanOutParts.find(p => p.canonical_name === override.canonical_name);
          if (existing && override.variant_id) {
            const resolved = resolveVariant(override.canonical_name, override.variant_id);
            if (resolved) existing.variant = resolved;
          }
        }
      }
    }
  }

  if (product.kit_includes) result.kit_includes = product.kit_includes;
  if (product.beginner_note) result.beginner_note = product.beginner_note;
  if (product.upgrade_path) result.upgrade_path = product.upgrade_path;

  return { product_match: result, fan_out: fanOutParts, estimated_value: estimatedValue };
};

/**
 * Main search function.
 */
export const search = (query) => {
  if (!query || !query.trim()) return null;

  const raw = query.trim();
  const results = {
    query: raw,
    signals: {},
    product_match: null,
    fan_out: null,
    canonical_match: null,
    expert_tips: [],
    estimated_value: 0,
    suggestions: []
  };

  // Step 1: Try product pattern match (exact then fuzzy)
  const productMatch = matchProductPattern(raw);
  if (productMatch) {
    const productResults = buildProductResult(productMatch, raw);
    results.product_match = productResults.product_match;
    results.fan_out = productResults.fan_out;
    results.estimated_value = productResults.estimated_value;
    results.expert_tips = getExpertContext(productResults.fan_out);

    // If fuzzy, also suggest other products that might match
    if (!productMatch.exact) {
      results.suggestions = aliasRules.product_patterns
        .filter(p => p.model !== productMatch.product.model)
        .slice(0, 4)
        .map(p => `${p.brand} ${p.model}`);
    }

    return results;
  }

  // Step 2: Extract signals from raw text
  results.signals = normalise(extractSignals(raw));

  // Step 3: Strip noise and try canonical lookup
  const { cleaned } = stripNoise(raw);
  const lookup = lookupParts(cleaned || raw, partLibrary);

  if (lookup.matched) {
    results.canonical_match = {
      part: lookup.best.part,
      part_type: lookup.best.part_type,
      score: lookup.best.score,
      specs: lookup.best.specs,
      compatibility_tags: lookup.best.compatibility_tags,
      substituted: lookup.substituted,
      warning: lookup.warning,
      alternatives: lookup.alternatives,
      price: PRICE_MAP[lookup.best.part] || null
    };
    results.expert_tips = getExpertContext([{ canonical_name: lookup.best.part }]);
  }

  // Step 4: If no match yet, suggest known products as fallback
  if (!results.canonical_match) {
    results.suggestions = aliasRules.product_patterns
      .slice(0, 6)
      .map(p => `${p.brand} ${p.model}`);
  }

  return results;
};
