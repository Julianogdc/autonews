import Link from 'next/link';
import { currentUserId } from '@/lib/session';
import { availableModels } from '@/lib/ai/openai';
import { EDIT_MODES } from '@/lib/ai/edit';
import EditorIA from '@/components/EditorIA';

export default function Editor() {
  if (!currentUserId()) {
    return <div className="alert alert-info">Sessão inválida. <Link href="/login">Entrar</Link></div>;
  }
  const modes = Object.entries(EDIT_MODES).map(([value, m]) => ({ value, label: m.label }));
  return (
    <>
      <h1>Editor IA</h1>
      <p className="muted">Cole o texto, escolha o tipo de revisão e o modelo. A IA não inventa fatos, mas revise sempre antes de publicar.</p>
      <div className="card" style={{ padding: '1.25rem' }}>
        <EditorIA models={availableModels()} modes={modes} />
      </div>
    </>
  );
}
