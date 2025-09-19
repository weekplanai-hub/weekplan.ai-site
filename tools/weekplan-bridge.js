// /tools/weekplan-bridge.js
// Leser OpenRouter-nøkkel + valgt modell fra localStorage (satt i API Manager),
// kaller OpenRouter chat/completions og returnerer PLAIN TEXT i 1000/200x-format.
// Faller tilbake til en mini-demo om noe mangler.

import { DEMO_PROMPT } from './menuDemoPrompt.js';

async function runPrompt(promptText) {
  const prompt = (typeof promptText === 'string' && promptText.trim())
    ? promptText
    : DEMO_PROMPT;
  // 1) Prøv OpenRouter direkte hvis nøkkel + modell finnes i localStorage
  try {
    const apiKey = localStorage.getItem('api-key-openrouter') || '';
    const model =
      localStorage.getItem('api-current-model-openrouter') ||
      'nvidia/nemotron-nano-9b-v2:free';

    if (apiKey && model) {
      const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
          'HTTP-Referer': window.location.origin,
          'X-Title': 'Weekplan.ai'
        },
        body: JSON.stringify({
          model,
          temperature: 0.2,
          messages: [
            {
              role: 'system',
              content:
                'You are a chef assistant. Reply with ONLY the Weekplan 1000/200x format (lines starting with 1000..1006 for days, 2000 for meal header with B/L/D/S, 2001 title, 2002 recipe block, 2003 shopping block). No extra commentary.'
            },
            { role: 'user', content: prompt }
          ]
        })
      });

      if (!res.ok) {
        const t = await res.text().catch(()=>'');
        throw new Error(`OpenRouter ${res.status}: ${t}`);
      }

      const data = await res.json();
      const text = (data?.choices?.[0]?.message?.content || '').trim();
      if (!text) throw new Error('Empty content from OpenRouter');
      return text;
    }
  } catch (e) {
    console.warn('OpenRouter call failed:', e);
  }

  // 2) Fallback – mini demo
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

async function runDemoPrompt() {
  return runPrompt(DEMO_PROMPT);
}

window.WeekplanBridge = { runPrompt, runDemoPrompt };
