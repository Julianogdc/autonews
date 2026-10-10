import Link from 'next/link';
import { prisma } from '@/lib/db';
import { currentUserId } from '@/lib/session';

const PRIORITY_COLOR: Record<string, string> = {
  URGENTE: '#b91c1c', ALTA: '#c2410c', NORMAL: '#4b5563', BAIXA: '#9ca3af',
};

export default async function Home() {
  if (!currentUserId()) {
    return (
      <main>
        <p>Sessão inválida. <Link href="/login">Entrar</Link></p>
      </main>
    );
  }

  const rows = await prisma.story.findMany({
    take: 100,
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      title: true,
      createdAt: true,
      articles: {
        select: { title: true, sourceKey: true, score: true, priority: true, reasons: true },
      },
      drafts: { select: { reviewFlags: true, status: true }, orderBy: { createdAt: 'desc' }, take: 1 },
      alerts: { where: { kind: 'DIVERGENCIA' }, select: { id: true } },
    },
  });

  // Ordena pela matéria de maior nota de cada pauta.
  const stories = rows
    .map((s: any) => {
      const top = [...s.articles].sort((a: any, b: any) => (b.score ?? -1) - (a.score ?? -1))[0];
      return { ...s, top, topScore: top?.score ?? -1 };
    })
    .sort((a: any, b: any) => b.topScore - a.topScore)
    .slice(0, 50);

  return (
    <main style={{ maxWidth: 900, margin: '0 auto' }}>
      <h1 style={{ marginBottom: '0.25rem' }}>Pautas</h1>
      <p style={{ color: '#4b5563', marginTop: 0 }}>Ordenadas pela nota da matéria mais relevante. Revise antes de publicar.</p>

      {stories.length === 0 && <p>Nenhuma pauta ainda. O coletor cria as pautas a cada 15 minutos.</p>}

      {stories.map((s: any) => {
        const draft = s.drafts[0];
        const flags: string[] = draft?.reviewFlags ?? [];
        return (
          <Link key={s.id} href={`/pauta/${s.id}`} style={{ display: 'block', textDecoration: 'none', color: 'inherit', border: '1px solid #e5e7eb', borderRadius: 8, padding: '0.9rem 1rem', marginBottom: '0.75rem' }}>
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap', marginBottom: '0.3rem' }}>
              <span style={{ background: PRIORITY_COLOR[s.top?.priority ?? 'BAIXA'], color: '#fff', borderRadius: 4, padding: '0.1rem 0.5rem', fontSize: '0.8rem' }}>
                {s.top?.priority ?? 'BAIXA'} · {s.topScore}
              </span>
              <span style={{ color: '#4b5563', fontSize: '0.85rem' }}>{s.articles.length} cobertura(s)</span>
              {s.alerts.length > 0 && <span style={{ color: '#b91c1c', fontSize: '0.85rem' }}>divergência</span>}
              {flags.includes('TEMA_SENSIVEL') && <span style={{ color: '#b91c1c', fontSize: '0.85rem' }}>tema sensível</span>}
              {flags.includes('FATOS_A_CONFERIR') && <span style={{ color: '#c2410c', fontSize: '0.85rem' }}>a conferir</span>}
              {draft?.status && draft.status !== 'GERADO' && <span style={{ color: '#065f46', fontSize: '0.85rem' }}>{draft.status.toLowerCase()}</span>}
            </div>
            <div style={{ fontWeight: 600 }}>{s.top?.title ?? s.title}</div>
          </Link>
        );
      })}
    </main>
  );
}
