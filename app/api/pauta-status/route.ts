import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { currentUserId } from '@/lib/session';

// Marca um rascunho como PUBLICADA ou IGNORADA. Exige sessão válida e registra quem fez.
export async function POST(req: NextRequest) {
  const userId = currentUserId();
  if (!userId) return new NextResponse(null, { status: 401 });

  const form = await req.formData();
  const draftId = String(form.get('draftId') ?? '');
  const status = String(form.get('status') ?? '');
  if (!draftId || !['PUBLICADA', 'IGNORADA'].includes(status)) {
    return new NextResponse(null, { status: 400 });
  }

  const draft = await prisma.draft.update({
    where: { id: draftId },
    data: { status },
    select: { storyId: true },
  });
  await prisma.auditLog.create({
    data: { userId, action: 'draft_status', target: draftId, details: { status } },
  });

  // Caminho relativo: não depende do endereço interno do servidor.
  return new NextResponse(null, { status: 303, headers: { Location: `/pauta/${draft.storyId}` } });
}
