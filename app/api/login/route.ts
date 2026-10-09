import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import {
  SESSION_COOKIE,
  createSessionToken,
  sessionCookieOptions,
  verifyPassword,
} from '@/lib/auth';

export async function POST(req: NextRequest) {
  const form = await req.formData();
  const email = String(form.get('email') ?? '').trim().toLowerCase();
  const password = String(form.get('password') ?? '');

  const user = email ? await prisma.user.findUnique({ where: { email } }) : null;
  const ok = user ? await verifyPassword(password, user.passwordHash) : false;

  if (!user || !ok) {
    // Mensagem genérica: não revela se o e-mail existe.
    return NextResponse.redirect(new URL('/login?erro=1', req.url), 303);
  }

  await prisma.auditLog.create({
    data: { userId: user.id, action: 'login' },
  });

  const res = NextResponse.redirect(new URL('/', req.url), 303);
  res.cookies.set(SESSION_COOKIE, createSessionToken(user.id), sessionCookieOptions);
  return res;
}
