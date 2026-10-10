// Chamada genérica à OpenAI (usada pelo editor e pelo chat).
// Modelos: se AI_MODELS estiver no .env, ela manda. Senão, pergunta à própria OpenAI
// quais modelos a chave acessa (cache de 1 hora). Se a pergunta falhar, usa a lista de reserva.
// Escolha automática: da lista da própria conta, pega os modelos de conversa mais NOVOS
// (pela data de criação informada pela OpenAI):
//   - 1 de baixo custo (nome com "mini" ou "nano")
//   - 2 de médio custo (os mais novos que não são mini/nano)
// Ficam de fora: áudio, imagem, embeddings, moderação, buscas, versões "pro", "codex", "cyber" e datas fixas.
// Se a conta não responder, usa esta lista de reserva.
const FALLBACK = ['gpt-4.1-mini', 'gpt-4.1', 'gpt-4o'];
const EXCLUDE = /(audio|realtime|tts|transcribe|image|embedding|moderation|search|instruct|davinci|babbage|whisper|dall|computer-use|codex|cyber|pro|chat-latest|-\d{4}-?\d{2}-?\d{2}$)/;
const CACHE_MS = 60 * 60 * 1000;
let cache: { at: number; models: string[] } | null = null;

export async function availableModels(): Promise<string[]> {
  const override = process.env.AI_MODELS;
  if (override) return override.split(',').map((m) => m.trim()).filter(Boolean);

  if (cache && Date.now() - cache.at < CACHE_MS) return cache.models;

  const key = process.env.AI_API_KEY;
  if (!key) return FALLBACK;
  try {
    const res = await fetch('https://api.openai.com/v1/models', {
      headers: { Authorization: `Bearer ${key}` },
      signal: AbortSignal.timeout(15000),
    });
    if (!res.ok) throw new Error(`status ${res.status}`);
    const json = (await res.json()) as { data?: { id: string; created?: number }[] };
    const chat = (json.data ?? [])
      .filter((m) => /^(gpt-|o\d)/.test(m.id) && !EXCLUDE.test(m.id))
      .sort((a, b) => (b.created ?? 0) - (a.created ?? 0));
    const isSmall = (id: string) => /(mini|nano)/.test(id);
    const low = chat.find((m) => isSmall(m.id))?.id;
    const mid = chat.filter((m) => !isSmall(m.id)).slice(0, 2).map((m) => m.id);
    const models = [...new Set([low, ...mid].filter((x): x is string => !!x))];
    if (models.length === 0) throw new Error('nenhum modelo de conversa na conta');
    cache = { at: Date.now(), models };
    return models;
  } catch {
    return cache?.models ?? FALLBACK;
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
