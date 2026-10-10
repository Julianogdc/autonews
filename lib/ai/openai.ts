// Chamada genérica à OpenAI (usada pelo editor e pelo chat).
// Modelos: se AI_MODELS estiver no .env, ela manda. Senão, pergunta à própria OpenAI
// quais modelos a chave acessa (cache de 1 hora). Se a pergunta falhar, usa a lista de reserva.
// Modelos escolhidos: 1 de baixo custo e 2 de médio custo, rápidos e bons para texto e pesquisa.
// Só aparecem se a conta tiver acesso a eles.
const CURATED = ['gpt-4.1-mini', 'gpt-4.1', 'gpt-4o'];
const CACHE_MS = 60 * 60 * 1000;
let cache: { at: number; models: string[] } | null = null;

export async function availableModels(): Promise<string[]> {
  const override = process.env.AI_MODELS;
  if (override) return override.split(',').map((m) => m.trim()).filter(Boolean);

  if (cache && Date.now() - cache.at < CACHE_MS) return cache.models;

  const key = process.env.AI_API_KEY;
  if (!key) return CURATED;
  try {
    const res = await fetch('https://api.openai.com/v1/models', {
      headers: { Authorization: `Bearer ${key}` },
      signal: AbortSignal.timeout(15000),
    });
    if (!res.ok) throw new Error(`status ${res.status}`);
    const json = (await res.json()) as { data?: { id: string }[] };
    const ids = new Set((json.data ?? []).map((m) => m.id));
    const models = CURATED.filter((m) => ids.has(m));
    if (models.length === 0) throw new Error('nenhum modelo escolhido disponível na conta');
    cache = { at: Date.now(), models };
    return models;
  } catch {
    return cache?.models ?? CURATED;
  }
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
