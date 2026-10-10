// Chamada à API de Respostas da OpenAI com pesquisa na web (a mesma que o chat usa).
// O nome da ferramenta de pesquisa vem de OPENAI_WEB_TOOL (padrão: web_search).
export type WebSource = { url: string; title: string };
export type WebReply = { text: string; sources: WebSource[] };

export async function askWithWeb(opts: {
  model: string;
  instructions: string;
  input: string;
  timeoutMs?: number;
}): Promise<WebReply> {
  const key = process.env.AI_API_KEY;
  if (!key) throw new Error('AI_API_KEY não configurada');

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), opts.timeoutMs ?? 300000);
  try {
    const res = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      signal: ctrl.signal,
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
      body: JSON.stringify({
        model: opts.model,
        instructions: opts.instructions,
        input: opts.input,
        tools: [{ type: process.env.OPENAI_WEB_TOOL || 'web_search' }],
      }),
    });
    if (!res.ok) {
      const err = (await res.text()).slice(0, 300);
      throw new Error(`a IA respondeu ${res.status}: ${err}`);
    }
    const data = (await res.json()) as {
      output_text?: string;
      output?: { type: string; content?: { type: string; text?: string; annotations?: { type: string; url?: string; title?: string }[] }[] }[];
    };

    const parts = (data.output ?? [])
      .filter((o) => o.type === 'message')
      .flatMap((m) => m.content ?? [])
      .filter((c) => c.type === 'output_text');
    const text = (data.output_text ?? parts.map((p) => p.text ?? '').join('\n')).trim();
    if (!text) throw new Error('a IA não devolveu texto');

    const seen = new Set<string>();
    const sources: WebSource[] = [];
    for (const c of parts) {
      for (const a of c.annotations ?? []) {
        if (a.type === 'url_citation' && a.url && !seen.has(a.url)) {
          seen.add(a.url);
          sources.push({ url: a.url, title: a.title ?? a.url });
        }
      }
    }
    return { text, sources };
  } catch (e) {
    if (e instanceof Error && (e.name === 'AbortError' || /aborted/i.test(e.message))) {
      throw new Error('a IA demorou demais para responder (mais de 5 minutos)');
    }
    throw e;
  } finally {
    clearTimeout(timer);
  }
}
