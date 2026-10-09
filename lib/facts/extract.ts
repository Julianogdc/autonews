// Extração de fatos com números (Fase 5). Regras simples e explicáveis.
// Cada fato tem um tipo (dinheiro, percentual, quantidade, velocidade, horário) e um valor normalizado.

export type FactKind = 'dinheiro' | 'percentual' | 'quantidade' | 'velocidade' | 'horario';

export type Fact = { kind: FactKind; value: string; raw: string };

const NUMBER_WORDS: Record<string, number> = {
  um: 1, uma: 1, dois: 2, duas: 2, três: 3, tres: 3, quatro: 4, cinco: 5,
  seis: 6, sete: 7, oito: 8, nove: 9, dez: 10, onze: 11, doze: 12,
};

// Substantivos que indicam quantidade de pessoas/vítimas.
const COUNT_NOUN = /(pessoas?|mortos?|mortas?|feridos?|feridas?|suspeitos?|vítimas?|presos?|presas?|detidos?|detidas?|crianças?|alunos?|famílias?)/i;

function toNumber(token: string): number | null {
  const t = token.toLowerCase();
  if (/^\d+$/.test(t)) return Number(t);
  return NUMBER_WORDS[t] ?? null;
}

// Converte "806,56" em "806.56" para comparação segura.
function normalizeMoney(s: string): string {
  return s.replace(/\./g, '').replace(',', '.');
}

export function extractFacts(text: string): Fact[] {
  const facts: Fact[] = [];

  for (const m of text.matchAll(/R\$\s?\d[\d.]*(?:,\d{1,2})?/g)) {
    facts.push({ kind: 'dinheiro', value: normalizeMoney(m[0].replace(/R\$\s?/, '')), raw: m[0] });
  }

  for (const m of text.matchAll(/\d+(?:,\d+)?\s?%/g)) {
    facts.push({ kind: 'percentual', value: m[0].replace(/\s/g, '').replace(',', '.').replace('%', ''), raw: m[0] });
  }

  const countRe = new RegExp(`\\b(\\d+|${Object.keys(NUMBER_WORDS).join('|')})\\s+(${COUNT_NOUN.source})`, 'gi');
  for (const m of text.matchAll(countRe)) {
    const n = toNumber(m[1]);
    if (n !== null) {
      facts.push({ kind: 'quantidade', value: `${n} ${m[2].toLowerCase().replace(/s$/, '')}`, raw: m[0] });
    }
  }

  for (const m of text.matchAll(/\d+(?:,\d+)?\s?(?:km\/h|km|°C|graus)/gi)) {
    facts.push({ kind: 'velocidade', value: m[0].replace(/\s/g, '').toLowerCase(), raw: m[0] });
  }

  for (const m of text.matchAll(/\b(\d{1,2})h(\d{2})?\b/g)) {
    facts.push({ kind: 'horario', value: `${m[1].padStart(2, '0')}:${(m[2] ?? '00')}`, raw: m[0] });
  }

  // Remove repetições dentro do mesmo texto.
  const seen = new Set<string>();
  return facts.filter((f) => {
    const key = `${f.kind}|${f.value}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

// Divergências: o mesmo tipo de fato com valores diferentes em portais diferentes.
// Regra conservadora: só compara portais que trazem UM único valor daquele tipo.
// Se a matéria cita dois valores (ex.: cesta e multa), não é possível saber qual é qual,
// então ela fica de fora para evitar alarme falso.
export type Coverage = { articleId: string; sourceKey: string; facts: Fact[] };
export type Divergence = { kind: FactKind; values: { value: string; sources: string[] }[] };

export function findDivergences(coverages: Coverage[]): Divergence[] {
  // Para cada portal e tipo de fato, quais valores aparecem.
  const perSource = new Map<string, Map<FactKind, Set<string>>>();
  for (const c of coverages) {
    if (!perSource.has(c.sourceKey)) perSource.set(c.sourceKey, new Map());
    const kinds = perSource.get(c.sourceKey)!;
    for (const f of c.facts) {
      if (!kinds.has(f.kind)) kinds.set(f.kind, new Set());
      kinds.get(f.kind)!.add(f.value);
    }
  }

  const out: Divergence[] = [];
  const allKinds = new Set<FactKind>();
  perSource.forEach((kinds) => kinds.forEach((_v, k) => allKinds.add(k)));

  for (const kind of allKinds) {
    const byValue = new Map<string, string[]>();
    perSource.forEach((kinds, sourceKey) => {
      const values = kinds.get(kind);
      if (values && values.size === 1) {
        const [value] = [...values];
        if (!byValue.has(value)) byValue.set(value, []);
        byValue.get(value)!.push(sourceKey);
      }
    });
    if (byValue.size > 1) {
      out.push({
        kind,
        values: [...byValue.entries()].map(([value, sources]) => ({ value, sources })),
      });
    }
  }
  return out;
}
