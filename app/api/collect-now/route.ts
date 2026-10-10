import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { currentUserId } from '@/lib/session';

const COOLDOWN_MS = 3 * 60 * 1000; // intervalo mínimo entre buscas manuais

// Pede ao coletor uma busca imediata nos portais. O worker confere os pedidos a cada 15 s.
export async function POST() {
  const userId = currentUserId();
  if (!userId) return new NextResponse(null, { status: 401 });

  const recent = await prisma.auditLog.findFirst({
    where: { action: 'collect_now', createdAt: { gt: new Date(Date.now() - COOLDOWN_MS) } },
    select: { id: true },
  });
  if (recent) {
    return new NextResponse(null, { status: 303, headers: { Location: '/?busca=aguarde' } });
  }

  await prisma.auditLog.create({ data: { userId, action: 'collect_now' } });
  return new NextResponse(null, { status: 303, headers: { Location: '/?busca=ok' } });
}
