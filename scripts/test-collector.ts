// Teste do coletor do Campo Grande News. Só lê a página e mostra o resultado.
// Uso (na VPS): docker compose run --rm migrate npx tsx scripts/test-collector.ts
import { listCandidates } from '../lib/collectors/campograndenews';

async function main() {
  const items = await listCandidates();
  console.log(`Candidatos encontrados: ${items.length}`);
  for (const item of items.slice(0, 10)) {
    console.log(`- ${item.title}\n  ${item.url}`);
  }
}

main().catch((e) => {
  console.error('FALHA:', e instanceof Error ? e.message : e);
  process.exit(1);
});
