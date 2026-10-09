import * as cheerio from 'cheerio';
import { fetchText } from './http';

// Campo Grande News: não tem RSS; a fonte é a página de últimas notícias.
const LISTING_URL = 'https://www.campograndenews.com.br/ultimas-noticias';
const SITE = 'https://www.campograndenews.com.br';

export type Candidate = { url: string; title: string };

// Lista os links de matérias da página. Retorna apenas candidatos, sem baixar o texto.
export async function listCandidates(): Promise<Candidate[]> {
  const html = await fetchText(LISTING_URL);
  const $ = cheerio.load(html);
  const seen = new Map<string, Candidate>();

  $('a[href]').each((_, el) => {
    const raw = $(el).attr('href') ?? '';
    const url = new URL(raw, SITE);
    if (url.host !== 'www.campograndenews.com.br') return;
    // Matérias têm caminho com mais de um nível e um título com texto real.
    const segments = url.pathname.split('/').filter(Boolean);
    if (segments.length < 2) return;
    const title = $(el).text().replace(/\s+/g, ' ').trim();
    if (title.length < 20) return;
    const clean = `${url.origin}${url.pathname}`;
    if (!seen.has(clean)) seen.set(clean, { url: clean, title });
  });

  return [...seen.values()];
}
