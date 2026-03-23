export const metadata = {
  title: "Novità — xNunc.ai",
  description: "Le ultime skill aggiunte al catalogo xNunc.ai per commercialisti e professionisti. Aggiornamenti, nuove aree e strumenti AI.",
  alternates: { canonical: "https://www.xnunc.ai/novita" },
};

const AGGIORNAMENTI = [
  {
    data: "Marzo 2026",
    badge: "Nuovo",
    area: "Chiusura bilancio",
    skills: [
      { id: "BIL-015", nome: "Mapping CEE → tassonomia XBRL SP", descrizione: "Corrispondenza completa tra le voci dello Stato Patrimoniale CEE e i tag della tassonomia XBRL per il deposito al Registro Imprese." },
      { id: "BIL-016", nome: "Mapping CEE → tassonomia XBRL CE", descrizione: "Corrispondenza completa tra le voci del Conto Economico CEE e i tag della tassonomia XBRL." },
      { id: "BIL-017", nome: "Checklist pre-deposito XBRL", descrizione: "Verifica degli errori più frequenti prima del deposito del file XBRL al Registro Imprese." },
      { id: "BIL-018", nome: "Nota integrativa in formato iXBRL", descrizione: "Struttura la nota integrativa in formato iXBRL con i tag inline correttamente posizionati." },
      { id: "BIL-019", nome: "Check coerenza NI ↔ bilancio CEE", descrizione: "Verifica che tutti i valori numerici nella nota integrativa corrispondano alle voci di bilancio." },
      { id: "BIL-020", nome: "Check coerenza anno N vs anno N-1", descrizione: "Verifica la corrispondenza dei saldi comparativi tra esercizio corrente e precedente." },
      { id: "BIL-013", nome: "Sezione NI — fatti successivi alla chiusura OIC 29", descrizione: "Analisi dei fatti successivi alla data di chiusura e determinazione del trattamento contabile." },
      { id: "BIL-014", nome: "Sezione NI — strumenti finanziari derivati OIC 32", descrizione: "Redige la sezione NI relativa a IRS, cap, collar e altri derivati con disclosure completa." },
    ],
  },
  {
    data: "Febbraio 2026",
    badge: "Aggiornamento",
    area: "Chiusura bilancio",
    skills: [
      { id: "BIL-009", nome: "BdV rettificato → SP completo art. 2424 cc", descrizione: "Trasforma il bilancio di verifica post-assestamento nel formato completo dello Stato Patrimoniale civilistico." },
      { id: "BIL-010", nome: "BdV rettificato → CE scalare art. 2425 cc", descrizione: "Trasforma i conti economici del BdV nel formato scalare del Conto Economico civilistico." },
      { id: "BIL-011", nome: "NI completa — bilancio ordinario OIC", descrizione: "Redige la nota integrativa completa per il bilancio ordinario art. 2427 cc con tutte le sezioni OIC." },
      { id: "BIL-012", nome: "Sezioni critiche NI — tabelle numeriche", descrizione: "Genera le tabelle numeriche delle sezioni più critiche: movimentazione immobilizzazioni, partecipazioni, debiti." },
    ],
  },
  {
    data: "Gennaio 2026",
    badge: "Aggiornamento",
    area: "Verifiche sindacali",
    skills: [
      { id: "VS-001", nome: "Verbale assemblea approvazione bilancio", descrizione: "Genera la bozza del verbale di assemblea per l'approvazione del bilancio d'esercizio." },
      { id: "VS-002", nome: "Relazione del Collegio Sindacale", descrizione: "Struttura la relazione del collegio sindacale ex art. 2429 cc con tutti i paragrafi obbligatori." },
    ],
  },
];

const C = {
  nox: "#0A0B0F",
  aurum: "#BA7517",
  lux: "#F1EFE8",
};

export default function NovitaPage() {
  return (
    <div style={{ minHeight: "100vh", background: C.lux, fontFamily: "Arial, sans-serif" }}>
      {/* Navbar minimale */}
      <nav style={{ background: C.nox, borderBottom: "1px solid #1a1c24", padding: "0 24px", height: 54, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <a href="/" style={{ textDecoration: "none" }}>
          <span style={{ fontFamily: "Georgia, serif", fontSize: 20, fontWeight: 700 }}>
            <span style={{ color: C.aurum }}>x</span>
            <span style={{ color: "#fff" }}>Nunc</span>
          </span>
        </a>
        <a href="/" style={{ color: "#888", fontSize: 12, textDecoration: "none", fontWeight: 700, letterSpacing: "0.08em" }}>← Catalogo</a>
      </nav>

      <main style={{ maxWidth: 760, margin: "0 auto", padding: "48px 24px 80px" }}>
        {/* Header */}
        <div style={{ marginBottom: 48 }}>
          <div style={{ fontSize: 10, color: C.aurum, fontWeight: 700, letterSpacing: "0.2em", textTransform: "uppercase", marginBottom: 12 }}>AGGIORNAMENTI</div>
          <h1 style={{ fontFamily: "Georgia, serif", fontSize: 32, fontWeight: 700, color: C.nox, margin: "0 0 12px" }}>Novità</h1>
          <p style={{ fontSize: 15, color: "#666", lineHeight: 1.6, margin: 0 }}>
            Le ultime skill aggiunte al catalogo. Ogni aggiornamento porta nuovi strumenti pensati con e per i professionisti.
          </p>
        </div>

        {/* Lista aggiornamenti */}
        {AGGIORNAMENTI.map((agg, i) => (
          <div key={i} style={{ marginBottom: 56 }}>
            {/* Header aggiornamento */}
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24, paddingBottom: 12, borderBottom: `2px solid ${C.nox}` }}>
              <span style={{ fontFamily: "Georgia, serif", fontSize: 20, fontWeight: 700, color: C.nox }}>{agg.data}</span>
              <span style={{
                fontSize: 9, fontWeight: 700, letterSpacing: "0.15em", textTransform: "uppercase",
                padding: "3px 10px", borderRadius: 2,
                background: agg.badge === "Nuovo" ? C.aurum : "#1a1c24",
                color: "#fff"
              }}>{agg.badge}</span>
              <span style={{ fontSize: 11, color: "#999", marginLeft: "auto" }}>{agg.area}</span>
            </div>

            {/* Skill list */}
            <div style={{ display: "flex", flexDirection: "column", gap: 1 }}>
              {agg.skills.map((skill) => (
                <div key={skill.id} style={{
                  background: "#fff",
                  border: "1px solid #E8E4DC",
                  borderLeft: `3px solid ${C.aurum}`,
                  padding: "14px 18px",
                  borderRadius: 2,
                }}>
                  <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginBottom: 4 }}>
                    <span style={{ fontSize: 9, color: "#bbb", fontWeight: 700, letterSpacing: "0.1em", flexShrink: 0 }}>{skill.id}</span>
                    <span style={{ fontFamily: "Georgia, serif", fontSize: 15, fontWeight: 700, color: C.nox }}>{skill.nome}</span>
                  </div>
                  <p style={{ margin: 0, fontSize: 13, color: "#666", lineHeight: 1.5 }}>{skill.descrizione}</p>
                </div>
              ))}
            </div>
          </div>
        ))}

        {/* CTA */}
        <div style={{ textAlign: "center", paddingTop: 24, borderTop: "1px solid #E8E4DC" }}>
          <p style={{ fontSize: 14, color: "#888", marginBottom: 16 }}>Vuoi proporre una nuova skill o migliorarne una esistente?</p>
          <a href="/" style={{
            display: "inline-block", background: C.nox, color: C.lux,
            padding: "11px 28px", borderRadius: 2, fontSize: 11, fontWeight: 700,
            letterSpacing: "0.1em", textTransform: "uppercase", textDecoration: "none"
          }}>Vai al catalogo →</a>
        </div>
      </main>
    </div>
  );
}
