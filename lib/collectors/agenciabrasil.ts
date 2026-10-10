import { listFromPage, type Candidate } from './listing';

// Agência Brasil (EBC): página de últimas notícias. Respeita robots.txt via http.ts.
export async function listCandidates(): Promise<Candidate[]> {
  return listFromPage({
    listingUrl: 'https://agenciabrasil.ebc.com.br/ultimas',
    host: 'agenciabrasil.ebc.com.br',
    ignorePaths: [/^\/ultimas/, /^\/busca/, /^\/assine/],
  });
}
