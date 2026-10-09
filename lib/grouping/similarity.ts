// Agrupamento por similaridade (Fase 4). Regras simples e explicáveis:
// duas matérias são do mesmo fato se compartilham muitas palavras do assunto
// ou um conjunto de nomes próprios (pessoas, lugares, órgãos).

const STOPWORDS = new Set([
  'a','o','as','os','um','uma','uns','umas','de','da','do','das','dos','em','no','na','nos','nas',
  'e','ou','que','se','por','para','com','sem','ao','aos','à','às','como','mais','menos','após',
  'apos','contra','sobre','entre','ser','foi','são','sao','será','vai','ha','há','é','the','pelo','pela',
  'pelos','pelas','seu','sua','seus','suas','ele','ela','eles','elas','vídeo','video','fotos','foto',
  'veja','ainda','também','tambem','neste','nesta','deste','desta','morre','morreu','morrem','mata',
  'matou','ferido','feridos','feridas','ferida','dois','duas','três','tres','quatro','cinco',
  // Termos de localidade que aparecem em quase toda matéria local: não identificam um fato.
  'campo','grande','mato','grosso','sul','ms','mt','brasil',
]);

// Remove acentos e pontuação, deixa minúsculas.
export function normalize(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function contentWords(title: string): Set<string> {
  return new Set(
    normalize(title)
      .split(' ')
      .filter((w) => w.length > 2 && !STOPWORDS.has(w)),
  );
}

// Nomes próprios: palavras que começam com maiúscula no título original (exceto a primeira).
export function properNouns(title: string): Set<string> {
  const words = title.split(/\s+/).map((w) => w.replace(/[^\p{L}]/gu, ''));
  const out = new Set<string>();
  words.slice(1).forEach((w) => {
    if (w.length > 2 && /^\p{Lu}/u.test(w)) out.add(normalize(w));
  });
  return out;
}

function jaccard(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 || b.size === 0) return 0;
  let inter = 0;
  for (const x of a) if (b.has(x)) inter++;
  return inter / (a.size + b.size - inter);
}

export type Match = { same: boolean; score: number; shared: string[] };

// Decide se duas matérias tratam do mesmo fato.
// Em caso de dúvida, responde "não": é melhor duas pautas separadas do que uma pauta com fatos misturados.
export function sameEvent(titleA: string, titleB: string): Match {
  const wa = contentWords(titleA);
  const wb = contentWords(titleB);
  const na = properNouns(titleA);
  const nb = properNouns(titleB);
  const sharedNouns = [...na].filter((x) => nb.has(x));
  const score = jaccard(wa, wb);
  const shared = [...wa].filter((x) => wb.has(x));
  // Regra 1: assunto muito parecido. Regra 2: mesmos nomes próprios e assunto parcialmente parecido.
  const same = score >= 0.45 || (sharedNouns.length >= 2 && score >= 0.2);
  return { same, score: Number(score.toFixed(2)), shared };
}
