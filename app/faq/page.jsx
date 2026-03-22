// app/faq/page.jsx — SERVER COMPONENT
// Pagina FAQ con schema FAQPage per Google AI Overview e AEO.
// Ogni domanda è ottimizzata per apparire come risposta diretta nei risultati AI.

export const metadata = {
  title: "FAQ — Domande Frequenti su xNunc.ai",
  description:
    "Risposte alle domande più comuni su xNunc.ai: privacy, sicurezza dei dati, come funziona l'AI per commercialisti, BYOK, compatibilità con Claude e ChatGPT.",
  alternates: {
    canonical: "https://www.xnunc.ai/faq",
  },
  openGraph: {
    title: "FAQ — xNunc.ai: AI per Commercialisti",
    description:
      "Tutto quello che vuoi sapere su xNunc.ai: privacy, sicurezza, funzionamento, integrazione AI e use case per commercialisti italiani.",
    url: "https://www.xnunc.ai/faq",
  },
};

const faqs = [
  {
    category: "Cos'è xNunc.ai",
    items: [
      {
        q: "Cos'è xNunc.ai e come funziona?",
        a: "xNunc.ai è una piattaforma AI open-source per dottori commercialisti italiani. Offre un catalogo di skill professionali — istruzioni strutturate per i modelli AI — che automatizzano attività fiscali, tributarie, societarie e di valutazione aziendale. Funziona su qualsiasi AI (Claude, ChatGPT, Copilot, Gemini): scegli la skill, inserisci i dati del cliente, ottieni un output professionale.",
      },
      {
        q: "xNunc.ai è gratuito?",
        a: "Sì, xNunc.ai è completamente gratuito e open source (licenza AGPL v3). Il codice sorgente è pubblico su GitHub. Non ci sono piani a pagamento né funzionalità premium bloccate.",
      },
      {
        q: "Qual è la differenza tra xNunc.ai e un normale software gestionale?",
        a: "Un software gestionale gestisce dati e processi (contabilità, fatturazione, archivio). xNunc.ai aggiunge il ragionamento AI: non registra dati, ma elabora situazioni professionali complesse e produce analisi, documenti e verifiche che normalmente richiederebbero ore di lavoro manuale.",
      },
      {
        q: "Posso usare xNunc.ai con il mio software gestionale?",
        a: "xNunc.ai non si integra direttamente con i gestionali, ma è complementare. Esporti i dati dal gestionale, li incolli nel campo input della skill e ottieni l'output AI. In futuro sono previste integrazioni con TeamSystem, Zucchetti e Datev.",
      },
    ],
  },
  {
    category: "Privacy e sicurezza dei dati",
    items: [
      {
        q: "I dati dei miei clienti sono al sicuro?",
        a: "Sì. xNunc.ai non salva mai il contenuto degli input. I dati del cliente transitano nei server xNunc solo durante la chiamata API (pochi secondi) e non vengono memorizzati. Nel database vengono salvati solo metadati anonimi: quale skill è stata usata, quando, e quanti token ha consumato la risposta. Nessun contenuto professionale.",
      },
      {
        q: "xNunc.ai è conforme al GDPR?",
        a: "Sì. I punti principali: nessun contenuto degli input viene salvato; puoi richiedere la cancellazione del tuo account e di tutti i dati personali; puoi esportare i tuoi dati; il consenso alla registrazione è esplicito; i dati sono ospitati su Supabase (server EU).",
      },
      {
        q: "Cos'è la modalità BYOK?",
        a: "BYOK (Bring Your Own Key) significa usare la tua API key Anthropic invece di quella di xNunc. La imposti una volta nelle impostazioni del profilo. Da quel momento ogni skill usa il tuo account Anthropic — i dati non passano per le credenziali della piattaforma. Anthropic ha policy di zero data retention per i piani API.",
      },
      {
        q: "Dove finisce quello che scrivo nel campo input?",
        a: "L'input viene inviato al server xNunc, che lo passa all'API AI e restituisce la risposta. Finita la chiamata HTTP, l'input viene scartato dalla memoria. Non viene salvato nessun contenuto, solo i metadati anonimi della chiamata.",
      },
    ],
  },
  {
    category: "Skill e funzionalità",
    items: [
      {
        q: "Quante skill sono disponibili su xNunc.ai?",
        a: "Il catalogo attuale conta oltre 100 skill professionali, organizzate in aree: Fiscale, Societario, Finanza agevolata, Valutazione aziendale, Beni strumentali, Verifiche sindacali e Chiusura bilancio. Il catalogo cresce con contributi della community.",
      },
      {
        q: "Posso creare skill personalizzate?",
        a: "Sì. Ogni utente registrato può creare skill private o proporne di nuove al catalogo pubblico tramite il wizard guidato. Le skill proposte vengono revisionate dalla redazione xNunc prima della pubblicazione.",
      },
      {
        q: "Le skill funzionano con qualsiasi modello AI?",
        a: "Sì. Le skill sono esportabili in formato .md per Claude (Anthropic), .json per ChatGPT/OpenAI, .yaml per Microsoft Copilot e .json per Google Gemini. Funzionano anche con altri modelli compatibili con system prompt.",
      },
      {
        q: "L'AI di xNunc.ai può commettere errori fiscali?",
        a: "Come qualsiasi strumento AI, può commettere errori. xNunc.ai è uno strumento di supporto professionale, non un sostituto del ragionamento del commercialista. L'output AI deve sempre essere verificato dal professionista prima di essere usato con i clienti. Le skill sono costruite su normativa italiana verificata, ma la responsabilità professionale rimane sempre del commercialista.",
      },
    ],
  },
  {
    category: "Accesso e account",
    items: [
      {
        q: "Come mi registro su xNunc.ai?",
        a: "Clicca su 'Registrati gratis' nella homepage. Inserisci email e password. Riceverai una email di conferma. Dopo la verifica, hai accesso completo al catalogo, ai preferiti, alla messaggistica e alla creazione di skill.",
      },
      {
        q: "Quanto tempo ci vuole per iniziare a usare xNunc.ai?",
        a: "Meno di 5 minuti. Registrazione, verifica email, accesso al catalogo. Le skill più semplici sono pronte all'uso immediatamente. Per le skill più avanzate (come WACC Calculator) è consigliata una lettura veloce della documentazione.",
      },
      {
        q: "xNunc.ai è adatto al mio studio commerciale?",
        a: "xNunc.ai è adatto a qualsiasi studio commerciale, dalla libera professione individuale alle grandi strutture. Non richiede competenze tecniche: se sai usare ChatGPT o Claude, sai usare xNunc.ai. Le skill sono calibrate sulla normativa italiana e sul lavoro quotidiano del commercialista.",
      },
    ],
  },
];

// Schema FAQPage per Google AI Overview e rich results
const faqSchema = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: faqs
    .flatMap((cat) => cat.items)
    .map((faq) => ({
      "@type": "Question",
      name: faq.q,
      acceptedAnswer: {
        "@type": "Answer",
        text: faq.a,
      },
    })),
};

// Schema BreadcrumbList
const breadcrumbSchema = {
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  itemListElement: [
    { "@type": "ListItem", position: 1, name: "Home", item: "https://www.xnunc.ai" },
    { "@type": "ListItem", position: 2, name: "FAQ", item: "https://www.xnunc.ai/faq" },
  ],
};

export default function FAQPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
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
          <a href="/" style={{ color: "#888", textDecoration: "none" }}>
            xNunc.ai
          </a>
          <span style={{ margin: "0 6px" }}>›</span>
          <span style={{ color: "#BA7517", fontWeight: 700 }}>FAQ</span>
        </nav>

        {/* Hero */}
        <div style={{ marginBottom: 48 }}>
          <div
            style={{
              fontSize: 9,
              fontWeight: 700,
              color: "#BA7517",
              letterSpacing: "0.2em",
              marginBottom: 12,
              textTransform: "uppercase",
            }}
          >
            DOMANDE FREQUENTI
          </div>
          <h1
            style={{
              fontFamily: "Georgia, serif",
              fontSize: 32,
              fontWeight: 400,
              color: "#0A0B0F",
              marginBottom: 16,
              lineHeight: 1.3,
            }}
          >
            Tutto quello che vuoi sapere su xNunc.ai
          </h1>
          <p
            style={{
              fontSize: 15,
              color: "#555",
              lineHeight: 1.7,
              maxWidth: 620,
              margin: 0,
            }}
          >
            Privacy, sicurezza, funzionamento, skill disponibili e come iniziare.
            Non trovi la risposta?{" "}
            <a href="/" style={{ color: "#BA7517" }}>
              Scrivici dalla piattaforma
            </a>
            .
          </p>
        </div>

        {/* FAQ Sections */}
        {faqs.map((section, si) => (
          <section key={si} style={{ marginBottom: 48 }}>
            <h2
              style={{
                fontFamily: "Georgia, serif",
                fontSize: 20,
                fontWeight: 400,
                color: "#0A0B0F",
                borderBottom: "2px solid #0A0B0F",
                paddingBottom: 10,
                marginBottom: 24,
              }}
            >
              {section.category}
            </h2>
            <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
              {section.items.map((faq, fi) => (
                <details
                  key={fi}
                  style={{
                    border: "1px solid #E8E4DC",
                    borderRadius: 4,
                    overflow: "hidden",
                    background: "#fff",
                  }}
                >
                  <summary
                    style={{
                      padding: "14px 18px",
                      cursor: "pointer",
                      fontFamily: "Arial, sans-serif",
                      fontSize: 14,
                      fontWeight: 600,
                      color: "#0A0B0F",
                      listStyle: "none",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      userSelect: "none",
                    }}
                  >
                    {faq.q}
                    <span
                      style={{
                        fontSize: 18,
                        color: "#BA7517",
                        flexShrink: 0,
                        marginLeft: 12,
                      }}
                    >
                      ▾
                    </span>
                  </summary>
                  <div
                    style={{
                      padding: "0 18px 16px",
                      fontSize: 14,
                      color: "#444",
                      lineHeight: 1.75,
                      borderTop: "1px solid #F0ECE4",
                      marginTop: 0,
                      paddingTop: 14,
                      fontFamily: "Arial, sans-serif",
                    }}
                  >
                    {faq.a}
                  </div>
                </details>
              ))}
            </div>
          </section>
        ))}

        {/* CTA */}
        <div
          style={{
            background: "#0A0B0F",
            borderRadius: 12,
            padding: "32px 36px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 24,
            flexWrap: "wrap",
          }}
        >
          <div>
            <div
              style={{
                fontFamily: "Georgia, serif",
                fontSize: 20,
                color: "#fff",
                marginBottom: 6,
              }}
            >
              Pronto a usare l'AI nel tuo studio?
            </div>
            <div style={{ fontSize: 13, color: "#888" }}>
              100+ skill professionali. Gratis. Open source.
            </div>
          </div>
          <a
            href="/"
            style={{
              background: "#BA7517",
              color: "#fff",
              padding: "11px 24px",
              borderRadius: 8,
              fontWeight: 700,
              fontSize: 14,
              textDecoration: "none",
              fontFamily: "Arial, sans-serif",
              whiteSpace: "nowrap",
            }}
          >
            Vai al catalogo →
          </a>
        </div>
      </main>
    </>
  );
}
