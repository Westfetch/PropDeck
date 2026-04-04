import { lookupParts } from '../../lib/fpv/lookup-parts.js';
import partLibrary from '../../lib/fpv/part-library.json' with { type: 'json' };
import aliasRules from '../../lib/fpv/fpv-alias-rules.json' with { type: 'json' };
import { log } from '../lib/log.js';

// Reuse the signal extractors from the brain's alias rules
const extractSignals = (text) => {
  const signals = {};
  for (const extractor of aliasRules.signal_extractors) {
    const flags = extractor.case_insensitive ? 'gi' : 'g';
    const regex = new RegExp(extractor.pattern, flags);
    const match = regex.exec(text);
    if (match) signals[extractor.signal] = match[1] || match[0];
  }
  return signals;
};

// Map part_type from scraper to canonical part_type names
const PART_TYPE_MAP = {
  motor: 'motor',
  aio: 'aio',
  frame: 'frame',
  camera: 'camera',
  vtx: 'vtx',
  rx: 'rx',
  propeller: 'propeller',
  battery: 'battery',
  charger: 'charger',
  radio: 'radio',
  goggles: 'goggles',
  antenna: 'antenna',
};

// Build variant object with only the fields relevant to this part type
const buildVariantFields = (partType, variant) => {
  const fields = {
    variant_id: variant.variant_id,
    product_name: variant.product_name,
    brand: variant.brand,
  };

  switch (partType) {
    case 'motor':
      if (variant.kv) fields.kv = variant.kv;
      if (variant.weight_g) fields.weight_g = variant.weight_g;
      if (variant.shaft) fields.shaft = variant.shaft;
      break;
    case 'aio':
      if (variant.protocol) fields.protocol = variant.protocol;
      if (variant.firmware) fields.firmware = variant.firmware;
      if (variant.amperage) fields.amperage = variant.amperage;
      if (variant.receiver) fields.receiver = variant.receiver;
      break;
    case 'frame':
      if (variant.weight_g) fields.weight_g = variant.weight_g;
      if (variant.frame_size) fields.size = variant.frame_size;
      break;
    case 'camera':
      if (variant.sensor) fields.sensor = variant.sensor;
      if (variant.fov) fields.fov = variant.fov;
      if (variant.video) fields.video = variant.video;
      break;
    case 'vtx':
      if (variant.power) fields.power = variant.power;
      if (variant.video) fields.video = variant.video;
      break;
    case 'rx':
      if (variant.protocol) fields.protocol = variant.protocol;
      break;
    case 'propeller':
      break;
    case 'battery':
      if (variant.capacity_mah) fields.capacity_mah = variant.capacity_mah;
      if (variant.connector) fields.connector = variant.connector;
      if (variant.cell_count) fields.cell_count = variant.cell_count;
      break;
    case 'charger':
      break;
    case 'radio':
      if (variant.protocol) fields.protocol = variant.protocol;
      break;
    case 'goggles':
      if (variant.video) fields.video = variant.video;
      break;
    case 'antenna':
      if (variant.frequency) fields.frequency = variant.frequency;
      if (variant.connector) fields.connector = variant.connector;
      break;
  }

  return fields;
};

// Map frame product names to canonical sizes
const FRAME_SIZE_MAP = {
  '65': '65mm whoop frame',
  '75': '75mm whoop frame',
  '80': '75mm whoop frame',
  '85': '75mm whoop frame',
  'pico': '65mm whoop frame',
  'femto': '65mm whoop frame',
  'pavo20': '2 inch frame',
  'pavo25': '2.5 inch frame',
  'pavo35': '3.5 inch cinewhoop frame',
  'cinelog25': '2.5 inch frame',
  'cineape': '2.5 inch frame',
  'cinerat': '3 inch cinewhoop frame',
  'tadpole': '3 inch cinewhoop frame',
  'babytooth': '3 inch cinewhoop frame',
  'stingerbee': '3 inch cinewhoop frame',
  'firefly16': '65mm whoop frame',
  'firefly18': '75mm whoop frame',
  'cockroach 82': '75mm whoop frame',
  'cockroach82': '75mm whoop frame',
};

const resolveFrameCanonical = (title) => {
  const lower = title.toLowerCase();
  // Filter frame accessories and non-frame items
  if (/bracket|canopy\b|screw\b|standoff|tpu\b|arm guard|bumper|antenna mount|camera plate|side plate only|top plate only|bottom plate only|cam mount|3d print|replacement duct|prop guard|carbon fiber & accessory|plastic part and carbon|foam pad|grommet|lipo foam|conversion kit|propguard|camera mount|cleanup|installation kit|bottom plate\b|goober|receiver installation/i.test(lower)) return null;
  if (/camera with|power module|baseboards?|pixhawk|airspeed|telemetry/i.test(lower)) return null;
  // Try size in mm first
  const sizeMatch = lower.match(/(\d{2,3})\s*mm/);
  if (sizeMatch) {
    const mm = parseInt(sizeMatch[1]);
    if (mm <= 65) return '65mm whoop frame';
    if (mm <= 85) return '75mm whoop frame';
  }
  // Try inch-based patterns
  const inchMatch = lower.match(/([\d.]+)\s*["'\u2033]|(\d{1,2}(?:\.\d)?)\s*inch/);
  if (inchMatch) {
    const inches = parseFloat(inchMatch[1] || inchMatch[2]);
    if (inches <= 2) return '2 inch frame';
    if (inches <= 2.5) return '2.5 inch frame';
    if (inches <= 3) return '3 inch cinewhoop frame';
    if (inches <= 3.5) return '3.5 inch cinewhoop frame';
    if (inches < 6) return '5 inch frame';
    if (inches < 7) return '6 inch frame';
    if (inches < 8) return '7 inch frame';
    if (inches < 9) return '8 inch frame';
    if (inches <= 10) return '10 inch frame';
  }
  // DJI O4 frame patterns - extract size from model name
  if (/o4|o4\s*pro/i.test(lower)) {
    if (/vapor.?x5|mk5|\bd5\b/i.test(lower)) return '5 inch frame';
    if (/vapor.?x6|\bd6\b/i.test(lower)) return '6 inch frame';
    if (/vapor.?x7|\bd7\b/i.test(lower)) return '7 inch frame';
    if (/tc18|tc20|87mm/i.test(lower)) return '75mm whoop frame';
    if (/stingerbee.*3|3.*stingerbee/i.test(lower)) return '3 inch cinewhoop frame';
  }
  // Try product name patterns
  for (const [key, canonical] of Object.entries(FRAME_SIZE_MAP)) {
    if (lower.includes(key)) return canonical;
  }
  // Try extracting from names like "Air65", "Air75", "Meteor65", "Mobula6", "Mobula7"
  const nameSize = lower.match(/(?:air|meteor|mobula)\s*(\d{1,2})/);
  if (nameSize) {
    const num = parseInt(nameSize[1]);
    if (num <= 6 || num === 65) return '65mm whoop frame';
    if (num <= 8 || num === 75) return '75mm whoop frame';
  }
  // Named model patterns with embedded size numbers
  // AOS 7, Mark4-7, Master 5, Mario 5, Nazgul 5, etc.
  const modelNum = lower.match(/(?:aos|mark\d?-?|master\s*|mario\s*|nazgul\s*|evoque\s*|source\s*one\s*)\s*(\d{1,2})/);
  if (modelNum) {
    const num = parseInt(modelNum[1]);
    if (num === 25 || lower.includes('cine25')) return '2.5 inch frame';
    if (num === 35 || lower.includes('cine35')) return '3.5 inch cinewhoop frame';
    if (num <= 3) return '3 inch cinewhoop frame';
    if (num <= 4) return '3.5 inch cinewhoop frame';
    if (num === 5) return '5 inch frame';
    if (num === 6) return '6 inch frame';
    if (num === 7) return '7 inch frame';
    if (num === 8) return '8 inch frame';
    if (num === 10) return '10 inch frame';
  }
  // Holybro S500/X500 (500mm wheelbase = ~10 inch class)
  if (/[sx]500/i.test(lower)) return '10 inch frame';
  // AOS Cine patterns
  if (/cine25/i.test(lower)) return '2.5 inch frame';
  if (/cine35/i.test(lower)) return '3.5 inch cinewhoop frame';
  // Shendrones models
  if (/smol baby/i.test(lower)) return '3 inch cinewhoop frame';
  if (/thicc|sicc/i.test(lower)) return '3.5 inch cinewhoop frame';
  if (/swol/i.test(lower)) return '5 inch frame';
  if (/legato/i.test(lower)) return '5 inch frame';
  if (/akira/i.test(lower)) return '5 inch frame';
  // Axisflying AVATA 3.5
  if (/avata\s*3\.5/i.test(lower)) return '3.5 inch cinewhoop frame';
  // Cockroach75 / Cockroach82
  if (/cockroach\s*75/i.test(lower)) return '75mm whoop frame';
  if (/savag/i.test(lower)) return '3 inch cinewhoop frame';
  // Nazgul Evoque
  if (/nazgul|evoque/i.test(lower)) {
    if (/f4/i.test(lower)) return '5 inch frame';
    if (/f5/i.test(lower)) return '5 inch frame';
    if (/f6/i.test(lower)) return '6 inch frame';
    return '5 inch frame';
  }
  // GEP-CL30 / CL35 patterns
  const geprcCl = lower.match(/cl(\d{2})/);
  if (geprcCl) {
    const num = parseInt(geprcCl[1]);
    if (num === 25) return '2.5 inch frame';
    if (num === 30) return '3 inch cinewhoop frame';
    if (num === 35) return '3.5 inch cinewhoop frame';
  }
  // Long-range keyword detection
  if (/long\s*range|lr\d/i.test(lower)) {
    if (/\b7\b/.test(lower) || lower.includes('lr7')) return '7 inch frame';
    if (/\b10\b/.test(lower) || lower.includes('lr10')) return '10 inch frame';
    return '7 inch frame';
  }
  // Whoop in title without explicit size - default to 65mm
  if (lower.includes('whoop frame') && !lower.includes('85') && !lower.includes('75')) {
    return '65mm whoop frame';
  }
  return null;
};

// Map prop dimensions to canonical sizes
const PROP_SIZE_MAP = {
  '31': '31mm propeller',
  '35': '31mm propeller',   // 35mm close to 31mm whoop class
  '40': '40mm propeller',
  '45': '40mm propeller',   // 45mm close to 40mm class
  '65': '2 inch propeller', // 65mm = ~2.5 inch
  '90': '3 inch propeller', // D90 = 3 inch class
};

const propSizeFromInches = (inches) => {
  if (inches <= 2) return '2 inch propeller';
  if (inches <= 2.9) return '2 inch propeller';
  if (inches <= 3.2) return '3 inch propeller';
  if (inches <= 3.9) return '3.5 inch propeller';
  if (inches < 6) return '5 inch propeller';
  if (inches < 7) return '6 inch propeller';
  if (inches < 8) return '7 inch propeller';
  if (inches < 9) return '8 inch propeller';
  if (inches < 10) return '9 inch propeller';
  if (inches <= 12) return '10 inch propeller';
  return null;
};

const resolvePropCanonical = (title) => {
  const lower = title.toLowerCase();
  // Folding prop detection
  if (/folding|fold/i.test(lower)) {
    // Extract size from folding prop code: F1051 = 10", F9046 = 9", F7036 = 7"
    const foldMatch = lower.match(/f(\d{2})(\d{2})/);
    if (foldMatch) {
      const size = propSizeFromInches(parseInt(foldMatch[1]));
      if (size) return size;
    }
    return 'folding propeller';
  }
  // Direct mm match
  const mmMatch = lower.match(/(\d{2,3})\s*mm/);
  if (mmMatch) {
    const mm = mmMatch[1];
    if (PROP_SIZE_MAP[mm]) return PROP_SIZE_MAP[mm];
    const num = parseInt(mm);
    if (num <= 35) return '31mm propeller';
    if (num <= 45) return '40mm propeller';
    if (num <= 65) return '2 inch propeller';
    if (num <= 90) return '3 inch propeller';
    if (num <= 100) return '3.5 inch propeller';
    if (num >= 120) return '5 inch propeller';
  }
  // HQProp format: 15X10, 12X7.5X3, LR10X5X3, 7.5X3.7
  const hqMatch = lower.match(/(?:lr)?(\d{1,2}(?:\.\d)?)\s*x\s*\d/);
  if (hqMatch) {
    const size = propSizeFromInches(parseFloat(hqMatch[1]));
    if (size) return size;
  }
  // Decimal format: 10.1x5.5, 7.5x3.7
  const decimalMatch = lower.match(/(\d{1,2}\.\d)\s*[x\u00d7]\s*\d/);
  if (decimalMatch) {
    const size = propSizeFromInches(parseFloat(decimalMatch[1]));
    if (size) return size;
  }
  // Inch-based pattern: 2", 2.5", 3", 5", 5.1"
  const inchMatch = lower.match(/([\d.]+)\s*["'\u2033]\s*(?:prop|inch)?/);
  if (inchMatch) {
    const size = propSizeFromInches(parseFloat(inchMatch[1]));
    if (size) return size;
  }
  // "N inch" pattern without quote mark
  const inchWord = lower.match(/(\d{1,2}(?:\.\d)?)\s*inch/);
  if (inchWord) {
    const size = propSizeFromInches(parseFloat(inchWord[1]));
    if (size) return size;
  }
  // 5-digit blade code like "51377", "51433L" (first 2 digits = diameter in tenths of inch)
  const fiveDigitMatch = lower.match(/\b(\d{5})[a-z]?\b/);
  if (fiveDigitMatch) {
    const diamTenths = parseInt(fiveDigitMatch[1].slice(0, 2));
    const size = propSizeFromInches(diamTenths / 10);
    if (size) return size;
  }
  // 4-digit blade code: "1207" "1219S" "1614" "2020" "2218" "2512" "5226" "6040" "7035" "5152S"
  const bladeMatch = lower.match(/\b(\d{4})[a-z]?\b/);
  if (bladeMatch) {
    const code = bladeMatch[1];
    const diameter = parseInt(code.slice(0, 2));
    if (diameter <= 15) return '31mm propeller';
    if (diameter <= 22) return '40mm propeller';
    if (diameter <= 30) return '2 inch propeller';
    if (diameter <= 39) return '3 inch propeller';
    if (diameter <= 45) return '3.5 inch propeller';
    if (diameter <= 55) return '5 inch propeller';
    if (diameter <= 65) return '6 inch propeller';
    if (diameter <= 75) return '7 inch propeller';
    if (diameter <= 85) return '8 inch propeller';
    if (diameter <= 95) return '9 inch propeller';
    if (diameter >= 100) return '10 inch propeller';
  }
  // Ducted prop pattern like "D63", "D51", "D75", "D90"
  const ductedMatch = lower.match(/d(\d{2,3})/);
  if (ductedMatch) {
    const mm = parseInt(ductedMatch[1]);
    if (mm <= 55) return '2 inch propeller';
    if (mm <= 70) return '2 inch propeller';
    if (mm <= 95) return '3 inch propeller';
    if (mm <= 130) return '5 inch propeller';
  }
  return null;
};

// Battery-specific resolver
const resolveBatteryCanonical = (title) => {
  const lower = title.toLowerCase();
  // Skip accessories
  if (/balance lead|connector|strap|checker|tester|adapter|cable|charger board|parallel board/i.test(lower)) return null;
  // Brand-specific batteries without standard cell count notation
  if (/aquila\s*16/i.test(lower)) return 'PH2.0 1S battery';
  if (/aquila\s*20/i.test(lower)) return 'BT2.0 1S battery';
  if (/aquila\s*25/i.test(lower)) return '1S LiPo battery';
  // Extract cell count from title
  const cellMatch = lower.match(/(\d)s/);
  if (!cellMatch) return null;
  const cells = cellMatch[1];
  // Check for BT2.0/BT3.0 connector (1S specific)
  if (cells === '1') {
    if (/bt\s*2\.0/i.test(lower)) return 'BT2.0 1S battery';
    if (/ph\s*2\.0/i.test(lower)) return 'PH2.0 1S battery';
    return '1S LiPo battery';
  }
  if (cells === '2') return '2S LiPo battery';
  if (cells === '3') return '3S LiPo battery';
  if (cells === '4') return '4S LiPo battery';
  if (cells === '5') return '5S LiPo battery';
  if (cells === '6') return '6S LiPo battery';
  if (cells === '8') return '8S LiPo battery';
  return null;
};

// AIO-specific resolver
const resolveAioCanonical = (title) => {
  const lower = title.toLowerCase();
  // Filter autopilot/drone platforms (Pixhawk, PX4, etc.) - must be first
  if (/pixhawk|px4|ardupilot|power module|airspeed|i2c\b|can node|telemetry|baseboards?|jetson/i.test(lower)) return null;
  // Skip accessories and misclassified items
  if (/standoff|cable only|harness|buzzer|capacitor/i.test(lower)) return null;
  // Filter cameras misclassified as AIO (RunCam Split, naked camera)
  if (/camera|action cam|split\s*\d|naked\s*(gopro|camera)/i.test(lower) && !/\baio\b/i.test(lower) && !/\bfc\b/i.test(lower)) return null;
  // Check for mount size in title
  if (lower.includes('16x16')) return '1S whoop AIO';
  if (lower.includes('25x25') || lower.includes('25.5x25.5')) return '25.5x25.5 stack';
  if (lower.includes('30x30') || lower.includes('30.5x30.5')) return '30x30 stack';
  // 20x20 is the most common whoop/toothpick AIO mount
  if (lower.includes('20x20')) return '20x20 stack';
  // Standalone ESC (not AIO, not FC)
  if (/\besc\b/i.test(lower) && !/\bfc\b/i.test(lower) && !/\baio\b/i.test(lower)) {
    if (/30x30|30\.5/.test(lower)) return '30x30 stack';
    if (/20x20/.test(lower)) return '20x20 stack';
    return '30x30 stack';
  }
  // Wider voltage range handling
  if (/\b2-6s\b|\b3-6s\b|\b4-6s\b/i.test(lower)) {
    if (/20x20/.test(lower)) return '20x20 stack';
    if (/30x30|30\.5/.test(lower)) return '30x30 stack';
    if (lower.includes('whoop') || lower.includes('toothpick')) return '2S whoop AIO';
    return '20x20 stack';
  }
  // Whoop/toothpick AIO without explicit mount size
  if (lower.includes('whoop') || lower.includes('toothpick')) {
    if (lower.includes('1s') || lower.includes('1-2s')) return '1S whoop AIO';
    if (lower.includes('2s') || lower.includes('2-4s')) return '2S whoop AIO';
    return '2S whoop AIO';
  }
  // Stack combos
  if (lower.includes('stack') || (lower.includes('fc') && lower.includes('esc'))) {
    if (/30x30|30\.5/.test(lower)) return '30x30 stack';
    return '20x20 stack';
  }
  // Generic AIO / flight controller
  if (lower.includes('aio') || lower.includes('flight controller')) {
    if (/30x30|30\.5/.test(lower)) return '30x30 stack';
    return '2S whoop AIO';
  }
  return null;
};

// Camera-specific resolver
const resolveCameraCanonical = (title) => {
  const lower = title.toLowerCase();
  // Skip accessories that get tagged as cameras
  if (/nd filter|lens lock|lens protector|replacement lens|lens cap|camera mount|lens ring|m12|lens cover/i.test(lower)) return null;
  // Digital systems by keyword
  if (lower.includes('hdzero') || lower.includes('hd zero')) return 'HDZero camera';
  if (lower.includes('walksnail') || lower.includes('avatar')) return 'Walksnail camera';
  if (lower.includes('dji') || / o[34] /.test(lower)) return 'DJI camera';
  // Action cameras
  if (lower.includes('action') || lower.includes('thumb')) return 'action camera';
  // Analog by size class
  if (lower.includes('nano')) return 'nano analog camera';
  if (lower.includes('micro') || lower.includes('mini')) return 'micro analog camera';
  // Fallback: if it says "camera" or "fpv camera" and has a brand, try micro
  if (lower.includes('camera')) return 'micro analog camera';
  return null;
};

// Goggles-specific resolver
const resolveGogglesCanonical = (title) => {
  const lower = title.toLowerCase();
  // Filter accessories misclassified as goggles (antennas, straps, etc.)
  if (/antenna|stubby|x-air|x2-air|mx-air|mx2-air|matchstick|lollipop|pagoda|patch|dipole|triumph|singularity|crosshair|x-ray/i.test(lower)) return null;
  if (/strap|padding|foam|faceplate|battery pack|power cable|fan|module bay/i.test(lower)) return null;
  // Digital system goggles
  if (lower.includes('hdzero') || lower.includes('hd zero')) {
    if (lower.includes('monitor')) return 'FPV monitor';
    return 'HDZero goggles';
  }
  if (lower.includes('dji')) {
    if (lower.includes('goggles') || lower.includes('integra') || lower.includes('n3')) return 'DJI goggles';
  }
  if (lower.includes('walksnail') || lower.includes('avatar')) {
    if (lower.includes('goggle')) return 'Walksnail goggles';
  }
  // Analog goggles by brand
  if (/skyzone|sky04|sky02|cobra\s*x/i.test(lower)) return 'Skyzone goggles';
  if (/orqa|fatshark/i.test(lower)) return 'analog FPV goggles';
  // Monitors
  if (/monitor|screen|pilot|captain/i.test(lower)) return 'FPV monitor';
  // Generic goggle keyword
  if (lower.includes('goggle')) return 'analog FPV goggles';
  return null;
};

// VTX-specific resolver
const resolveVtxCanonical = (title) => {
  const lower = title.toLowerCase();
  // Reclassify antennas wrongly tagged as VTX
  if (/\bantenna\b/i.test(lower) && !/\bvtx\b/i.test(lower)) return null;
  // Filter accessories
  if (/cable|adapter|mount|bracket|connector|pigtail|harness|mmcx|extension/i.test(lower)) return null;
  // Ghost/Crossfire hybrids (VTX + RX combo units)
  if (lower.includes('ghost') && (lower.includes('hybrid') || lower.includes('tramp'))) return 'analog VTX 600mW+';
  if (lower.includes('tramp')) return 'analog VTX 600mW+';
  // Digital VTX by system
  if (lower.includes('hdzero') || lower.includes('hd zero')) {
    if (/whoop|lite|nano/i.test(lower)) return 'HDZero Whoop Lite VTX';
    if (/race|freestyle/i.test(lower)) return 'HDZero Race VTX';
    return 'HDZero Race VTX';
  }
  if (lower.includes('walksnail') || lower.includes('avatar')) {
    if (/nano|mini|1s/i.test(lower)) return 'Walksnail Avatar Nano';
    return 'Walksnail Avatar VTX';
  }
  if ((/\bo4\b/i.test(lower) || lower.includes('o4 air') || lower.includes('dji o4')) && !(/bracket|frame|nd filter|conversion kit/i.test(lower))) return 'DJI O4 Air Unit';
  if (/\bo3\b/i.test(lower) || lower.includes('o3 air') || lower.includes('dji o3')) return 'DJI O3 Air Unit';
  if (lower.includes('dji') && (lower.includes('vtx') || lower.includes('air unit'))) return 'DJI O3 Air Unit';
  // Analog VTX by power/size
  if (/\b(16x16|20x20)\b/.test(lower)) return '20x20 analog VTX';
  if (/\b(25x25|30x30)\b/.test(lower)) return 'standalone analog VTX';
  if (/\b(600|800|1000|1200|1600|2000)\s*m[wW]/.test(lower)) return 'analog VTX 600mW+';
  if (/\b(25|100|200|350|400)\s*m[wW]/.test(lower)) return 'standalone analog VTX';
  // Generic VTX keyword
  if (lower.includes('vtx') || lower.includes('video transmitter')) {
    if (lower.includes('whoop') || lower.includes('tiny')) return 'whoop VTX';
    return 'standalone analog VTX';
  }
  return null;
};

// Receiver-specific resolver
const resolveRxCanonical = (title) => {
  const lower = title.toLowerCase();
  // Filter non-receiver items
  if (/telemetry|sik radio/i.test(lower)) return null;
  if (/\badapter\b|cable only|mount only/i.test(lower)) return null;
  // TX modules (transmitter-side, not receivers)
  if (/\btx\s*(module|mod)\b/i.test(lower) || (/\b1w\s*tx\b/i.test(lower) && !/\brx\b/i.test(lower))) {
    return 'ELRS TX module';
  }
  // Crossfire
  if (lower.includes('crossfire')) return 'Crossfire receiver';
  // Ghost
  if (lower.includes('ghost')) return 'Ghost receiver';
  // FrSky
  if (/frsky|fport|\bxm\+?\b|\br-xsr\b/i.test(lower)) return 'FrSky receiver';
  // ELRS by frequency
  if (lower.includes('elrs') || lower.includes('expresslrs')) {
    if (/dual|xrossband|gemini/i.test(lower)) return 'ELRS dual-band receiver';
    if (/915|900|868/i.test(lower)) return 'ELRS 915MHz receiver';
    return 'ELRS 2.4GHz receiver';
  }
  // RadioMaster receivers are ELRS
  if (lower.includes('radiomaster') && (/receiver/i.test(lower) || /\brx\b/i.test(lower))) {
    if (/915|900/i.test(lower)) return 'ELRS 915MHz receiver';
    return 'ELRS 2.4GHz receiver';
  }
  // Generic receiver/rx keyword
  if (lower.includes('receiver') || /\brx\b/i.test(lower)) {
    if (/915|900|868/i.test(lower)) return 'ELRS 915MHz receiver';
    return 'ELRS 2.4GHz receiver';
  }
  return null;
};

// Antenna-specific resolver
const resolveAntennaCanonical = (title) => {
  const lower = title.toLowerCase();
  // Filter accessories
  if (/mount|holder|tube|cap|cover|protector/i.test(lower) && !/antenna/i.test(lower)) return null;
  const isUfl = /u\.?fl|ipex|ipx/i.test(lower);
  const isSma = /\bsma\b|rp-sma/i.test(lower);
  // Frequency detection
  if (/915|900|868/i.test(lower)) return '915MHz antenna';
  if (/2\.4\s*g/i.test(lower)) return '2.4GHz antenna';
  if (/5\.8|5800/i.test(lower) || (/\bfpv\b/.test(lower) && /\bantenna\b/.test(lower))) {
    if (isUfl) return '5.8GHz U.FL antenna';
    if (isSma) return '5.8GHz SMA antenna';
    return 'FPV antenna';
  }
  // Generic antenna
  if (/\bantenna\b/.test(lower)) {
    if (isUfl) return '5.8GHz U.FL antenna';
    if (isSma) return '5.8GHz SMA antenna';
    return 'FPV antenna';
  }
  return null;
};

// Try to match a scraped product to a canonical family
const resolveCanonical = (product, variant) => {
  const searchText = `${product.title} ${variant.product_name || ''}`;
  const signals = extractSignals(searchText);
  const partType = PART_TYPE_MAP[product.part_type] || product.part_type;

  // Filter: chargers should not match as batteries
  if (partType === 'charger' || searchText.toLowerCase().includes('charger')) {
    const chargerResult = lookupParts('LiPo charger', partLibrary);
    if (chargerResult.matched) {
      return {
        canonical_name: chargerResult.best.part,
        canonical_part_type: chargerResult.best.part_type,
        match_score: chargerResult.best.score,
        substituted: false,
      };
    }
    return null;
  }

  // Frames: use product name heuristics since BetaFPV names don't contain "65mm"
  if (partType === 'frame') {
    const canonical = resolveFrameCanonical(searchText);
    if (canonical) {
      return {
        canonical_name: canonical,
        canonical_part_type: 'frame',
        match_score: 80,
        substituted: false,
      };
    }
  }

  // Props: use size mapping since BetaFPV uses unusual prop naming
  if (partType === 'propeller') {
    const canonical = resolvePropCanonical(searchText);
    if (canonical) {
      return {
        canonical_name: canonical,
        canonical_part_type: 'propeller',
        match_score: 75,
        substituted: false,
      };
    }
  }

  // Cameras: use keyword matching for digital/analog/action subcategories
  if (partType === 'camera') {
    const canonical = resolveCameraCanonical(searchText);
    if (canonical) {
      return {
        canonical_name: canonical,
        canonical_part_type: 'camera',
        match_score: 80,
        substituted: false,
      };
    }
  }

  // Batteries: cell count + connector type
  if (partType === 'battery') {
    const canonical = resolveBatteryCanonical(searchText);
    if (canonical) {
      return {
        canonical_name: canonical,
        canonical_part_type: 'battery',
        match_score: 80,
        substituted: false,
      };
    }
  }

  // AIOs: mount size + class
  if (partType === 'aio') {
    const canonical = resolveAioCanonical(searchText);
    if (canonical) {
      return {
        canonical_name: canonical,
        canonical_part_type: 'aio',
        match_score: 75,
        substituted: false,
      };
    }
  }

  // Cross-type antenna reclassification: items tagged as vtx/goggles/rx that are actually antennas
  const lowerSearch = searchText.toLowerCase();
  if ((partType === 'vtx' || partType === 'goggles' || partType === 'rx') &&
      (/\bantenna\b/i.test(lowerSearch) || /rhcp|lhcp|stubby|triumph|mushroom|dipole|yagi|bardpole|x-air|x2-air|mx-air|crosshair|sniper|x-ray|singularity/i.test(lowerSearch)) &&
      !/\bvtx\b/i.test(lowerSearch) && !/\breceiver\b/i.test(lowerSearch)) {
    const canonical = resolveAntennaCanonical(searchText);
    if (canonical) {
      return {
        canonical_name: canonical,
        canonical_part_type: 'antenna',
        match_score: 75,
        substituted: false,
      };
    }
  }
  // Cross-type cable/accessory filtering: pigtails, extensions, adapters
  if ((partType === 'vtx' || partType === 'rx') &&
      /pigtail|extension|mmcx to sma|sma to|adapter|replacement antenna/i.test(lowerSearch) &&
      !/\bvtx\b/i.test(lowerSearch) && !/\breceiver\b/i.test(lowerSearch)) {
    return null; // Accessories, not parts
  }

  // Goggles: digital vs analog vs monitor
  if (partType === 'goggles') {
    const canonical = resolveGogglesCanonical(searchText);
    if (canonical) {
      return {
        canonical_name: canonical,
        canonical_part_type: 'goggles',
        match_score: 80,
        substituted: false,
      };
    }
  }

  // VTX: digital system + power level
  if (partType === 'vtx') {
    const canonical = resolveVtxCanonical(searchText);
    if (canonical) {
      return {
        canonical_name: canonical,
        canonical_part_type: 'vtx',
        match_score: 80,
        substituted: false,
      };
    }
  }

  // Receivers: protocol + frequency
  if (partType === 'rx') {
    const canonical = resolveRxCanonical(searchText);
    if (canonical) {
      return {
        canonical_name: canonical,
        canonical_part_type: 'rx',
        match_score: 80,
        substituted: false,
      };
    }
  }

  // Antennas: frequency + connector
  if (partType === 'antenna') {
    const canonical = resolveAntennaCanonical(searchText);
    if (canonical) {
      return {
        canonical_name: canonical,
        canonical_part_type: 'antenna',
        match_score: 75,
        substituted: false,
      };
    }
  }

  // Standard lookup for everything else
  let query = product.title;

  // Motor accessory filtering
  if (partType === 'motor') {
    const lowerTitle = product.title.toLowerCase();
    // Spare bells are motor accessories, not motors
    if (/spare bell/i.test(lowerTitle)) return null;
    // Brushed motors are a different category entirely
    if (/brushed\s*motor|6mm\s*brushed|7mm\s*brushed|8\.5mm/i.test(lowerTitle)) return null;
    // Motor screws, bases, adapters
    if (/motor base|motor bolt|motor screw|motor mount|motor guard|motor wire/i.test(lowerTitle)) return null;
  }

  // Motor name-to-stator mapping for products without standard stator codes
  const MOTOR_NAME_MAP = {
    'f40': '2306', 'f60': '2207', 'f80': '2208',
    'velox v3': '2207', 'pacer v3': '2207',
    'stout': '2306', 'silk': '2207',  // Ethix branded motors
  };

  if (partType === 'motor') {
    // First try signal-extracted stator
    if (signals.stator_size) {
      query = `${signals.stator_size} motor`;
    } else {
      // Try extracting stator from embedded model names: TC2004, GTS2107, EM3215
      const embeddedStator = searchText.match(/(?:[A-Za-z])(\d{4})(?:\b|[^0-9])/);
      if (embeddedStator) {
        const code = embeddedStator[1];
        const first2 = parseInt(code.slice(0, 2));
        // Valid stator range: 05xx to 32xx
        if (first2 >= 5 && first2 <= 32) {
          query = `${code} motor`;
        }
      }
      // Try named motor models
      if (query === product.title) {
        const lowerTitle = product.title.toLowerCase();
        for (const [name, stator] of Object.entries(MOTOR_NAME_MAP)) {
          if (lowerTitle.includes(name)) {
            query = `${stator} motor`;
            break;
          }
        }
      }
    }
  } else if (partType === 'aio' && signals.cell_count) {
    query = `${signals.cell_count} AIO`;
  } else if (partType === 'battery' && signals.cell_count) {
    const connector = signals.connector || '';
    // Detect BT2.0/BT3.0 from product name
    const btMatch = searchText.match(/BT(\d)\.0/i);
    if (btMatch) {
      query = `BT${btMatch[1]}.0 ${signals.cell_count} battery`;
    } else {
      query = connector ? `${connector} ${signals.cell_count} battery` : `${signals.cell_count} battery`;
    }
  }

  const result = lookupParts(query, partLibrary);
  if (result.matched && result.best.score >= 50) {
    return {
      canonical_name: result.best.part,
      canonical_part_type: result.best.part_type,
      match_score: result.best.score,
      substituted: result.substituted,
    };
  }

  return null;
};

/**
 * Normalize an array of scraped products into brain-ready format.
 * Returns { variants: { [canonical_name]: variant[] }, products: productPattern[], unresolved: [] }
 */
export const normalizeProducts = (scrapedProducts) => {
  const variants = {};   // canonical_name -> array of variant objects
  const products = [];    // product patterns (for complete quads)
  const unresolved = [];  // products that couldn't match a canonical family

  for (const product of scrapedProducts) {
    if (!product?.brain_variants?.length) continue;

    for (const variant of product.brain_variants) {
      // Complete quads become product patterns
      if (variant.is_quad) {
        products.push({
          source: product.source,
          source_url: product.source_url,
          scraped_at: product.scraped_at,
          brand: variant.brand,
          model: variant.product_name.replace(`${variant.brand} `, ''),
          build_type: variant.build_type || 'BNF',
          raw_specs: product.raw_specs,
          // fan_out would need deeper analysis of the product description
          // For now, flag it for manual review
          needs_fan_out: true,
        });
        continue;
      }

      // Parts: resolve to canonical family
      const match = resolveCanonical(product, variant);
      if (!match) {
        unresolved.push({
          source: product.source,
          source_url: product.source_url,
          title: product.title,
          part_type: product.part_type,
          variant_name: variant.product_name,
        });
        log.warn('normalize', `No canonical match: ${variant.product_name} (${product.part_type})`);
        continue;
      }

      const canonName = match.canonical_name;
      if (!variants[canonName]) variants[canonName] = [];

      // Check for duplicate variant_id
      const existing = variants[canonName].find(v => v.variant_id === variant.variant_id);
      if (existing) continue;

      const fields = buildVariantFields(match.canonical_part_type, variant);
      fields._source = product.source;
      fields._source_url = product.source_url;
      fields._scraped_at = product.scraped_at;
      fields._match_score = match.match_score;

      variants[canonName].push(fields);
      log.success('normalize', `${variant.product_name} -> ${canonName} (score: ${match.match_score})`);
    }
  }

  return { variants, products, unresolved };
};
