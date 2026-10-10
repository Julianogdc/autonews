// Chat com pesquisa na web pela API de Respostas da OpenAI.
// O nome da ferramenta de pesquisa vem de OPENAI_WEB_TOOL (padrão: web_search).
export type ChatTurn = { role: 'user' | 'assistant'; content: string };
export type Source = { url: string; title: string };
export type ChatReply = { text: string; sources: Source[] };

export function chatSystemPrompt(): string {
  const hoje = new Date().toLocaleDateString('pt-BR', { timeZone: 'America/Cuiaba' });
  return `Você é o assistente de redação do Autonews, uso interno de um portal de notícias de Campo Grande (MS). Responda em português do Brasil.
Data de hoje: ${hoje}.
- Quando usar pesquisa na web, cite as fontes com o link.
- Se uma informação pode ter mudado (título, valor, cargo, situação), diga a data da fonte e sinalize que é preciso confirmar.
- Não invente fatos, nomes, números ou declarações. Se não souber ou não encontrar, diga isso.
- Para pedidos de texto jornalístico, ajude com clareza, sem sensacionalismo.`;
}

export async function askOpenAI(model: string, history: ChatTurn[], useWeb: boolean): Promise<ChatReply> {
  const key = process.env.AI_API_KEY;
  if (!key) throw new Error('chave da IA não configurada no servidor');

  const body: Record<string, unknown> = {
    model,
    instructions: chatSystemPrompt(),
    input: history.map((t) => ({ role: t.role, content: t.content })),
  };
  if (useWeb) body.tools = [{ type: process.env.OPENAI_WEB_TOOL || 'web_search' }];

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 240000);
  try {
    const res = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      signal: ctrl.signal,
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const err = (await res.text()).slice(0, 300);
      throw new Error(`a IA respondeu ${res.status}: ${err}`);
    }
    const data = (await res.json()) as {
      output_text?: string;
      output?: { type: string; content?: { type: string; text?: string; annotations?: { type: string; url?: string; title?: string }[] }[] }[];
    };

    const messages = (data.output ?? []).filter((o) => o.type === 'message');
    const parts = messages.flatMap((m) => m.content ?? []).filter((c) => c.type === 'output_text');
    const text = (data.output_text ?? parts.map((p) => p.text ?? '').join('\n')).trim();
    if (!text) throw new Error('a IA não devolveu texto');

    const seen = new Set<string>();
    const sources: Source[] = [];
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
      throw new Error('a IA demorou demais para responder (mais de 4 minutos). Tente de novo, ou desligue a pesquisa na web.');
    }
    throw e;
  } finally {
    clearTimeout(timer);
  }
}
