import { prisma } from '../db';
import { scoreArticle } from './score';

// Dá nota às matérias que ainda não foram triadas (novas ou anteriores à fase 3).
// Retorna quantas foram triadas nesta rodada.
export async function triagePending(limit = 200): Promise<number> {
  const pending = await prisma.article.findMany({
    where: { triagedAt: null },
    select: { id: true, title: true, category: true, publishedAt: true },
    orderBy: { detectedAt: 'asc' },
    take: limit,
  });

  const now = new Date();
  for (const a of pending) {
    const r = scoreArticle({
      title: a.title,
      category: a.category,
      publishedAt: a.publishedAt,
      now,
    });
    await prisma.article.update({
      where: { id: a.id },
      data: { score: r.score, priority: r.priority, reasons: r.reasons, triagedAt: now },
    });
  }
  return pending.length;
}
