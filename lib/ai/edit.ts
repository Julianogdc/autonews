// Regras do editor. Valem para qualquer modo: não inventar fatos, manter nomes e números.
export const EDIT_MODES: Record<string, { label: string; instruction: string }> = {
  corrigir: {
    label: 'Corrigir (ortografia, gramática e pontuação)',
    instruction: 'Corrija apenas erros reais de ortografia, acentuação, gramática, pontuação e concordância em TODO o texto (ex.: "nao" vira "não", "esta" vira "está" quando for verbo). Palavras já corretas não devem ser mudadas, mesmo que pareçam estranhas (ex.: "campus" é a forma correta em português). Não reescreva frases corretas e não mude o sentido. Se não houver erro algum, devolva o texto igual e deixe "avisos" vazio. Em "avisos", liste somente as correções que você de fato fez (ex.: "nao → não").',
  },
  revisar: {
    label: 'Revisar (clareza e estilo jornalístico)',
    instruction: 'Melhore a clareza e o estilo jornalístico: frases curtas, voz ativa, sem adjetivos desnecessários. Mantenha todos os fatos.',
  },
  encurtar: {
    label: 'Encurtar (cerca de 30% menor)',
    instruction: 'Reduza o texto em cerca de 30%, cortando redundâncias e detalhes secundários. Mantenha todos os fatos principais, nomes e números.',
  },
  manchete: {
    label: 'Sugerir título e subtítulo',
    instruction: 'Devolva apenas um título (até 90 caracteres) e um subtítulo (até 200 caracteres) para o texto, sem sensacionalismo, baseados só no que está escrito.',
  },
};

export const EDIT_RULES = `Regras obrigatórias:
- Não invente nomes, números, datas, cargos, declarações ou contexto que não estejam no texto original.
- Mantenha os nomes, números e datas exatamente como estão.
- Se encontrar algo que pareça erro factual, não corrija: aponte em "avisos".
- Responda somente com JSON no formato {"texto": "...", "avisos": ["..."]}. Use avisos vazios se não houver.`;

export function editSystemPrompt(mode: string): string {
  const m = EDIT_MODES[mode] ?? EDIT_MODES.corrigir;
  return `Você é um editor de um portal de notícias de Campo Grande (MS), em português do Brasil.\n${m.instruction}\n\n${EDIT_RULES}`;
}
