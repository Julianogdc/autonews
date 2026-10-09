import { listFromPage, type Candidate } from './listing';

// Campo Grande News: sem RSS. Lista a página de últimas notícias.
export async function listCandidates(): Promise<Candidate[]> {
  return listFromPage({
    listingUrl: 'https://www.campograndenews.com.br/ultimas-noticias',
    host: 'www.campograndenews.com.br',
  });
}
