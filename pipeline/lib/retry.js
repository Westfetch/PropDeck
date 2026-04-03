const sleep = (ms) => new Promise(r => setTimeout(r, ms));

export const withRetry = async (fn, opts = {}) => {
  const { maxAttempts = 3, baseDelay = 1000, label = 'operation' } = opts;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (err) {
      if (attempt === maxAttempts) {
        console.error(`[retry] ${label} failed after ${maxAttempts} attempts: ${err.message}`);
        throw err;
      }
      const delay = baseDelay * Math.pow(2, attempt - 1) + Math.random() * 500;
      console.warn(`[retry] ${label} attempt ${attempt}/${maxAttempts} failed, retrying in ${Math.round(delay)}ms`);
      await sleep(delay);
    }
  }
};

export const withTimeout = (promise, ms, label = 'operation') => {
  return Promise.race([
    promise,
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms)
    ),
  ]);
};
