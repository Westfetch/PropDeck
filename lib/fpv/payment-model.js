export function createPayment({
  transaction_id,
  payer_user_id,
  payee_user_id,
  amount_gbp,
  type = "item",
  provider = null
}) {
  return {
    id: crypto.randomUUID(),
    transaction_id,
    payer_user_id,
    payee_user_id,
    amount_gbp,
    type,
    status: "pending",
    provider,
    provider_ref: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };
}
