// Teste do agrupamento com títulos reais. Não grava nada.
// Uso local: npx tsx scripts/test-grouping.ts
import { sameEvent } from '../lib/grouping/similarity';

// Casos claros. Casos de fronteira (ex.: apagão após tempestade) ficam de fora de propósito:
// o princípio é separar em duas pautas em vez de juntar fatos diferentes.
const cases: [string, string, boolean][] = [
  ['Técnica de enfermagem morre em acidente com padre em Dourados', 'Câmera flagrou acidente que matou técnica de enfermagem em Dourados (vídeo)', true],
  ['Estudante de Medicina da UFGD morre após acidente em Dourados', 'Técnica de enfermagem morre em acidente com padre em Dourados', false],
  ['Homem com tornozeleira eletrônica é suspeito de destruir carro de assistente social em MS', 'Ladrão arromba e furta carro de trabalhador em Campo Grande (vídeo)', false],
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
