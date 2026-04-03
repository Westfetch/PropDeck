export function buildContext(detected) {
  return {
    motorCount: detected
      .filter((d) => d.type === 'motor')
      .reduce((sum, item) => sum + (item.quantity || 1), 0),
    hasFrame: detected.some((d) => d.type === 'frame'),
    hasAIO: detected.some((d) => d.type === 'aio'),
    hasProps: detected.some((d) => d.type === 'propeller')
  };
}

function classifyMotor(context) {
  if (context.motorCount === 4 && context.hasFrame && context.hasAIO) {
    return { guess: '0802', confidence: 'high', note: 'Likely complete whoop motor set' };
  }

  if (context.motorCount >= 4) {
    return { guess: '0702–1102', confidence: 'low', note: 'Likely whoop-class motors' };
  }

  return { guess: 'unknown motor', confidence: 'low' };
}

function classifyFrame(context) {
  if (context.motorCount >= 4) {
    return { guess: '65mm whoop frame', confidence: 'medium' };
  }

  return { guess: 'unknown frame', confidence: 'low' };
}

function classifyAIO(context) {
  if (context.motorCount >= 4 && context.hasFrame) {
    return { guess: '1S AIO', confidence: 'medium' };
  }

  return { guess: 'generic flight controller', confidence: 'low' };
}

export function applyHeuristics(detected) {
  const context = buildContext(detected);

  const enriched = detected.map((item) => {
    if (item.type === 'motor') {
      return { ...item, ...classifyMotor(context) };
    }

    if (item.type === 'frame') {
      return { ...item, ...classifyFrame(context) };
    }

    if (item.type === 'aio') {
      return { ...item, ...classifyAIO(context) };
    }

    return item;
  });

  return { enriched, context };
}
