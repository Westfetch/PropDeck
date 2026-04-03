import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const HEALTH_PATH = join(__dirname, '..', 'selector-health.json');

let health = {};

const loadHealth = () => {
  if (existsSync(HEALTH_PATH)) {
    try { health = JSON.parse(readFileSync(HEALTH_PATH, 'utf-8')); } catch { health = {}; }
  }
};

const saveHealth = () => {
  writeFileSync(HEALTH_PATH, JSON.stringify(health, null, 2), 'utf-8');
};

loadHealth();

export const trackSelector = (source, field, selector, success) => {
  const key = `${source}::${field}`;
  if (!health[key]) health[key] = { selector, successes: 0, failures: 0, lastHealed: null };
  if (success) {
    health[key].successes++;
  } else {
    health[key].failures++;
  }
  health[key].selector = selector;
  saveHealth();
};

export const getHealthySelectorOrder = (source, field, selectors) => {
  const key = `${source}::${field}`;
  const record = health[key];
  if (!record) return selectors;

  // Put the most recently successful selector first
  const sorted = [...selectors].sort((a, b) => {
    if (a === record.selector && record.successes > record.failures) return -1;
    if (b === record.selector && record.successes > record.failures) return 1;
    return 0;
  });
  return sorted;
};

export const markHealed = (source, field, newSelector) => {
  const key = `${source}::${field}`;
  if (!health[key]) health[key] = { selector: newSelector, successes: 0, failures: 0 };
  health[key].selector = newSelector;
  health[key].lastHealed = new Date().toISOString();
  saveHealth();
};

export const log = {
  info: (source, msg) => console.log(`[${source}] ${msg}`),
  warn: (source, msg) => console.warn(`[${source}] WARN: ${msg}`),
  error: (source, msg) => console.error(`[${source}] ERROR: ${msg}`),
  success: (source, msg) => console.log(`[${source}] OK: ${msg}`),
};
