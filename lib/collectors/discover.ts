import { prisma } from '../db';
import { listCandidates } from './campograndenews';
import { fetchArticle } from './article';

const SOURCE = 'campograndenews';
const MAX_NEW_PER_CYCLE = 20;   // limita o trabalho por rodada
const RETENTION_DAYS = 30;      // texto extraído é apagado após 30 dias
const MAX_AGE_HOURS = 48;       // matérias mais antigas são só registradas, sem texto

export type CycleResult = { candidates: number; alreadyKnown: number; saved: number; failed: number };

// Descobre matérias novas e salva apenas as que ainda não existem no banco.
export async function runCampoGrandeNews(): Promise<CycleResult> {
  const candidates = await listCandidates();
  const urls = candidates.map((c) => c.url);

  const known = await prisma.article.findMany({
    where: { url: { in: urls } },
    select: { url: true },
  });
  const knownSet = new Set(known.map((k: { url: string }) => k.url));
  const fresh = urls.filter((u) => !knownSet.has(u)).slice(0, MAX_NEW_PER_CYCLE);

  let saved = 0;
  let failed = 0;
  for (const url of fresh) {
    try {
      const a = await fetchArticle(url);
      if (!a.title) throw new Error('sem título');

      // Matéria com mais de 48h: registra a URL (para não reler) mas não guarda texto.
      const published = a.publishedAt ? new Date(a.publishedAt) : null;
      const tooOld = !published || Date.now() - published.getTime() > MAX_AGE_HOURS * 3600000;

      await prisma.article.create({
        data: {
          sourceKey: SOURCE,
          url: a.url,
          title: a.title,
          publishedAt: a.publishedAt ? new Date(a.publishedAt) : null,
          author: a.author,
          category: a.category,
          imageUrl: a.imageUrl,
          imageCredit: a.imageCredit,
          text: tooOld ? null : a.text || null,
          textPurgeAt: tooOld ? null : new Date(Date.now() + RETENTION_DAYS * 86400000),
          status: tooOld ? 'ANTIGA' : 'NOVA',
        },
      });
      saved++;
    } catch (e) {
      failed++;
      console.error(`falha em ${url}:`, e instanceof Error ? e.message : e);
    }
  }

  return { candidates: candidates.length, alreadyKnown: knownSet.size, saved, failed };
}
