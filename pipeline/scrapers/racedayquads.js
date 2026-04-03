import { ShopifyScraper } from './_base.js';
import { log } from '../lib/log.js';

// RaceDayQuads collections focused on whoop/micro parts (deep tinywhoop first)
const COLLECTIONS = [
  // Motors
  '07xx-motors',
  '08xx-brushless-motors',
  '10xx-brushless-motors',
  '11xx-brushless-motors',
  '12xx-brushless-motors',
  '13xx-brushless-motors',
  '14xx-brushless-motors',
  // Frames
  'micro-frames',
  '2-frames',
  '2-5-frames',
  // Electronics
  '25x25-aio',
  '20x20-stacks',
  'all-16x16-electronics',
  // Props
  'micro-props',
  '2-props',
  '2-5-65mm-props',
  // Batteries
  '1s-batteries',
  // Receivers
  'expresslrs-receivers',
  // Cameras
  'fpv-cameras',
  // VTX
  'analog-vtx',
];

// Same spec extraction as betafpv but adapted for retailer product descriptions
const parseSpecsFromDescription = (html) => {
  if (!html) return {};
  const specs = {};

  const kvMatch = html.match(/(\d{3,5})\s*KV/i);
  if (kvMatch) specs.kv = kvMatch[1];

  const statorMatch = html.match(/(?:stator|motor)\s*(?:size)?[:\s]*(\d{4})/i) ||
                       html.match(/(\d{4})\s*(?:brushless|motor)/i);
  if (statorMatch) specs.stator_size = statorMatch[1];

  const weightMatch = html.match(/(?:weight|motor weight)[:\s]*([\d.]+)\s*g/i);
  if (weightMatch) specs.weight_g = parseFloat(weightMatch[1]);

  const shaftMatch = html.match(/(?:shaft|shaft diameter)[:\s]*[ø⌀]?([\d.]+)\s*mm/i);
  if (shaftMatch) specs.shaft = `${shaftMatch[1]}mm`;

  const protoMatch = html.match(/\b(ELRS|ExpressLRS|Crossfire|FrSky|TBS)\b/i);
  if (protoMatch) specs.protocol = protoMatch[1].toUpperCase() === 'EXPRESSLRS' ? 'ELRS' : protoMatch[1];

  const ampMatch = html.match(/(\d+)\s*A\s*(?:ESC|continuous|BLHeli)/i);
  if (ampMatch) specs.amperage = `${ampMatch[1]}A`;

  const connMatch = html.match(/\b(BT\s*2\.0|PH\s*2\.0|XT30|XT60)\b/i);
  if (connMatch) specs.connector = connMatch[1].replace(/\s/g, '');

  const vidMatch = html.match(/\b(Analog|HDZero|Walksnail|DJI\s*O[34])\b/i);
  if (vidMatch) specs.video = vidMatch[1];

  const powerMatch = html.match(/(\d+)\s*mW/i);
  if (powerMatch) specs.power = `${powerMatch[1]}mW`;

  const capMatch = html.match(/(\d{2,4})\s*mAh/i);
  if (capMatch) specs.capacity_mah = capMatch[1];

  return specs;
};

// Classify part type from product data
const classifyPartType = (product) => {
  const title = (product.title || '').toLowerCase();
  const type = (product.product_type || '').toLowerCase();
  const rawTags = product.tags || '';
  const tags = (typeof rawTags === 'string' ? rawTags.split(',').map(t => t.trim()) : rawTags).map(t => t.toLowerCase());
  const all = `${title} ${type} ${tags.join(' ')}`;

  if (all.includes('motor') || all.includes('brushless motor')) return 'motor';
  if (all.includes('aio') || all.includes('flight controller') || all.includes('stack')) return 'aio';
  if (all.includes('frame')) return 'frame';
  if (all.includes('camera') || all.includes('fpv cam')) return 'camera';
  if (all.includes('vtx') || all.includes('video transmitter')) return 'vtx';
  if (all.includes('receiver') || all.includes('elrs rx') || all.includes('expresslrs')) return 'rx';
  if (all.includes('propeller') || all.includes('props') || all.includes('prop')) return 'propeller';
  if (all.includes('battery') || all.includes('lipo') || all.includes('lihv')) return 'battery';
  if (all.includes('charger')) return 'charger';
  if (all.includes('radio') || all.includes('transmitter')) return 'radio';
  if (all.includes('goggle')) return 'goggles';
  if (all.includes('antenna')) return 'antenna';

  return 'unknown';
};

const makeVariantId = (brand, name) => {
  return `rdq-${brand}-${name}`
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 64);
};

// Extract brand from product title (RDQ sells multiple brands)
const extractBrand = (title) => {
  const brandPatterns = [
    /^(BETAFPV|BetaFPV)/i,
    /^(Happymodel)/i,
    /^(EMAX|Emax)/i,
    /^(GepRC|GEPRC)/i,
    /^(iFlight)/i,
    /^(Flywoo)/i,
    /^(NewBeeDrone)/i,
    /^(Caddx)/i,
    /^(RunCam|Runcam)/i,
    /^(TBS|Team BlackSheep)/i,
    /^(RadioMaster)/i,
    /^(Gemfan)/i,
    /^(HQProp|HQ)/i,
    /^(GNB|Gaoneng)/i,
    /^(Tattu)/i,
    /^(VIFLY)/i,
    /^(HGLRC)/i,
    /^(Diatone)/i,
    /^(Foxeer)/i,
    /^(RUSHFPV|Rush)/i,
  ];

  for (const pattern of brandPatterns) {
    const match = title.match(pattern);
    if (match) return match[1];
  }
  return 'Unknown';
};

export class RaceDayQuadsScraper extends ShopifyScraper {
  constructor() {
    super('racedayquads', 'https://www.racedayquads.com', COLLECTIONS);
    this.delayMs = 1500; // slightly more polite for retailer
  }

  extractProduct(product, url) {
    if (!product) return null;

    const partType = classifyPartType(product);
    if (partType === 'unknown') {
      log.warn(this.name, `  Skipping unknown type: ${product.title}`);
      return null;
    }

    const brand = extractBrand(product.title || '');
    const specs = parseSpecsFromDescription(product.body_html || '');
    const variants = (product.variants || []).map(v => ({
      shopify_variant_id: v.id,
      title: v.title,
      price: v.price,
      sku: v.sku,
      available: v.available,
    }));

    const brainVariants = [];

    if (partType === 'motor' && variants.length > 1) {
      for (const v of variants) {
        const variantTitle = v.title !== 'Default Title' ? `${product.title} ${v.title}` : product.title;
        const variantSpecs = { ...specs };
        const kvMatch = v.title.match(/(\d{3,5})\s*KV/i);
        if (kvMatch) variantSpecs.kv = kvMatch[1];

        brainVariants.push({
          variant_id: makeVariantId(brand, variantTitle),
          product_name: variantTitle,
          brand,
          price: v.price,
          ...variantSpecs,
        });
      }
    } else {
      const variantTitle = product.title;
      brainVariants.push({
        variant_id: makeVariantId(brand, variantTitle),
        product_name: variantTitle,
        brand,
        price: variants[0]?.price,
        ...specs,
      });
    }

    return {
      source: 'racedayquads',
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

export default RaceDayQuadsScraper;
