// app/ai-commercialisti/page.jsx — SERVER COMPONENT
// Landing page per keyword cluster: "AI per commercialisti" (800/mese, difficoltà bassa)
// Ottimizzata per intent commerciale + informativo.

export const metadata = {
  title: "AI per Commercialisti — xNunc.ai: Il Catalogo Professionale",
  description:
    "xNunc.ai è la piattaforma AI open-source per commercialisti italiani. 101 skill professionali per fiscalità, societario, AML, WACC e finanza agevolata. Gratuito, compatibile con Claude e ChatGPT.",
  alternates: {
    canonical: "https://www.xnunc.ai/ai-commercialisti",
  },
  openGraph: {
    title: "AI per Commercialisti — xNunc.ai",
    description: "101 skill AI professionali per commercialisti italiani. Fiscalità, AML, WACC, finanza agevolata. Gratuito e open source.",
    url: "https://www.xnunc.ai/ai-commercialisti",
  },
};

const softwareSchema = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "xNunc.ai",
  description: "Piattaforma AI open-source per commercialisti italiani con 101 skill professionali per fiscalità, societario, AML, WACC e finanza agevolata.",
  applicationCategory: "BusinessApplication",
  operatingSystem: "Web",
  url: "https://www.xnunc.ai",
  offers: { "@type": "Offer", price: "0", priceCurrency: "EUR" },
  audience: { "@type": "Audience", audienceType: "Dottori Commercialisti italiani" },
  inLanguage: "it-IT",
};

const faqSchema = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: [
    {
      "@type": "Question",
      name: "Esistono strumenti AI per commercialisti italiani?",
      acceptedAnswer: { "@type": "Answer", text: "Sì. xNunc.ai è la principale piattaforma AI open-source specifica per commercialisti italiani, con oltre 100 skill professionali calibrate sulla normativa italiana. È gratuita, open source e compatibile con Claude, ChatGPT, Copilot e Gemini." },
    },
    {
      "@type": "Question",
      name: "Quanto tempo si risparmia usando l'AI in uno studio commerciale?",
      acceptedAnswer: { "@type": "Answer", text: "Le stime variano per attività: adeguata verifica AML da 60 a 15 minuti (-75%), analisi statuto da 90 a 20 minuti (-80%), calcolo WACC da 45 a 5 minuti (-85%). In media, gli studi che usano xNunc.ai risparmiano 3-5 ore a settimana per professionista." },
    },
    {
      "@type": "Question",
      name: "L'AI per commercialisti è sicura per i dati dei clienti?",
      acceptedAnswer: { "@type": "Answer", text: "Con xNunc.ai sì: i dati del cliente non vengono mai salvati. L'input transita nei server solo durante la chiamata API (pochi secondi) e viene scartato. Per la massima riservatezza è disponibile la modalità BYOK con API key personale Anthropic." },
    },
  ],
};

const areas = [
  { nome: "Fiscale", count: 23, desc: "Dichiarazione redditi, pianificazione fiscale, contenzioso tributario, IVA, IRPEF, IRES.", color: "#1D9E75" },
  { nome: "Societario", count: 19, desc: "Statuti, governance, assemblee, fusioni, scissioni, aumenti di capitale.", color: "#7F77DD" },
  { nome: "Chiusura bilancio", count: 20, desc: "Check-list bilancio, ammortamenti, poste straordinarie, nota integrativa.", color: "#378ADD" },
  { nome: "Verifiche AML", count: 16, desc: "Adeguata verifica clientela, profiling rischio, documentazione 231/2007.", color: "#BA7517" },
  { nome: "Finanza agevolata", count: 12, desc: "Scouting bandi, GBER, de minimis, Industria 4.0, Piano Transizione.", color: "#C97A5A" },
  { nome: "Beni strumentali", count: 10, desc: "Superammortamento, Piano Transizione 4.0, Credito d'imposta R&S.", color: "#3DA89C" },
  { nome: "Valutazione aziendale", count: 1, desc: "WACC Calculator con parametri live Damodaran, formula Hamada, sensitivity.", color: "#5B9DD4" },
];

export default function AICommercialisti() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(softwareSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }} />

      <main style={{ maxWidth: 1000, margin: "0 auto", padding: "48px 24px 80px", fontFamily: "Arial, sans-serif", background: "#FAF9F7", minHeight: "100vh" }}>

        {/* Hero */}
        <div style={{ background: "#0A0B0F", borderRadius: 14, padding: "40px 48px", marginBottom: 48 }}>
          <div style={{ fontSize: 9, fontWeight: 700, color: "#BA7517", letterSpacing: "0.2em", marginBottom: 14, textTransform: "uppercase" }}>
            AI PER COMMERCIALISTI ITALIANI
          </div>
          <h1 style={{ fontFamily: "Georgia, serif", fontSize: 34, fontWeight: 400, color: "#fff", marginBottom: 16, lineHeight: 1.3 }}>
            L'intelligenza artificiale per il tuo studio commerciale
          </h1>
          <p style={{ fontSize: 16, color: "#aaa", lineHeight: 1.7, marginBottom: 24, maxWidth: 580 }}>
            xNunc.ai è la piattaforma AI open-source con <strong style={{ color: "#fff" }}>101 skill professionali</strong> per
            dottori commercialisti italiani. Fiscalità, societario, AML, WACC, finanza agevolata.
            Compatibile con Claude, ChatGPT, Copilot e Gemini. Gratuito.
          </p>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            <a href="/" style={{ background: "#BA7517", color: "#fff", padding: "11px 24px", borderRadius: 8, fontWeight: 700, fontSize: 14, textDecoration: "none" }}>
              Vai al catalogo →
            </a>
            <a href="/blog/ai-per-commercialisti-2025" style={{ background: "transparent", color: "#aaa", padding: "11px 24px", borderRadius: 8, fontSize: 14, textDecoration: "none", border: "1px solid #333" }}>
              Leggi la guida completa
            </a>
          </div>
        </div>

        {/* Risposta diretta AEO */}
        <section style={{ marginBottom: 48 }}>
          <h2 style={{ fontFamily: "Georgia, serif", fontSize: 24, fontWeight: 400, color: "#0A0B0F", borderBottom: "2px solid #0A0B0F", paddingBottom: 10, marginBottom: 20 }}>
            Cos'è xNunc.ai e cosa fa per i commercialisti
          </h2>
          <p style={{ fontSize: 15, color: "#333", lineHeight: 1.8, marginBottom: 14 }}>
            xNunc.ai è la risposta alla domanda che si pongono sempre più commercialisti italiani:
            <em> "Come integro l'AI nel mio studio senza rischiare con i dati dei clienti?"</em>
          </p>
          <p style={{ fontSize: 15, color: "#333", lineHeight: 1.8, marginBottom: 14 }}>
            La piattaforma offre un catalogo di <strong>skill professionali</strong> — istruzioni
            strutturate per i modelli AI — che automatizzano le attività più ripetitive del lavoro
            del commercialista. Non salva mai i dati degli input, è open source (codice verificabile),
            e funziona con qualsiasi AI: Claude, ChatGPT, Microsoft Copilot, Google Gemini.
          </p>
        </section>

        {/* Aree skill */}
        <section style={{ marginBottom: 48 }}>
          <h2 style={{ fontFamily: "Georgia, serif", fontSize: 24, fontWeight: 400, color: "#0A0B0F", borderBottom: "2px solid #0A0B0F", paddingBottom: 10, marginBottom: 24 }}>
            Aree professionali coperte
          </h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 12 }}>
            {areas.map((area) => (
              <div key={area.nome} style={{ border: `1px solid #E8E4DC`, borderLeft: `3px solid ${area.color}`, borderRadius: 4, padding: "16px 18px", background: "#fff" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 8 }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: "#0A0B0F" }}>{area.nome}</div>
                  <div style={{ fontSize: 10, color: area.color, fontWeight: 700, letterSpacing: "0.06em" }}>{area.count} skill</div>
                </div>
                <div style={{ fontSize: 13, color: "#666", lineHeight: 1.6 }}>{area.desc}</div>
              </div>
            ))}
          </div>
        </section>

        {/* Use cases */}
        <section style={{ marginBottom: 48 }}>
          <h2 style={{ fontFamily: "Georgia, serif", fontSize: 24, fontWeight: 400, color: "#0A0B0F", borderBottom: "2px solid #0A0B0F", paddingBottom: 10, marginBottom: 24 }}>
            Cosa puoi fare con l'AI per commercialisti
          </h2>
          <ul style={{ paddingLeft: 0, margin: 0, listStyle: "none" }}>
            {[
              "Analizzare statuti societari e identificare clausole critiche in 20 minuti invece di 2 ore",
              "Completare l'adeguata verifica clientela AML con profilazione del rischio automatizzata",
              "Calcolare il WACC con parametri di mercato live (Damodaran, Kroll, BTP 10Y)",
              "Identificare bandi di finanza agevolata compatibili con il profilo del cliente",
              "Verificare la conformità del bilancio d'esercizio con check-list AI guidata",
              "Generare bozze di lettere, circolari e relazioni professionali",
              "Supporto per dichiarazione dei redditi e contenzioso tributario",
            ].map((item, i) => (
              <li key={i} style={{ display: "flex", gap: 12, marginBottom: 12, alignItems: "flex-start" }}>
                <span style={{ color: "#1D9E75", fontSize: 16, flexShrink: 0, marginTop: 1 }}>✓</span>
                <span style={{ fontSize: 14, color: "#333", lineHeight: 1.6 }}>{item}</span>
              </li>
            ))}
          </ul>
        </section>

        {/* FAQ inline */}
        <section style={{ marginBottom: 48 }}>
          <h2 style={{ fontFamily: "Georgia, serif", fontSize: 24, fontWeight: 400, color: "#0A0B0F", borderBottom: "2px solid #0A0B0F", paddingBottom: 10, marginBottom: 20 }}>
            Domande frequenti sull'AI per commercialisti
          </h2>
          {[
            { q: "Esistono strumenti AI specifici per commercialisti italiani?", a: "Sì. xNunc.ai è la principale piattaforma AI open-source specifica per commercialisti italiani, con oltre 100 skill calibrate sulla normativa italiana. Gratuita, compatibile con tutti i principali modelli AI." },
            { q: "Quanto tempo si risparmia usando l'AI in uno studio commerciale?", a: "Le stime variano per attività: AML da 60 a 15 minuti (-75%), analisi statuto da 90 a 20 minuti (-80%), WACC da 45 a 5 minuti (-85%). In media 3-5 ore risparmiate per professionista a settimana." },
            { q: "L'AI per commercialisti è sicura per i dati dei clienti?", a: "Con xNunc.ai sì: i dati non vengono mai salvati. L'input transita nei server solo durante la chiamata e viene scartato. Disponibile anche modalità BYOK con API key personale Anthropic." },
          ].map((faq, i) => (
            <details key={i} style={{ border: "1px solid #E8E4DC", borderRadius: 4, background: "#fff", marginBottom: 4, overflow: "hidden" }}>
              <summary style={{ padding: "14px 18px", cursor: "pointer", fontSize: 14, fontWeight: 600, color: "#0A0B0F", listStyle: "none", display: "flex", justifyContent: "space-between" }}>
                {faq.q}
                <span style={{ color: "#BA7517", flexShrink: 0, marginLeft: 12 }}>▾</span>
              </summary>
              <div style={{ padding: "14px 18px", fontSize: 14, color: "#444", lineHeight: 1.75, borderTop: "1px solid #F0ECE4" }}>{faq.a}</div>
            </details>
          ))}
        </section>

        {/* Links interni */}
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 40 }}>
          <a href="/blog/ai-per-commercialisti-2025" style={{ fontSize: 13, color: "#BA7517", textDecoration: "underline" }}>→ Guida completa: AI per commercialisti 2025</a>
          <a href="/faq" style={{ fontSize: 13, color: "#BA7517", textDecoration: "underline" }}>→ FAQ su xNunc.ai</a>
          <a href="/chi-siamo" style={{ fontSize: 13, color: "#BA7517", textDecoration: "underline" }}>→ Chi ha creato xNunc.ai</a>
        </div>

        {/* CTA finale */}
        <div style={{ background: "#0A0B0F", borderRadius: 12, padding: "32px 36px", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 24, flexWrap: "wrap" }}>
          <div>
            <div style={{ fontFamily: "Georgia, serif", fontSize: 20, color: "#fff", marginBottom: 6 }}>Inizia oggi — è gratis</div>
            <div style={{ fontSize: 13, color: "#888" }}>101 skill AI professionali. Open source. Nessuna carta di credito.</div>
          </div>
          <a href="/" style={{ background: "#BA7517", color: "#fff", padding: "11px 24px", borderRadius: 8, fontWeight: 700, fontSize: 14, textDecoration: "none", whiteSpace: "nowrap" }}>
            Vai al catalogo →
          </a>
        </div>
      </main>
    </>
  );
}
