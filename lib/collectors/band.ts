import { listFromPage, type Candidate } from './listing';

// Band (site nacional, band.uol.com.br): página de notícias. Respeita robots.txt via http.ts.
export async function listCandidates(): Promise<Candidate[]> {
  return listFromPage({
    listingUrl: 'https://www.band.uol.com.br/noticias/',
    host: 'www.band.uol.com.br',
    ignorePaths: [/^\/busca/, /^\/assine/, /^\/noticias\/?$/],
  });
}
