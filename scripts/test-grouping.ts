// Teste do agrupamento com títulos reais. Não grava nada.
// Uso local: npx tsx scripts/test-grouping.ts
import { sameEvent } from '../lib/grouping/similarity';

// Casos claros. Casos de fronteira (ex.: apagão após tempestade) ficam de fora de propósito:
// o princípio é separar em duas pautas em vez de juntar fatos diferentes.
const cases: [string, string, boolean][] = [
  ['Técnica de enfermagem morre em acidente com padre em Dourados', 'Câmera flagrou acidente que matou técnica de enfermagem em Dourados (vídeo)', true],
  ['Estudante de Medicina da UFGD morre após acidente em Dourados', 'Técnica de enfermagem morre em acidente com padre em Dourados', false],
  ['Homem com tornozeleira eletrônica é suspeito de destruir carro de assistente social em MS', 'Ladrão arromba e furta carro de trabalhador em Campo Grande (vídeo)', false],
  // Localidade comum não pode juntar fatos diferentes (caso real: pauta da Emagrecentro).
  ['Emagrecentro investiga unidade de Campo Grande após fiscalização', 'Cesta básica em Campo Grande custa R$ 806,56 e sobe 0,18%', false],
  ['Homem vive em árvore há 3 anos às margens de córrego em Campo Grande', 'Banda Jennifer Magnética retorna aos palcos de Campo Grande após 8 anos de pausa', false],
  // Mesmo sorteio em matérias diferentes.
  ['Resultado da Quina de hoje, concurso 7138, quinta-feira (08/10)', 'Resultado da Quina de ontem, concurso 7138, quinta-feira (08/10): veja o rateio', true],
];

let ok = 0;
for (const [a, b, expected] of cases) {
  const r = sameEvent(a, b);
  const pass = r.same === expected;
  if (pass) ok++;
  console.log(pass ? 'OK  ' : 'ERRO', r.same ? 'mesmo fato' : 'fatos diferentes', `(${r.score})`, '|', a.slice(0, 50), '<->', b.slice(0, 50));
  if (r.shared.length) console.log('     palavras em comum:', r.shared.join(', '));
}
console.log(`${ok}/${cases.length} casos como esperado`);
