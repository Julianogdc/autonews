// Worker do Autonews: a cada 15 minutos verifica o Campo Grande News,
// salva matérias novas e apaga textos com mais de 30 dias.
import { prisma } from '../lib/db';
import { runCampoGrandeNews } from '../lib/collectors/discover';

const INTERVAL_MS = 15 * 60 * 1000;
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function cycle() {
  try {
    const r = await runCampoGrandeNews();
    const purged = await prisma.article.updateMany({
      where: { textPurgeAt: { lt: new Date() }, text: { not: null } },
      data: { text: null },
    });
    console.log(
      new Date().toISOString(),
      `campograndenews: ${r.candidates} candidatos, ${r.alreadyKnown} já conhecidos, ${r.saved} novos, ${r.failed} falhas, ${purged.count} textos expirados`,
    );
  } catch (e) {
    console.error(new Date().toISOString(), 'erro no ciclo:', e instanceof Error ? e.message : e);
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
