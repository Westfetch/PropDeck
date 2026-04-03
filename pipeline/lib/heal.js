import { markHealed, log } from './log.js';

const GEMINI_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';

const getApiKey = () => process.env.GEMINI_API_KEY || null;

const callGemini = async (prompt) => {
  const key = getApiKey();
  if (!key) return null;

  const res = await fetch(`${GEMINI_URL}?key=${key}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { response_mime_type: 'application/json' },
    }),
  });

  if (!res.ok) {
    log.warn('heal', `Gemini API returned ${res.status}`);
    return null;
  }

  const data = await res.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) return null;

  try { return JSON.parse(text); } catch { return null; }
};

const buildHealPrompt = (html, failedSelector, fieldDescription) => `
You are a web scraping assistant. A CSS selector has stopped working on a product page.

Failed selector: ${failedSelector}
Field we are trying to extract: ${fieldDescription}

Here is the page HTML (truncated to relevant sections):
${html.slice(0, 15000)}

Return ONLY a valid JSON object with this structure:
{
  "selector": "the new CSS selector that would match this field",
  "confidence": "high | medium | low",
  "note": "one sentence explaining what changed"
}

If you cannot determine a selector, return:
{ "selector": null, "confidence": "low", "note": "could not determine replacement selector" }
`;

/**
 * Try multiple selectors for a field, with optional Gemini healing.
 * Returns the extracted text or null.
 */
export const extractWithHeal = async (page, selectors, fieldDescription, source) => {
  // Try each selector in order (healthy selectors first via log.js ordering)
  for (const selector of selectors) {
    try {
      const el = await page.$(selector);
      if (el) {
        const text = await el.textContent();
        if (text?.trim()) return { value: text.trim(), selector, healed: false };
      }
    } catch { /* selector failed, try next */ }
  }

  // All selectors failed. Try Gemini healing if API key is present.
  if (!getApiKey()) {
    log.warn(source, `All selectors failed for "${fieldDescription}" and no GEMINI_API_KEY set. Add it to pipeline/.env to enable self-healing.`);
    return null;
  }

  log.info(source, `Attempting Gemini heal for "${fieldDescription}"`);

  try {
    const html = await page.content();
    const result = await callGemini(buildHealPrompt(html, selectors[0], fieldDescription));

    if (!result?.selector) {
      log.warn(source, `Gemini could not heal selector for "${fieldDescription}"`);
      return null;
    }

    // Try the healed selector
    const el = await page.$(result.selector);
    if (el) {
      const text = await el.textContent();
      if (text?.trim()) {
        markHealed(source, fieldDescription, result.selector);
        log.success(source, `Healed "${fieldDescription}" with: ${result.selector} (${result.note})`);
        return { value: text.trim(), selector: result.selector, healed: true };
      }
    }

    log.warn(source, `Healed selector "${result.selector}" matched nothing for "${fieldDescription}"`);
    return null;
  } catch (err) {
    log.error(source, `Gemini heal failed: ${err.message}`);
    return null;
  }
};

/**
 * Extract an attribute value with fallback selectors + optional heal.
 */
export const extractAttrWithHeal = async (page, selectors, attr, fieldDescription, source) => {
  for (const selector of selectors) {
    try {
      const el = await page.$(selector);
      if (el) {
        const val = await el.getAttribute(attr);
        if (val?.trim()) return { value: val.trim(), selector, healed: false };
      }
    } catch { /* try next */ }
  }

  // No Gemini heal for attribute extraction yet (keep it simple)
  log.warn(source, `All selectors failed for "${fieldDescription}" (attr: ${attr})`);
  return null;
};

/**
 * Extract all matching elements' text content.
 */
export const extractAllWithHeal = async (page, selectors, fieldDescription, source) => {
  for (const selector of selectors) {
    try {
      const els = await page.$$(selector);
      if (els.length) {
        const texts = await Promise.all(els.map(el => el.textContent()));
        const cleaned = texts.map(t => t?.trim()).filter(Boolean);
        if (cleaned.length) return { values: cleaned, selector, healed: false };
      }
    } catch { /* try next */ }
  }

  log.warn(source, `All selectors failed for "${fieldDescription}" (extractAll)`);
  return null;
};
