import { PARCEL_PRESETS } from "./shipping-presets.js";

export function createShipment({
  transaction_id,
  from_user_id,
  to_user_id,
  items = [],
  preset = "parts_padded_bag"
}) {
  const parcel = PARCEL_PRESETS[preset] || PARCEL_PRESETS.parts_padded_bag;
  return {
    id: crypto.randomUUID(),
    transaction_id,
    from_user_id,
    to_user_id,
    items,
    parcel: {
      preset,
      weight_g: parcel.weight_g,
      dimensions_cm: parcel.dimensions_cm
    },
    quote: {},
    label: { status: "none", tracking_number: null, label_url: null },
    status: "not_created",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };
}
