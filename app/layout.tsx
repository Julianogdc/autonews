import './globals.css';
import Link from 'next/link';

export const metadata = {
  title: 'Autonews',
  description: 'Radar jornalístico e assistente de redação — uso interno',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>
        <header className="topbar">
          <Link href="/" className="brand">Autonews</Link>
          <nav>
            <Link href="/">Pautas</Link>
            <Link href="/historico">Histórico</Link>
          </nav>
        </header>
        <div className="container">{children}</div>
      </body>
    </html>
  );
}
