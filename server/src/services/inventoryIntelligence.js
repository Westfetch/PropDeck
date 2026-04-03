const BUILD_RECIPES = [
  {
    name: '65mm Whoop',
    requires: {
      motor: 4,
      frame: 1,
      aio: 1,
      propeller: 4
    }
  }
];

const PRICE_MAP = {
  motor: 12,
  frame: 8,
  aio: 40,
  propeller: 2,
  battery: 6,
  camera: 18,
  vtx: 15,
  goggles: 90,
  radio: 75
};

export function detectBuilds(inventory) {
  return BUILD_RECIPES.map((recipe) => {
    let possible = true;
    const missing = [];

    for (const [part, needed] of Object.entries(recipe.requires)) {
      const available = inventory
        .filter((item) => item.type === part)
        .reduce((sum, item) => sum + (item.quantity || 1), 0);

      if (available < needed) {
        possible = false;
        missing.push({ part, needed, available });
      }
    }

    return { name: recipe.name, possible, missing };
  });
}

export function estimateValue(inventory) {
  return inventory.reduce((sum, item) => {
    const unitPrice = PRICE_MAP[item.type] || 5;
    return sum + unitPrice * (item.quantity || 1);
  }, 0);
}

export function generateInsights(builds, value) {
  const insights = [];

  builds.forEach((build) => {
    if (build.possible) {
      insights.push(`You can build a ${build.name}`);
    } else {
      const missingParts = build.missing.map((item) => item.part).join(', ');
      insights.push(`Missing for ${build.name}: ${missingParts}`);
    }
  });

  insights.push(`Estimated value: £${value}`);
  return insights;
}

export function runInventoryIntelligence(inventory) {
  const builds = detectBuilds(inventory);
  const value = estimateValue(inventory);
  const insights = generateInsights(builds, value);

  return { builds, value, insights };
}
