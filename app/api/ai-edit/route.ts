import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { currentUserId } from '@/lib/session';
import { availableModels, chatJson } from '@/lib/ai/openai';
import { EDIT_MODES, editSystemPrompt } from '@/lib/ai/edit';

const MAX_CHARS = 20000;

export async function POST(req: NextRequest) {
  const userId = currentUserId();
  if (!userId) return NextResponse.json({ erro: 'sessão inválida' }, { status: 401 });

  const body = (await req.json().catch(() => null)) as { text?: string; model?: string; mode?: string } | null;
  const text = (body?.text ?? '').trim();
  const model = body?.model ?? '';
  const mode = body?.mode ?? 'corrigir';

  if (!text) return NextResponse.json({ erro: 'texto vazio' }, { status: 400 });
  if (text.length > MAX_CHARS) return NextResponse.json({ erro: `texto muito longo (máximo ${MAX_CHARS} caracteres)` }, { status: 400 });
  if (!(await availableModels()).includes(model)) return NextResponse.json({ erro: 'modelo não permitido' }, { status: 400 });
  if (!EDIT_MODES[mode]) return NextResponse.json({ erro: 'modo inválido' }, { status: 400 });

  try {
    const raw = await chatJson(model, editSystemPrompt(mode), `TEXTO:\n${text}`);
    const data = JSON.parse(raw) as { texto?: unknown; avisos?: unknown };
    const out = typeof data.texto === 'string' ? data.texto.trim() : '';
    if (!out) throw new Error('a IA não devolveu o texto');
    const avisos = Array.isArray(data.avisos) ? data.avisos.filter((x): x is string => typeof x === 'string') : [];

    // Registra o uso sem guardar o texto (privacidade): só modelo, modo e tamanho.
    await prisma.auditLog.create({
      data: { userId, action: 'ia_edit', details: { model, mode, chars: text.length } },
    });

    return NextResponse.json({ texto: out, avisos, model });
  } catch (e) {
    return NextResponse.json({ erro: e instanceof Error ? e.message : 'falha desconhecida' }, { status: 502 });
  }
}
