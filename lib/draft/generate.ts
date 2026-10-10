import { prisma } from '../db';
import { buildPrompt, buildVerifyUser, isSensitive, parseDraft, parseVerify, VERIFY_SYSTEM, type SourceInput } from './prompt';

const SOURCES_PER_STORY = 3;    // no máximo 3 coberturas por pauta
const MODEL = process.env.AI_MODEL || 'gpt-4o-mini';
const TIMEOUT_MS = 90000;

type StoryRow = {
  id: string;
  articles: {
    sourceKey: string; title: string; url: string; text: string | null;
    facts: { kind: string; value: string; raw: string }[];
  }[];
  alerts: { detail: string }[];
};

async function callOpenAI(system: string, user: string): Promise<string> {
  const key = process.env.AI_API_KEY;
  if (!key) throw new Error('AI_API_KEY não configurada');
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      signal: ctrl.signal,
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
      body: JSON.stringify({
        model: MODEL,
        temperature: 0.3,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: user },
        ],
      }),
    });
    if (!res.ok) throw new Error(`OpenAI respondeu ${res.status}`);
    const json = (await res.json()) as { choices?: { message?: { content?: string } }[] };
    const content = json.choices?.[0]?.message?.content;
    if (!content) throw new Error('OpenAI sem conteúdo');
    return content;
  } finally {
    clearTimeout(timer);
  }
}

// Gera o rascunho de uma pauta. Só roda quando alguém pede no painel (botão "Gerar matéria").
export async function generateDraftForStory(storyId: string): Promise<void> {
  const st: StoryRow | null = await prisma.story.findUnique({
    where: { id: storyId },
    select: {
      id: true,
      articles: {
        where: { text: { not: null } },
        orderBy: { score: 'desc' },
        take: SOURCES_PER_STORY,
        select: {
          sourceKey: true, title: true, url: true, text: true,
          facts: { select: { kind: true, value: true, raw: true } },
        },
      },
      alerts: { where: { kind: 'DIVERGENCIA' }, select: { detail: true } },
    },
  });
  if (!st) throw new Error('pauta não encontrada');
  if (!st.articles.length) throw new Error('o texto das fontes não está mais disponível (é apagado após 30 dias)');

  const sources: SourceInput[] = st.articles.map((a) => ({
    sourceKey: a.sourceKey, title: a.title, url: a.url, text: a.text ?? '', facts: a.facts,
  }));
  const prompt = buildPrompt({
    sources,
    divergences: st.alerts.map((a) => a.detail),
    sensitive: isSensitive(sources.map((s) => `${s.title} ${s.text}`).join(' ')),
  });
  const draft = parseDraft(await callOpenAI(prompt.system, prompt.user));
  // Conferência: afirmações que não aparecem nas fontes ficam registradas para revisão.
  const unsupported = parseVerify(
    await callOpenAI(VERIFY_SYSTEM, buildVerifyUser(draft, sources)),
  );

  const flags: string[] = [];
  if (st.alerts.length) flags.push('DIVERGENCIA');
  if (prompt.user.includes('Tema sensível')) flags.push('TEMA_SENSIVEL');
  if (unsupported.length) flags.push('FATOS_A_CONFERIR');

  await prisma.draft.create({
    data: {
      storyId: st.id,
      title: draft.title,
      subtitle: draft.subtitle,
      body: draft.body,
      category: draft.category,
      tags: draft.tags,
      seoTitle: draft.seoTitle,
      seoDescription: draft.seoDescription,
      sources: sources.map((s) => ({ sourceKey: s.sourceKey, title: s.title, url: s.url })),
      reviewFlags: flags,
      unsupported,
      model: MODEL,
    },
  });
}
