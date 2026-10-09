// Triagem por regras (sem IA): nota de 0 a 100 e motivos explícitos.
// Regras transparentes: cada ponto ganho tem um motivo registrado, para a equipe entender a nota.

export type TriageInput = {
  title: string;
  category?: string | null;
  text?: string | null;
  publishedAt?: Date | null;
  now?: Date;
};

export type TriageResult = {
  score: number;                       // 0 a 100
  priority: 'URGENTE' | 'ALTA' | 'NORMAL' | 'BAIXA';
  reasons: string[];
};

type Rule = { label: string; points: number; pattern: RegExp };

// Assuntos priorizados (escopo: Campo Grande, MS, política, polícia, acidentes, trânsito, clima, economia local, serviços, saúde, interesse público).
const RULES: Rule[] = [
  { label: 'Campo Grande / MS', points: 30, pattern: /campo grande|mato grosso do sul|\bms\b|capital|dourados|três lagoas|corumbá|afonso pena|calógeras|bandeirantes|joaquim murtinho|14 de julho|ernesto geisel|euler de azevedo/i },
  { label: 'polícia / ocorrência', points: 25, pattern: /polícia|preso|prisão|preso|assalto|furto|homicídio|morto|morre|baleado|operação/i },
  { label: 'acidente / trânsito', points: 25, pattern: /acidente|colisão|batida|capotamento|atropel|trânsito|engarrafamento|avenida|rodovia/i },
  { label: 'clima / alerta', points: 20, pattern: /chuva|temporal|alagamento|alerta|calor|frio|tempestade|granizo|defesa civil/i },
  { label: 'política / governo', points: 20, pattern: /prefeitura|governo|câmara|assembleia|vereador|deputado|prefeito|governador|eleição|tcu|tribunal/i },
  { label: 'saúde', points: 15, pattern: /saúde|hospital|upa|vacina|dengue|surto|sus\b|médico/i },
  { label: 'economia local / serviços', points: 15, pattern: /preço|tarifa|imposto|emprego|vagas|concurso|energia|água|sanesul|energisa|feira|combustível/i },
  { label: 'interesse público', points: 10, pattern: /decreto|lei\b|portaria|edital|diário oficial|direitos|escola|universidade/i },
];

// Matérias de entretenimento e lado B: pouco prioritárias para a pauta factual.
const LOW_INTEREST = /lado b|entretenimento|famosos|novela|bbb|futebol|horóscopo|receita de|dicas de/i;

export function scoreArticle(input: TriageInput): TriageResult {
  const reasons: string[] = [];
  let score = 0;
  const haystack = `${input.title} ${input.category ?? ''}`;

  for (const rule of RULES) {
    if (rule.pattern.test(haystack)) {
      score += rule.points;
      reasons.push(`+${rule.points} ${rule.label}`);
    }
  }

  if (input.publishedAt) {
    const hours = ((input.now ?? new Date()).getTime() - input.publishedAt.getTime()) / 3600000;
    if (hours <= 6) { score += 15; reasons.push('+15 publicada nas últimas 6h'); }
    else if (hours <= 24) { score += 10; reasons.push('+10 publicada nas últimas 24h'); }
    else if (hours <= 48) { score += 5; reasons.push('+5 publicada nas últimas 48h'); }
  }

  if (LOW_INTEREST.test(haystack)) {
    score -= 20;
    reasons.push('-20 assunto de entretenimento / lado B');
  }

  score = Math.max(0, Math.min(100, score));
  const priority: TriageResult['priority'] =
    score >= 80 ? 'URGENTE' : score >= 60 ? 'ALTA' : score >= 40 ? 'NORMAL' : 'BAIXA';

  return { score, priority, reasons };
}
