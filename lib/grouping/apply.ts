import { prisma } from '../db';
import { sameEvent } from './similarity';

const WINDOW_HOURS = 48; // só compara com matérias das últimas 48h

// Liga cada matéria triada à pauta do mesmo fato, ou cria uma pauta nova.
// Retorna quantas matérias foram ligadas nesta rodada.
export async function groupPending(limit = 200): Promise<number> {
  const since = new Date(Date.now() - WINDOW_HOURS * 3600000);

  // Pautas recentes: referência para comparar as matérias novas.
  const recent = await prisma.article.findMany({
    where: { storyId: { not: null }, detectedAt: { gte: since } },
    select: { title: true, storyId: true },
  });
  const pool: { title: string; storyId: string }[] = recent.filter(
    (r: { title: string; storyId: string | null }): r is { title: string; storyId: string } => r.storyId !== null,
  );

  const pending = await prisma.article.findMany({
    where: { storyId: null, triagedAt: { not: null } },
    select: { id: true, title: true },
    orderBy: { detectedAt: 'asc' },
    take: limit,
  });

  let linked = 0;
  for (const a of pending) {
    let match: { storyId: string; score: number } | null = null;
    for (const p of pool) {
      const r = sameEvent(a.title, p.title);
      if (r.same && (!match || r.score > match.score)) match = { storyId: p.storyId, score: r.score };
    }

    let storyId: string;
    if (match) {
      storyId = match.storyId;
    } else {
      const story = await prisma.story.create({ data: { title: a.title } });
      storyId = story.id;
    }

    await prisma.article.update({ where: { id: a.id }, data: { storyId } });
    pool.push({ title: a.title, storyId });
    linked++;
  }
  return linked;
}
