export function buildFPVListingPrompt({ rawText = "", platformName = "" } = {}) {
  return `You are extracting structured FPV part data from a retailer or community listing.

CRITICAL RULES:
- Never guess details not clearly stated.
- Return null for any field not directly present in the text.
- Prefer mapping to a part family over inventing an exact model.
- If the text is not FPV-related, return { "type": "not_fpv_listing" }.
- If the text is too short or ambiguous, return { "type": "unreadable" }.

Platform: ${platformName || "unknown"}
Raw listing text:
${rawText}

Return ONLY valid JSON.`;
}
