import { NextRequest, NextResponse } from 'next/server';

// Redireciona para o login quem não tem sessão válida.
// A verificação completa da assinatura acontece nas rotas que leem o usuário.
// Aqui basta checar a presença do cookie para não expor o painel.
const PUBLIC_PATHS = ['/login', '/api/login', '/api/health'];

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(p + '/'))) {
    return NextResponse.next();
  }
  if (!req.cookies.get('autonews_session')) {
    // O middleware exige endereço completo. Usa o domínio que o navegador pediu (repassado
    // pelo Traefik), e não req.nextUrl, que aponta para o endereço interno 0.0.0.0:3000.
    const host = req.headers.get('x-forwarded-host') ?? req.headers.get('host') ?? req.nextUrl.host;
    const proto = req.headers.get('x-forwarded-proto') ?? req.nextUrl.protocol.replace(':', '');
    return NextResponse.redirect(new URL('/login', `${proto}://${host}`), 307);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
