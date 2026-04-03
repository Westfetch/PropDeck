export const PRICE_MAP = {
  "0702 motor": 5, "0802 motor": 6, "1002 motor": 8, "1102 motor": 10,
  "65mm whoop frame": 10, "75mm whoop frame": 12, "2 inch frame": 25, "5 inch frame": 45,
  "1S whoop AIO": 35, "2S whoop AIO": 45, "20x20 stack": 60, "30x30 stack": 75,
  "nano analog camera": 15, "micro analog camera": 20, "whoop VTX": 15, "standalone analog VTX": 20,
  "ELRS receiver": 12, "SPI ELRS receiver": 10, "31mm propeller": 1.5, "40mm propeller": 2,
  "2 inch propeller": 3, "5 inch propeller": 3.5, "1S LiPo battery": 4, "BT2.0 1S battery": 5,
  "PH2.0 1S battery": 4.5, "4S LiPo battery": 18, "6S LiPo battery": 25,
  "analog FPV goggles": 120, "ELRS radio transmitter": 90, "LiPo charger": 35, "FPV antenna": 8
};

export const CONDITION_MULTIPLIERS = {
  new: 1.0, tested_ok: 0.85, used: 0.7, unknown: 0.55, faulty: 0.25, for_parts: 0.2
};

export function estimateItemValue(item, priceMap = PRICE_MAP) {
  const base = priceMap[item.canonical_name] ?? 0;
  const quantity = item.quantity || 1;
  const multiplier = CONDITION_MULTIPLIERS[item.condition || "unknown"] ?? 0.55;
  return +(base * quantity * multiplier).toFixed(2);
}

export function getFairness(yourValue, theirValue) {
  if (yourValue <= 0 || theirValue <= 0) return "unknown";
  const max = Math.max(yourValue, theirValue);
  const diff = Math.abs(yourValue - theirValue);
  const pct = diff / max;
  if (pct <= 0.15) return "balanced";
  if (pct <= 0.35) return "slightly_unbalanced";
  return "unbalanced";
}
