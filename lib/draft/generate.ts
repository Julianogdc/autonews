import { prisma } from '../db';
import { buildPrompt, isSensitive, parseDraft, type SourceInput } from './prompt';

const MIN_SCORE = 60;           // só pautas de prioridade ALTA ou URGENTE (controle de custo)
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

// Gera rascunhos para pautas de prioridade alta que ainda não têm rascunho.
export async function generateDraftsPending(limit = 2): Promise<{ created: number; failed: number }> {
  if (!process.env.AI_API_KEY) return { created: 0, failed: 0 };

  const stories: StoryRow[] = await prisma.story.findMany({
    where: {
      drafts: { none: {} },
      articles: { some: { score: { gte: MIN_SCORE }, text: { not: null } } },
    },
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
    take: limit,
  });

  let created = 0;
  let failed = 0;
  for (const st of stories) {
    try {
      const sources: SourceInput[] = st.articles.map((a) => ({
        sourceKey: a.sourceKey, title: a.title, url: a.url, text: a.text ?? '', facts: a.facts,
      }));
      const prompt = buildPrompt({
        sources,
        divergences: st.alerts.map((a) => a.detail),
        sensitive: isSensitive(sources.map((s) => `${s.title} ${s.text}`).join(' ')),
      });
      const draft = parseDraft(await callOpenAI(prompt.system, prompt.user));

      const flags: string[] = [];
      if (st.alerts.length) flags.push('DIVERGENCIA');
      if (prompt.user.includes('Tema sensível')) flags.push('TEMA_SENSIVEL');

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
          model: MODEL,
        },
      });
      created++;
    } catch (e) {
      failed++;
      console.error(`rascunho da pauta ${st.id} falhou:`, e instanceof Error ? e.message : e);
    }
  }
  return { created, failed };
}
