// StaticShell.jsx — SERVER COMPONENT
// Renderizzato server-side: Google Googlebot legge questo contenuto.
// Portal.jsx si carica dopo (client hydration) per l'interfaccia interattiva.
// NON aggiungere "use client" — deve restare un Server Component.

const SKILL_LIST = [
  // Valutazione Aziendale
  { id:"WACC-001", nome:"WACC Calculator", area:"Valutazione Aziendale", sotto_area:"Costo del Capitale", desc:"Calcola il Weighted Average Cost of Capital con wizard guidato, parametri di mercato live Damodaran, formula Hamada per re-levering del beta e sensitivity analysis." },
  // Finanza Agevolata
  { id:"FA-001", nome:"Profiling cliente per bandi", area:"Finanza agevolata", sotto_area:"Scouting e verifica", desc:"Analizza i dati identificativi del cliente per costruire un profilo di ammissibilità ai principali strumenti di finanza agevolata disponibili." },
  { id:"FA-002", nome:"Verifica requisiti bando", area:"Finanza agevolata", sotto_area:"Scouting e verifica", desc:"Incrocia i dati del cliente con i requisiti di un bando specifico e produce un check pass/fail motivato per ogni requisito." },
  // Fiscale
  { id:"FISC-001", nome:"Analisi regime fiscale", area:"Fiscale", sotto_area:"Pianificazione", desc:"Valuta il regime fiscale ottimale per persone fisiche e società in base a redditi, struttura e obiettivi del cliente." },
  { id:"FISC-002", nome:"Dichiarazione dei redditi AI", area:"Fiscale", sotto_area:"Adempimenti", desc:"Supporto AI per la compilazione e verifica della dichiarazione dei redditi con riferimento alla normativa italiana vigente." },
  // Societario
  { id:"SOC-001", nome:"Analisi statuto societario", area:"Societario", sotto_area:"Governance", desc:"Analizza lo statuto di una società e identifica clausole critiche, lacune e opportunità di ottimizzazione governance." },
  // Antiriciclaggio
  { id:"AML-001", nome:"Adeguata verifica clientela", area:"Verifiche sindacali", sotto_area:"Antiriciclaggio", desc:"Guida l'adeguata verifica della clientela secondo D.Lgs 231/2007, con profiling del rischio e documentazione AML." },
  // Chiusura Bilancio
  { id:"BIL-001", nome:"Check-list chiusura bilancio", area:"Chiusura bilancio", sotto_area:"Adempimenti", desc:"Lista di controllo AI per la chiusura del bilancio d'esercizio con verifica delle principali poste contabili." },
];

export default function StaticShell() {
  // Raggruppa per area
  const byArea = {};
  for (const s of SKILL_LIST) {
    if (!byArea[s.area]) byArea[s.area] = [];
    byArea[s.area].push(s);
  }

  return (
    <div
      aria-hidden="false"
      style={{
        position: "absolute",
        width: "1px",
        height: "1px",
        overflow: "hidden",
        clip: "rect(0,0,0,0)",
        whiteSpace: "nowrap",
      }}
    >
      {/* H1 con keyword principale — letta da Google, nascosta visivamente */}
      <h1>xNunc.ai — AI per Commercialisti: Catalogo Skill Professionali</h1>
      <p>
        xNunc.ai è la piattaforma AI open-source per dottori commercialisti italiani.
        Offre un catalogo di skill professionali per WACC, fiscalità, antiriciclaggio,
        valutazione aziendale, finanza agevolata e chiusura bilancio.
        Gratuito, open source (AGPL v3), compatibile con Claude, ChatGPT, Copilot e Gemini.
      </p>
      <p>
        Utilizza l'intelligenza artificiale per automatizzare le pratiche fiscali,
        generare documenti professionali e risparmiare ore di lavoro ogni settimana.
        Costruito da commercialisti, per commercialisti italiani.
      </p>

      <h2>Cosa puoi fare con xNunc.ai</h2>
      <ul>
        <li>Automatizzare le pratiche fiscali con l'AI</li>
        <li>Calcolare il WACC con parametri di mercato live (Damodaran, Kroll)</li>
        <li>Gestire gli adempimenti antiriciclaggio (AML) con supporto AI</li>
        <li>Analizzare statuti societari e clausole contrattuali</li>
        <li>Ottimizzare la chiusura del bilancio con check-list AI</li>
        <li>Scoutare bandi di finanza agevolata per i clienti</li>
        <li>Supporto AI per dichiarazione dei redditi e contenzioso tributario</li>
      </ul>

      <h2>Skill AI disponibili per commercialisti</h2>
      {Object.entries(byArea).map(([area, skills]) => (
        <section key={area}>
          <h3>{area}</h3>
          <ul>
            {skills.map(s => (
              <li key={s.id}>
                <strong>{s.nome}</strong> ({s.sotto_area}): {s.desc}
              </li>
            ))}
          </ul>
        </section>
      ))}

      <h2>Piattaforme AI supportate</h2>
      <p>
        Le skill di xNunc.ai sono compatibili con Claude (Anthropic), ChatGPT (OpenAI),
        Microsoft Copilot e Google Gemini. Esporta le skill nel formato nativo di ogni
        piattaforma: .md per Claude, .json per OpenAI, .yaml per Copilot, .json per Gemini.
      </p>

      <h2>Chi usa xNunc.ai</h2>
      <p>
        xNunc.ai è progettato per dottori commercialisti, studi commerciali,
        professionisti fiscali e tributaristi italiani che vogliono integrare
        l'intelligenza artificiale nel lavoro quotidiano senza compromettere
        la qualità professionale e la conformità normativa.
      </p>
    </div>
  );
}
