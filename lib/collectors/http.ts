// Cliente HTTP do coletor: identifica-se honestamente, tem tempo limite
// e espera entre requisições ao mesmo portal (não sobrecarrega o site).
const USER_AGENT = 'AutonewsBot/1.0 (uso interno de redação; contato: equipe Autonews)';
const MIN_INTERVAL_MS = 3000;
const lastRequestAt = new Map<string, number>();

// robots.txt: se o portal proíbe o caminho para robôs (regras "*" ou "AutonewsBot"), não acessamos.
// Se o robots.txt não existir (404), permitimos. Se estiver fora do ar, não arriscamos: bloqueamos a rodada.
const ROBOTS_TTL_MS = 60 * 60 * 1000;
const robotsCache = new Map<string, { at: number; disallow: string[] | 'ERRO' }>();

async function disallowedPrefixes(origin: string): Promise<string[] | 'ERRO'> {
  const hit = robotsCache.get(origin);
  if (hit && Date.now() - hit.at < ROBOTS_TTL_MS) return hit.disallow;

  let result: string[] | 'ERRO';
  try {
    const res = await fetch(`${origin}/robots.txt`, {
      headers: { 'User-Agent': USER_AGENT },
      signal: AbortSignal.timeout(15000),
    });
    if (res.status === 404) result = [];
    else if (!res.ok) result = 'ERRO';
    else result = parseDisallow(await res.text());
  } catch {
    result = 'ERRO';
  }
  robotsCache.set(origin, { at: Date.now(), disallow: result });
  return result;
}

function parseDisallow(txt: string): string[] {
  const groups: { agents: string[]; disallow: string[] }[] = [];
  let current: { agents: string[]; disallow: string[] } | null = null;
  let lastWasAgent = false;
  for (const raw of txt.split('\n')) {
    const line = raw.split('#')[0].trim();
    if (!line) continue;
    const idx = line.indexOf(':');
    if (idx < 0) continue;
    const field = line.slice(0, idx).trim().toLowerCase();
    const value = line.slice(idx + 1).trim();
    if (field === 'user-agent') {
      if (!current || !lastWasAgent) {
        current = { agents: [], disallow: [] };
        groups.push(current);
      }
      current.agents.push(value.toLowerCase());
      lastWasAgent = true;
    } else {
      lastWasAgent = false;
      if (current && field === 'disallow' && value) current.disallow.push(value);
    }
  }
  const mine = groups.filter((g) => g.agents.some((a) => a === '*' || a === 'autonewsbot'));
  // Regra específica (AutonewsBot) tem prioridade sobre a regra geral (*).
  const specific = mine.filter((g) => g.agents.includes('autonewsbot'));
  const use = specific.length ? specific : mine;
  return use.flatMap((g) => g.disallow);
}

export async function fetchText(url: string): Promise<string> {
  const u = new URL(url);
  const rules = await disallowedPrefixes(u.origin);
  if (rules === 'ERRO') throw new Error(`robots.txt indisponível em ${u.host}; rodada pulada por segurança`);
  if (rules.some((p) => p !== '/' ? u.pathname.startsWith(p) : true)) {
    throw new Error(`bloqueado pelo robots.txt de ${u.host}: ${u.pathname}`);
  }

  const host = u.host;
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
