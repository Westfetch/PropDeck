export function detectPartsFromImage(_filePath) {
  // Placeholder for Gemini Vision or another coarse classifier.
  // Keep output coarse. Let heuristics + user correction do the rest.
  return [
    { type: 'motor', quantity: 4, source: 'mock_vision' },
    { type: 'frame', quantity: 1, source: 'mock_vision' },
    { type: 'aio', quantity: 1, source: 'mock_vision' }
  ];
}
