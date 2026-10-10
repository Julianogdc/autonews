import Link from 'next/link';
import { prisma } from '@/lib/db';
import { currentUserId } from '@/lib/session';
import { referenceImage } from '@/lib/images/reference';
import CopyButton from '@/components/CopyButton';
import { PRIORITY_LABEL, SOURCE_LABEL, formatDateTime, timeAgo } from '@/lib/ui';

const DRAFT_STATUS: Record<string, string> = { GERADO: 'Rascunho pronto', PUBLICADA: 'Publicada', IGNORADA: 'Ignorada' };

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
          id: true, sourceKey: true, title: true, url: true, publishedAt: true, detectedAt: true,
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
  const priority: string = topArticle?.priority ?? 'BAIXA';

  return (
    <>
      <Link href="/" className="back">← Voltar às pautas</Link>

      <header className="detail-head">
        <div className="row">
          <span className={`pill pill-${priority.toLowerCase()}`}>{PRIORITY_LABEL[priority] ?? priority} · nota {topArticle?.score ?? '—'}</span>
          <span className="muted">{story.articles.length} cobertura(s)</span>
        </div>
        <h1>{topArticle?.title ?? story.title}</h1>
      </header>

      {story.alerts.length > 0 && (
        <div className="alert alert-danger">
          <strong>Divergências entre portais: conferir antes de publicar</strong>
          <ul>{story.alerts.map((a: any) => <li key={a.id}>{a.detail}</li>)}</ul>
        </div>
      )}

      <h2>Rascunho</h2>
      {story.drafts.length === 0 && (
        <div className="empty"><p>Nenhum rascunho ainda. Só pautas de prioridade alta ou urgente recebem rascunho automático.</p></div>
      )}

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
          <article key={d.id} className="card draft">
            <div className="draft-meta">
              <span className={`status status-${d.status.toLowerCase()}`}>{DRAFT_STATUS[d.status] ?? d.status}</span>
              {d.reviewFlags.includes('TEMA_SENSIVEL') && <span className="pill pill-danger">Tema sensível: revisão humana obrigatória</span>}
              {d.reviewFlags.includes('FATOS_A_CONFERIR') && <span className="pill pill-warn">Fatos a conferir</span>}
              <span className="muted spacer">gerado {timeAgo(d.createdAt)} · {d.model}</span>
            </div>

            {d.unsupported.length > 0 && (
              <div className="alert alert-warn">
                <strong>Não encontrado nas fontes: conferir</strong>
                <ul>{d.unsupported.map((u: string, i: number) => <li key={i}>{u}</li>)}</ul>
              </div>
            )}

            <h3 className="draft-title">{d.title}</h3>
            {d.subtitle && <p className="draft-subtitle">{d.subtitle}</p>}
            <div className="draft-body">
              {d.body.split(/\n\s*\n/).map((p: string, i: number) => <p key={i}>{p}</p>)}
            </div>

            <dl className="draft-extra">
              <dt>Categoria</dt><dd>{d.category ?? '—'}</dd>
              <dt>Tags</dt><dd>{d.tags.join(', ') || '—'}</dd>
              <dt>SEO título</dt><dd>{d.seoTitle ?? '—'}</dd>
              <dt>SEO descrição</dt><dd>{d.seoDescription ?? '—'}</dd>
            </dl>

            <div className="draft-actions">
              <div className="row">
                <span className="muted">Copiar:</span>
                <CopyButton text={tudo} label="Tudo" primary />
                <CopyButton text={d.title} label="Título" />
                <CopyButton text={d.subtitle ?? ''} label="Subtítulo" />
                <CopyButton text={d.body} label="Texto" />
                <CopyButton text={d.tags.join(', ')} label="Tags" />
                <CopyButton text={`${d.seoTitle ?? ''}\n${d.seoDescription ?? ''}`} label="SEO" />
              </div>
              <form method="post" action="/api/pauta-status" className="row">
                <input type="hidden" name="draftId" value={d.id} />
                <button type="submit" name="status" value="PUBLICADA" className="success" disabled={d.status === 'PUBLICADA'}>Marcar como publicada</button>
                <button type="submit" name="status" value="IGNORADA" className="danger" disabled={d.status === 'IGNORADA'}>Ignorar</button>
              </form>
            </div>
          </article>
        );
      })}

      <h2>Coberturas nos portais</h2>
      <div className="list">
        {story.articles.map((a: any) => (
          <a key={a.id} href={a.url} target="_blank" rel="noreferrer" className="source">
            <div className="source-head">
              <strong>{SOURCE_LABEL[a.sourceKey] ?? a.sourceKey}</strong>
              <span className="muted">{formatDateTime(a.publishedAt ?? a.detectedAt)}</span>
              <span className="muted spacer">nota {a.score ?? '—'} · {PRIORITY_LABEL[a.priority] ?? '—'}</span>
            </div>
            <div className="source-title">{a.title} ↗</div>
            {(a.reasons ?? []).length > 0 && <div className="muted">{a.reasons.join(' · ')}</div>}
          </a>
        ))}
      </div>

      {ref && (
        <section className="card ref-card">
          <h2>Imagem de referência</h2>
          <div className="alert alert-danger"><strong>{ref.notice}</strong></div>
          <img className="ref" src={ref.url} alt="Referência do portal" />
          <div className="muted">Origem: {ref.origin} · {ref.credit}</div>
        </section>
      )}
    </>
  );
}
