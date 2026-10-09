// Teste da extração de fatos e das divergências com frases reais. Não grava nada.
// Uso local: npx tsx scripts/test-facts.ts
import { extractFacts, findDivergences } from '../lib/facts/extract';

const t1 = 'Cesta básica em Campo Grande custa R$ 806,56 e sobe 0,18%';
const t2 = 'Temporal com ventos de até 60 km/h e granizo ameaça Campo Grande e MS';
const t3 = 'Quatro suspeitos morrem após serem baleados durante operação policial em MS';
const t4 = 'Ação deixa 2 mortos e 3 feridos; ocorrência foi às 14h30';
const t5 = 'Cesta básica em Campo Grande custa R$ 806,50 e sobe 0,2%';

for (const t of [t1, t2, t3, t4]) {
  console.log(t);
  console.log('   ', extractFacts(t).map((f) => `${f.kind}=${f.value}`).join(' | ') || 'nenhum fato');
}

const div = findDivergences([
  { articleId: 'a', sourceKey: 'campograndenews', facts: extractFacts(t1) },
  { articleId: 'b', sourceKey: 'topmidia', facts: extractFacts(t5) },
]);
console.log('\nDivergências entre dois portais:');
for (const d of div) console.log(' ', d.kind, JSON.stringify(d.values));

// Caso sem divergência: matéria com dois valores em dinheiro (cesta e multa) não deve alarmar.
const div2 = findDivergences([
  { articleId: 'c', sourceKey: 'campograndenews', facts: extractFacts('Cesta custa R$ 806,56; multa é de R$ 50,00') },
  { articleId: 'd', sourceKey: 'topmidia', facts: extractFacts('Cesta custa R$ 806,50') },
]);
console.log('\nCaso com dois valores numa das matérias (esperado: nenhuma divergência):', div2.length === 0 ? 'OK' : 'ERRO', JSON.stringify(div2));
