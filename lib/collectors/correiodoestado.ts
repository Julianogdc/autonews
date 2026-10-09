import { listFromPage, type Candidate } from './listing';

// Correio do Estado: sem RSS. Lista a página de últimas notícias.
// Conteúdo exclusivo para assinantes é ignorado (ver article.ts: isPaid).
export async function listCandidates(): Promise<Candidate[]> {
  return listFromPage({
    listingUrl: 'https://correiodoestado.com.br/ultimas-noticias/',
    host: 'correiodoestado.com.br',
    ignorePaths: [/^\/noticias-assinantes/, /^\/busca/, /^\/assine/, /^\/entrar/],
  });
}
