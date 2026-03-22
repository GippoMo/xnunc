// app/blog/page.jsx — SERVER COMPONENT
// Indice del blog. Ogni articolo è una keyword rankata separatamente.

export const metadata = {
  title: "Blog — AI per Commercialisti: Guide e Approfondimenti",
  description:
    "Guide pratiche, approfondimenti normativi e casi d'uso sull'intelligenza artificiale per commercialisti italiani. Come usare l'AI nello studio professionale.",
  alternates: {
    canonical: "https://www.xnunc.ai/blog",
  },
  openGraph: {
    title: "Blog xNunc.ai — AI per Commercialisti",
    description: "Guide pratiche sull'uso dell'AI nello studio commerciale italiano.",
    url: "https://www.xnunc.ai/blog",
  },
};

const articles = [
  {
    slug: "ai-per-commercialisti-2025",
    title: "AI per Commercialisti Italiani: Guida Completa 2025",
    excerpt:
      "Come l'intelligenza artificiale sta trasformando il lavoro quotidiano negli studi commerciali italiani. Strumenti, casi d'uso reali e come iniziare oggi.",
    date: "2025-03-01",
    readTime: "8 min",
    tags: ["AI", "Commercialisti", "Guida"],
    category: "Guide pratiche",
  },
];

const breadcrumbSchema = {
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  itemListElement: [
    { "@type": "ListItem", position: 1, name: "Home", item: "https://www.xnunc.ai" },
    { "@type": "ListItem", position: 2, name: "Blog", item: "https://www.xnunc.ai/blog" },
  ],
};

export default function BlogIndex() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
      />
      <main style={{ maxWidth: 860, margin: "0 auto", padding: "48px 24px 80px", fontFamily: "Arial, sans-serif", background: "#FAF9F7", minHeight: "100vh" }}>
        <nav style={{ fontSize: 12, color: "#888", marginBottom: 32 }}>
          <a href="/" style={{ color: "#888", textDecoration: "none" }}>xNunc.ai</a>
          <span style={{ margin: "0 6px" }}>›</span>
          <span style={{ color: "#BA7517", fontWeight: 700 }}>Blog</span>
        </nav>

        <div style={{ marginBottom: 48 }}>
          <div style={{ fontSize: 9, fontWeight: 700, color: "#BA7517", letterSpacing: "0.2em", marginBottom: 12, textTransform: "uppercase" }}>BLOG</div>
          <h1 style={{ fontFamily: "Georgia, serif", fontSize: 32, fontWeight: 400, color: "#0A0B0F", marginBottom: 16, lineHeight: 1.3 }}>
            AI per Commercialisti: Guide e Approfondimenti
          </h1>
          <p style={{ fontSize: 15, color: "#555", lineHeight: 1.7, maxWidth: 580, margin: 0 }}>
            Come usare l'intelligenza artificiale nel lavoro quotidiano di uno studio commerciale italiano.
            Guide pratiche, normativa, strumenti e casi d'uso reali.
          </p>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
          {articles.map((art) => (
            <a
              key={art.slug}
              href={`/blog/${art.slug}`}
              style={{ textDecoration: "none", display: "block" }}
            >
              <article
                style={{
                  border: "1px solid #E8E4DC",
                  borderLeft: "3px solid #BA7517",
                  borderRadius: 4,
                  padding: "20px 22px",
                  background: "#fff",
                  transition: "background .15s",
                }}
              >
                <div style={{ fontSize: 8, fontWeight: 700, color: "#BA7517", letterSpacing: "0.16em", textTransform: "uppercase", marginBottom: 8 }}>
                  {art.category}
                </div>
                <h2 style={{ fontFamily: "Georgia, serif", fontSize: 19, fontWeight: 400, color: "#0A0B0F", marginBottom: 8, lineHeight: 1.35 }}>
                  {art.title}
                </h2>
                <p style={{ fontSize: 13, color: "#666", lineHeight: 1.6, marginBottom: 12 }}>{art.excerpt}</p>
                <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                  <span style={{ fontSize: 11, color: "#aaa" }}>
                    {new Date(art.date).toLocaleDateString("it-IT", { day: "numeric", month: "long", year: "numeric" })}
                  </span>
                  <span style={{ fontSize: 11, color: "#aaa" }}>·</span>
                  <span style={{ fontSize: 11, color: "#aaa" }}>{art.readTime} di lettura</span>
                  {art.tags.map((t) => (
                    <span key={t} style={{ fontSize: 9, color: "#888", border: "1px solid #E8E4DC", padding: "1px 6px", fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase" }}>
                      {t}
                    </span>
                  ))}
                </div>
              </article>
            </a>
          ))}
        </div>
      </main>
    </>
  );
}
