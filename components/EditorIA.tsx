'use client';

import { useState } from 'react';

type Modo = { value: string; label: string };

// Editor: cola o texto, escolhe modelo e tipo de revisão, recebe a versão e pode continuar editando ali.
export default function EditorIA({ models, modes }: { models: string[]; modes: Modo[] }) {
  const [texto, setTexto] = useState('');
  const [resultado, setResultado] = useState('');
  const [avisos, setAvisos] = useState<string[]>([]);
  const [modelo, setModelo] = useState(models[0] ?? '');
  const [modo, setModo] = useState(modes[0]?.value ?? 'corrigir');
  const [ocupado, setOcupado] = useState(false);
  const [erro, setErro] = useState('');
  const [copiado, setCopiado] = useState('');

  async function enviar() {
    setErro('');
    setAvisos([]);
    setOcupado(true);
    try {
      const res = await fetch('/api/ai-edit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: texto, model: modelo, mode: modo }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.erro ?? 'falha ao editar');
      setResultado(data.texto);
      setAvisos(data.avisos ?? []);
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'falha ao editar');
    } finally {
      setOcupado(false);
    }
  }

  function copiar(valor: string, rotulo: string) {
    navigator.clipboard?.writeText(valor).then(() => {
      setCopiado(rotulo);
      setTimeout(() => setCopiado(''), 1500);
    }).catch(() => {});
  }

  return (
    <div>
      <div className="row" style={{ marginBottom: '0.75rem' }}>
        <select value={modo} onChange={(e) => setModo(e.target.value)}>
          {modes.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
        </select>
        <select value={modelo} onChange={(e) => setModelo(e.target.value)}>
          {models.map((m) => <option key={m} value={m}>{m}</option>)}
        </select>
        <button type="button" className="primary" onClick={enviar} disabled={ocupado || !texto.trim()}>
          {ocupado ? 'Editando…' : 'Editar com IA'}
        </button>
      </div>

      <label className="muted">Texto original</label>
      <textarea
        value={texto}
        onChange={(e) => setTexto(e.target.value)}
        rows={10}
        placeholder="Cole aqui o texto da matéria"
        style={{ width: '100%', marginBottom: '1rem', padding: '0.6rem', fontFamily: 'inherit' }}
      />

      {erro && <div className="alert alert-danger">{erro}</div>}

      {resultado && (
        <>
          <label className="muted">Versão editada (pode alterar antes de copiar)</label>
          <textarea
            value={resultado}
            onChange={(e) => setResultado(e.target.value)}
            rows={12}
            style={{ width: '100%', padding: '0.6rem', fontFamily: 'inherit' }}
          />
          {avisos.length > 0 && (
            <div className="alert alert-warn">
              <strong>Avisos da IA (conferir):</strong>
              <ul>{avisos.map((a, i) => <li key={i}>{a}</li>)}</ul>
            </div>
          )}
          <div className="row" style={{ marginTop: '0.5rem' }}>
            <button type="button" onClick={() => copiar(resultado, 'Copiado!')}>{copiado || 'Copiar versão'}</button>
            <button type="button" onClick={() => setTexto(resultado)}>Continuar editando esta versão</button>
          </div>
        </>
      )}
    </div>
  );
}
