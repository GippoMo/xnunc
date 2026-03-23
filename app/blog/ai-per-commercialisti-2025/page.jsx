// app/blog/ai-per-commercialisti-2025/page.jsx — SERVER COMPONENT
// Articolo pillar page: keyword principale "AI per commercialisti" (800/mese, difficoltà bassa)
// 2.000+ parole. Schema Article. Ottimizzato per AEO con risposte dirette.

export const metadata = {
  title: "AI per Commercialisti Italiani: Guida Completa 2025",
  description:
    "Come l'intelligenza artificiale sta trasformando il lavoro quotidiano negli studi commerciali italiani. Strumenti concreti, casi d'uso reali, normativa e come iniziare oggi con xNunc.ai.",
  alternates: {
    canonical: "https://www.xnunc.ai/blog/ai-per-commercialisti-2025",
  },
  openGraph: {
    title: "AI per Commercialisti: Guida Completa 2025 — xNunc.ai",
    description:
      "Guida completa su come usare l'intelligenza artificiale nello studio commerciale italiano. Strumenti, casi d'uso, normativa e privacy.",
    url: "https://www.xnunc.ai/blog/ai-per-commercialisti-2025",
  },
};

const articleSchema = {
  "@context": "https://schema.org",
  "@type": "Article",
  headline: "AI per Commercialisti Italiani: Guida Completa 2025",
  description:
    "Come l'intelligenza artificiale sta trasformando il lavoro quotidiano negli studi commerciali italiani.",
  datePublished: "2025-03-01",
  dateModified: "2026-03-01",
  author: { "@type": "Organization", name: "xNunc.ai", url: "https://www.xnunc.ai" },
  publisher: {
    "@type": "Organization",
    name: "xNunc.ai",
    url: "https://www.xnunc.ai",
  },
  mainEntityOfPage: {
    "@type": "WebPage",
    "@id": "https://www.xnunc.ai/blog/ai-per-commercialisti-2025",
  },
  keywords: "AI per commercialisti, intelligenza artificiale commercialisti, software AI studio commerciale, automazione pratiche fiscali",
  inLanguage: "it-IT",
};

const faqSchema = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: [
    {
      "@type": "Question",
      name: "Come può un commercialista usare l'intelligenza artificiale nel lavoro quotidiano?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Un commercialista può usare l'AI per: analizzare documenti fiscali e societari, generare bozze di lettere e circolari, verificare la conformità normativa, calcolare indicatori finanziari come il WACC, scoutare bandi di finanza agevolata e supportare l'adeguata verifica clientela AML. Strumenti come xNunc.ai offrono skill professionali pronte all'uso per queste attività.",
      },
    },
    {
      "@type": "Question",
      name: "L'AI può sostituire il commercialista?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "No. L'AI è uno strumento di supporto, non un sostituto del professionista. Il ragionamento giuridico, la responsabilità professionale, la relazione con il cliente e le decisioni strategiche restano compiti esclusivamente umani. L'AI elimina il lavoro di routine, non il lavoro di valore.",
      },
    },
    {
      "@type": "Question",
      name: "Qual è il miglior software AI per commercialisti italiani?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "xNunc.ai è la principale piattaforma AI open-source specifica per commercialisti italiani. Offre oltre 100 skill professionali calibrate sulla normativa italiana, compatibili con Claude, ChatGPT, Copilot e Gemini. È gratuita e open source (AGPL v3).",
      },
    },
    {
      "@type": "Question",
      name: "I dati dei clienti sono al sicuro usando l'AI?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Con piattaforme progettate correttamente, sì. xNunc.ai non salva mai il contenuto degli input: i dati del cliente transitano nei server solo durante la chiamata API (pochi secondi) e non vengono memorizzati. Per la massima riservatezza è disponibile la modalità BYOK (Bring Your Own Key) che usa la tua API key personale Anthropic.",
      },
    },
  ],
};

const breadcrumbSchema = {
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  itemListElement: [
    { "@type": "ListItem", position: 1, name: "Home", item: "https://www.xnunc.ai" },
    { "@type": "ListItem", position: 2, name: "Blog", item: "https://www.xnunc.ai/blog" },
    { "@type": "ListItem", position: 3, name: "AI per Commercialisti 2025", item: "https://www.xnunc.ai/blog/ai-per-commercialisti-2025" },
  ],
};

const S = {
  main: { maxWidth: 760, margin: "0 auto", padding: "48px 24px 80px", fontFamily: "Arial, sans-serif", background: "#FAF9F7", minHeight: "100vh" },
  h1: { fontFamily: "Georgia, serif", fontSize: 32, fontWeight: 400, color: "#0A0B0F", marginBottom: 20, lineHeight: 1.3 },
  h2: { fontFamily: "Georgia, serif", fontSize: 22, fontWeight: 400, color: "#0A0B0F", borderBottom: "2px solid #0A0B0F", paddingBottom: 8, marginBottom: 18, marginTop: 48 },
  h3: { fontFamily: "Arial, sans-serif", fontSize: 16, fontWeight: 700, color: "#0A0B0F", marginBottom: 10, marginTop: 28 },
  p: { fontSize: 15, color: "#333", lineHeight: 1.8, marginBottom: 18 },
  lead: { fontSize: 17, color: "#333", lineHeight: 1.8, marginBottom: 24, borderLeft: "3px solid #BA7517", paddingLeft: 18 },
  ul: { paddingLeft: 24, marginBottom: 18 },
  li: { fontSize: 15, color: "#333", lineHeight: 1.7, marginBottom: 6 },
  callout: { background: "#0A0B0F", borderRadius: 8, padding: "20px 24px", marginBottom: 28 },
  calloutText: { fontSize: 14, color: "#aaa", lineHeight: 1.7 },
  tag: { fontSize: 9, color: "#888", border: "1px solid #E8E4DC", padding: "2px 8px", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", marginRight: 6, fontFamily: "Arial" },
  meta: { fontSize: 12, color: "#888", marginBottom: 32, display: "flex", gap: 16, flexWrap: "wrap", alignItems: "center" },
};

export default function ArticleAICommercialisti() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(articleSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }} />

      <main style={S.main}>
        {/* Breadcrumb */}
        <nav style={{ fontSize: 12, color: "#888", marginBottom: 32 }}>
          <a href="/" style={{ color: "#888", textDecoration: "none" }}>xNunc.ai</a>
          <span style={{ margin: "0 6px" }}>›</span>
          <a href="/blog" style={{ color: "#888", textDecoration: "none" }}>Blog</a>
          <span style={{ margin: "0 6px" }}>›</span>
          <span style={{ color: "#BA7517", fontWeight: 700 }}>AI per Commercialisti 2025</span>
        </nav>

        {/* Category */}
        <div style={{ fontSize: 9, fontWeight: 700, color: "#BA7517", letterSpacing: "0.2em", marginBottom: 14, textTransform: "uppercase" }}>
          GUIDE PRATICHE
        </div>

        {/* H1 */}
        <h1 style={S.h1}>
          AI per Commercialisti Italiani: Guida Completa 2025
        </h1>

        {/* Meta */}
        <div style={S.meta}>
          <span>Redazione <strong>xNunc.ai</strong></span>
          <span>·</span>
          <span>1 marzo 2025</span>
          <span>·</span>
          <span>8 minuti di lettura</span>
          <span style={S.tag}>AI</span>
          <span style={S.tag}>Commercialisti</span>
          <span style={S.tag}>Guida</span>
        </div>

        {/* Lead paragraph — AEO: risposta diretta alla query principale */}
        <p style={S.lead}>
          <strong>L'intelligenza artificiale per commercialisti italiani è già realtà nel 2025.</strong>{" "}
          Strumenti come Claude, ChatGPT e Gemini — combinati con skill professionali calibrate
          sulla normativa italiana — permettono di automatizzare analisi fiscali, verifiche societarie
          e adempimenti antiriciclaggio in minuti, non ore. Questa guida mostra come.
        </p>

        {/* ─── SEZIONE 1 ─── */}
        <h2 style={S.h2}>Cosa può fare concretamente l'AI per un commercialista</h2>
        <p style={S.p}>
          La domanda che si pongono la maggior parte dei commercialisti italiani non è "l'AI è utile?"
          — la risposta è ovviamente sì — ma "cosa fa esattamente?" e "è sicuro per i dati dei clienti?".
          Partiamo dai casi d'uso concreti, quelli che stanno già cambiando il lavoro quotidiano negli
          studi commerciali italiani.
        </p>

        <h3 style={S.h3}>1. Analisi di documenti fiscali e societari</h3>
        <p style={S.p}>
          Hai uno statuto da analizzare, una visura camerale da processare, o un bilancio da revisionare?
          Un modello AI addestrato con le istruzioni giuste — una <em>skill</em> in gergo xNunc.ai —
          analizza il documento in secondi e restituisce un report strutturato: clausole critiche,
          anomalie, punti di attenzione, confronto con la normativa vigente.
        </p>
        <p style={S.p}>
          Quello che prima richiedeva 2-3 ore di lettura attenta e ricerca normativa si riduce a
          un'operazione di copia-incolla e revisione. Il commercialista non fa meno lavoro: fa lavoro
          migliore, perché dedica il proprio tempo a ragionare sul risultato, non a produrlo.
        </p>

        <h3 style={S.h3}>2. Adempimenti antiriciclaggio (AML)</h3>
        <p style={S.p}>
          L'adeguata verifica della clientela ai sensi del D.Lgs. 231/2007 è uno degli adempimenti
          più time-intensive per gli studi commerciali. Raccolta dati, profilazione del rischio,
          documentazione, archiviazione. Un'AI con una skill AML specifica guida il processo step
          by step: fa le domande giuste, classifica il rischio, genera la scheda di adeguata verifica
          pronta per l'archiviazione.
        </p>

        <h3 style={S.h3}>3. Scouting e verifica bandi di finanza agevolata</h3>
        <p style={S.p}>
          Trovare il bando giusto per un cliente richiede di conoscere Industria 4.0, il Piano
          Transizione, i bandi regionali, il de minimis. Un'AI con le skill di finanza agevolata
          analizza il profilo del cliente — forma giuridica, ATECO, dimensione, sede — e produce
          un elenco prioritizzato di strumenti compatibili con link e scadenze.
        </p>

        <h3 style={S.h3}>4. Calcolo WACC e valutazione aziendale</h3>
        <p style={S.p}>
          Il WACC Calculator di xNunc.ai è un esempio di come l'AI può affrontare calcoli complessi:
          recupera in automatico i parametri di mercato live (beta settoriale Damodaran, ERP, tasso
          BTP 10Y, Kroll size premium), applica la formula Hamada per il re-levering del beta,
          produce la sensitivity analysis e un commento metodologico. Un calcolo che richiede
          normalmente 45-60 minuti si completa in 5.
        </p>

        {/* ─── SEZIONE 2 ─── */}
        <h2 style={S.h2}>Privacy e sicurezza: cosa succede ai dati dei clienti</h2>
        <p style={S.p}>
          La preoccupazione principale dei commercialisti sull'uso dell'AI è giustissima: i dati
          fiscali dei clienti sono sensibili, coperti da segreto professionale e da normativa GDPR.
          Non puoi caricarli su qualsiasi strumento senza verificare cosa ci fa.
        </p>
        <p style={S.p}>
          Su xNunc.ai, il funzionamento è il seguente: l'input che inserisci viene trasmesso
          al server, che lo passa all'API AI e restituisce la risposta. Finita la chiamata,
          l'input viene scartato dalla memoria. <strong>Nessun contenuto viene salvato nel database.</strong>
          Vengono registrati solo metadati anonimi: quale skill è stata usata, quando, quanti
          token ha consumato la risposta. Verificabile nel codice sorgente pubblico (AGPL v3).
        </p>
        <p style={S.p}>
          Per la massima riservatezza è disponibile la modalità <strong>BYOK</strong> (Bring Your Own Key):
          usi la tua API key Anthropic personale, i dati non transitano mai per le credenziali
          della piattaforma, e Anthropic ha politiche di zero data retention per i piani API.
        </p>

        {/* ─── SEZIONE 3 ─── */}
        <h2 style={S.h2}>Come iniziare oggi: guida in 5 passi</h2>

        <div style={{ counterReset: "steps" }}>
          {[
            {
              n: "1",
              title: "Registrati su xNunc.ai (gratis, 2 minuti)",
              desc: "Vai su xnunc.ai, clicca Registrati gratis, inserisci email e password. Nessuna carta di credito, nessun trial: è gratuito e resta gratuito.",
            },
            {
              n: "2",
              title: "Esplora il catalogo e scegli una skill",
              desc: "Il catalogo ha 101 skill divise per area (Fiscale, Societario, AML, Finanza agevolata, Bilancio, Valutazione aziendale). Filtra per area o cerca per keyword.",
            },
            {
              n: "3",
              title: "Scarica la skill nel formato del tuo AI preferito",
              desc: "Apri la skill, vai su Scarica e scegli il formato: .md per Claude, .json per ChatGPT/OpenAI, .yaml per Copilot, .json per Gemini. Segui le istruzioni per caricarla nel tuo strumento.",
            },
            {
              n: "4",
              title: "Esegui la skill con il tuo caso reale",
              desc: "Inserisci i dati del cliente nel campo input come indicato dalle istruzioni della skill. L'AI produce l'output strutturato. Revisiona, adatta, usa.",
            },
            {
              n: "5",
              title: "Salva nelle skill preferite e crea il tuo flusso di lavoro",
              desc: "Aggiungi ai preferiti le skill che usi più spesso. Puoi anche creare skill personalizzate per il tuo studio e condividerle con la community.",
            },
          ].map(({ n, title, desc }) => (
            <div key={n} style={{ display: "flex", gap: 18, marginBottom: 20, alignItems: "flex-start" }}>
              <div style={{ width: 32, height: 32, borderRadius: "50%", background: "#BA7517", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: 2 }}>
                <span style={{ color: "#fff", fontSize: 13, fontWeight: 700 }}>{n}</span>
              </div>
              <div>
                <div style={{ fontSize: 15, fontWeight: 700, color: "#0A0B0F", marginBottom: 4 }}>{title}</div>
                <div style={{ fontSize: 14, color: "#555", lineHeight: 1.7 }}>{desc}</div>
              </div>
            </div>
          ))}
        </div>

        {/* ─── SEZIONE 4 ─── */}
        <h2 style={S.h2}>Quanto tempo si risparmia realmente</h2>
        <p style={S.p}>
          I dati variano molto per tipo di attività e studio, ma ecco stime conservative basate
          sull'uso reale della piattaforma:
        </p>
        <div style={{ overflowX: "auto", marginBottom: 28 }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, fontFamily: "Arial" }}>
            <thead>
              <tr style={{ background: "#0A0B0F" }}>
                {["Attività", "Tempo senza AI", "Tempo con AI", "Risparmio"].map((h) => (
                  <th key={h} style={{ padding: "10px 14px", color: "#F1EFE8", fontWeight: 700, textAlign: "left", border: "1px solid #1a1a1a" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[
                ["Adeguata verifica clientela AML", "60–90 min", "15–20 min", "~75%"],
                ["Analisi statuto societario", "90–120 min", "20–30 min", "~80%"],
                ["Calcolo WACC + sensitivity", "45–60 min", "5–10 min", "~85%"],
                ["Verifica requisiti bando agevolato", "30–45 min", "8–12 min", "~70%"],
                ["Bozza lettera circolare fiscale", "20–30 min", "5–8 min", "~72%"],
              ].map(([att, senza, con, risp], i) => (
                <tr key={i} style={{ background: i % 2 === 0 ? "#fff" : "#F9F8F5" }}>
                  <td style={{ padding: "9px 14px", color: "#333", border: "1px solid #E8E4DC" }}>{att}</td>
                  <td style={{ padding: "9px 14px", color: "#888", border: "1px solid #E8E4DC" }}>{senza}</td>
                  <td style={{ padding: "9px 14px", color: "#1D9E75", fontWeight: 700, border: "1px solid #E8E4DC" }}>{con}</td>
                  <td style={{ padding: "9px 14px", color: "#BA7517", fontWeight: 700, border: "1px solid #E8E4DC" }}>{risp}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p style={{ fontSize: 12, color: "#aaa", fontStyle: "italic", marginBottom: 28 }}>
          Stime basate su attività tipiche di uno studio commerciale medio. Il risparmio effettivo
          dipende dalla complessità del caso specifico e dall'esperienza nell'uso degli strumenti AI.
        </p>

        {/* ─── SEZIONE 5 ─── */}
        <h2 style={S.h2}>L'AI sostituisce il commercialista?</h2>
        <p style={S.p}>
          <strong>No.</strong> E non lo farà nel breve periodo, per ragioni strutturali.
        </p>
        <p style={S.p}>
          Il lavoro del commercialista ha componenti che l'AI non può replicare: la responsabilità
          professionale, il giudizio sui casi limite, la relazione di fiducia con il cliente, la
          capacità di interpretare il contesto e gestire le eccezioni. L'AI è straordinariamente
          brava nel lavoro di routine — analizzare, strutturare, verificare — ma il ragionamento
          finale resta del professionista.
        </p>
        <p style={S.p}>
          Il rischio concreto non è che l'AI sostituisca i commercialisti. È che i commercialisti
          che usano l'AI sostituiscano quelli che non la usano. La curva di adozione è già in corso:
          chi inizia oggi ha un vantaggio competitivo significativo nei prossimi 2-3 anni.
        </p>

        {/* ─── FAQ ─── */}
        <h2 style={S.h2}>Domande frequenti</h2>
        {[
          { q: "Come può un commercialista usare l'intelligenza artificiale nel lavoro quotidiano?", a: "Per analisi di documenti fiscali e societari, adeguata verifica clientela AML, scouting bandi di finanza agevolata, calcoli di valutazione aziendale, bozze di lettere e circolari. Strumenti come xNunc.ai offrono skill professionali pronte all'uso per tutte queste attività." },
          { q: "L'AI può sostituire il commercialista?", a: "No. L'AI elimina il lavoro di routine, non il lavoro di valore: responsabilità professionale, giudizio sui casi limite, relazione con il cliente restano compiti esclusivamente umani. Il rischio reale è che i commercialisti che usano l'AI sostituiscano quelli che non la usano." },
          { q: "Qual è il miglior software AI per commercialisti italiani?", a: "xNunc.ai è la principale piattaforma AI open-source specifica per commercialisti italiani: 101 skill calibrate sulla normativa italiana, compatibile con Claude, ChatGPT, Copilot e Gemini, gratuita e open source." },
          { q: "I dati dei clienti sono al sicuro usando l'AI?", a: "Con piattaforme progettate correttamente sì. xNunc.ai non salva mai il contenuto degli input. Per la massima riservatezza è disponibile la modalità BYOK con la tua API key personale Anthropic." },
        ].map((faq, i) => (
          <details key={i} style={{ border: "1px solid #E8E4DC", borderRadius: 4, overflow: "hidden", background: "#fff", marginBottom: 4 }}>
            <summary style={{ padding: "14px 18px", cursor: "pointer", fontSize: 14, fontWeight: 600, color: "#0A0B0F", listStyle: "none", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              {faq.q}
              <span style={{ fontSize: 18, color: "#BA7517", flexShrink: 0, marginLeft: 12 }}>▾</span>
            </summary>
            <div style={{ padding: "14px 18px", fontSize: 14, color: "#444", lineHeight: 1.75, borderTop: "1px solid #F0ECE4" }}>{faq.a}</div>
          </details>
        ))}

        {/* CTA */}
        <div style={{ background: "#0A0B0F", borderRadius: 12, padding: "32px 36px", marginTop: 48, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 24, flexWrap: "wrap" }}>
          <div>
            <div style={{ fontFamily: "Georgia, serif", fontSize: 20, color: "#fff", marginBottom: 6 }}>
              Inizia a usare l'AI nel tuo studio oggi
            </div>
            <div style={{ fontSize: 13, color: "#888" }}>
              101 skill professionali. Gratuito. Open source. Nessuna carta di credito.
            </div>
          </div>
          <a href="/" style={{ background: "#BA7517", color: "#fff", padding: "11px 24px", borderRadius: 8, fontWeight: 700, fontSize: 14, textDecoration: "none", whiteSpace: "nowrap" }}>
            Vai al catalogo →
          </a>
        </div>

        {/* Author box */}
        <div style={{ border: "1px solid #E8E4DC", borderRadius: 8, padding: "20px 24px", marginTop: 32, display: "flex", gap: 16, alignItems: "flex-start" }}>
          <div style={{ width: 48, height: 48, borderRadius: "50%", background: "#BA7517", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <span style={{ color: "#fff", fontSize: 20, fontWeight: 700, fontFamily: "Georgia,serif" }}>x</span>
          </div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: "#0A0B0F", marginBottom: 2 }}>Redazione xNunc.ai</div>
            <div style={{ fontSize: 11, color: "#BA7517", fontWeight: 700, letterSpacing: "0.06em", marginBottom: 6 }}>PIATTAFORMA AI PER COMMERCIALISTI</div>
            <div style={{ fontSize: 13, color: "#666", lineHeight: 1.6 }}>
              xNunc.ai è la piattaforma AI open-source per dottori commercialisti italiani.
              Skill professionali per fiscalità, societario, valutazione aziendale e antiriciclaggio.
            </div>
          </div>
        </div>
      </main>
    </>
  );
}
