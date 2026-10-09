import * as cheerio from 'cheerio';
import { fetchText } from './http';

// Extrai os dados de uma matéria a partir da própria página.
// Usa metadados padrão (og:, article:, meta author), que costumam ser estáveis.
export type ArticleData = {
  url: string;
  title: string;
  publishedAt: string | null;   // data/hora ISO, se encontrada
  author: string | null;
  category: string | null;
  imageUrl: string | null;      // só referência, nunca armazenada
  imageCredit: string | null;
  text: string;                 // texto extraído (para análise, não para republicar)
  textLength: number;
};

const clean = (s: string | undefined | null) => (s ?? '').replace(/\s+/g, ' ').trim() || null;

export async function fetchArticle(url: string): Promise<ArticleData> {
  const html = await fetchText(url);
  const $ = cheerio.load(html);

  const meta = (name: string) =>
    clean($(`meta[property="${name}"]`).attr('content')) ??
    clean($(`meta[name="${name}"]`).attr('content'));

  const paragraphs = $('article p, main p, .content p, p')
    .map((_, el) => clean($(el).text()) ?? '')
    .get()
    .filter((p) => p.length > 40);
  const text = [...new Set(paragraphs)].join('\n\n');

  const figure = $('figure img, article img').first();
  const caption =
    clean($('figcaption').first().text()) ?? clean(figure.attr('alt')) ?? null;

  return {
    url,
    title: meta('og:title') ?? clean($('title').text()) ?? '',
    publishedAt: meta('article:published_time') ?? null,
    author: meta('article:author') ?? meta('author') ?? null,
    category: meta('article:section') ?? null,
    imageUrl: meta('og:image') ?? clean(figure.attr('src')) ?? null,
    imageCredit: caption,
    text,
    textLength: text.length,
  };
}
