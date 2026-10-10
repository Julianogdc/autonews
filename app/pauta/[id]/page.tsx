import Link from 'next/link';
import { prisma } from '@/lib/db';
import { currentUserId } from '@/lib/session';
import { referenceImage } from '@/lib/images/reference';
import CopyButton from '@/components/CopyButton';

export default async function Pauta({ params }: { params: { id: string } }) {
  if (!currentUserId()) {
    return <div className="alert alert-info">Sessão inválida. <Link href="/login">Entrar</Link></div>;
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

  if (!story) return <div className="alert alert-info">Pauta não encontrada. <Link href="/">Voltar</Link></div>;

  const topArticle = story.articles[0];
  const ref = topArticle ? referenceImage(topArticle) : null;

  return (
    <>
      <p className="muted"><Link href="/">← Pautas</Link></p>
      <h1>{topArticle?.title ?? story.title}</h1>

      {story.alerts.length > 0 && (
        <div className="alert alert-danger">
          <strong>Divergências entre portais: conferir antes de publicar</strong>
          <ul>{story.alerts.map((a: any) => <li key={a.id}>{a.detail}</li>)}</ul>
        </div>
      )}

      <h2>Rascunhos</h2>
      {story.drafts.length === 0 && <p className="muted">Nenhum rascunho ainda.</p>}

      {story.drafts.map((d: any) => {
        const tudo = [
          d.title,
          d.subtitle ?? '',
          d.body,
          `Categoria: ${d.category ?? ''}`,
          `Tags: ${d.tags.join(', ')}`,
          `SEO título: ${d.seoTitle ?? ''}`,
          `SEO descrição: ${d.seoDescription ?? ''}`,
        ].join('\n\n');
        return (
          <article key={d.id} className="card" style={{ padding: '1.25rem' }}>
            <div className="draft-meta">
              <span className="tag">{d.status}</span>{' '}
              {d.reviewFlags.includes('TEMA_SENSIVEL') && <span className="flag flag-danger">tema sensível: revisão humana obrigatória</span>}{' '}
              {d.reviewFlags.includes('FATOS_A_CONFERIR') && <span className="flag flag-warn">a conferir</span>}{' '}
              <span className="muted">modelo {d.model}</span>
            </div>

            <h3>{d.title}</h3>
            {d.subtitle && <p style={{ fontStyle: 'italic', color: 'var(--muted)' }}>{d.subtitle}</p>}
            <div className="draft-body">
              {d.body.split(/\n\s*\n/).map((p: string, i: number) => <p key={i}>{p}</p>)}
            </div>

            <p className="muted">
              <strong>Categoria:</strong> {d.category ?? '—'} · <strong>Tags:</strong> {d.tags.join(', ') || '—'}
            </p>
            <p className="muted"><strong>SEO:</strong> {d.seoTitle ?? '—'} / {d.seoDescription ?? '—'}</p>

            {d.unsupported.length > 0 && (
              <div className="alert alert-warn" style={{ margin: '0.75rem 0' }}>
                <strong>Não encontrado nas fontes: conferir</strong>
                <ul>{d.unsupported.map((u: string, i: number) => <li key={i}>{u}</li>)}</ul>
              </div>
            )}

            <div className="row" style={{ marginTop: '0.75rem' }}>
              <CopyButton text={tudo} label="Copiar tudo" />
              <CopyButton text={d.title} label="Título" />
              <CopyButton text={d.subtitle ?? ''} label="Subtítulo" />
              <CopyButton text={d.body} label="Texto" />
              <CopyButton text={d.tags.join(', ')} label="Tags" />
              <CopyButton text={`${d.seoTitle ?? ''}\n${d.seoDescription ?? ''}`} label="SEO" />
            </div>

            <div className="row" style={{ marginTop: '0.75rem' }}>
              <form method="post" action="/api/pauta-status" className="row">
                <input type="hidden" name="draftId" value={d.id} />
                <button type="submit" name="status" value="PUBLICADA" className="primary">Marcar como publicada</button>
                <button type="submit" name="status" value="IGNORADA" className="danger">Ignorar</button>
              </form>
            </div>

            <details style={{ marginTop: '0.75rem' }}>
              <summary>Fontes</summary>
              <ul>
                {(d.sources as any[]).map((s: any, i: number) => (
                  <li key={i}><a href={s.url} target="_blank" rel="noreferrer">{s.title}</a> <span className="muted">({s.sourceKey})</span></li>
                ))}
              </ul>
            </details>
          </article>
        );
      })}

      <h2>Coberturas</h2>
      {story.articles.map((a: any) => (
        <div key={a.id} className="card" style={{ padding: '0.75rem 1rem' }}>
          <a href={a.url} target="_blank" rel="noreferrer">{a.title}</a>
          <div className="muted">
            {a.sourceKey} · nota {a.score ?? '—'} ({a.priority ?? '—'}) · {(a.reasons ?? []).join('; ')}
          </div>
        </div>
      ))}

      {ref && (
        <section className="card" style={{ marginTop: '1.25rem', borderStyle: 'dashed' }}>
          <h2 style={{ marginTop: 0 }}>Imagem de referência</h2>
          <div className="alert alert-danger" style={{ margin: '0 0 0.75rem' }}><strong>{ref.notice}</strong></div>
          <img className="ref" src={ref.url} alt="Referência do portal" />
          <div className="muted" style={{ marginTop: '0.4rem' }}>Origem: {ref.origin} · {ref.credit}</div>
        </section>
      )}
    </>
  );
}
