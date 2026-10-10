// Chamada genérica à OpenAI (usada pelo editor). Os modelos disponíveis vêm da variável AI_MODELS.
const DEFAULT_MODELS = [
  'gpt-5',
  'gpt-5-mini',
  'gpt-5-nano',
  'gpt-4.1',
  'gpt-4.1-mini',
  'gpt-4.1-nano',
  'gpt-4o',
  'gpt-4o-mini',
  'o4-mini',
  'o3',
  'o3-mini',
].join(',');

export function availableModels(): string[] {
  const raw = process.env.AI_MODELS || DEFAULT_MODELS;
  return raw.split(',').map((m) => m.trim()).filter(Boolean);
}

export async function chatJson(model: string, system: string, user: string, timeoutMs = 90000): Promise<string> {
  const key = process.env.AI_API_KEY;
  if (!key) throw new Error('chave da IA não configurada no servidor');
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      signal: ctrl.signal,
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
      body: JSON.stringify({
        model,
        temperature: 0.3,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: user },
        ],
      }),
    });
    if (!res.ok) throw new Error(`a IA respondeu ${res.status}`);
    const json = (await res.json()) as { choices?: { message?: { content?: string } }[] };
    const content = json.choices?.[0]?.message?.content;
    if (!content) throw new Error('a IA não devolveu conteúdo');
    return content;
  } finally {
    clearTimeout(timer);
  }
}
