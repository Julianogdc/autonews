// Imagem de referência (Fase 7). Regra oficial do escopo, seção 6:
// a imagem dos portais é só referência editorial interna, com origem e crédito visíveis.
// Na V1 não existe cadastro de licença, então ela NUNCA é apresentada como liberada.

export type ReferenceImage = {
  url: string;
  credit: string;
  origin: string;            // portal de onde veio
  releaseStatus: 'NAO_LIBERADA';
  notice: string;
};

export const REFERENCE_NOTICE =
  'Imagem de referência do portal de origem. Não está liberada para publicação: ' +
  'é preciso cadastrar a licença ou usar imagem própria/autorizada.';

const ORIGIN_NAMES: Record<string, string> = {
  campograndenews: 'Campo Grande News',
  correiodoestado: 'Correio do Estado',
  topmidia: 'TopMídia News',
  agenciabrasil: 'Agência Brasil',
  band: 'Band',
};

// Monta a referência a partir de uma matéria. Sem URL de imagem, não há referência.
export function referenceImage(article: {
  sourceKey: string;
  imageUrl: string | null;
  imageCredit: string | null;
}): ReferenceImage | null {
  if (!article.imageUrl) return null;
  return {
    url: article.imageUrl,
    credit: article.imageCredit ?? 'Crédito não informado pelo portal',
    origin: ORIGIN_NAMES[article.sourceKey] ?? article.sourceKey,
    releaseStatus: 'NAO_LIBERADA',
    notice: REFERENCE_NOTICE,
  };
}
