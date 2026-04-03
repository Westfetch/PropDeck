export function confirmSuggestion(suggestion) {
  return { ...suggestion, state: "confirmed", user_correction: null };
}
export function correctSuggestion(suggestion, canonicalPart) {
  return { ...suggestion, state: "corrected", user_correction: canonicalPart };
}
export function rejectSuggestion(suggestion) {
  return { ...suggestion, state: "rejected" };
}
