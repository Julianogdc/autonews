'use client';

import { useState } from 'react';

// Botão "Gerar matéria": trava ao clicar para não disparar duas gerações.
export default function GenerateButton({ storyId, label }: { storyId: string; label: string }) {
  const [sent, setSent] = useState(false);
  return (
    <form method="post" action="/api/draft-generate" onSubmit={() => setSent(true)}>
      <input type="hidden" name="storyId" value={storyId} />
      <button type="submit" className="primary" disabled={sent}>
        {sent ? <><span className="spinner" /> Enviando…</> : label}
      </button>
    </form>
  );
}
