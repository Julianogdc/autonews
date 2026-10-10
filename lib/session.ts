import { cookies } from 'next/headers';
import { SESSION_COOKIE, readSessionToken } from './auth';

// Quem está logado (ou null). Confere a assinatura do cookie, não só a presença.
export function currentUserId(): string | null {
  return readSessionToken(cookies().get(SESSION_COOKIE)?.value);
}
