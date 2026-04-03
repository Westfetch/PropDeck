export function createInventoryItemFromSuggestion(suggestion, overrides = {}) {
  const canonical_name = overrides.canonical_name || suggestion.user_correction || suggestion.suggested_part;
  return {
    id: overrides.id || crypto.randomUUID(),
    user_id: overrides.user_id || null,
    canonical_name,
    part_type: overrides.part_type || suggestion.part_type,
    quantity: overrides.quantity || suggestion.quantity || 1,
    variant: {
      brand: suggestion.extracted?.brand ?? null,
      model: suggestion.extracted?.model ?? null,
      kv: suggestion.extracted?.kv ?? null,
      cell_count: suggestion.extracted?.cell_count ?? null,
      connector: suggestion.extracted?.connector ?? null,
      size: suggestion.extracted?.size ?? null,
      mount: suggestion.extracted?.mount ?? null,
      video: suggestion.extracted?.video ?? null,
      protocol: suggestion.extracted?.protocol ?? null
    },
    source: suggestion.input_source || "manual",
    source_ref: suggestion.source_ref || null,
    evidence_state: overrides.evidence_state || suggestion.evidence_state || "confirmed",
    confidence: suggestion.confidence || "low",
    visibility: overrides.visibility || "private",
    trade_status: overrides.trade_status || "not_for_sale",
    condition: overrides.condition || "unknown",
    notes: overrides.notes || null,
    flight_proof_media: overrides.flight_proof_media || null,
    created_at: overrides.created_at || new Date().toISOString(),
    updated_at: overrides.updated_at || new Date().toISOString()
  };
}
