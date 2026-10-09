import * as cheerio from 'cheerio';
import { fetchText } from './http';

// Extrai os dados de uma matéria a partir da própria página.
// Ordem de prioridade: JSON-LD (dados estruturados), metadados og/article, texto visível.
export type ArticleData = {
  url: string;
  title: string;
  publishedAt: string | null;   // ISO 8601, com fuso
  author: string | null;        // jornalista, quando identificado
  category: string | null;
  imageUrl: string | null;      // só referência, nunca armazenada
  imageCredit: string | null;
  text: string;                 // texto extraído (para análise, não para republicar)
  textLength: number;
};

const clean = (s: string | undefined | null) => (s ?? '').replace(/\s+/g, ' ').trim() || null;

type Jsonish = Record<string, unknown>;

// Procura o objeto de notícia dentro dos blocos JSON-LD da página.
function findNewsArticle($: cheerio.CheerioAPI): Jsonish | null {
  let found: Jsonish | null = null;
  $('script[type="application/ld+json"]').each((_, el) => {
    if (found) return;
    try {
      const data = JSON.parse($(el).contents().text()) as unknown;
      const list = Array.isArray(data) ? data : [data];
      for (const item of list as Jsonish[]) {
        const type = String(item?.['@type'] ?? '');
        if (/NewsArticle|Article|ReportageNewsArticle/i.test(type)) {
          found = item;
          return;
        }
      }
    } catch {
      /* bloco inválido: ignora */
    }
  });
  return found;
}

// Categoria de reserva: primeiro nível do endereço (ex.: /cidades/capital/... → "Cidades").
function categoryFromUrl(url: string): string | null {
  const first = new URL(url).pathname.split('/').filter(Boolean)[0];
  if (!first || /^\d/.test(first)) return null;
  return first.charAt(0).toUpperCase() + first.slice(1).replace(/-/g, ' ');
}

export async function fetchArticle(url: string): Promise<ArticleData> {
  const html = await fetchText(url);
  const $ = cheerio.load(html);
  const news = findNewsArticle($);

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

  const jsonAuthor = news?.author as Jsonish | undefined;
  const rawAuthor =
    (jsonAuthor && typeof jsonAuthor.name === 'string' ? clean(jsonAuthor.name) : null) ??
    meta('article:author') ??
    null;
  // Remove o prefixo "Por " comum nos cabeçalhos de matéria.
  const author = rawAuthor ? rawAuthor.replace(/^Por\s+/i, '') : null;

  return {
    url,
    title: clean(news?.headline as string) ?? meta('og:title') ?? clean($('title').text()) ?? '',
    publishedAt:
      (typeof news?.datePublished === 'string' ? news.datePublished : null) ??
      meta('article:published_time') ??
      null,
    author,
    category:
      (typeof news?.articleSection === 'string' ? clean(news.articleSection) : null) ??
      meta('article:section') ??
      categoryFromUrl(url),
    imageUrl: meta('og:image') ?? clean(figure.attr('src')) ?? null,
    imageCredit: caption,
    text,
    textLength: text.length,
  };
}
