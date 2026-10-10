import Link from 'next/link';
import { prisma } from '@/lib/db';
import { currentUserId } from '@/lib/session';

// Histórico básico: quem fez o quê e quando (logins e mudanças de status).
export default async function Historico() {
  if (!currentUserId()) {
    return <div className="alert alert-info">Sessão inválida. <Link href="/login">Entrar</Link></div>;
  }

  const logs: any[] = await prisma.auditLog.findMany({
    orderBy: { createdAt: 'desc' },
    take: 100,
    select: { userId: true, action: true, target: true, details: true, createdAt: true },
  });
  const users: { id: string; name: string }[] = await prisma.user.findMany({ select: { id: true, name: true } });
  const names = new Map<string, string>(users.map((u) => [u.id, u.name]));

  return (
    <>
      <h1>Histórico</h1>
      <p className="muted">Últimos 100 registros: entradas no painel e mudanças de status.</p>
      <table>
        <thead>
          <tr><th>Quando (Cuiabá)</th><th>Quem</th><th>Ação</th><th>Detalhe</th></tr>
        </thead>
        <tbody>
          {logs.map((l, i) => (
            <tr key={i}>
              <td>{new Date(l.createdAt).toLocaleString('pt-BR', { timeZone: 'America/Cuiaba' })}</td>
              <td>{(l.userId && names.get(l.userId)) || '—'}</td>
              <td>{l.action === 'login' ? 'Entrou no painel' : l.action === 'draft_status' ? 'Mudou status' : l.action}</td>
              <td>{l.details?.status === 'PUBLICADA' ? 'Publicada' : l.details?.status === 'IGNORADA' ? 'Ignorada' : ''}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
}
