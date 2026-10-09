import * as cheerio from 'cheerio';
import { fetchText } from './http';

// Lista genérica de matérias a partir de uma página de notícias.
// Cada portal informa a página de listagem, o domínio e caminhos a ignorar.
export type Candidate = { url: string; title: string };

export type ListingConfig = {
  listingUrl: string;
  host: string;           // ex.: "www.topmidianews.com.br"
  ignorePaths?: RegExp[]; // caminhos que nunca são matérias (assinatura, busca, etc.)
};

export async function listFromPage(cfg: ListingConfig): Promise<Candidate[]> {
  const html = await fetchText(cfg.listingUrl);
  const $ = cheerio.load(html);
  const base = `https://${cfg.host}`;
  const seen = new Map<string, Candidate>();

  $('a[href]').each((_, el) => {
    const raw = $(el).attr('href') ?? '';
    let url: URL;
    try {
      url = new URL(raw, base);
    } catch {
      return;
    }
    if (url.host !== cfg.host) return;
    if (cfg.ignorePaths?.some((re) => re.test(url.pathname))) return;
    // Matéria tem caminho com mais de um nível e título com texto real.
    const segments = url.pathname.split('/').filter(Boolean);
    if (segments.length < 2) return;
    const title = $(el).text().replace(/\s+/g, ' ').trim();
    if (title.length < 20) return;
    const clean = `${url.origin}${url.pathname}`;
    if (!seen.has(clean)) seen.set(clean, { url: clean, title });
  });

  return [...seen.values()];
}
