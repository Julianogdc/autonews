import { prisma } from '../db';
import { extractFacts, findDivergences, type Coverage, type Fact } from './extract';

// Extrai fatos das matérias que ainda não passaram por essa etapa.
// Matérias sem texto (antigas ou de assinantes) são marcadas sem fatos, para não serem relidas.
export async function processFacts(limit = 200): Promise<{ extracted: number; alerts: number }> {
  const pending = await prisma.article.findMany({
    where: { factsAt: null },
    select: { id: true, text: true, storyId: true },
    orderBy: { detectedAt: 'asc' },
    take: limit,
  });

  const touched = new Set<string>();
  for (const a of pending) {
    const facts = a.text ? extractFacts(a.text) : [];
    await prisma.$transaction([
      prisma.fact.createMany({
        data: facts.map((f) => ({ articleId: a.id, kind: f.kind, value: f.value, raw: f.raw })),
      }),
      prisma.article.update({ where: { id: a.id }, data: { factsAt: new Date() } }),
    ]);
    if (a.storyId) touched.add(a.storyId);
  }

  let alerts = 0;
  for (const storyId of touched) alerts += await refreshAlerts(storyId);
  return { extracted: pending.length, alerts };
}

// Recalcula as divergências de uma pauta a partir dos fatos gravados.
// Os alertas antigos da pauta são substituídos, para refletir o estado atual.
export async function refreshAlerts(storyId: string): Promise<number> {
  const arts = await prisma.article.findMany({
    where: { storyId },
    select: { id: true, sourceKey: true, facts: { select: { kind: true, value: true, raw: true } } },
  });

  const coverages: Coverage[] = arts.map((a: { id: string; sourceKey: string; facts: Fact[] }) => ({
    articleId: a.id,
    sourceKey: a.sourceKey,
    facts: a.facts,
  }));
  const divs = findDivergences(coverages);

  await prisma.$transaction([
    prisma.alert.deleteMany({ where: { storyId, kind: 'DIVERGENCIA' } }),
    prisma.alert.createMany({
      data: divs.map((d) => ({
        storyId,
        kind: 'DIVERGENCIA',
        detail:
          `Valores diferentes para ${d.kind}: ` +
          d.values.map((v) => `${v.value} (${v.sources.join(', ')})`).join(' x '),
        data: JSON.parse(JSON.stringify(d)),
      })),
    }),
  ]);
  return divs.length;
}
