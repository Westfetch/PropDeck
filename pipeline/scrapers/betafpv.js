import { ShopifyScraper } from './_base.js';
import { log } from '../lib/log.js';

// BetaFPV collections that contain FPV parts
const COLLECTIONS = [
  'brushless-motors',
  'brushless-whoop-drone',      // Complete BNF/RTF quads
  'aio-toothpick-boards',       // AIO flight controllers
  'flight-controller',
  'fpv-camera',
  'fpv-vtx',
  'frame',
  'propellers',
  'battery-charger',            // Chargers
  'batteries',
  'radio-transmitter',
  'elrs-receiver',
];

// Parse specs from Shopify product description HTML
const parseSpecsFromDescription = (html) => {
  if (!html) return {};
  const specs = {};

  // KV rating
  const kvMatch = html.match(/(\d{3,5})\s*KV/i);
  if (kvMatch) specs.kv = kvMatch[1];

  // Stator size
  const statorMatch = html.match(/(?:stator|motor)\s*(?:size)?[:\s]*(\d{4})/i) ||
                       html.match(/(\d{4})\s*(?:brushless|motor)/i);
  if (statorMatch) specs.stator_size = statorMatch[1];

  // Weight
  const weightMatch = html.match(/(?:weight|motor weight)[:\s]*([\d.]+)\s*g/i);
  if (weightMatch) specs.weight_g = parseFloat(weightMatch[1]);

  // Shaft diameter
  const shaftMatch = html.match(/(?:shaft|shaft diameter)[:\s]*[ø⌀]?([\d.]+)\s*mm/i);
  if (shaftMatch) specs.shaft = `${shaftMatch[1]}mm`;

  // Rated voltage / cell count
  const voltageMatch = html.match(/([\d.]+)\s*V\s*\((\d)S\)/i) ||
                        html.match(/(\d)S\s*(?:lipo|battery|rated)/i);
  if (voltageMatch) specs.cell_count = `${voltageMatch[2] || voltageMatch[1]}S`;

  // Protocol (for AIO/RX)
  const protoMatch = html.match(/\b(ELRS|ExpressLRS|Crossfire|FrSky|TBS)\b/i);
  if (protoMatch) specs.protocol = protoMatch[1].toUpperCase() === 'EXPRESSLRS' ? 'ELRS' : protoMatch[1];

  // Amperage (for AIO/ESC)
  const ampMatch = html.match(/(\d+)\s*A\s*(?:ESC|continuous|BLHeli)/i);
  if (ampMatch) specs.amperage = `${ampMatch[1]}A`;

  // Frame size
  const frameMatch = html.match(/(\d{2,3})\s*mm\s*(?:wheelbase|frame|whoop)/i);
  if (frameMatch) specs.frame_size = `${frameMatch[1]}mm`;

  // Connector
  const connMatch = html.match(/\b(BT\s*2\.0|PH\s*2\.0|XT30|XT60)\b/i);
  if (connMatch) specs.connector = connMatch[1].replace(/\s/g, '');

  // Firmware
  const fwMatch = html.match(/\b(Betaflight|INAV|iNAV)\b/i);
  if (fwMatch) specs.firmware = fwMatch[1];

  // Video system
  const vidMatch = html.match(/\b(Analog|HDZero|Walksnail|DJI\s*O[34])\b/i);
  if (vidMatch) specs.video = vidMatch[1];

  // Camera sensor
  const sensorMatch = html.match(/(1\/[234](?:\.\d)?["\s]*CMOS)/i);
  if (sensorMatch) specs.sensor = sensorMatch[1].replace(/"/g, '"');

  // FOV
  const fovMatch = html.match(/FOV[:\s]*([\d.]+)/i);
  if (fovMatch) specs.fov = fovMatch[1];

  // VTX power
  const powerMatch = html.match(/(\d+)\s*mW/i);
  if (powerMatch) specs.power = `${powerMatch[1]}mW`;

  // Build type from title-ish patterns
  const buildMatch = html.match(/\b(BNF|RTF|PNP|Kit)\b/i);
  if (buildMatch) specs.build_type = buildMatch[1].toUpperCase();

  // Capacity (battery)
  const capMatch = html.match(/(\d{2,4})\s*mAh/i);
  if (capMatch) specs.capacity_mah = capMatch[1];

  return specs;
};

// Classify what part type this product is
const classifyPartType = (product) => {
  const title = (product.title || '').toLowerCase();
  const type = (product.product_type || '').toLowerCase();
  const rawTags = product.tags || '';
  const tags = (typeof rawTags === 'string' ? rawTags.split(',').map(t => t.trim()) : rawTags).map(t => t.toLowerCase());
  const all = `${title} ${type} ${tags.join(' ')}`;

  if (all.includes('motor') || all.includes('brushless motor')) return 'motor';
  if (all.includes('aio') || all.includes('flight controller') || all.includes('toothpick board')) return 'aio';
  if (all.includes('frame') || all.includes('whoop frame')) return 'frame';
  if (all.includes('camera') || all.includes('fpv camera')) return 'camera';
  if (all.includes('vtx') || all.includes('video transmitter')) return 'vtx';
  if (all.includes('receiver') || all.includes('elrs rx')) return 'rx';
  if (all.includes('propeller') || all.includes('props')) return 'propeller';
  if (all.includes('battery') || all.includes('lipo')) return 'battery';
  if (all.includes('charger')) return 'charger';
  if (all.includes('radio') || all.includes('transmitter') || all.includes('controller')) return 'radio';
  if (all.includes('goggle')) return 'goggles';
  if (all.includes('antenna')) return 'antenna';

  // Check if it's a complete quad (BNF/RTF)
  if (all.includes('bnf') || all.includes('rtf') || all.includes('drone') || all.includes('whoop drone')) return 'quad';

  return 'unknown';
};

// Generate a stable variant_id slug
const makeVariantId = (brand, name) => {
  return `${brand}-${name}`
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 64);
};

export class BetaFPVScraper extends ShopifyScraper {
  constructor() {
    super('betafpv', 'https://betafpv.com', COLLECTIONS);
  }

  extractProduct(product, url) {
    if (!product) return null;

    const partType = classifyPartType(product);
    if (partType === 'unknown') {
      log.warn(this.name, `  Skipping unknown type: ${product.title}`);
      return null;
    }

    const specs = parseSpecsFromDescription(product.body_html || '');
    const variants = (product.variants || []).map(v => ({
      shopify_variant_id: v.id,
      title: v.title,
      price: v.price,
      sku: v.sku,
      weight: v.weight,
      available: v.available,
    }));

    // For motors, each Shopify variant (different KV) is a separate brain variant
    // For other parts, the Shopify product is usually one brain variant
    const brainVariants = [];

    if (partType === 'motor' && variants.length > 1) {
      for (const v of variants) {
        const variantTitle = `${product.title} ${v.title}`.trim();
        const variantSpecs = { ...specs };

        // Try to extract KV from variant title
        const kvMatch = v.title.match(/(\d{3,5})\s*KV/i) || v.title.match(/(\d{3,5})KV/i);
        if (kvMatch) variantSpecs.kv = kvMatch[1];

        // Parse weight from variant title if present
        const wMatch = v.title.match(/([\d.]+)\s*g/i);
        if (wMatch) variantSpecs.weight_g = parseFloat(wMatch[1]);

        brainVariants.push({
          variant_id: makeVariantId('betafpv', `${product.title}-${v.title}`),
          product_name: `BETAFPV ${variantTitle}`,
          brand: 'BETAFPV',
          price: v.price,
          ...variantSpecs,
        });
      }
    } else if (partType === 'quad') {
      // Complete quads become product patterns, not variants
      brainVariants.push({
        variant_id: makeVariantId('betafpv', product.title),
        product_name: `BETAFPV ${product.title}`,
        brand: 'BETAFPV',
        price: variants[0]?.price,
        build_type: specs.build_type || 'BNF',
        is_quad: true,
        ...specs,
      });
    } else {
      brainVariants.push({
        variant_id: makeVariantId('betafpv', product.title),
        product_name: `BETAFPV ${product.title}`,
        brand: 'BETAFPV',
        price: variants[0]?.price,
        ...specs,
      });
    }

    return {
      source: 'betafpv',
      source_url: url.replace('.json', ''),
      scraped_at: new Date().toISOString(),
      shopify_id: product.id,
      title: product.title,
      part_type: partType,
      tags: typeof product.tags === 'string' ? product.tags.split(',').map(t => t.trim()).filter(Boolean) : (product.tags || []),
      image: product.images?.[0]?.src || null,
      shopify_variants: variants,
      brain_variants: brainVariants,
      raw_specs: specs,
    };
  }
}

export default BetaFPVScraper;
