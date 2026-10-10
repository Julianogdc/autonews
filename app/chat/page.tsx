import Link from 'next/link';
import { prisma } from '@/lib/db';
import { currentUserId } from '@/lib/session';
import { availableModels } from '@/lib/ai/openai';
import ChatIA from '@/components/ChatIA';

export default async function Chat({ searchParams }: { searchParams: { c?: string } }) {
  const userId = currentUserId();
  if (!userId) return <div className="alert alert-info">Sessão inválida. <Link href="/login">Entrar</Link></div>;

  const conversations: { id: string; title: string }[] = await prisma.conversation.findMany({
    where: { userId },
    orderBy: { updatedAt: 'desc' },
    take: 50,
    select: { id: true, title: true },
  });

  // Só abre conversas do próprio usuário.
  let initialId: string | null = null;
  let initialMessages: { role: 'user' | 'assistant'; content: string; sources?: any }[] = [];
  if (searchParams.c) {
    const conv = await prisma.conversation.findFirst({ where: { id: searchParams.c, userId }, select: { id: true } });
    if (conv) {
      initialId = conv.id;
      initialMessages = await prisma.message.findMany({
        where: { conversationId: conv.id },
        orderBy: { createdAt: 'asc' },
        select: { role: true, content: true, sources: true },
      }).then((rows: any[]) => rows.map((r) => ({ role: r.role, content: r.content, sources: r.sources })));
    }
  }

  const models = await availableModels();
  return (
    <>
      <h1>Chat IA</h1>
      <ChatIA conversations={conversations} models={models} initialId={initialId} initialMessages={initialMessages} />
    </>
  );
}
