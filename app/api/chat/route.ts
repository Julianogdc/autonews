import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { currentUserId } from '@/lib/session';
import { availableModels } from '@/lib/ai/openai';
import { askOpenAI, type ChatTurn } from '@/lib/ai/chat';

const MAX_MSG = 8000;
const HISTORY_TURNS = 20;

export async function POST(req: NextRequest) {
  const userId = currentUserId();
  if (!userId) return NextResponse.json({ erro: 'sessão inválida' }, { status: 401 });

  const body = (await req.json().catch(() => null)) as
    { conversationId?: string; message?: string; model?: string; useWeb?: boolean } | null;
  const message = (body?.message ?? '').trim();
  const model = body?.model ?? '';
  const useWeb = !!body?.useWeb;

  if (!message) return NextResponse.json({ erro: 'mensagem vazia' }, { status: 400 });
  if (message.length > MAX_MSG) return NextResponse.json({ erro: `mensagem muito longa (máximo ${MAX_MSG} caracteres)` }, { status: 400 });
  if (!availableModels().includes(model)) return NextResponse.json({ erro: 'modelo não permitido' }, { status: 400 });

  // Conversa existente só se for do próprio usuário; senão cria uma nova.
  const existing = body?.conversationId
    ? await prisma.conversation.findFirst({ where: { id: body.conversationId, userId }, select: { id: true } })
    : null;
  const convId: string = existing
    ? existing.id
    : (
        await prisma.conversation.create({
          data: { userId, title: message.slice(0, 60) },
          select: { id: true },
        })
      ).id;

  const past: { role: string; content: string }[] = await prisma.message.findMany({
    where: { conversationId: convId },
    orderBy: { createdAt: 'desc' },
    take: HISTORY_TURNS,
    select: { role: true, content: true },
  });
  const history: ChatTurn[] = past
    .reverse()
    .map((m) => ({ role: m.role === 'assistant' ? 'assistant' : 'user', content: m.content }));
  history.push({ role: 'user', content: message });

  try {
    const reply = await askOpenAI(model, history, useWeb);

    await prisma.message.createMany({
      data: [
        { conversationId: convId, role: 'user', content: message },
        { conversationId: convId, role: 'assistant', content: reply.text, model, sources: reply.sources },
      ],
    });
    await prisma.auditLog.create({
      data: { userId, action: 'ia_chat', target: convId, details: { model, useWeb, chars: message.length } },
    });

    return NextResponse.json({ conversationId: convId, texto: reply.text, fontes: reply.sources });
  } catch (e) {
    return NextResponse.json({ erro: e instanceof Error ? e.message : 'falha desconhecida' }, { status: 502 });
  }
}
