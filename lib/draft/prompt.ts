// Montagem do pedido à IA e validação da resposta (fase 6).
// As regras editoriais vêm do Escopo Oficial v1.0, seção 8.

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

export type DraftOutput = {
  title: string;
  subtitle: string | null;
  body: string;
  category: string | null;
  tags: string[];
  seoTitle: string | null;
  seoDescription: string | null;
};

const SYSTEM = `Você é assistente de redação de um portal de notícias de Campo Grande (MS), em português do Brasil.
Escreva uma matéria NOVA a partir dos fatos e das fontes fornecidas. Regras obrigatórias:
- Não copie frases das fontes nem troque apenas sinônimos. Escreva com suas palavras, a partir dos fatos.
- Não invente nomes, números, datas, cargos, declarações ou contexto. Use somente o que está nas fontes.
- Diferencie o que é confirmado do que é alegação ou versão de uma parte (use "segundo", "de acordo com", "a polícia informou").
- Se houver divergência entre fontes, não escolha uma versão: diga que os números divergem e sinalize na lista de revisão.
- Evite linguagem sensacionalista. A manchete deve ser sustentada pelos fatos.
- Texto informativo, em parágrafos curtos, com 3 a 6 parágrafos.
Responda somente com um objeto JSON com estas chaves:
title (string), subtitle (string ou null), body (string com parágrafos separados por linha em branco),
category (string ou null), tags (array de 3 a 6 strings), seoTitle (até 60 caracteres), seoDescription (até 155 caracteres).`;

export function buildPrompt(input: PromptInput): { system: string; user: string } {
  const blocks = input.sources.map((s, i) => {
    const facts = s.facts.length
      ? s.facts.map((f) => `- ${f.kind}: ${f.raw}`).join('\n')
      : '- (nenhum número extraído)';
    return [
      `FONTE ${i + 1} — ${s.sourceKey}`,
      `Título: ${s.title}`,
      `Link: ${s.url}`,
      `Números extraídos:\n${facts}`,
      `Texto:\n${s.text.slice(0, 4000)}`,
    ].join('\n');
  });

  const notes: string[] = [];
  if (input.divergences.length) {
    notes.push('DIVERGÊNCIAS ENTRE FONTES (não escolha uma versão; mencione que os dados divergem):');
    notes.push(...input.divergences.map((d) => `- ${d}`));
  }
  if (input.sensitive) notes.push('Tema sensível: escreva com cuidado redobrado e sem detalhes desnecessários.');

  return {
    system: SYSTEM,
    user: [...blocks, ...(notes.length ? ['', ...notes] : [])].join('\n\n'),
  };
}

// Aceita a resposta da IA só se estiver completa. Qualquer falha vira erro, sem gravar lixo.
export function parseDraft(raw: string): DraftOutput {
  const data = JSON.parse(raw) as Record<string, unknown>;
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
  };
}

// Temas que exigem revisão humana obrigatória.
const SENSITIVE = /homicídio|assassin|estupr|abuso|sexual|suicíd|menor de idade|criança|adolescente|tráfico|sequestr|corrupção|operação policial/i;
export function isSensitive(text: string): boolean {
  return SENSITIVE.test(text);
}
