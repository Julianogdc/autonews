// Worker do Autonews: a cada 15 minutos verifica o Campo Grande News,
// salva matérias novas e apaga textos com mais de 30 dias.
import { prisma } from '../lib/db';
import { runSource } from '../lib/collectors/discover';
import { triagePending } from '../lib/triage/apply';
import * as cgn from '../lib/collectors/campograndenews';
import * as correio from '../lib/collectors/correiodoestado';
import * as topmidia from '../lib/collectors/topmidia';

const SOURCES = [
  { key: 'campograndenews', list: cgn.listCandidates },
  { key: 'correiodoestado', list: correio.listCandidates },
  { key: 'topmidia', list: topmidia.listCandidates },
];

const INTERVAL_MS = 15 * 60 * 1000;
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function cycle() {
  for (const src of SOURCES) {
  try {
    const candidates = await src.list();
    const r = await runSource(src.key, candidates);
    const purged = await prisma.article.updateMany({
      where: { textPurgeAt: { lt: new Date() }, text: { not: null } },
      data: { text: null },
    });
    console.log(
      new Date().toISOString(),
      `${src.key}: ${r.candidates} candidatos, ${r.alreadyKnown} já conhecidos, ${r.saved} novos, ${r.failed} falhas, ${purged.count} textos expirados`,
    );
  } catch (e) {
    console.error(new Date().toISOString(), `${src.key}: erro no ciclo:`, e instanceof Error ? e.message : e);
  }
  }
  try {
    const triaged = await triagePending();
    console.log(new Date().toISOString(), `triagem: ${triaged} matérias pontuadas`);
  } catch (e) {
    console.error(new Date().toISOString(), 'triagem: erro:', e instanceof Error ? e.message : e);
  }
}

async function main() {
  console.log(new Date().toISOString(), 'worker iniciado (ciclo a cada 15 min)');
  while (true) {
    await cycle();
    await sleep(INTERVAL_MS);
  }
}

main();
