// In Vite, JSON imports work automatically.
// For Node 24+, use --experimental-json-modules or import with assert.
import expertRules from './fpv-expert-rules.json' with { type: 'json' };
import partLibrary from './part-library.json' with { type: 'json' };

const allRules = Object.values(expertRules.categories).flat();

const partSpecsMap = {};
partLibrary.forEach(p => { partSpecsMap[p.canonical_name] = p; });

const getSpec = (partName, field) => {
  const lib = partSpecsMap[partName];
  if (!lib) return null;
  const parts = field.split('.');
  let val = lib;
  for (const p of parts) { val = val?.[p]; }
  return val ?? null;
};

const hasPartType = (parts, partType) =>
  parts.some(p => p.part_type === partType);

const getPartsOfType = (parts, partType) =>
  parts.filter(p => p.part_type === partType);

const getPartNames = (parts) =>
  parts.map(p => p.canonical_name);

// Check if a build contains a part that a rule applies_to
const buildHasApplyTarget = (parts, appliesTo) => {
  if (!appliesTo || !appliesTo.length) return true;
  const names = getPartNames(parts);
  return appliesTo.some(target => names.includes(target));
};

// Evaluate a single rule against a set of parts
const evaluateRule = (rule, parts) => {
  const { condition, applies_to, severity, action } = rule;

  // Rules with no condition are general info/recommendations
  if (!condition || !condition.operator) {
    if (action === 'info' || action === 'recommend') {
      return { fires: true, type: 'tip' };
    }
    return { fires: false };
  }

  // Only evaluate if the build contains a relevant part
  if (!buildHasApplyTarget(parts, applies_to)) {
    return { fires: false };
  }

  const partNames = getPartNames(parts);
  const op = condition.operator;
  const values = condition.values || [];

  switch (op) {
    case 'in': {
      // Check if parts of the given type have specs matching the allowed values
      if (!condition.part_type) return { fires: false };
      const relevant = getPartsOfType(parts, condition.part_type);
      if (!relevant.length) {
        // Missing part type entirely — fire as warning
        return { fires: true, type: 'warning' };
      }
      for (const part of relevant) {
        const spec = getSpec(part.canonical_name, condition.field);
        if (spec && !values.includes(spec)) {
          return { fires: true, type: 'violation' };
        }
      }
      return { fires: false };
    }

    case 'equals': {
      if (!condition.part_type) return { fires: false };
      const relevant = getPartsOfType(parts, condition.part_type);
      if (!relevant.length) return { fires: false };
      for (const part of relevant) {
        const spec = getSpec(part.canonical_name, condition.field);
        if (spec && !values.includes(spec)) {
          return { fires: true, type: 'violation' };
        }
      }
      return { fires: false };
    }

    case 'mismatch': {
      // Check for connector/protocol/version mismatches within the build
      if (condition.field === 'specs.connector') {
        const batteries = getPartsOfType(parts, 'battery');
        const connectors = new Set(batteries.map(b => getSpec(b.canonical_name, 'specs.connector')).filter(Boolean));
        if (connectors.size > 1) return { fires: true, type: 'violation' };
      }
      return { fires: false };
    }

    case 'match_frame': {
      // Prop size must match frame size
      const frames = getPartsOfType(parts, 'frame');
      const props = getPartsOfType(parts, 'propeller');
      if (!frames.length || !props.length) return { fires: false };
      const frameSize = getSpec(frames[0].canonical_name, 'specs.size');
      for (const prop of props) {
        const propSize = getSpec(prop.canonical_name, 'specs.size');
        if (frameSize && propSize) {
          // 65mm -> 31mm, 75mm -> 40mm, etc
          const frameToProp = { '65mm': '31mm', '75mm': '40mm', '2inch': '2inch', '3inch': '3inch', '3.5inch': '3.5inch', '5inch': '5inch' };
          if (frameToProp[frameSize] && frameToProp[frameSize] !== propSize) {
            return { fires: true, type: 'violation' };
          }
        }
      }
      return { fires: false };
    }

    case 'minimum_frame': {
      // VTX requires minimum frame size
      const frames = getPartsOfType(parts, 'frame');
      if (!frames.length) return { fires: false };
      const frameSize = getSpec(frames[0].canonical_name, 'specs.size');
      const sizeOrder = ['65mm', '75mm', '2inch', '3inch', '3.5inch', '5inch'];
      const minSize = values[0];
      if (frameSize && minSize) {
        const frameIdx = sizeOrder.indexOf(frameSize);
        const minIdx = sizeOrder.indexOf(minSize);
        if (frameIdx >= 0 && minIdx >= 0 && frameIdx < minIdx) {
          return { fires: true, type: 'violation' };
        }
      }
      return { fires: false };
    }

    // General info rules that always show as tips when relevant parts are present
    case 'match_cell_count':
    case 'check_availability':
    case 'match_ecosystem':
    case 'compare':
    case 'range_check':
    case 'match':
    case 'greater_than':
    case 'less_than':
    case 'less_than_or_equal': {
      // These require variant/state data we may not have yet
      // Show as tip if the build has relevant parts
      if (action === 'info' || action === 'recommend') {
        return { fires: true, type: 'tip' };
      }
      return { fires: false };
    }

    default:
      return { fires: false };
  }
};

/**
 * Evaluate all expert rules against a set of parts.
 * Returns { warnings: [], tips: [] }
 * Each item: { rule_id, summary, severity, message, category }
 */
export const evaluateExpertRules = (parts, userLevel = 'beginner') => {
  const warnings = [];
  const tips = [];

  for (const rule of allRules) {
    const result = evaluateRule(rule, parts);
    if (!result.fires) continue;

    const message = userLevel === 'advanced' ? rule.message_advanced : rule.message_beginner;
    const item = {
      rule_id: rule.rule_id,
      summary: rule.summary,
      severity: rule.severity,
      category: rule.category,
      message
    };

    if (result.type === 'violation' || result.type === 'warning') {
      warnings.push(item);
    } else {
      tips.push(item);
    }
  }

  // Sort warnings by severity
  const severityOrder = { hard_constraint: 0, strong_recommendation: 1, soft_guidance: 2, info: 3 };
  warnings.sort((a, b) => (severityOrder[a.severity] ?? 9) - (severityOrder[b.severity] ?? 9));

  // Limit tips to most relevant (max 3)
  const limitedTips = tips.slice(0, 3);

  return { warnings, tips: limitedTips };
};
