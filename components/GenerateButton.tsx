'use client';

import { useState } from 'react';

// Botão "Gerar matéria" / "Gerar nova versão": trava ao clicar para não disparar duas gerações.
export default function GenerateButton({ storyId, label, regenerate }: { storyId: string; label: string; regenerate?: boolean }) {
  const [sent, setSent] = useState(false);
  return (
    <form
      method="post"
      action="/api/draft-generate"
      onSubmit={(e) => {
        if (regenerate && !confirm('Gerar uma nova versão da matéria? A versão atual continua salva logo abaixo.')) {
          e.preventDefault();
          return;
        }
        setSent(true);
      }}
    >
      <input type="hidden" name="storyId" value={storyId} />
      {regenerate && <input type="hidden" name="regenerate" value="1" />}
      <button type="submit" className={regenerate ? undefined : 'primary'} disabled={sent}>
        {sent ? <><span className={regenerate ? 'spinner spinner-dark' : 'spinner'} /> Enviando…</> : label}
      </button>
    </form>
  );
}
