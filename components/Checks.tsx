// Quadro da checagem feita pela IA: sugestões (o que não ficou confirmado) em destaque,
// e o que foi confirmado + sites consultados recolhidos logo abaixo.
type Item = { claim: string; status: 'confirmado' | 'divergente' | 'nao_confirmado'; note: string | null; urls: string[] };
type Data = { items?: Item[]; web?: { url: string; title: string }[] };

const STATUS_LABEL = { confirmado: 'Confirmado', divergente: 'Divergente', nao_confirmado: 'Não confirmado' };

function host(url: string) {
  try { return new URL(url).hostname.replace(/^www\./, ''); } catch { return url; }
}

function Links({ urls }: { urls: string[] }) {
  if (!urls.length) return null;
  return (
    <span className="check-links">
      {urls.map((u) => <a key={u} href={u} target="_blank" rel="noreferrer">{host(u)}</a>)}
    </span>
  );
}

export default function Checks({ checks }: { checks: Data }) {
  const items = checks.items ?? [];
  const web = checks.web ?? [];
  const pending = items.filter((c) => c.status !== 'confirmado');
  const ok = items.filter((c) => c.status === 'confirmado');

  return (
    <section className="checks">
      {pending.length > 0 ? (
        <div className="alert alert-warn">
          <strong>Sugestões de checagem</strong>
          <span className="muted"> · a IA já apurou na web; vale conferir estes pontos antes de publicar</span>
          <ul className="check-list">
            {pending.map((c, i) => (
              <li key={i}>
                <span className={`check-status check-${c.status}`}>{STATUS_LABEL[c.status]}</span> {c.claim}
                {c.note && <div className="muted">{c.note}</div>}
                <Links urls={c.urls} />
              </li>
            ))}
          </ul>
        </div>
      ) : items.length > 0 ? (
        <div className="alert alert-ok"><strong>Checagem: todos os fatos principais foram confirmados.</strong></div>
      ) : null}

      {(ok.length > 0 || web.length > 0) && (
        <details className="check-details">
          <summary>
            {ok.length > 0 && <>{ok.length} fato(s) confirmado(s)</>}
            {ok.length > 0 && web.length > 0 && ' · '}
            {web.length > 0 && <>{web.length} site(s) consultado(s) na web</>}
          </summary>
          {ok.length > 0 && (
            <ul className="check-list">
              {ok.map((c, i) => (
                <li key={i}>
                  <span className="check-status check-confirmado">Confirmado</span> {c.claim}
                  {c.note && <div className="muted">{c.note}</div>}
                  <Links urls={c.urls} />
                </li>
              ))}
            </ul>
          )}
          {web.length > 0 && (
            <>
              <div className="muted check-web-title">Sites consultados</div>
              <ul className="check-web">
                {web.map((w) => (
                  <li key={w.url}><a href={w.url} target="_blank" rel="noreferrer">{w.title !== w.url ? w.title : host(w.url)}</a> <span className="muted">{host(w.url)}</span></li>
                ))}
              </ul>
            </>
          )}
        </details>
      )}
    </section>
  );
}
