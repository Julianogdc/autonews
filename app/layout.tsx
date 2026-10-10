import './globals.css';
import Link from 'next/link';
import NavLinks from '@/components/NavLinks';

export const metadata = {
  title: 'Autonews',
  description: 'Radar jornalístico e assistente de redação — uso interno',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>
        <header className="topbar">
          <div className="topbar-inner">
            <Link href="/" className="brand"><span className="brand-dot" />Autonews</Link>
            <NavLinks />
          </div>
        </header>
        <div className="container">{children}</div>
      </body>
    </html>
  );
}
