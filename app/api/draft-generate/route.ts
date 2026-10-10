import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { currentUserId } from '@/lib/session';
import { generateDraftForStory } from '@/lib/draft/generate';
import { draftRequestState } from '@/lib/draft/request';

// "Gerar matéria": dispara a geração do rascunho com IA em segundo plano e volta para a pauta.
// A página da pauta se atualiza sozinha até o rascunho aparecer (ou o erro).
export async function POST(req: NextRequest) {
  const userId = currentUserId();
  if (!userId) return new NextResponse(null, { status: 401 });

  const form = await req.formData();
  const storyId = String(form.get('storyId') ?? '');
  if (!storyId) return new NextResponse(null, { status: 400 });
  const back = new NextResponse(null, { status: 303, headers: { Location: `/pauta/${storyId}` } });

  // Já tem rascunho (sem pedido de nova versão) ou já está gerando: não gasta IA de novo.
  const regenerate = form.get('regenerate') === '1';
  const hasDraft = await prisma.draft.findFirst({ where: { storyId }, select: { id: true } });
  if (hasDraft && !regenerate) return back;
  if ((await draftRequestState(storyId)).state === 'running') return back;

  await prisma.auditLog.create({ data: { userId, action: 'draft_request', target: storyId } });

  generateDraftForStory(storyId).catch(async (e) => {
    const error = e instanceof Error ? e.message : String(e);
    console.error(`rascunho da pauta ${storyId} falhou:`, error);
    await prisma.auditLog
      .create({ data: { userId, action: 'draft_failed', target: storyId, details: { error } } })
      .catch(() => {});
  });

  return back;
}
