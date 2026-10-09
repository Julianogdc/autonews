import { randomBytes, scrypt as scryptCb, timingSafeEqual, createHmac } from 'crypto';
import { promisify } from 'util';

const scrypt = promisify(scryptCb) as (
  password: string,
  salt: Buffer,
  keylen: number,
) => Promise<Buffer>;

export const SESSION_COOKIE = 'autonews_session';
const SESSION_TTL_MS = 12 * 60 * 60 * 1000; // 12 horas

// Senha: scrypt (algoritmo de hash lento, resistente a força bruta).
export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const key = await scrypt(password, salt, 64);
  return `scrypt$${salt.toString('hex')}$${key.toString('hex')}`;
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [algo, saltHex, keyHex] = stored.split('$');
  if (algo !== 'scrypt' || !saltHex || !keyHex) return false;
  const expected = Buffer.from(keyHex, 'hex');
  const actual = await scrypt(password, Buffer.from(saltHex, 'hex'), expected.length);
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

function secret(): string {
  const value = process.env.SESSION_SECRET;
  if (!value || value.length < 32) {
    throw new Error('SESSION_SECRET ausente ou curto demais (mínimo 32 caracteres).');
  }
  return value;
}

// Sessão: "userId.expiração.assinatura". A assinatura impede alteração do cookie.
export function createSessionToken(userId: string): string {
  const expires = Date.now() + SESSION_TTL_MS;
  const payload = `${userId}.${expires}`;
  const sig = createHmac('sha256', secret()).update(payload).digest('hex');
  return `${payload}.${sig}`;
}

export function readSessionToken(token: string | undefined): string | null {
  if (!token) return null;
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  const [userId, expiresStr, sig] = parts;
  const expected = createHmac('sha256', secret()).update(`${userId}.${expiresStr}`).digest('hex');
  const sigOk =
    sig.length === expected.length && timingSafeEqual(Buffer.from(sig), Buffer.from(expected));
  if (!sigOk) return null;
  if (Number(expiresStr) < Date.now()) return null;
  return userId;
}

export const sessionCookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  path: '/',
  maxAge: SESSION_TTL_MS / 1000,
};
