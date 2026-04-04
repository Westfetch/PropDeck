import { ShopifyScraper } from './_base.js';
import { log } from '../lib/log.js';

// Ummagawd collections - niche freestyle/cinewhoop brand + multi-brand retailer
const COLLECTIONS = [
  'motors',        // 14 products
  'frames',        // 29 products
  'propellers',    // 21 products
  'batteries',     // 6 products
  'esc-fc',        // 11 products - flight controllers and ESCs
  'rx',            // 9 products - receivers
  'vtx',           // 8 products - video transmitters
  'antenna',       // 3 products
  'naked-gopro',   // 10 products - action cameras
  'ready-to-fly',  // 7 products - BNF/RTF quads
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

  const connMatch = html.match(/\b(BT\s*2\.0|PH\s*2\.0|XT30|XT60)\b/i);
  if (connMatch) specs.connector = connMatch[1].replace(/\s/g, '');

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

  // Title-level keywords first
  if (/frame kit|frame\b/i.test(title) && !/cam mount|canopy|arm kit|conversion/i.test(title)) return 'frame';
  if (/spare bell|motor screw|motor guard/i.test(title)) return 'unknown';
  if (/\baio\b|flight controller/i.test(title)) return 'aio';
  if (/\bprop\b|\bprops\b|propeller/i.test(title)) return 'propeller';
  if (/\bmotor\b/i.test(title) && !/motor mount|motor screw/i.test(title)) return 'motor';

  // Naked GoPro / action camera
  if (/naked\s*gopro|naked\s*camera|action\s*cam|smo4k/i.test(title)) return 'camera';

  if (all.includes('stack') || (all.includes('fc') && all.includes('esc'))) return 'aio';
  if (all.includes('camera') || all.includes('fpv cam')) return 'camera';
  if (all.includes('vtx') || all.includes('video transmitter')) return 'vtx';
  if (all.includes('receiver') || all.includes('elrs rx')) return 'rx';
  if (all.includes('battery') || all.includes('lipo')) return 'battery';
  if (all.includes('charger')) return 'charger';
  if (all.includes('radio') || all.includes('transmitter') || all.includes('tx module')) return 'radio';
  if (all.includes('goggle')) return 'goggles';
  if (all.includes('antenna')) return 'antenna';
  if (all.includes('bnf') || all.includes('rtf')) return 'quad';

  return 'unknown';
};

const makeVariantId = (brand, name) => {
  return `um-${brand}-${name}`
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 64);
};

const extractBrand = (title) => {
  const brandPatterns = [
    /^(Ummagawd)/i,
    /^(BotGrinder)/i,
    /^(BETAFPV|BetaFPV)/i,
    /^(Happymodel)/i,
    /^(EMAX|Emax)/i,
    /^(GepRC|GEPRC)/i,
    /^(iFlight)/i,
    /^(Caddx)/i,
    /^(RunCam|Runcam)/i,
    /^(Gemfan)/i,
    /^(HQProp)/i,
    /^(GNB|Gaoneng)/i,
    /^(Tattu)/i,
    /^(HDZero)/i,
    /^(Walksnail)/i,
    /^(T-Motor|Tmotor)/i,
    /^(RadioMaster)/i,
    /^(TBS|Team BlackSheep)/i,
    /^(Foxeer)/i,
    /^(Ethix)/i,
    /^(Lumenier)/i,
  ];

  for (const pattern of brandPatterns) {
    const match = title.match(pattern);
    if (match) return match[1];
  }
  return 'Ummagawd';
};

export class UmmagawdScraper extends ShopifyScraper {
  constructor() {
    super('ummagawd', 'https://www.ummagawd.com', COLLECTIONS);
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
        build_type: 'BNF',
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
      source: 'ummagawd',
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

export default UmmagawdScraper;
