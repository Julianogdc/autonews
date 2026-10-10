import Link from 'next/link';
import { prisma } from '@/lib/db';
import { currentUserId } from '@/lib/session';

const PRIORITY_COLOR: Record<string, string> = {
  URGENTE: '#b91c1c', ALTA: '#c2410c', NORMAL: '#4b5563', BAIXA: '#9ca3af',
};

export default async function Home({ searchParams }: { searchParams: { prioridade?: string; fonte?: string; situacao?: string; busca?: string; ordem?: string } }) {
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
  const lastDoneText = lastDone
    ? lastDone.createdAt.toLocaleString('pt-BR', { timeZone: 'America/Campo_Grande', dateStyle: 'short', timeStyle: 'short' })
    : null;

  // "relevantes": maior nota primeiro (urgentes no topo). "recentes": cobertura mais nova primeiro.
  const ordem = searchParams.ordem === 'recentes' ? 'recentes' : 'relevantes';
  const stories = rows
    .map((s: any) => {
      const top = [...s.articles].sort((a: any, b: any) => (b.score ?? -1) - (a.score ?? -1))[0];
      const latest = Math.max(...s.articles.map((a: any) => new Date(a.publishedAt ?? a.detectedAt).getTime()), 0);
      return { ...s, top, topScore: top?.score ?? -1, latest };
    })
    .sort((a: any, b: any) => (ordem === 'recentes' ? b.latest - a.latest : b.topScore - a.topScore))
    .filter((s: any) => !searchParams.prioridade || s.top?.priority === searchParams.prioridade)
    .filter((s: any) => !searchParams.fonte || s.articles.some((a: any) => a.sourceKey === searchParams.fonte))
    .filter((s: any) => {
      const st = s.drafts[0]?.status ?? 'SEM_RASCUNHO';
      return !searchParams.situacao || st === searchParams.situacao;
    })
    .slice(0, 50);

  return (
    <>
      <h1>Pautas</h1>
      <p className="muted">
        {ordem === 'recentes'
          ? 'Mais recentes primeiro, de qualquer prioridade. Revise antes de publicar.'
          : 'Ordenadas pela nota da matéria mais relevante. Revise antes de publicar.'}
      </p>

      <form method="post" action="/api/collect-now" className="row" style={{ margin: '1rem 0' }}>
        <button type="submit" className="primary" disabled={!!pending}>
          {pending ? 'Buscando…' : 'Buscar notícias agora'}
        </button>
        <span className="muted">
          {pending
            ? 'A busca começa em até 15 segundos e leva alguns minutos. Atualize a página depois.'
            : lastDoneText ? `Última busca: ${lastDoneText}` : 'Busca automática a cada 15 minutos.'}
        </span>
      </form>
      {searchParams.busca === 'aguarde' && (
        <div className="alert alert-warn">Uma busca foi pedida há menos de 3 minutos. Aguarde um pouco antes de pedir outra.</div>
      )}

      <form method="get" className="row" style={{ margin: '1rem 0' }}>
        <select name="ordem" defaultValue={ordem}>
          <option value="relevantes">Urgentes primeiro</option>
          <option value="recentes">Últimas notícias</option>
        </select>
        <select name="prioridade" defaultValue={searchParams.prioridade ?? ''}>
          <option value="">Todas as prioridades</option>
          <option value="URGENTE">Urgente</option>
          <option value="ALTA">Alta</option>
          <option value="NORMAL">Normal</option>
          <option value="BAIXA">Baixa</option>
        </select>
        <select name="fonte" defaultValue={searchParams.fonte ?? ''}>
          <option value="">Todos os portais</option>
          <option value="campograndenews">Campo Grande News</option>
          <option value="correiodoestado">Correio do Estado</option>
          <option value="topmidia">TopMídia News</option>
        </select>
        <select name="situacao" defaultValue={searchParams.situacao ?? ''}>
          <option value="">Qualquer situação</option>
          <option value="GERADO">Rascunho gerado</option>
          <option value="PUBLICADA">Publicada</option>
          <option value="IGNORADA">Ignorada</option>
          <option value="SEM_RASCUNHO">Sem rascunho</option>
        </select>
        <button type="submit">Filtrar</button>
      </form>

      {stories.length === 0 && <p className="muted">Nenhuma pauta com esses filtros.</p>}

      {stories.map((s: any) => {
        const draft = s.drafts[0];
        const flags: string[] = draft?.reviewFlags ?? [];
        return (
          <Link key={s.id} href={`/pauta/${s.id}`} className="card">
            <div className="row" style={{ marginBottom: '0.35rem' }}>
              <span className="badge" style={{ background: PRIORITY_COLOR[s.top?.priority ?? 'BAIXA'] }}>
                {s.top?.priority ?? 'BAIXA'} · {s.topScore}
              </span>
              <span className="muted">{s.articles.length} cobertura(s)</span>
              {s.latest > 0 && (
                <span className="muted">
                  · {new Date(s.latest).toLocaleString('pt-BR', { timeZone: 'America/Campo_Grande', dateStyle: 'short', timeStyle: 'short' })}
                </span>
              )}
              {s.alerts.length > 0 && <span className="flag flag-danger">divergência</span>}
              {flags.includes('TEMA_SENSIVEL') && <span className="flag flag-danger">tema sensível</span>}
              {flags.includes('FATOS_A_CONFERIR') && <span className="flag flag-warn">a conferir</span>}
              {draft?.status && draft.status !== 'GERADO' && (
                <span className="flag flag-ok spacer">{draft.status === 'PUBLICADA' ? 'publicada' : 'ignorada'}</span>
              )}
            </div>
            <div style={{ fontWeight: 600 }}>{s.top?.title ?? s.title}</div>
          </Link>
        );
      })}
    </>
  );
}
