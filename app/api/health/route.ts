import { NextResponse } from 'next/server';

// Health check: responde se a aplicação está no ar.
// Não expõe nenhuma informação sensível.
export const dynamic = 'force-dynamic';

export function GET() {
  return NextResponse.json({
    status: 'ok',
    service: 'autonews-web',
    time: new Date().toISOString(),
  });
}
