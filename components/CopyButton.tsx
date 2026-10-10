'use client';

// Copia o texto da matéria para a área de transferência (a equipe cola no site).
export default function CopyButton({ text, label }: { text: string; label: string }) {
  return (
    <button
      type="button"
      onClick={() => {
        navigator.clipboard?.writeText(text).catch(() => {});
      }}
      style={{ padding: '0.4rem 0.8rem', cursor: 'pointer' }}
    >
      {label}
    </button>
  );
}
