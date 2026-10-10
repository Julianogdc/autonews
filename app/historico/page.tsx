import Link from 'next/link';
import { prisma } from '@/lib/db';
import { currentUserId } from '@/lib/session';
import { formatDateTime } from '@/lib/ui';

const ACTION_LABEL: Record<string, string> = {
  login: 'Entrou no painel',
  draft_status: 'Mudou status',
  collect_now: 'Pediu busca de notícias',
  draft_request: 'Pediu matéria à IA',
  draft_failed: 'Falha ao gerar matéria',
};

// Histórico básico: quem fez o quê e quando (logins, mudanças de status e buscas manuais).
export default async function Historico() {
  if (!currentUserId()) {
    return <div className="alert alert-info">Sessão inválida. <Link href="/login">Entrar</Link></div>;
  }

  const logs: any[] = await prisma.auditLog.findMany({
    where: { action: { not: 'collect_done' } }, // registro automático do coletor, não é ação de pessoa
    orderBy: { createdAt: 'desc' },
    take: 100,
    select: { userId: true, action: true, target: true, details: true, createdAt: true },
  });
  const users: { id: string; name: string }[] = await prisma.user.findMany({ select: { id: true, name: true } });
  const names = new Map<string, string>(users.map((u) => [u.id, u.name]));

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Histórico</h1>
          <p className="muted">Últimos 100 registros: entradas no painel, mudanças de status e buscas manuais.</p>
        </div>
      </div>
      <div className="table-wrap">
        <table>
          <thead>
            <tr><th>Quando</th><th>Quem</th><th>Ação</th><th>Detalhe</th></tr>
          </thead>
          <tbody>
            {logs.map((l, i) => (
              <tr key={i}>
                <td className="nowrap">{formatDateTime(l.createdAt)}</td>
                <td>{(l.userId && names.get(l.userId)) || '—'}</td>
                <td>{ACTION_LABEL[l.action] ?? l.action}</td>
                <td>
                  {l.details?.status === 'PUBLICADA' && <span className="status status-publicada">Publicada</span>}
                  {l.details?.status === 'IGNORADA' && <span className="status status-ignorada">Ignorada</span>}
                  {l.action === 'draft_failed' && <span className="muted">{String(l.details?.error ?? '')}</span>}
                  {(l.action === 'draft_request' || l.action === 'draft_failed') && l.target && <> <Link href={`/pauta/${l.target}`} className="muted">ver</Link></>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
