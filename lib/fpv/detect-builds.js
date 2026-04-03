function countMatching(inventory, requirement, allowedStates) {
  const matchNames = new Set(requirement.match || []);
  return (inventory || [])
    .filter(item => matchNames.has(item.canonical_name) && allowedStates.has(item.evidence_state || "confirmed"))
    .reduce((sum, item) => sum + (item.quantity || 1), 0);
}

function buildCountForSection(inventory, requirements, allowedStates) {
  if (!requirements || requirements.length === 0) return Infinity;
  const counts = requirements.map(req => {
    const available = countMatching(inventory, req, allowedStates);
    return Math.floor(available / (req.quantity || 1));
  });
  return Math.min(...counts);
}

function missingForNextBuild(inventory, requirements, allowedStates) {
  const missing = [];
  for (const req of requirements || []) {
    const available = countMatching(inventory, req, allowedStates);
    const needed = req.quantity || 1;
    if (available < needed) {
      missing.push({
        part_type: req.part_type,
        candidates: req.match || [],
        needed,
        available,
        shortfall: needed - available
      });
    }
  }
  return missing;
}

export function detectBuilds(inventory, templates) {
  const strictStates = new Set(["confirmed"]);
  const looseStates = new Set(["observed", "inferred", "claimed", "confirmed"]);

  return (templates || []).map(template => {
    const requires = template.requires || [];
    const hidden = template.hidden_or_integrated || [];
    const consumables = template.consumables || [];
    const strictCoreBuilds = buildCountForSection(inventory, requires, strictStates);
    const looseHiddenBuilds = hidden.length ? buildCountForSection(inventory, hidden, looseStates) : Infinity;
    const confirmedComplete = strictCoreBuilds >= 1 && looseHiddenBuilds >= 1;
    const corePresent = buildCountForSection(inventory, requires, looseStates) >= 1;
    let status = "observed_incomplete";
    if (confirmedComplete) status = "confirmed_complete";
    else if (corePresent) status = "possibly_complete";
    const missingRequired = missingForNextBuild(inventory, requires, strictStates);
    const missingHidden = hidden.length ? missingForNextBuild(inventory, hidden, looseStates) : [];
    const missingConsumables = consumables.length ? missingForNextBuild(inventory, consumables, looseStates) : [];
    if (status === "confirmed_complete" && missingConsumables.length > 0) {
      status = "complete_except_consumables";
    }
    return {
      build_name: template.build_name,
      status,
      builds_possible: strictCoreBuilds === Infinity ? 0 : strictCoreBuilds,
      missing_required: missingRequired,
      missing_hidden_or_integrated: missingHidden,
      missing_consumables: missingConsumables
    };
  });
}
