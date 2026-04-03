export function createTransaction({
  type = "swap",
  initiator_user_id,
  counterparty_user_id,
  user_1_gives = [],
  user_2_gives = [],
  value_summary = {},
  messages_thread_id = null
}) {
  return {
    id: crypto.randomUUID(),
    type,
    status: "draft",
    initiator_user_id,
    counterparty_user_id,
    items: { user_1_gives, user_2_gives },
    value_summary,
    messages_thread_id,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };
}
