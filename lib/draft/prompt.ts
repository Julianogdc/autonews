// Montagem do pedido à IA e validação da resposta (fase 6).
// As regras editoriais vêm do Escopo Oficial v1.0, seção 8.
// A IA apura na web e escreve a matéria na mesma resposta, já com a checagem dos fatos.

export type SourceInput = {
  sourceKey: string;
  title: string;
  url: string;
  text: string;
  facts: { kind: string; value: string; raw: string }[];
};

export type PromptInput = {
  sources: SourceInput[];
  divergences: string[];   // descrições de divergências já detectadas
  sensitive: boolean;      // tema sensível detectado
};

export type CheckItem = {
  claim: string;                                           // fato conferido
  status: 'confirmado' | 'divergente' | 'nao_confirmado';
  note: string | null;                                     // o que foi encontrado (ex.: "G1 diz 26 anos")
  urls: string[];                                          // onde foi conferido
};

export type DraftOutput = {
  title: string;
  subtitle: string | null;
  body: string;
  category: string | null;
  tags: string[];
  seoTitle: string | null;
  seoDescription: string | null;
  checks: CheckItem[];
};

export function draftSystemPrompt(): string {
  const hoje = new Date().toLocaleDateString('pt-BR', { timeZone: 'America/Campo_Grande' });
  return `Você é repórter e editor de um portal de notícias de Campo Grande (MS), em português do Brasil. Data de hoje: ${hoje}.
Você recebe uma ou mais matérias de portais sobre o mesmo fato. Seu trabalho tem duas partes.

PARTE 1 — APURAÇÃO NA WEB (obrigatória)
- Pesquise na web o fato: outros portais, órgãos oficiais (polícia, prefeitura, governo, universidade, tribunal), notas e redes oficiais.
- Confirme os fatos principais: nomes, idades, cargos, números, datas, horários, locais, causas e declarações.
- Procure desdobramentos mais recentes (estado de saúde, prisão, nota oficial, velório, investigação).
- Se uma fonte diz algo diferente da outra, registre a divergência; não escolha uma versão.

PARTE 2 — MATÉRIA
- Escreva uma matéria NOVA e COMPLETA, com 6 a 10 parágrafos (cerca de 400 a 700 palavras quando houver informação para isso).
- Estrutura: lide com o fato principal (o quê, quem, quando, onde); depois os detalhes; versões e declarações das partes;
  desdobramentos e atualizações encontrados na web; por último, contexto relevante (histórico, dados públicos) quando confirmado.
- Use somente informações das matérias recebidas ou de fontes da web que você consultou. Não invente nada.
  Se não houver informação suficiente, a matéria pode ser menor: nunca preencha com suposições.
- Atribua as informações ("segundo a Polícia Civil", "de acordo com o Campo Grande News").
- Não copie frases das fontes nem troque apenas sinônimos. Não reproduza títulos de outros portais.
- Use nomes, cargos e siglas como aparecem nas fontes. Não expanda siglas.
- Não identifique menores de idade pelo nome: escreva "um adolescente de 17 anos".
- Sem sensacionalismo. A manchete deve ser sustentada pelos fatos.

CHECAGEM
Liste os fatos principais da sua matéria (de 5 a 12) e a situação de cada um após a apuração:
- "confirmado": está nas matérias recebidas ou em fonte confiável na web. Escrever com outras palavras NÃO é problema.
- "divergente": fontes dizem coisas diferentes (explique em "note").
- "nao_confirmado": nenhuma fonte confiável confirma (explique em "note").

Responda SOMENTE com um objeto JSON, sem texto antes ou depois, com estas chaves:
title (string), subtitle (string ou null), body (string com parágrafos separados por linha em branco),
category (string ou null), tags (array de 3 a 6 strings), seoTitle (até 60 caracteres), seoDescription (até 155 caracteres),
checks (array de objetos {"claim": string, "status": "confirmado" | "divergente" | "nao_confirmado", "note": string ou null, "urls": array de links}).`;
}

export function buildPrompt(input: PromptInput): { system: string; user: string } {
  const blocks = input.sources.map((s, i) => {
    const facts = s.facts.length
      ? s.facts.map((f) => `- ${f.kind}: ${f.raw}`).join('\n')
      : '- (nenhum número extraído)';
    return [
      `MATÉRIA ${i + 1} — ${s.sourceKey}`,
      `Título: ${s.title}`,
      `Link: ${s.url}`,
      `Números extraídos:\n${facts}`,
      `Texto:\n${s.text.slice(0, 15000)}`,
    ].join('\n');
  });

  const notes: string[] = [];
  if (input.divergences.length) {
    notes.push('DIVERGÊNCIAS JÁ DETECTADAS ENTRE OS PORTAIS (confira na web e não escolha uma versão sem confirmação):');
    notes.push(...input.divergences.map((d) => `- ${d}`));
  }
  if (input.sensitive) notes.push('Tema sensível: escreva com cuidado redobrado e sem detalhes desnecessários.');

  return {
    system: draftSystemPrompt(),
    user: [...blocks, ...(notes.length ? ['', ...notes] : [])].join('\n\n'),
  };
}

// Aceita a resposta da IA só se estiver completa. Qualquer falha vira erro, sem gravar lixo.
export function parseDraft(raw: string): DraftOutput {
  // Com pesquisa na web a resposta vem como texto: pega o objeto JSON de dentro dela.
  const start = raw.indexOf('{');
  const end = raw.lastIndexOf('}');
  if (start < 0 || end <= start) throw new Error('a IA não devolveu a matéria no formato esperado');
  const data = JSON.parse(raw.slice(start, end + 1)) as Record<string, unknown>;
  const str = (v: unknown) => (typeof v === 'string' && v.trim() ? v.trim() : null);
  const title = str(data.title);
  const body = str(data.body);
  if (!title || !body) throw new Error('resposta da IA sem título ou corpo');
  const tags = Array.isArray(data.tags)
    ? data.tags.filter((t): t is string => typeof t === 'string').slice(0, 6)
    : [];
  return {
    title,
    subtitle: str(data.subtitle),
    body,
    category: str(data.category),
    tags,
    seoTitle: str(data.seoTitle)?.slice(0, 60) ?? null,
    seoDescription: str(data.seoDescription)?.slice(0, 155) ?? null,
    checks: parseChecks(data.checks),
  };
}

const STATUSES = ['confirmado', 'divergente', 'nao_confirmado'];
function parseChecks(v: unknown): CheckItem[] {
  if (!Array.isArray(v)) return [];
  return v.flatMap((c: any): CheckItem[] => {
    const claim = typeof c?.claim === 'string' ? c.claim.trim() : '';
    if (!claim) return [];
    const status = STATUSES.includes(c.status) ? c.status : 'nao_confirmado';
    const note = typeof c.note === 'string' && c.note.trim() ? c.note.trim() : null;
    const urls = Array.isArray(c.urls)
      ? c.urls.filter((u: unknown): u is string => typeof u === 'string' && /^https?:\/\//.test(u))
      : [];
    return [{ claim, status, note, urls }];
  });
}

// Temas que exigem revisão humana obrigatória.
const SENSITIVE = /homicídio|assassin|estupr|abuso|sexual|suicíd|menor de idade|criança|adolescente|tráfico|sequestr|corrupção|operação policial/i;
export function isSensitive(text: string): boolean {
  return SENSITIVE.test(text);
}
