'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

// Enquanto algo está rodando (busca manual, geração de rascunho), recarrega os dados da página.
export default function AutoRefresh({ active, interval = 20000 }: { active: boolean; interval?: number }) {
  const router = useRouter();
  useEffect(() => {
    if (!active) return;
    const t = setInterval(() => router.refresh(), interval);
    return () => clearInterval(t);
  }, [active, interval, router]);
  return null;
}
