import { chromium } from 'playwright';

const USER_AGENTS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
];

const pickUA = () => USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];

export const launchBrowser = async (opts = {}) => {
  const browser = await chromium.launch({
    headless: opts.headless !== false,
  });
  const context = await browser.newContext({
    userAgent: opts.userAgent || pickUA(),
    viewport: { width: 1280, height: 800 },
  });
  const page = await context.newPage();
  return { browser, context, page };
};

export const closeBrowser = async (browser) => {
  try { await browser.close(); } catch { /* already closed */ }
};
