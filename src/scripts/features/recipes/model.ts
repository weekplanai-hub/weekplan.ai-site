export type Provider = 'openrouter' | 'openai';

export async function callChatModel(options: {
  provider: Provider;
  apiKey: string;
  model: string;
  prompt: string;
}): Promise<string> {
  const { provider, apiKey, model, prompt } = options;
  if (!apiKey) {
    throw new Error('API key is required');
  }
  if (!model) {
    throw new Error('Model is required');
  }

  if (provider === 'openrouter') {
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
        'HTTP-Referer': typeof window !== 'undefined' ? window.location.origin : 'https://weekplan.ai',
        'X-Title': 'Weekplan.ai Recipe Generator',
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: 'Du er en hjelpsom assistent som svarer på norsk.' },
          { role: 'user', content: prompt },
        ],
      }),
    });
    if (!response.ok) {
      throw new Error(`OpenRouter returned ${response.status}`);
    }
    const data = await response.json();
    return data?.choices?.[0]?.message?.content ?? '';
  }

  if (provider === 'openai') {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: 'Du er en hjelpsom assistent som svarer på norsk.' },
          { role: 'user', content: prompt },
        ],
      }),
    });
    if (!response.ok) {
      throw new Error(`OpenAI returned ${response.status}`);
    }
    const data = await response.json();
    return data?.choices?.[0]?.message?.content ?? '';
  }

  throw new Error('Unsupported provider');
}

export function parseJsonFromModel(text: string): unknown {
  const fenced = text.match(/```json\s*([\s\S]*?)```/i) ?? text.match(/```\s*([\s\S]*?)```/i);
  const raw = fenced ? fenced[1] : text;
  try {
    return JSON.parse(raw);
  } catch (error) {
    const normalized = raw
      .replace(/[“”]/g, '"')
      .replace(/[‘’]/g, "'")
      .replace(/,\s*([\]}])/g, '$1');
    return JSON.parse(normalized);
  }
}
