// Teste de extração de matérias. Lê algumas páginas e mostra os campos. Não grava nada.
// Uso (na VPS): docker compose --profile tools run --rm migrate npx tsx scripts/test-article.ts
import { listCandidates } from '../lib/collectors/campograndenews';
import { fetchArticle } from '../lib/collectors/article';

async function main() {
  const candidates = await listCandidates();
  const sample = candidates.slice(0, 3);
  for (const c of sample) {
    const a = await fetchArticle(c.url);
    console.log('----------------------------------------');
    console.log('TITULO   :', a.title);
    console.log('DATA     :', a.publishedAt ?? '(não encontrada)');
    console.log('AUTOR    :', a.author ?? '(não encontrado)');
    console.log('CATEGORIA:', a.category ?? '(não encontrada)');
    console.log('IMAGEM   :', a.imageUrl ?? '(não encontrada)');
    console.log('CREDITO  :', a.imageCredit ?? '(não encontrado)');
    console.log('TEXTO    :', a.textLength, 'caracteres');
  }
}

main().catch((e) => {
  console.error('FALHA:', e instanceof Error ? e.message : e);
  process.exit(1);
});
