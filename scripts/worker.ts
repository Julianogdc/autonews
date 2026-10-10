// Worker do Autonews: a cada 15 minutos verifica os portais,
// salva matérias novas e apaga textos com mais de 30 dias.
// Rascunhos com IA não são gerados aqui: só quando alguém pede no painel ("Gerar matéria").
import { prisma } from '../lib/db';
import { runSource } from '../lib/collectors/discover';
import { triagePending } from '../lib/triage/apply';
import { groupPending } from '../lib/grouping/apply';
import { processFacts } from '../lib/facts/apply';
import * as cgn from '../lib/collectors/campograndenews';
import * as correio from '../lib/collectors/correiodoestado';
import * as topmidia from '../lib/collectors/topmidia';
import * as agencia from '../lib/collectors/agenciabrasil';
import * as band from '../lib/collectors/band';

const SOURCES = [
  { key: 'campograndenews', list: cgn.listCandidates },
  { key: 'correiodoestado', list: correio.listCandidates },
  { key: 'topmidia', list: topmidia.listCandidates },
  { key: 'agenciabrasil', list: agencia.listCandidates },
  { key: 'band', list: band.listCandidates },
];

const INTERVAL_MS = 15 * 60 * 1000;
const CHECK_MS = 15 * 1000; // de quanto em quanto tempo olha se alguém apertou "Buscar agora"
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// Espera até o próximo ciclo, mas sai antes se houver pedido de busca feito pelo painel.
async function waitNext(since: Date) {
  const end = Date.now() + INTERVAL_MS;
  while (Date.now() < end) {
    await sleep(CHECK_MS);
    try {
      const req = await prisma.auditLog.findFirst({
        where: { action: 'collect_now', createdAt: { gt: since } },
        select: { id: true },
      });
      if (req) {
        console.log(new Date().toISOString(), 'busca manual pedida pelo painel');
        return;
      }
    } catch (e) {
      console.error(new Date().toISOString(), 'pedido manual: erro ao consultar:', e instanceof Error ? e.message : e);
    }
  }
}

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
  try {
    const grouped = await groupPending();
    console.log(new Date().toISOString(), `agrupamento: ${grouped} matérias ligadas a pautas`);
  } catch (e) {
    console.error(new Date().toISOString(), 'agrupamento: erro:', e instanceof Error ? e.message : e);
  }
  try {
    const f = await processFacts();
    console.log(new Date().toISOString(), `fatos: ${f.extracted} matérias processadas, ${f.alerts} alertas de divergência`);
  } catch (e) {
    console.error(new Date().toISOString(), 'fatos: erro:', e instanceof Error ? e.message : e);
  }
}

async function main() {
  console.log(new Date().toISOString(), 'worker iniciado (ciclo a cada 15 min ou quando pedido no painel)');
  while (true) {
    const started = new Date();
    await cycle();
    await prisma.auditLog.create({ data: { action: 'collect_done' } }).catch(() => {});
    await waitNext(started);
  }
}

main();
