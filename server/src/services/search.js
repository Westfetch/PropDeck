function parseMotorQuery(query) {
  const kvMatch = query.match(/\b(\d{5})\b/);
  const statorMatch = query.match(/\b(\d{4})\b/);

  return {
    kv: kvMatch ? Number(kvMatch[1]) : null,
    stator: statorMatch ? statorMatch[1] : null
  };
}

export function searchParts(query, inventory) {
  const normalized = query.toLowerCase().trim();
  const parsed = parseMotorQuery(normalized);

  const canonical = {
    name: `${parsed.stator || 'Unknown'} ${parsed.kv || ''} Motor`.trim(),
    subtitle: 'Typical whoop motor for 65–75mm builds',
    type: 'motor',
    specs: parsed
  };

  const retailers = [
    {
      id: 'r1',
      store: 'HobbyRC',
      price: 11.99,
      stock: 'In stock',
      link: '#'
    },
    {
      id: 'r2',
      store: 'Unmanned Tech',
      price: 12.49,
      stock: 'Low stock',
      link: '#'
    }
  ];

  const owned = inventory.filter((item) => {
    if (item.type !== 'motor') return false;
    if (!parsed.stator) return item.name.toLowerCase().includes(normalized);
    return item.specs?.stator_size === parsed.stator;
  });

  const suggestions = [
    '0802 19000KV',
    '0702 23000KV',
    '31mm whoop props',
    '1S BT2.0 pigtail'
  ];

  return { canonical, retailers, owned, suggestions };
}
