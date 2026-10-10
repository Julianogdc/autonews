import { prisma } from '../db';

// Situação do pedido de rascunho de uma pauta, a partir do histórico (AuditLog):
// draft_request = alguém clicou em "Gerar matéria"; draft_failed = a geração deu erro.
const RUNNING_MS = 7 * 60 * 1000; // depois disso, um pedido sem resposta é tratado como perdido

export type DraftRequestState =
  | { state: 'idle' }
  | { state: 'running' }
  | { state: 'failed'; error: string };

export async function draftRequestState(storyId: string): Promise<DraftRequestState> {
  const last = await prisma.auditLog.findFirst({
    where: { target: storyId, action: { in: ['draft_request', 'draft_failed'] } },
    orderBy: { createdAt: 'desc' },
    select: { action: true, details: true, createdAt: true },
  });
  if (!last) return { state: 'idle' };
  // Um rascunho criado depois do último pedido/falha quer dizer que o pedido foi atendido.
  const newer = await prisma.draft.findFirst({
    where: { storyId, createdAt: { gt: last.createdAt } },
    select: { id: true },
  });
  if (newer) return { state: 'idle' };
  if (last.action === 'draft_failed') {
    return { state: 'failed', error: String((last.details as any)?.error ?? 'erro desconhecido') };
  }
  if (Date.now() - last.createdAt.getTime() < RUNNING_MS) return { state: 'running' };
  return { state: 'failed', error: 'a geração demorou demais e foi interrompida' };
}
