'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

// Menu do topo com a página atual destacada.
const LINKS = [
  { href: '/', label: 'Pautas', match: (p: string) => p === '/' || p.startsWith('/pauta') },
  { href: '/historico', label: 'Histórico', match: (p: string) => p.startsWith('/historico') },
];

export default function NavLinks() {
  const path = usePathname() ?? '/';
  return (
    <nav>
      {LINKS.map((l) => (
        <Link key={l.href} href={l.href} className={l.match(path) ? 'active' : undefined}>{l.label}</Link>
      ))}
    </nav>
  );
}
