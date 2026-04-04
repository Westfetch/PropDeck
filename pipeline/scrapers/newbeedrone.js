import { ShopifyScraper } from './_base.js';
import { log } from '../lib/log.js';

// NewBeeDrone collections covering their FPV parts catalogue
const COLLECTIONS = [
  'drone-motors',
  'drone-frame',
  'drone-fc-esc',
  'drone-vtx-camera-systems',
  'drone-receiver',
  'drone-propellers',
  'drone-batteries',
  'chargers',
  'goggles',
  'remote-controller',
  'drone-antennas',
];

// Spec extraction from product description HTML
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

  // Title-level checks first
  if (title.includes('frame') || title.includes('frame kit')) return 'frame';
  if (title.includes('motor base') || title.includes('body plate') || title.includes('motor guard')) return 'unknown';
  if (title.includes('aio') || title.includes('flight controller')) return 'aio';

  if (all.includes('motor') || all.includes('brushless motor')) return 'motor';
  if (all.includes('stack') || all.includes('flight controller') || all.includes('fc') && all.includes('esc')) return 'aio';
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

  // Complete quads
  if (all.includes('bnf') || all.includes('rtf') || all.includes('drone')) return 'quad';

  return 'unknown';
};

const makeVariantId = (brand, name) => {
  return `nbd-${brand}-${name}`
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 64);
};

// Extract brand from product title (NewBeeDrone sells their own brand + others)
const extractBrand = (title) => {
  const brandPatterns = [
    /^(NewBeeDrone)/i,
    /^(BETAFPV|BetaFPV)/i,
    /^(Happymodel)/i,
    /^(EMAX|Emax)/i,
    /^(GepRC|GEPRC)/i,
    /^(iFlight)/i,
    /^(Flywoo)/i,
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
    /^(T-Motor|Tmotor)/i,
    /^(DarwinFPV)/i,
    /^(Sub250)/i,
    /^(Lumenier)/i,
    /^(HDZero)/i,
    /^(Walksnail)/i,
    /^(FrSky)/i,
  ];

  for (const pattern of brandPatterns) {
    const match = title.match(pattern);
    if (match) return match[1];
  }
  return 'NewBeeDrone';
};

export class NewBeeDroneScraper extends ShopifyScraper {
  constructor() {
    super('newbeedrone', 'https://newbeedrone.com', COLLECTIONS);
    this.delayMs = 1500;
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
    } else if (partType === 'quad') {
      brainVariants.push({
        variant_id: makeVariantId(brand, product.title),
        product_name: product.title,
        brand,
        price: variants[0]?.price,
        build_type: specs.build_type || 'BNF',
        is_quad: true,
        ...specs,
      });
    } else {
      brainVariants.push({
        variant_id: makeVariantId(brand, product.title),
        product_name: product.title,
        brand,
        price: variants[0]?.price,
        ...specs,
      });
    }

    return {
      source: 'newbeedrone',
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

export default NewBeeDroneScraper;
