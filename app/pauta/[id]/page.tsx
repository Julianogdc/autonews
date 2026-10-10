import Link from 'next/link';
import { prisma } from '@/lib/db';
import { currentUserId } from '@/lib/session';
import { referenceImage } from '@/lib/images/reference';
import CopyButton from '@/components/CopyButton';

export default async function Pauta({ params }: { params: { id: string } }) {
  if (!currentUserId()) {
    return <main><p>Sessão inválida. <Link href="/login">Entrar</Link></p></main>;
  }

  const story: any = await prisma.story.findUnique({
    where: { id: params.id },
    select: {
      id: true,
      title: true,
      articles: {
        orderBy: { score: 'desc' },
        select: {
          id: true, sourceKey: true, title: true, url: true, publishedAt: true,
          score: true, priority: true, reasons: true, imageUrl: true, imageCredit: true,
        },
      },
      alerts: { where: { kind: 'DIVERGENCIA' }, select: { id: true, detail: true } },
      drafts: { orderBy: { createdAt: 'desc' } },
    },
  });

  if (!story) return <main><p>Pauta não encontrada. <Link href="/">Voltar</Link></p></main>;

  const topArticle = story.articles[0];
  const ref = topArticle ? referenceImage(topArticle) : null;

  return (
    <main style={{ maxWidth: 900, margin: '0 auto' }}>
      <p><Link href="/">← Pautas</Link></p>
      <h1 style={{ marginBottom: '0.5rem' }}>{topArticle?.title ?? story.title}</h1>

      {story.alerts.length > 0 && (
        <section style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, padding: '0.75rem 1rem', marginBottom: '1rem' }}>
          <strong>Divergências entre portais — conferir antes de publicar:</strong>
          <ul>{story.alerts.map((a: any) => <li key={a.id}>{a.detail}</li>)}</ul>
        </section>
      )}

      <h2>Rascunhos</h2>
      {story.drafts.length === 0 && <p>Nenhum rascunho ainda.</p>}
      {story.drafts.map((d: any) => {
        const copyText = `${d.title}\n\n${d.body}`;
        return (
          <article key={d.id} style={{ border: '1px solid #e5e7eb', borderRadius: 8, padding: '1rem', marginBottom: '1.25rem' }}>
            <div style={{ fontSize: '0.85rem', color: '#4b5563', marginBottom: '0.5rem' }}>
              Status: <strong>{d.status}</strong> · Modelo: {d.model} · {d.reviewFlags.length ? `Revisão: ${d.reviewFlags.join(', ')}` : 'sem alertas'}
            </div>
            {d.reviewFlags.includes('TEMA_SENSIVEL') && (
              <p style={{ color: '#b91c1c' }}><strong>Tema sensível: revisão humana obrigatória.</strong></p>
            )}
            <h3 style={{ marginBottom: '0.25rem' }}>{d.title}</h3>
            {d.subtitle && <p style={{ marginTop: 0, fontStyle: 'italic' }}>{d.subtitle}</p>}
            {d.body.split(/\n\s*\n/).map((p: string, i: number) => <p key={i}>{p}</p>)}
            <p style={{ fontSize: '0.85rem', color: '#4b5563' }}>
              <strong>Categoria:</strong> {d.category ?? '—'} · <strong>Tags:</strong> {d.tags.join(', ') || '—'}
            </p>
            <p style={{ fontSize: '0.85rem', color: '#4b5563' }}>
              <strong>SEO:</strong> {d.seoTitle ?? '—'} / {d.seoDescription ?? '—'}
            </p>

            {d.unsupported.length > 0 && (
              <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 6, padding: '0.5rem 0.75rem', fontSize: '0.9rem' }}>
                <strong>Não encontrado nas fontes — conferir:</strong>
                <ul>{d.unsupported.map((u: string, i: number) => <li key={i}>{u}</li>)}</ul>
              </div>
            )}

            <div style={{ marginTop: '0.75rem', display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              <CopyButton text={copyText} label="Copiar matéria" />
              <form method="post" action="/api/pauta-status">
                <input type="hidden" name="draftId" value={d.id} />
                <button name="status" value="PUBLICADA" style={{ padding: '0.4rem 0.8rem', cursor: 'pointer' }}>Marcar como publicada</button>{' '}
                <button name="status" value="IGNORADA" style={{ padding: '0.4rem 0.8rem', cursor: 'pointer' }}>Ignorar</button>
              </form>
            </div>

            <details style={{ marginTop: '0.75rem' }}>
              <summary>Fontes</summary>
              <ul>
                {(d.sources as any[]).map((s: any, i: number) => (
                  <li key={i}><a href={s.url} target="_blank" rel="noreferrer">{s.title}</a> ({s.sourceKey})</li>
                ))}
              </ul>
            </details>
          </article>
        );
      })}

      <h2>Coberturas</h2>
      <ul>
        {story.articles.map((a: any) => (
          <li key={a.id} style={{ marginBottom: '0.5rem' }}>
            <a href={a.url} target="_blank" rel="noreferrer">{a.title}</a>
            <div style={{ fontSize: '0.85rem', color: '#4b5563' }}>
              {a.sourceKey} · nota {a.score ?? '—'} ({a.priority ?? '—'}) · {(a.reasons ?? []).join('; ')}
            </div>
          </li>
        ))}
      </ul>

      {ref && (
        <section style={{ marginTop: '1.5rem', border: '1px dashed #9ca3af', borderRadius: 8, padding: '1rem' }}>
          <h2 style={{ marginTop: 0 }}>Imagem de referência</h2>
          <p style={{ color: '#b91c1c', marginTop: 0 }}><strong>{ref.notice}</strong></p>
          <img src={ref.url} alt="Referência do portal" style={{ maxWidth: '100%', borderRadius: 6 }} />
          <div style={{ fontSize: '0.85rem', color: '#4b5563' }}>Origem: {ref.origin} · {ref.credit}</div>
        </section>
      )}
    </main>
  );
}
