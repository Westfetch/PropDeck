import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync, unlinkSync } from 'fs';
import { createHash } from 'crypto';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const CACHE_DIR = join(__dirname, '..', '.cache');
const DEFAULT_TTL = 24 * 60 * 60 * 1000; // 24 hours

const ensureDir = () => { if (!existsSync(CACHE_DIR)) mkdirSync(CACHE_DIR, { recursive: true }); };

const hashKey = (url) => createHash('sha256').update(url).digest('hex').slice(0, 16);

export const getCache = (url) => {
  ensureDir();
  const metaPath = join(CACHE_DIR, `${hashKey(url)}.meta.json`);
  const htmlPath = join(CACHE_DIR, `${hashKey(url)}.html`);

  if (!existsSync(metaPath) || !existsSync(htmlPath)) return null;

  try {
    const meta = JSON.parse(readFileSync(metaPath, 'utf-8'));
    if (Date.now() - meta.timestamp > (meta.ttl || DEFAULT_TTL)) return null;
    return readFileSync(htmlPath, 'utf-8');
  } catch {
    return null;
  }
};

export const setCache = (url, html, ttl = DEFAULT_TTL) => {
  ensureDir();
  const key = hashKey(url);
  writeFileSync(join(CACHE_DIR, `${key}.html`), html, 'utf-8');
  writeFileSync(join(CACHE_DIR, `${key}.meta.json`), JSON.stringify({
    url,
    timestamp: Date.now(),
    ttl,
    size: html.length,
  }), 'utf-8');
};

export const clearCache = () => {
  ensureDir();
  const files = readdirSync(CACHE_DIR);
  for (const f of files) {
    unlinkSync(join(CACHE_DIR, f));
  }
};
