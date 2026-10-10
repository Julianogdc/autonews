import { prisma } from '../db';
import { availableModels } from '../ai/openai';
import { askWithWeb } from '../ai/responses';
import { buildPrompt, isSensitive, parseDraft, type SourceInput } from './prompt';

const SOURCES_PER_STORY = 3;    // no máximo 3 coberturas por pauta

type StoryRow = {
  id: string;
  articles: {
    sourceKey: string; title: string; url: string; text: string | null;
    facts: { kind: string; value: string; raw: string }[];
  }[];
  alerts: { detail: string }[];
};

// Modelo da matéria: AI_DRAFT_MODEL no .env manda. Senão, o modelo médio mais novo da conta
// (a matéria só é gerada quando alguém pede, então vale usar um modelo melhor que o mini).
async function draftModel(): Promise<string> {
  if (process.env.AI_DRAFT_MODEL) return process.env.AI_DRAFT_MODEL;
  const models = await availableModels();
  return models.find((m) => !/(mini|nano)/.test(m)) ?? models[0];
}

// Gera o rascunho de uma pauta. Só roda quando alguém pede no painel (botão "Gerar matéria").
// Uma única chamada: a IA apura na web, escreve a matéria e devolve a checagem dos fatos.
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
  const sensitive = isSensitive(sources.map((s) => `${s.title} ${s.text}`).join(' '));
  const prompt = buildPrompt({ sources, divergences: st.alerts.map((a) => a.detail), sensitive });

  const model = await draftModel();
  const reply = await askWithWeb({ model, instructions: prompt.system, input: prompt.user });
  const draft = parseDraft(reply.text);

  // O que não ficou confirmado vira sugestão de checagem (a IA já apurou o resto).
  const pending = draft.checks.filter((c) => c.status !== 'confirmado');
  const flags: string[] = [];
  if (st.alerts.length || draft.checks.some((c) => c.status === 'divergente')) flags.push('DIVERGENCIA');
  if (sensitive) flags.push('TEMA_SENSIVEL');
  if (pending.length) flags.push('FATOS_A_CONFERIR');

  // Sites consultados: citados no texto da resposta e nos itens da checagem (sem repetir os portais).
  const known = new Set(sources.map((s) => s.url));
  const web = new Map<string, string>();
  for (const s of reply.sources) if (!known.has(s.url)) web.set(s.url, s.title);
  for (const c of draft.checks) for (const u of c.urls) if (!known.has(u) && !web.has(u)) web.set(u, u);

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
      unsupported: pending.map((c) => (c.note ? `${c.claim} (${c.note})` : c.claim)),
      checks: { items: draft.checks, web: [...web].map(([url, title]) => ({ url, title })) },
      model,
    },
  });
}
