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
    const url = req.nextUrl.clone();
    url.pathname = '/login';
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
