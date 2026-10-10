import Link from 'next/link';
import { prisma } from '@/lib/db';
import { currentUserId } from '@/lib/session';
import AutoSelect from '@/components/AutoSelect';
import AutoRefresh from '@/components/AutoRefresh';
import { PRIORITIES, PRIORITY_LABEL, SOURCE_LABEL, formatDateTime, timeAgo } from '@/lib/ui';

type Params = { prioridade?: string; fonte?: string; situacao?: string; busca?: string; ordem?: string };

// Monta o link da própria página trocando um filtro e mantendo os outros.
function hrefWith(params: Params, change: Partial<Params>) {
  const merged: Record<string, string | undefined> = { ...params, busca: undefined, ...change };
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(merged)) if (v) qs.set(k, v);
  const s = qs.toString();
  return s ? `/?${s}` : '/';
}

const STATUS_LABEL: Record<string, string> = {
  GERADO: 'Rascunho pronto', PUBLICADA: 'Publicada', IGNORADA: 'Ignorada', SEM_RASCUNHO: 'Sem rascunho',
};

export default async function Home({ searchParams }: { searchParams: Params }) {
  if (!currentUserId()) {
    return (
      <div className="alert alert-info">Sessão inválida. <Link href="/login">Entrar</Link></div>
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
        select: { title: true, sourceKey: true, score: true, priority: true, reasons: true, publishedAt: true, detectedAt: true },
      },
      drafts: { select: { reviewFlags: true, status: true }, orderBy: { createdAt: 'desc' }, take: 1 },
      alerts: { where: { kind: 'DIVERGENCIA' }, select: { id: true } },
    },
  });

  // Última busca concluída pelo coletor e se há pedido manual ainda na fila.
  const lastDone = await prisma.auditLog.findFirst({
    where: { action: 'collect_done' }, orderBy: { createdAt: 'desc' }, select: { createdAt: true },
  });
  const pending = await prisma.auditLog.findFirst({
    where: { action: 'collect_now', ...(lastDone ? { createdAt: { gt: lastDone.createdAt } } : {}) },
    select: { id: true },
  });

  // "relevantes": maior nota primeiro (urgentes no topo). "recentes": cobertura mais nova primeiro.
  const ordem = searchParams.ordem === 'recentes' ? 'recentes' : 'relevantes';
  const all = rows.map((s: any) => {
    const top = [...s.articles].sort((a: any, b: any) => (b.score ?? -1) - (a.score ?? -1))[0];
    const latest = Math.max(...s.articles.map((a: any) => new Date(a.publishedAt ?? a.detectedAt).getTime()), 0);
    const status: string = s.drafts[0]?.status ?? 'SEM_RASCUNHO';
    const sources: string[] = Array.from(new Set(s.articles.map((a: any) => a.sourceKey)));
    return { ...s, top, topScore: top?.score ?? -1, priority: top?.priority ?? 'BAIXA', latest, status, sources };
  });

  // Resumo do topo (antes dos filtros).
  const count = (p: (s: any) => boolean) => all.filter(p).length;
  const summary = {
    urgentes: count((s) => s.priority === 'URGENTE' && s.status === 'GERADO'),
    revisar: count((s) => s.status === 'GERADO'),
    publicadas: count((s) => s.status === 'PUBLICADA'),
  };
  const byPriority = Object.fromEntries(PRIORITIES.map((p) => [p, count((s) => s.priority === p)]));

  const stories = all
    .sort((a: any, b: any) => (ordem === 'recentes' ? b.latest - a.latest : b.topScore - a.topScore))
    .filter((s: any) => !searchParams.prioridade || s.priority === searchParams.prioridade)
    .filter((s: any) => !searchParams.fonte || s.sources.includes(searchParams.fonte))
    .filter((s: any) => !searchParams.situacao || s.status === searchParams.situacao)
    .slice(0, 50);

  const hasFilters = !!(searchParams.prioridade || searchParams.fonte || searchParams.situacao);

  return (
    <>
      <AutoRefresh active={!!pending} />

      <div className="page-head">
        <div>
          <h1>Pautas</h1>
          <p className="muted">
            {pending
              ? 'Buscando nos portais… a lista atualiza sozinha.'
              : lastDone ? `Última busca ${timeAgo(lastDone.createdAt)} · automática a cada 15 min` : 'Busca automática a cada 15 minutos.'}
          </p>
        </div>
        <form method="post" action="/api/collect-now">
          <button type="submit" className="primary" disabled={!!pending}>
            {pending ? <><span className="spinner" /> Buscando…</> : 'Buscar notícias agora'}
          </button>
        </form>
      </div>

      {searchParams.busca === 'aguarde' && (
        <div className="alert alert-warn">Uma busca foi pedida há menos de 3 minutos. Aguarde um pouco antes de pedir outra.</div>
      )}

      <div className="stats">
        <Link href={hrefWith({}, { prioridade: 'URGENTE', situacao: 'GERADO' })} className="stat stat-danger">
          <strong>{summary.urgentes}</strong><span>urgentes para revisar</span>
        </Link>
        <Link href={hrefWith({}, { situacao: 'GERADO' })} className="stat">
          <strong>{summary.revisar}</strong><span>rascunhos aguardando</span>
        </Link>
        <Link href={hrefWith({}, { situacao: 'PUBLICADA' })} className="stat stat-ok">
          <strong>{summary.publicadas}</strong><span>publicadas</span>
        </Link>
      </div>

      <div className="toolbar">
        <div className="segmented" role="tablist">
          <Link href={hrefWith(searchParams, { ordem: undefined })} className={ordem === 'relevantes' ? 'on' : ''}>Urgentes primeiro</Link>
          <Link href={hrefWith(searchParams, { ordem: 'recentes' })} className={ordem === 'recentes' ? 'on' : ''}>Últimas notícias</Link>
        </div>

        <form method="get" className="toolbar-selects">
          {searchParams.ordem && <input type="hidden" name="ordem" value={searchParams.ordem} />}
          {searchParams.prioridade && <input type="hidden" name="prioridade" value={searchParams.prioridade} />}
          <AutoSelect
            name="fonte"
            value={searchParams.fonte ?? ''}
            options={[{ value: '', label: 'Todos os portais' }, ...Object.entries(SOURCE_LABEL).map(([value, label]) => ({ value, label }))]}
          />
          <AutoSelect
            name="situacao"
            value={searchParams.situacao ?? ''}
            options={[{ value: '', label: 'Qualquer situação' }, ...Object.entries(STATUS_LABEL).map(([value, label]) => ({ value, label }))]}
          />
          <noscript><button type="submit">Filtrar</button></noscript>
        </form>
      </div>

      <div className="chips">
        <Link href={hrefWith(searchParams, { prioridade: undefined })} className={`chip ${!searchParams.prioridade ? 'on' : ''}`}>
          Todas <span>{all.length}</span>
        </Link>
        {PRIORITIES.map((p) => (
          <Link
            key={p}
            href={hrefWith(searchParams, { prioridade: searchParams.prioridade === p ? undefined : p })}
            className={`chip chip-${p.toLowerCase()} ${searchParams.prioridade === p ? 'on' : ''}`}
          >
            {PRIORITY_LABEL[p]} <span>{byPriority[p]}</span>
          </Link>
        ))}
        {hasFilters && <Link href={hrefWith({}, { ordem: searchParams.ordem })} className="clear">Limpar filtros</Link>}
      </div>

      {stories.length === 0 && (
        <div className="empty">
          <p>Nenhuma pauta com esses filtros.</p>
          {hasFilters && <Link href={hrefWith({}, { ordem: searchParams.ordem })}>Limpar filtros</Link>}
        </div>
      )}

      <div className="list">
        {stories.map((s: any) => {
          const flags: string[] = s.drafts[0]?.reviewFlags ?? [];
          return (
            <Link key={s.id} href={`/pauta/${s.id}`} className={`story story-${s.priority.toLowerCase()} ${s.status !== 'GERADO' && s.status !== 'SEM_RASCUNHO' ? 'story-done' : ''}`}>
              <div className="story-score" title={`Nota ${s.topScore}`}>
                <strong>{s.topScore >= 0 ? s.topScore : '—'}</strong>
                <span>{PRIORITY_LABEL[s.priority] ?? s.priority}</span>
              </div>
              <div className="story-main">
                <div className="story-title">{s.top?.title ?? s.title}</div>
                <div className="story-meta">
                  {s.latest > 0 && <span title={formatDateTime(s.latest)}>{timeAgo(s.latest)}</span>}
                  <span>{s.sources.map((k: string) => SOURCE_LABEL[k] ?? k).join(' · ')}</span>
                  {s.articles.length > 1 && <span>{s.articles.length} coberturas</span>}
                </div>
                {(s.alerts.length > 0 || flags.length > 0) && (
                  <div className="story-flags">
                    {s.alerts.length > 0 && <span className="pill pill-danger">Divergência entre portais</span>}
                    {flags.includes('TEMA_SENSIVEL') && <span className="pill pill-danger">Tema sensível</span>}
                    {flags.includes('FATOS_A_CONFERIR') && <span className="pill pill-warn">Sugestões de checagem</span>}
                  </div>
                )}
              </div>
              <span className={`status status-${s.status.toLowerCase()}`}>{STATUS_LABEL[s.status] ?? s.status}</span>
            </Link>
          );
        })}
      </div>
    </>
  );
}
