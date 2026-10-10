'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

// Enquanto a busca manual está na fila ou rodando, recarrega os dados da página a cada 20 s.
export default function AutoRefresh({ active }: { active: boolean }) {
  const router = useRouter();
  useEffect(() => {
    if (!active) return;
    const t = setInterval(() => router.refresh(), 20000);
    return () => clearInterval(t);
  }, [active, router]);
  return null;
}
