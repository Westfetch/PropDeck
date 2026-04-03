import express from 'express';
import cors from 'cors';
import multer from 'multer';

import { inventory } from './data/store.js';
import { detectPartsFromImage } from './services/detection.js';
import { applyHeuristics } from './services/heuristics.js';
import { runInventoryIntelligence } from './services/inventoryIntelligence.js';
import { searchParts } from './services/search.js';

const app = express();
const upload = multer({ dest: 'uploads/' });

app.use(cors());
app.use(express.json());

app.get('/health', (_req, res) => {
  res.json({ ok: true });
});

app.post('/scan', upload.single('image'), (req, res) => {
  const detected = detectPartsFromImage(req.file?.path || '');
  const { enriched, context } = applyHeuristics(detected);

  res.json({ detected: enriched, context });
});

app.get('/inventory', (_req, res) => {
  res.json(inventory);
});

app.post('/inventory', (req, res) => {
  const items = Array.isArray(req.body.items) ? req.body.items : [];

  const inserted = items.map((item, index) => ({
    id: `inv_${Date.now()}_${index}`,
    type: item.type,
    name: item.name || item.guess || item.type,
    quantity: item.quantity || 1,
    status: item.status || 'spare',
    specs: item.specs || inferSpecs(item)
  }));

  inventory.push(...inserted);
  res.status(201).json({ success: true, inventory, inserted });
});

app.get('/inventory/intelligence', (_req, res) => {
  res.json(runInventoryIntelligence(inventory));
});

app.get('/search', (req, res) => {
  const q = String(req.query.q || '');
  res.json(searchParts(q, inventory));
});

function inferSpecs(item) {
  if (item.type === 'motor' && item.guess === '0802') {
    return { stator_size: '0802' };
  }

  if (item.type === 'frame' && item.guess === '65mm whoop frame') {
    return { size_mm: 65 };
  }

  if (item.type === 'aio' && item.guess === '1S AIO') {
    return { battery_cells: '1S' };
  }

  return {};
}

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Graft/FPV server listening on http://localhost:${PORT}`);
});
