// ──────────────────────────────────────────────────────────────────
// /sitemap.xml — auto-generated from content collections + static routes
// Generated at build time. Excludes drafts and noindex pages.
// ──────────────────────────────────────────────────────────────────
import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';

export const prerender = true;

const SITE = 'https://power-in-numbers.net';

// Static routes (no slug). Listed explicitly so we control priority + lastmod.
const STATIC_ROUTES: { path: string; priority: string; changefreq: string }[] = [
  { path: '/',                                            priority: '1.0', changefreq: 'monthly' },
  { path: '/about/',                                      priority: '0.7', changefreq: 'monthly' },
  { path: '/contact/',                                    priority: '0.5', changefreq: 'yearly'  },
  { path: '/engage/',                                     priority: '0.7', changefreq: 'monthly' },
  { path: '/press/',                                      priority: '0.5', changefreq: 'monthly' },
  { path: '/methodology/',                                priority: '0.9', changefreq: 'monthly' },
  { path: '/methodology/framework/',                      priority: '0.7', changefreq: 'monthly' },
  { path: '/methodology/curriculum/',                     priority: '0.7', changefreq: 'monthly' },
  { path: '/methodology/validation/',                     priority: '0.7', changefreq: 'monthly' },
  { path: '/case-studies/',                               priority: '0.9', changefreq: 'monthly' },
  { path: '/case-studies/ghana-market-entry/interactive/',priority: '0.8', changefreq: 'monthly' },
  { path: '/library/',                                    priority: '0.8', changefreq: 'monthly' },
  { path: '/track-record/',                               priority: '0.7', changefreq: 'monthly' },
  { path: '/artifacts/foundation/',                       priority: '0.6', changefreq: 'yearly'  },
  { path: '/artifacts/case-studies/ghana/',               priority: '0.6', changefreq: 'yearly'  },
  { path: '/artifacts/case-studies/masters-chair/',       priority: '0.6', changefreq: 'yearly'  },
];

function fmtDate(d: Date | string | undefined): string {
  if (!d) return new Date().toISOString().slice(0, 10);
  const date = typeof d === 'string' ? new Date(d) : d;
  if (isNaN(date.getTime())) return new Date().toISOString().slice(0, 10);
  return date.toISOString().slice(0, 10);
}

export const GET: APIRoute = async () => {
  const caseStudies = await getCollection('case-studies').catch(() => []);
  const libraryAll  = await getCollection('library').catch(() => []);
  const library     = libraryAll.filter((e: any) => !e.data.unlisted);
  const trackRecord = await getCollection('track-record').catch(() => []);

  const urls: string[] = [];

  // Static routes
  for (const r of STATIC_ROUTES) {
    urls.push(
      `  <url>\n    <loc>${SITE}${r.path}</loc>\n    <changefreq>${r.changefreq}</changefreq>\n    <priority>${r.priority}</priority>\n  </url>`
    );
  }

  const slugOf = (e: any): string => (e.id ?? '').replace(/\.md$/, '');

  // Case studies
  for (const cs of caseStudies as any[]) {
    const lastmod = fmtDate(cs.data.publishedAt);
    urls.push(
      `  <url>\n    <loc>${SITE}/case-studies/${slugOf(cs)}/</loc>\n    <lastmod>${lastmod}</lastmod>\n    <changefreq>monthly</changefreq>\n    <priority>0.8</priority>\n  </url>`
    );
  }

  // Library
  for (const lib of library as any[]) {
    const lastmod = fmtDate(lib.data.publishedAt);
    urls.push(
      `  <url>\n    <loc>${SITE}/library/${slugOf(lib)}/</loc>\n    <lastmod>${lastmod}</lastmod>\n    <changefreq>monthly</changefreq>\n    <priority>0.7</priority>\n  </url>`
    );
  }

  // Track record
  for (const tr of trackRecord as any[]) {
    const lastmod = fmtDate(tr.data.publishedAt);
    urls.push(
      `  <url>\n    <loc>${SITE}/track-record/${slugOf(tr)}/</loc>\n    <lastmod>${lastmod}</lastmod>\n    <changefreq>yearly</changefreq>\n    <priority>0.6</priority>\n  </url>`
    );
  }

  const xml =
    `<?xml version="1.0" encoding="UTF-8"?>\n` +
    `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
    urls.join('\n') + '\n' +
    `</urlset>\n`;

  return new Response(xml, {
    status: 200,
    headers: { 'Content-Type': 'application/xml; charset=utf-8' },
  });
};
