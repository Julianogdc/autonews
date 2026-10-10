'use client';

import { useState } from 'react';

// Copia o texto da matéria para a área de transferência (a equipe cola no site).
export default function CopyButton({ text, label, primary }: { text: string; label: string; primary?: boolean }) {
  const [done, setDone] = useState(false);
  const cls = [primary ? 'primary' : '', done ? 'copied' : ''].filter(Boolean).join(' ');
  return (
    <button
      type="button"
      className={cls || undefined}
      disabled={!text}
      onClick={() => {
        navigator.clipboard?.writeText(text).then(() => {
          setDone(true);
          setTimeout(() => setDone(false), 1500);
        }).catch(() => {});
      }}
    >
      {done ? 'Copiado ✓' : label}
    </button>
  );
}
