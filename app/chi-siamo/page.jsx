// app/chi-siamo/page.jsx — SERVER COMPONENT
// E-E-A-T: Experience, Expertise, Authoritativeness, Trust
// Google classifica i siti YMYL (finanza/fiscale) in base all'autorevolezza dichiarata.
// Questa pagina dimostra le credenziali professionali di chi ha costruito xNunc.ai.

export const metadata = {
  title: "Chi siamo — xNunc.ai: AI per Commercialisti",
  description:
    "xNunc.ai è stato creato da Dott. Giampiero Morales, Dottore Commercialista e Revisore Legale. Scopri la storia, la visione e il team dietro la piattaforma AI per commercialisti italiani.",
  alternates: {
    canonical: "https://www.xnunc.ai/chi-siamo",
  },
  openGraph: {
    title: "Chi siamo — xNunc.ai",
    description:
      "Creato da un Dottore Commercialista per i commercialisti italiani. La storia e la visione di xNunc.ai.",
    url: "https://www.xnunc.ai/chi-siamo",
  },
};

// Schema Person (E-E-A-T fondamentale per siti YMYL fiscale/finanziario)
const personSchema = {
  "@context": "https://schema.org",
  "@type": "Person",
  name: "Giampiero Morales",
  jobTitle: "Dottore Commercialista e Revisore Legale",
  affiliation: {
    "@type": "Organization",
    name: "BC & Studio Prof.le Consulenza Societaria Tributaria",
    url: "https://www.xnunc.ai/chi-siamo",
  },
  email: "morales@bcand.it",
  url: "https://www.xnunc.ai/chi-siamo",
  knowsAbout: [
    "Fiscalità italiana",
    "Diritto societario",
    "Antiriciclaggio AML",
    "Contenzioso tributario",
    "Valutazione aziendale",
    "Intelligenza artificiale applicata alla professione",
  ],
  hasCredential: [
    {
      "@type": "EducationalOccupationalCredential",
      credentialCategory: "Iscrizione all'Ordine dei Dottori Commercialisti e degli Esperti Contabili",
      recognizedBy: {
        "@type": "Organization",
        name: "ODCEC — Ordine dei Dottori Commercialisti e degli Esperti Contabili",
      },
    },
    {
      "@type": "EducationalOccupationalCredential",
      credentialCategory: "Iscrizione nel Registro dei Revisori Legali",
      recognizedBy: {
        "@type": "Organization",
        name: "MEF — Ministero dell'Economia e delle Finanze",
      },
    },
  ],
};

const organizationSchema = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "xNunc.ai",
  url: "https://www.xnunc.ai",
  foundingDate: "2025",
  description:
    "Piattaforma AI open-source per dottori commercialisti italiani. Skill professionali per fiscalità, societario, valutazione aziendale e antiriciclaggio.",
  founder: {
    "@type": "Person",
    name: "Giampiero Morales",
  },
  license: "https://www.gnu.org/licenses/agpl-3.0.html",
  knowsAbout: [
    "AI per commercialisti",
    "Fiscalità italiana",
    "Automazione studio professionale",
  ],
};

const breadcrumbSchema = {
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  itemListElement: [
    { "@type": "ListItem", position: 1, name: "Home", item: "https://www.xnunc.ai" },
    { "@type": "ListItem", position: 2, name: "Chi siamo", item: "https://www.xnunc.ai/chi-siamo" },
  ],
};

export default function ChiSiamoPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(personSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
      />
      <main
        style={{
          maxWidth: 860,
          margin: "0 auto",
          padding: "48px 24px 80px",
          fontFamily: "Arial, sans-serif",
          background: "#FAF9F7",
          minHeight: "100vh",
        }}
      >
        {/* Breadcrumb */}
        <nav style={{ fontSize: 12, color: "#888", marginBottom: 32 }}>
          <a href="/" style={{ color: "#888", textDecoration: "none" }}>xNunc.ai</a>
          <span style={{ margin: "0 6px" }}>›</span>
          <span style={{ color: "#BA7517", fontWeight: 700 }}>Chi siamo</span>
        </nav>

        {/* Header */}
        <div style={{ marginBottom: 48 }}>
          <div style={{ fontSize: 9, fontWeight: 700, color: "#BA7517", letterSpacing: "0.2em", marginBottom: 12, textTransform: "uppercase" }}>
            CHI SIAMO
          </div>
          <h1 style={{ fontFamily: "Georgia, serif", fontSize: 32, fontWeight: 400, color: "#0A0B0F", marginBottom: 16, lineHeight: 1.3 }}>
            Costruito da un commercialista, per i commercialisti
          </h1>
          <p style={{ fontSize: 15, color: "#555", lineHeight: 1.7, maxWidth: 640, margin: 0 }}>
            xNunc.ai nasce dall'esperienza diretta di chi affronta ogni giorno le complessità
            della fiscalità italiana. Non è un prodotto di una software house: è uno strumento
            professionale costruito da chi lo usa.
          </p>
        </div>

        {/* Creator card */}
        <section
          style={{
            background: "#0A0B0F",
            borderRadius: 12,
            padding: "32px 36px",
            marginBottom: 48,
            display: "flex",
            gap: 32,
            alignItems: "flex-start",
            flexWrap: "wrap",
          }}
        >
          {/* Avatar */}
          <div
            style={{
              width: 72,
              height: 72,
              borderRadius: "50%",
              background: "#BA7517",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <span style={{ color: "#fff", fontSize: 28, fontWeight: 700, fontFamily: "Georgia, serif" }}>G</span>
          </div>
          <div style={{ flex: 1, minWidth: 240 }}>
            <div style={{ fontFamily: "Georgia, serif", fontSize: 22, color: "#fff", marginBottom: 4 }}>
              Giampiero Morales
            </div>
            <div style={{ fontSize: 13, color: "#BA7517", fontWeight: 700, letterSpacing: "0.06em", marginBottom: 12 }}>
              DOTTORE COMMERCIALISTA · REVISORE LEGALE
            </div>
            <p style={{ fontSize: 14, color: "#aaa", lineHeight: 1.7, margin: "0 0 12px" }}>
              Iscritto all'Ordine dei Dottori Commercialisti e degli Esperti Contabili.
              Revisore Legale iscritto nel Registro MEF.
              Partner di BC & Studio Prof.le Consulenza Societaria Tributaria.
            </p>
            <p style={{ fontSize: 14, color: "#aaa", lineHeight: 1.7, margin: "0 0 16px" }}>
              Specializzato in fiscalità d'impresa, diritto societario, valutazione aziendale
              e antiriciclaggio AML. Da oltre vent'anni al fianco di PMI, startup e
              professionisti nella gestione fiscale e societaria.
            </p>
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
              <a
                href="mailto:morales@bcand.it"
                style={{ fontSize: 12, color: "#888", textDecoration: "none", fontFamily: "Arial, sans-serif" }}
              >
                morales@bcand.it
              </a>
            </div>
          </div>
        </section>

        {/* Visione */}
        <section style={{ marginBottom: 48 }}>
          <h2 style={{ fontFamily: "Georgia, serif", fontSize: 22, fontWeight: 400, color: "#0A0B0F", borderBottom: "2px solid #0A0B0F", paddingBottom: 10, marginBottom: 24 }}>
            La visione di xNunc.ai
          </h2>
          <p style={{ fontSize: 14, color: "#444", lineHeight: 1.8, marginBottom: 16 }}>
            <strong>Il problema</strong>: I commercialisti italiani gestiscono una delle normative fiscali più
            complesse al mondo. Ogni anno, nuovi adempimenti, circolari, risoluzioni e sentenze.
            Il tempo per aggiornarsi si mangia il tempo per i clienti.
          </p>
          <p style={{ fontSize: 14, color: "#444", lineHeight: 1.8, marginBottom: 16 }}>
            <strong>La soluzione</strong>: l'intelligenza artificiale può fare il lavoro di routine —
            la ricerca normativa, la compilazione di form, la prima bozza di un'analisi —
            liberando il professionista per il lavoro ad alto valore: la relazione con il cliente,
            la strategia, il giudizio professionale.
          </p>
          <p style={{ fontSize: 14, color: "#444", lineHeight: 1.8, marginBottom: 0 }}>
            <strong>La scelta open source</strong>: xNunc.ai è AGPL v3. Il codice è pubblico,
            le skill sono scaricabili, la piattaforma è gratuita. La comunità dei commercialisti
            italiani può costruire, migliorare e condividere strumenti senza dipendere da un
            vendor. <em>Ex nunc</em> — da adesso, lavori diversamente.
          </p>
        </section>

        {/* Credenziali/trust signals */}
        <section style={{ marginBottom: 48 }}>
          <h2 style={{ fontFamily: "Georgia, serif", fontSize: 22, fontWeight: 400, color: "#0A0B0F", borderBottom: "2px solid #0A0B0F", paddingBottom: 10, marginBottom: 24 }}>
            Credenziali e trasparenza
          </h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 16 }}>
            {[
              { label: "Iscrizione ODCEC", desc: "Ordine dei Dottori Commercialisti e degli Esperti Contabili — iscrizione verificabile." },
              { label: "Revisore Legale MEF", desc: "Iscritto nel Registro dei Revisori Legali tenuto dal Ministero dell'Economia e delle Finanze." },
              { label: "Open Source AGPL v3", desc: "Il codice sorgente è pubblico su GitHub. Nessun black box. Chiunque può verificare come funziona." },
              { label: "Zero data retention", desc: "I contenuti degli input non vengono mai salvati. Verificabile nel codice sorgente pubblico." },
              { label: "Server EU (Supabase)", desc: "Tutti i dati degli utenti sono ospitati su infrastruttura europea, conforme GDPR." },
              { label: "Normativa italiana verificata", desc: "Ogni skill è costruita su riferimenti normativi italiani verificati: Codice Civile, TUIR, D.Lgs 231/2007." },
            ].map((item, i) => (
              <div key={i} style={{ border: "1px solid #E8E4DC", borderRadius: 6, padding: "16px 18px", background: "#fff" }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: "#BA7517", letterSpacing: "0.08em", marginBottom: 6, textTransform: "uppercase" }}>
                  {item.label}
                </div>
                <div style={{ fontSize: 13, color: "#555", lineHeight: 1.6 }}>{item.desc}</div>
              </div>
            ))}
          </div>
        </section>

        {/* Contatti / CTA */}
        <section style={{ background: "#0A0B0F", borderRadius: 12, padding: "32px 36px" }}>
          <h2 style={{ fontFamily: "Georgia, serif", fontSize: 20, color: "#fff", marginBottom: 8, fontWeight: 400 }}>
            Vuoi contribuire a xNunc.ai?
          </h2>
          <p style={{ fontSize: 14, color: "#888", lineHeight: 1.6, marginBottom: 20 }}>
            xNunc.ai cresce grazie ai contributi della community di commercialisti italiani.
            Puoi proporre nuove skill, segnalare errori, tradurre, o semplicemente usarla
            e darci feedback dalla piattaforma.
          </p>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            <a href="/" style={{ background: "#BA7517", color: "#fff", padding: "10px 22px", borderRadius: 6, fontWeight: 700, fontSize: 13, textDecoration: "none" }}>
              Vai al catalogo →
            </a>
            <a href="/faq" style={{ background: "transparent", color: "#aaa", padding: "10px 22px", borderRadius: 6, fontSize: 13, textDecoration: "none", border: "1px solid #333" }}>
              Leggi le FAQ
            </a>
          </div>
        </section>
      </main>
    </>
  );
}
