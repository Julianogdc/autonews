// Cliente HTTP do coletor: identifica-se honestamente, tem tempo limite
// e espera entre requisições ao mesmo portal (não sobrecarrega o site).
const USER_AGENT = 'AutonewsBot/1.0 (uso interno de redação; contato: equipe Autonews)';
const MIN_INTERVAL_MS = 3000;
const lastRequestAt = new Map<string, number>();

export async function fetchText(url: string): Promise<string> {
  const host = new URL(url).host;
  const wait = (lastRequestAt.get(host) ?? 0) + MIN_INTERVAL_MS - Date.now();
  if (wait > 0) await new Promise((r) => setTimeout(r, wait));
  lastRequestAt.set(host, Date.now());

  const res = await fetch(url, {
    headers: { 'User-Agent': USER_AGENT, Accept: 'text/html,application/xml' },
    signal: AbortSignal.timeout(20000),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} em ${url}`);
  return res.text();
}
