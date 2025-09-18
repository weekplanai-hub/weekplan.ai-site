// /tools/weekplan-bridge.js
// Minimal bridge for weekplan.html. It exposes window.WeekplanBridge.runDemoPrompt()
// which returns PLAIN TEXT in your 1000/200x format. It uses DEMO_PROMPT and
// tries to call a backend endpoint (/api/run-demo). If that fails, it returns
// a tiny local Monday demo so you can test the UI without any backend.

import { DEMO_PROMPT } from './menuDemoPrompt.js';

/**
 * Call your backend proxy with DEMO_PROMPT and return the raw text.
 * If /api/run-demo is not implemented yet, we fall back to a local sample.
 */
async function runDemoPrompt() {
  try {
    const res = await fetch('/api/run-demo', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt: DEMO_PROMPT })
    });
    if (!res.ok) throw new Error('API responded not OK');
    // IMPORTANT: backend should return text/plain in your 1000/200x format
    return await res.text();
  } catch (e) {
    // Fallback: tiny Monday demo so you can test without backend
    return [
      '1000 Monday',
      '2000 D',
      '2001 Salmon with Roasted Potatoes',
      '2002 Recipe',
      'Preheat oven to 200°C.',
      'Toss potato wedges with olive oil, salt, pepper; roast 25 min.',
      'Season salmon; bake last 12–15 min.',
      'Serve with lemon and a green salad.',
      '2003 Shopping list',
      'Salmon fillets (2)',
      'Potatoes (600 g)',
      'Olive oil, salt, pepper, lemon',
      'Mixed greens'
    ].join('\n');
  }
}

// Expose globally for weekplan.html without colliding with your API Manager UI
window.WeekplanBridge = { runDemoPrompt };
