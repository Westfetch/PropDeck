function normalise(str) {
  return String(str || "")
    .toLowerCase()
    .replace(/[^a-z0-9\s.]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function stem(word) {
  return word.replace(/(es|ing|ed|s)$/i, "");
}

function tokenise(str) {
  return normalise(str).split(" ").filter(Boolean);
}

function scoreMatch(input, part) {
  const text = normalise(input);
  const name = normalise(part.canonical_name);
  const aliases = (part.aliases || []).map(normalise);
  if (!text) return 0;
  if (text === name) return 100;
  if (aliases.includes(text)) return 94;
  if (name.includes(text) || text.includes(name)) return 82;
  if (aliases.some(a => a.includes(text) || text.includes(a))) return 74;
  const inputWords = tokenise(text);
  const targets = [name, ...aliases].flatMap(tokenise);
  const targetStems = targets.map(stem);
  const overlap = inputWords.filter(w => targetStems.includes(stem(w)));
  if (overlap.length === 0) return 0;
  return Math.round((overlap.length / Math.max(inputWords.length, 1)) * 60);
}

export function lookupParts(input, library, opts = {}) {
  const minScore = opts.minScore ?? 20;
  const scored = (library || [])
    .map(part => ({ part, score: scoreMatch(input, part) }))
    .filter(row => row.score >= minScore)
    .sort((a, b) => b.score - a.score);

  if (scored.length === 0) {
    return { matched: false, warning: "No canonical match found", best: null, alternatives: [] };
  }

  const best = scored[0];
  const alternatives = scored
    .slice(1, 4)
    .filter(row => row.score >= best.score - 18)
    .map(row => ({ part: row.part.canonical_name, part_type: row.part.part_type, score: row.score }));

  return {
    matched: true,
    substituted: best.score < 90,
    warning: best.score < 90 ? "Mapped to nearest canonical part family" : null,
    best: {
      part: best.part.canonical_name,
      part_type: best.part.part_type,
      score: best.score,
      specs: best.part.specs || {},
      compatibility_tags: best.part.compatibility_tags || []
    },
    alternatives
  };
}
