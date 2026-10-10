'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

type Msg = { role: 'user' | 'assistant'; content: string; sources?: { url: string; title: string }[] | null };
type Conv = { id: string; title: string };

export default function ChatIA({
  conversations, models, initialId, initialMessages,
}: { conversations: Conv[]; models: string[]; initialId: string | null; initialMessages: Msg[] }) {
  const router = useRouter();
  const [convId, setConvId] = useState<string | null>(initialId);
  const [msgs, setMsgs] = useState<Msg[]>(initialMessages);
  const [texto, setTexto] = useState('');
  const [modelo, setModelo] = useState(models[0] ?? '');
  const [web, setWeb] = useState(true);
  const [ocupado, setOcupado] = useState(false);
  const [erro, setErro] = useState('');

  async function enviar() {
    const msg = texto.trim();
    if (!msg || ocupado) return;
    setErro('');
    setOcupado(true);
    setTexto('');
    setMsgs((m) => [...m, { role: 'user', content: msg }]);
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ conversationId: convId, message: msg, model: modelo, useWeb: web }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.erro ?? 'falha no chat');
      setMsgs((m) => [...m, { role: 'assistant', content: data.texto, sources: data.fontes, }]);
      if (!convId) {
        setConvId(data.conversationId);
        router.replace(`/chat?c=${data.conversationId}`);
      }
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'falha no chat');
    } finally {
      setOcupado(false);
    }
  }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '240px 1fr', gap: '1rem', alignItems: 'start' }} className="chat-grid">
      <aside className="card" style={{ padding: '0.75rem' }}>
        <Link href="/chat" className="btn" style={{ display: 'block', textAlign: 'center', marginBottom: '0.5rem' }}>+ Nova conversa</Link>
        {conversations.length === 0 && <p className="muted">Nenhuma conversa ainda.</p>}
        {conversations.map((c) => (
          <Link key={c.id} href={`/chat?c=${c.id}`} style={{ display: 'block', padding: '0.4rem 0.3rem', color: c.id === convId ? 'var(--accent)' : 'var(--text)', fontWeight: c.id === convId ? 700 : 400, fontSize: '0.9rem' }}>
            {c.title}
          </Link>
        ))}
      </aside>

      <section>
        <div className="row" style={{ marginBottom: '0.75rem' }}>
          <select value={modelo} onChange={(e) => setModelo(e.target.value)}>
            {models.map((m) => <option key={m} value={m}>{m}</option>)}
          </select>
          <label className="row" style={{ gap: '0.3rem' }}>
            <input type="checkbox" checked={web} onChange={(e) => setWeb(e.target.checked)} />
            Pesquisar na web
          </label>
        </div>

        <div className="card" style={{ minHeight: 320, maxHeight: '60vh', overflowY: 'auto' }}>
          {msgs.length === 0 && <p className="muted">Pergunte algo ou peça ajuda com um texto. Com a pesquisa na web ligada, a IA busca informações atuais e cita as fontes.</p>}
          {msgs.map((m, i) => (
            <div key={i} style={{ marginBottom: '1rem' }}>
              <div className="muted" style={{ fontWeight: 600 }}>{m.role === 'user' ? 'Você' : 'Autonews IA'}</div>
              <div style={{ whiteSpace: 'pre-wrap' }}>{m.content}</div>
              {m.sources && m.sources.length > 0 && (
                <div className="muted" style={{ marginTop: '0.4rem' }}>
                  Fontes:{' '}
                  {m.sources.map((s, j) => (
                    <a key={j} href={s.url} target="_blank" rel="noreferrer" style={{ marginRight: '0.6rem' }}>{s.title}</a>
                  ))}
                </div>
              )}
            </div>
          ))}
          {ocupado && <p className="muted">Pensando…</p>}
        </div>

        {erro && <div className="alert alert-danger" style={{ marginTop: '0.75rem' }}>{erro}</div>}

        <div className="row" style={{ marginTop: '0.75rem', alignItems: 'flex-end' }}>
          <textarea
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); enviar(); } }}
            rows={2}
            placeholder="Escreva sua pergunta ou cole um texto (Enter envia, Shift+Enter quebra linha)"
            style={{ flex: 1, padding: '0.6rem', fontFamily: 'inherit' }}
          />
          <button type="button" className="primary" onClick={enviar} disabled={ocupado || !texto.trim()}>Enviar</button>
        </div>
      </section>
    </div>
  );
}
