// app/sitemap.js
// Sitemap XML generata da Next.js — incluse tutte le pagine pubbliche.
// Aggiornare ogni volta che si aggiungono nuove pagine o articoli blog.
// Google la legge da https://www.xnunc.ai/sitemap.xml

const BASE = "https://www.xnunc.ai";

export default function sitemap() {
  const now = new Date();

  // Pagine statiche principali
  const staticPages = [
    {
      url: BASE,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 1.0,
    },
    {
      url: `${BASE}/faq`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.9,
    },
    {
      url: `${BASE}/chi-siamo`,
      lastModified: new Date("2026-03-01"),
      changeFrequency: "monthly",
      priority: 0.7,
    },
    {
      url: `${BASE}/novita`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.9,
    },
    {
      url: `${BASE}/ai-commercialisti`,
      lastModified: new Date("2026-03-01"),
      changeFrequency: "monthly",
      priority: 0.95,
    },
  ];

  // Articoli blog
  const blogArticles = [
    {
      url: `${BASE}/blog/ai-per-commercialisti-2025`,
      lastModified: new Date("2026-03-01"),
      changeFrequency: "monthly",
      priority: 0.85,
    },
    // Aggiungere nuovi articoli qui:
    // { url: `${BASE}/blog/wacc-calculator-commercialisti`, lastModified: new Date("2026-04-01"), changeFrequency: "monthly", priority: 0.8 },
    // { url: `${BASE}/blog/automazione-pratiche-fiscali`, lastModified: new Date("2026-04-15"), changeFrequency: "monthly", priority: 0.8 },
  ];

  return [...staticPages, ...blogArticles];
}
