import Link from 'next/link';
import { prisma } from '@/lib/db';
import { currentUserId } from '@/lib/session';

// Histórico básico: quem fez o quê e quando (logins e mudanças de status).
export default async function Historico() {
  if (!currentUserId()) {
    return <main><p>Sessão inválida. <Link href="/login">Entrar</Link></p></main>;
  }

  const logs: any[] = await prisma.auditLog.findMany({
    orderBy: { createdAt: 'desc' },
    take: 100,
    select: { userId: true, action: true, target: true, details: true, createdAt: true },
  });
  const users: { id: string; name: string }[] = await prisma.user.findMany({ select: { id: true, name: true } });
  const names = new Map<string, string>(users.map((u) => [u.id, u.name]));

  return (
    <main style={{ maxWidth: 900, margin: '0 auto' }}>
      <p><Link href="/">← Pautas</Link></p>
      <h1>Histórico</h1>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
        <thead>
          <tr style={{ textAlign: 'left', borderBottom: '1px solid #e5e7eb' }}>
            <th>Quando (Cuiabá)</th><th>Quem</th><th>Ação</th><th>Detalhe</th>
          </tr>
        </thead>
        <tbody>
          {logs.map((l, i) => (
            <tr key={i} style={{ borderBottom: '1px solid #f3f4f6' }}>
              <td>{new Date(l.createdAt).toLocaleString('pt-BR', { timeZone: 'America/Cuiaba' })}</td>
              <td>{(l.userId && names.get(l.userId)) || '—'}</td>
              <td>{l.action === 'login' ? 'Entrou no painel' : l.action === 'draft_status' ? 'Mudou status' : l.action}</td>
              <td>{l.details?.status ?? ''}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </main>
  );
}
