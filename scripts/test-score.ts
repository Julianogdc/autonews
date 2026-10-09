// Teste da triagem com títulos reais. Não grava nada.
// Uso local: npx tsx scripts/test-score.ts
import { scoreArticle } from '../lib/triage/score';

const samples = [
  'Homem é preso após perseguição em Campo Grande',
  'Temporal provoca alagamentos em Campo Grande',
  'Acidente na Avenida Afonso Pena deixa dois feridos',
  'Sucuri de 8 metros é flagrada no Rio Sucuri, em Bonito (MS)',
  'Dia do Cabelo Maluco: menina usa andor de Nossa Senhora',
  'Vereadores repercutem possível máfia dos combustíveis',
  'Prefeitura publica edital de concurso com vagas',
];
for (const t of samples) {
  const r = scoreArticle({ title: t, publishedAt: new Date(Date.now() - 2 * 3600000) });
  console.log(`${String(r.score).padStart(3)} ${r.priority.padEnd(8)} ${t}`);
  console.log(`    ${r.reasons.join(' | ') || 'sem sinal de relevância'}`);
}
