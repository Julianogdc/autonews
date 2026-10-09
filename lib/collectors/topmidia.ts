import { listFromPage, type Candidate } from './listing';

// TopMídia: endereço atual topmidianews.com.br. Sem RSS; lista a página inicial.
export async function listCandidates(): Promise<Candidate[]> {
  return listFromPage({
    listingUrl: 'https://www.topmidianews.com.br/',
    host: 'www.topmidianews.com.br',
    ignorePaths: [/^\/sitemap/, /^\/busca/, /^\/assine/],
  });
}
