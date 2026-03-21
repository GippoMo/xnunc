"use client";
import { useState, useMemo, useEffect, useRef, useCallback } from "react";
import { supabase, signIn, signUp, signOut, resetPassword, getProfile, upsertProfile, logAiCall } from "../lib/supabase";

// ─────────────────────────────────────────────────────
// xNunc brand palette
// ─────────────────────────────────────────────────────
const C = {
  nox:"#0A0B0F", aurum:"#BA7517", viridis:"#1D9E75",
  purpura:"#7F77DD", caelum:"#378ADD", lux:"#F1EFE8", gray:"#888888",
};
const AREA_COLOR = {
  "Finanza agevolata":C.aurum,"Beni strumentali":C.caelum,
  "Societario":C.purpura,"Fiscale":C.viridis,
  "Verifiche sindacali":"#C97A5A","Chiusura bilancio":"#3DA89C",
  "Valutazione Aziendale":"#5B9DD4",
};
const AREA_BG = {
  "Finanza agevolata":"#FDF3E3","Beni strumentali":"#E3EEF9",
  "Societario":"#EEEDF9","Fiscale":"#E3F7F0",
  "Verifiche sindacali":"#F9EDE7","Chiusura bilancio":"#E4F5F3",
  "Valutazione Aziendale":"#EBF2FD",
};
const COMP_COLOR={alta:"#C0392B",media:C.aurum,bassa:C.viridis};
const FREQ_COLOR={ricorrente:C.viridis,occasionale:C.gray};

// ─────────────────────────────────────────────────────
// Platform SVG logos
// ─────────────────────────────────────────────────────
const LOGO_URLS={
  claude:  "https://www.google.com/s2/favicons?domain=claude.ai&sz=64",
  openai:  "https://www.google.com/s2/favicons?domain=openai.com&sz=64",
  copilot: "https://www.google.com/s2/favicons?domain=copilot.microsoft.com&sz=64",
  gemini:  "https://www.google.com/s2/favicons?domain=gemini.google.com&sz=64",
};
const PlatformLogo=({id,size=22})=>(
  <img
    src={LOGO_URLS[id]}
    alt={id}
    width={size} height={size}
    style={{borderRadius:6,display:"block",objectFit:"contain"}}
    onError={e=>{e.target.style.display="none";}}
  />
);
const PLATFORM_LOGOS={
  claude: <PlatformLogo id="claude"/>,
  openai: <PlatformLogo id="openai"/>,
  copilot:<PlatformLogo id="copilot"/>,
  gemini: <PlatformLogo id="gemini"/>,
};

const PLATFORMS = [
  { id:"claude",  label:"Claude",  sub:"Anthropic",        color:"#D97757", bg:"#FDF3EE",
    ext:"md",   mime:"text/markdown",
    desc:"Per Claude Projects (istruzioni) o Claude API",
    howto:[
      "Apri Claude.ai → scegli o crea un Progetto",
      "Vai su 'Istruzioni del progetto' e incolla il contenuto del file .md",
      "In alternativa, passa il contenuto come system prompt nell'API Anthropic"
    ]},
  { id:"openai",  label:"OpenAI",  sub:"GPT-4o / ChatGPT", color:"#10A37F", bg:"#E8F8F2",
    ext:"json", mime:"application/json",
    desc:"Per Custom GPTs o Assistants API",
    howto:[
      "Per Custom GPT: vai su chatgpt.com/gpts/editor → incolla il campo 'instructions' nel form",
      "Per Assistants API: usa il campo 'instructions' del JSON nella chiamata POST /assistants",
      "Modello consigliato: gpt-4o (già indicato nel file)"
    ]},
  { id:"copilot", label:"Copilot", sub:"Microsoft",         color:"#0078D4", bg:"#E3F0FB",
    ext:"yaml", mime:"text/yaml",
    desc:"Per Copilot Studio o Microsoft Teams",
    howto:[
      "Apri Copilot Studio (copilotstudio.microsoft.com)",
      "Crea un nuovo agent → incolla il campo 'instructions' nella sezione Topic",
      "Per Teams: usa Power Virtual Agents e importa il YAML come base"
    ]},
  { id:"gemini",  label:"Gemini",  sub:"Google",            color:"#1A73E8", bg:"#EBF2FE",
    ext:"json", mime:"application/json",
    desc:"Per Gemini API o Gemini Advanced",
    howto:[
      "Per Gemini API: usa il campo 'system_instruction.parts[0].text' nella chiamata",
      "Per Gemini Advanced: crea un Gem personalizzato e incolla le istruzioni",
      "Modello consigliato: gemini-1.5-pro (già nel file)"
    ]},
];

// ─────────────────────────────────────────────────────
// Format converters
// ─────────────────────────────────────────────────────
function toClaudeFormat(skills) {
  return skills.map(s => {
    const sp = PROMPTS[s.id]||"[system prompt non disponibile]";
    return `# ${s.nome}\n\n**Area:** ${s.area} › ${s.sotto_area}  \n**ID:** ${s.id} · v1.0 · Complessità: ${s.complessita} · Frequenza: ${s.frequenza}\n\n---\n\n## Istruzioni di sistema\n\n${sp}\n\n---\n\n## Input atteso\n${s.input_atteso}\n\n## Output atteso\n${s.output_atteso}\n\n## Normativa\n${s.normativa||"N/D"}\n\n**Tag:** ${(s.tags||[]).join(", ")}\n\n---\n*Esportato da xNunc.ai · AGPL v3 · ex nunc · Versione statica — nessun aggiornamento automatico*\n*Per la versione aggiornata: xnunc.ai/skill/${s.id}*`;
  }).join("\n\n---\n---\n\n");
}
function toOpenAIFormat(skills) {
  const arr = skills.map(s => ({
    name:s.nome, description:s.descrizione, instructions:PROMPTS[s.id]||"",
    model:"gpt-4o",
    metadata:{source:"xnunc.ai",id:s.id,area:s.area,sotto_area:s.sotto_area,normativa:s.normativa,tags:s.tags,frequenza:s.frequenza,complessita:s.complessita,version:"1.0",note:"Versione statica — riscaricare da xnunc.ai per aggiornamenti"}
  }));
  return JSON.stringify(skills.length===1?arr[0]:arr,null,2);
}
function toCopilotFormat(skills) {
  const esc=v=>(v||"").replace(/"/g,'\\"').replace(/\n/g," ");
  const block=v=>(v||"").split("\n").map(l=>"    "+l).join("\n");
  const entries=skills.map(s=>`  - name: "${esc(s.nome)}"\n    description: "${esc(s.descrizione)}"\n    instructions: |\n${block(PROMPTS[s.id]||"")}\n    metadata:\n      source: xnunc.ai\n      id: ${s.id}\n      area: "${esc(s.area)}"\n      sotto_area: "${esc(s.sotto_area)}"\n      version: "1.0"\n      note: "Versione statica — riscaricare da xnunc.ai per aggiornamenti"`).join("\n");
  return `# xNunc Skill Export — Microsoft Copilot Studio\n# Generato da xNunc.ai · AGPL v3\n# ATTENZIONE: versione statica. Nessun aggiornamento automatico.\n# Per la versione aggiornata visita: xnunc.ai\n\nskills:\n${entries}`;
}
function toGeminiFormat(skills) {
  const arr=skills.map(s=>({
    name:s.nome,description:s.descrizione,
    system_instruction:{parts:[{text:PROMPTS[s.id]||""}]},
    model:"gemini-1.5-pro",
    generation_config:{temperature:0.7,max_output_tokens:4096},
    metadata:{source:"xnunc.ai",id:s.id,area:s.area,sotto_area:s.sotto_area,normativa:s.normativa,tags:s.tags,frequenza:s.frequenza,complessita:s.complessita,version:"1.0",note:"Versione statica — riscaricare da xnunc.ai per aggiornamenti"}
  }));
  return JSON.stringify(skills.length===1?arr[0]:arr,null,2);
}
const FORMATTERS={claude:toClaudeFormat,openai:toOpenAIFormat,copilot:toCopilotFormat,gemini:toGeminiFormat};

function downloadFile(content,filename,mime){
  const blob=new Blob([content],{type:mime});
  const url=URL.createObjectURL(blob);
  const a=document.createElement("a");
  a.href=url;a.download=filename;a.click();
  setTimeout(()=>URL.revokeObjectURL(url),1000);
}
const slugify=s=>s.toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"");

// ─────────────────────────────────────────────────────
// FAQ data
// ─────────────────────────────────────────────────────
const FAQ_SECTIONS = [
  {
    section:"🔒 Privacy e sicurezza dei dati",
    items:[
      { q:"Dove finisce quello che scrivo nel campo input?",
        a:"Da nessuna parte — nel senso letterale. L'input che inserisci viene inviato al server xNunc, che lo passa all'API AI e restituisce la risposta. Finita la chiamata HTTP, l'input viene scartato dalla memoria. Nel database vengono salvati solo tre metadati anonimi: quale skill hai usato, quando, e quanti token ha consumato la risposta. Nessun contenuto."},
      { q:"Chi può vedere il mio input professionale?",
        a:"Nessuno, in modo persistente. Durante la chiamata il testo transita nei server xNunc e nell'API Anthropic (o nella tua API, in modalità BYOK). Anthropic ha politiche di zero data retention per i piani API — il dato non viene usato per addestrare modelli. Se vuoi la massima riservatezza, usa la modalità BYOK: i dati transitano sotto il tuo account Anthropic, non quello di xNunc."},
      { q:"Cos'è la modalità BYOK?",
        a:"BYOK (Bring Your Own Key) significa usare la tua API key Anthropic invece di quella di xNunc. La imposti una volta sola nelle impostazioni profilo. Da quel momento ogni skill che esegui usa il tuo account Anthropic — i dati non passano per le credenziali della piattaforma. La chiave viene salvata cifrata (AES-256) nel database e non è mai visibile nel browser."},
      { q:"Il system prompt delle skill è visibile a tutti?",
        a:"No — non durante l'esecuzione. Quando esegui una skill, il system prompt gira lato server: tu vedi solo il risultato. Tuttavia xNunc è open source e il catalogo è scaricabile: i prompt sono accessibili a chi li scarica esplicitamente (vedi tab Dettagli → Esporta). La trasparenza è un valore deliberato, non un bug."},
      { q:"xNunc è GDPR compliant?",
        a:"Sì. I punti principali: (1) nessun contenuto degli input viene salvato, (2) puoi richiedere la cancellazione del tuo account e di tutti i tuoi dati personali, (3) puoi esportare i tuoi dati, (4) il consenso alla registrazione è esplicito con riferimento alla Privacy Policy, (5) i log server registrano solo metadati anonimi. Il trattamento dei dati è descritto in dettaglio nella Privacy Policy accessibile dal footer."},
    ]
  },
  {
    section:"⬇ File scaricati e portabilità",
    items:[
      { q:"Il file scaricato si aggiorna automaticamente?",
        a:"No — ed è importante saperlo. Quando scarichi una skill, ottieni uno snapshot della versione corrente (es. v1.0). Se la community migliora la skill e arriva alla v2.0, il tuo file non si aggiorna da solo. Per avere la versione più recente, torna su xNunc, trova la skill e riscarica il file. La versione attiva è sempre visibile sul portale con il numero di versione e la data dell'ultimo aggiornamento."},
      { q:"Posso usare la skill scaricata su ChatGPT, Gemini o Copilot?",
        a:"Sì, è esattamente lo scopo dell'export. Il system prompt è puro testo e funziona su qualsiasi AI che accetta istruzioni di sistema. Il formato del file cambia (Markdown per Claude, JSON per OpenAI e Gemini, YAML per Copilot) ma il contenuto è lo stesso. Vedi la guida all'uso nel pannello di download per le istruzioni specifiche per ogni piattaforma."},
      { q:"Cosa contiene esattamente il file scaricato?",
        a:"Il file contiene: nome e descrizione della skill, istruzioni di sistema complete (system prompt), indicazione dell'input atteso, descrizione dell'output atteso, riferimenti normativi, tag, livello di complessità, frequenza d'uso, versione, data e fonte (xNunc.ai). Non contiene nessun dato dell'utente — è solo la definizione della skill."},
      { q:"Posso scaricare tutte le skill di un'area insieme?",
        a:"Sì — nel pannello di download puoi scegliere 'Tutta la raccolta' invece di 'Solo questa skill'. In questo modo scarichi in un unico file tutte le skill della stessa sotto-area (ad esempio tutte le skill 'Verbali CdA'). Il file è strutturato per essere importato direttamente nelle piattaforme che supportano multiple istruzioni o assistants."},
      { q:"Posso usare le skill su modelli AI locali (Ollama, LM Studio)?",
        a:"Sì. Il system prompt è testo standard compatibile con qualsiasi LLM. Per i modelli locali usa il formato Markdown (export Claude) — è il più leggibile e universale. Incolla il contenuto del campo 'Istruzioni di sistema' come system prompt nella tua interfaccia locale."},
    ]
  },
  {
    section:"🏗 Come funziona la piattaforma",
    items:[
      { q:"Qual è la differenza tra eseguire in piattaforma e scaricare il file?",
        a:"Eseguire in piattaforma: inserisci l'input, premi 'Esegui', il server chiama l'AI con il system prompt già caricato e ti restituisce il risultato. Non devi fare niente di tecnico e hai sempre la versione più aggiornata della skill. Scaricare: ottieni il file con il system prompt per usarlo autonomamente su Claude, OpenAI, Copilot, Gemini o modelli locali — ma la versione è statica e non si aggiorna."},
      { q:"Come funziona il versioning delle skill?",
        a:"Ogni skill parte dalla v1.0. Quando la community propone e il creatore approva 3 miglioramenti, la skill avanza automaticamente alla v2.0 (poi v3.0 e così via). Ogni passaggio di versione crea uno snapshot della versione precedente, visibile nella tab 'Storia versioni'. I punti vengono ripartiti tra il creatore originale e i contributor."},
      { q:"Come posso contribuire una nuova skill?",
        a:"Dal tuo profilo (ruolo CONTRIBUTOR o superiore) puoi usare il pulsante 'Crea skill con AI': descrivi in italiano cosa vuole fare la skill, la piattaforma genera automaticamente tutti i campi. Poi rivedi, testa e pubblica. Se preferisci creare manualmente, usa il wizard in 5 step. Ogni skill pubblicata vale +10 punti."},
      { q:"Cosa sono i punti e la classifica?",
        a:"I punti tracciano il contributo alla community: +10 per ogni skill pubblicata, +5 per ogni miglioramento approvato, +2 per ogni partecipazione a un thread di discussione, bonus per skill molto usate o molto votate. La classifica è pubblica e mostra i top contributor per area tematica."},
      { q:"Qual è la differenza tra piano Free e Pro?",
        a:"Free: 20 esecuzioni/mese, solo lettura del catalogo, possibilità di proporre miglioramenti (2/mese). Pro (€19/mese): esecuzioni illimitate, BYOK, creazione di nuove skill, download output in Word/PDF, supporto email. Piano Studio (€79/mese): fino a 5 utenti, tutte le funzionalità Pro."},
    ]
  },
  {
    section:"📖 Cos'è xNunc",
    items:[
      { q:"Cos'è xNunc?",
        a:"xNunc è una piattaforma SaaS open source (AGPL v3) che raccoglie, organizza e distribuisce workflow AI specializzati per commercialisti italiani. Il nome viene dal latino 'ex nunc' — da ora in poi — che nel diritto romano indica un cambiamento con effetto immediato, senza retroattività. L'idea è questa: smettere di subire il peso degli adempimenti meccanici, ex nunc."},
      { q:"Perché è open source?",
        a:"Perché il valore appartiene a chi lo genera — non a un vendor che lo vende dall'alto. Il codice è sotto licenza AGPL v3: chiunque può leggerlo, migliorarlo, forkarlo. I workflow professionali nascono dall'esperienza dei commercialisti stessi: è giusto che restino accessibili alla community, non chiusi in un sistema proprietario."},
      { q:"Chi c'è dietro xNunc?",
        a:"Il progetto nasce da Giampiero Morales, Dottore Commercialista specializzato in fiscalità internazionale e patrimoni strutturati, Junior Partner di BC&. Il catalogo iniziale di 100 skill è stato costruito su casi reali — non in aula, non in una demo, ma sul campo con clienti reali."},
      { q:"xNunc sostituisce il mio gestionale o il mio software fiscale?",
        a:"No — e non è questo l'obiettivo. xNunc non è un gestionale, non ha un database clienti, non genera pratiche automaticamente. È il layer AI sopra ai tuoi strumenti esistenti: ti aiuta a produrre documenti, analisi, verbali e checklist partendo da dati che tu fornisci. Il risultato è sempre una bozza da validare — il giudizio professionale resta tuo."},
    ]
  }
];

// ─────────────────────────────────────────────────────
// DATA
// ─────────────────────────────────────────────────────
const SKILLS  = [{"id":"WACC-001","area":"Valutazione Aziendale","sotto_area":"Costo del Capitale","nome":"WACC Calculator","tipo":"tool","descrizione":"Calcola il Weighted Average Cost of Capital con wizard guidato in 5 passi. Recupera automaticamente parametri di mercato live (beta Damodaran, ERP, BTP 10Y, Kroll size premium) via web search. Include formula Hamada per re-levering del beta, sensitivity analysis e commento metodologico AI.","input_atteso":"Tipo impresa, settore Damodaran, area geografica, struttura del capitale (D ed E in €), scopo della valutazione","output_atteso":"WACC con breakdown Ke/Kd, beta levered (Hamada), sensitivity 5×5 su beta/ERP, commento professionale AI","normativa":"CAPM, Formula Hamada, Damodaran NYU Beta/ERP Dataset, Kroll/Duff&Phelps CRSP, BTP 10Y Banca d'Italia","tags":["wacc","valutazione","dcf","beta","capm","hamada","erp","costo-capitale","m&a"],"frequenza":"ricorrente","complessita":"alta"},{"id":"FA-001","area":"Finanza agevolata","sotto_area":"Scouting e verifica ammissibilit\u00e0","nome":"Profiling cliente per bandi","descrizione":"Analizza i dati identificativi del cliente per costruire un profilo di ammissibilit\u00e0 ai principali strumenti di finanza agevolata disponibili.","input_atteso":"Visura camerale o dati sintetici: forma giuridica, ATECO, dimensione (micro/PMI/grande), sede, fatturato, anno costituzione","output_atteso":"Scheda profilo con elenco bandi compatibili per settore, dimensione e sede, con indicazione di priorit\u00e0 e scadenze","normativa":"D.Lgs. 123/1998, Reg. UE 651/2014 (GBER), Reg. UE 2831/2023 (de minimis)","tags":["finanza-agevolata","scouting","PMI","bandi","profiling"],"frequenza":"ricorrente","complessita":"media"},{"id":"FA-002","area":"Finanza agevolata","sotto_area":"Scouting e verifica ammissibilit\u00e0","nome":"Verifica requisiti bando","descrizione":"Incrocia i dati del cliente con i requisiti di un bando specifico e produce un check pass/fail motivato per ogni requisito.","input_atteso":"PDF o testo del bando (incollato) + dati cliente (forma giuridica, ATECO, dimensione, sede, situazione debitoria)","output_atteso":"Tabella requisiti con colonne: requisito / verifica (pass/fail/da verificare) / nota esplicativa / azione richiesta","normativa":"Variabile per bando. Reg. UE 651/2014, Reg. UE 2831/2023","tags":["finanza-agevolata","scouting","verifica-requisiti","ammissibilit\u00e0","bandi"],"frequenza":"ricorrente","complessita":"media"},{"id":"FA-003","area":"Finanza agevolata","sotto_area":"Scouting e verifica ammissibilit\u00e0","nome":"Sintesi comparativa bandi","descrizione":"Confronta 2-3 bandi alternativi per lo stesso cliente e produce una raccomandazione motivata su quale privilegiare.","input_atteso":"Testi o sintesi di 2-3 bandi alternativi + profilo cliente","output_atteso":"Tabella comparativa con pro/contro per ciascun bando, raccomandazione finale motivata e timeline consigliata","normativa":"Reg. UE 2831/2023 (de minimis), Reg. UE 651/2014","tags":["finanza-agevolata","scouting","comparazione","strategia","bandi"],"frequenza":"occasionale","complessita":"media"},{"id":"FA-004","area":"Finanza agevolata","sotto_area":"Produzione documenti di domanda","nome":"Business plan agevolato","descrizione":"Redige la sezione narrativa del business plan su traccia richiesta dal bando, partendo dalle informazioni fornite dal cliente.","input_atteso":"Note descrittive del progetto (anche in forma di punti), dati economici dell'impresa, traccia o sezioni richieste dal bando","output_atteso":"Business plan narrativo strutturato sulle sezioni del bando: descrizione impresa, progetto, mercato, team, piano economico-finanziario, impatto atteso","normativa":"Variabile per bando","tags":["finanza-agevolata","domanda","business-plan","PNRR","Smart-Start"],"frequenza":"occasionale","complessita":"alta"},{"id":"FA-005","area":"Finanza agevolata","sotto_area":"Produzione documenti di domanda","nome":"Relazione descrittiva progetto","descrizione":"Trasforma note sintetiche del cliente in una relazione tecnica descrittiva del progetto formattata sulle sezioni del bando.","input_atteso":"Note sul progetto (punti elenco o testo libero), sezioni richieste dal bando","output_atteso":"Relazione descrittiva strutturata, pronta per l'inserimento nella domanda, con linguaggio tecnico-professionale","normativa":"Variabile per bando","tags":["finanza-agevolata","domanda","relazione-tecnica","documentazione"],"frequenza":"ricorrente","complessita":"media"},{"id":"FA-006","area":"Finanza agevolata","sotto_area":"Produzione documenti di domanda","nome":"Lettere e dichiarazioni de minimis","descrizione":"Redige dichiarazioni de minimis, lettere di intenti e autocertificazioni richieste dalla domanda di agevolazione.","input_atteso":"Tipo di dichiarazione richiesta, dati impresa, elenco aiuti de minimis ricevuti negli ultimi 3 anni (se disponibile)","output_atteso":"Bozza dichiarazione/lettera pronta per la firma, con tutti i campi compilati o segnalati come da completare","normativa":"Reg. UE 2831/2023 (de minimis), DPR 445/2000 (autocertificazioni)","tags":["finanza-agevolata","domanda","de-minimis","dichiarazioni","autocertificazioni"],"frequenza":"ricorrente","complessita":"bassa"},{"id":"FA-007","area":"Finanza agevolata","sotto_area":"Crediti d'imposta e agevolazioni automatiche","nome":"Calcolo credito d'imposta R&S e Innovazione","descrizione":"Calcola il credito d'imposta spettante per attivit\u00e0 di ricerca e sviluppo e innovazione tecnologica, partendo dall'elenco delle spese sostenute.","input_atteso":"Tabella spese per tipologia (personale ricercatori, contratti ricerca, quote ammort. strumenti, ecc.) con importi e anno di sostenimento","output_atteso":"Calcolo credito spettante per categoria di spesa e per aliquota applicabile, con tabella riepilogativa e note per la perizia tecnica","normativa":"Art. 1 cc. 198-209 L. 160/2019, DL 73/2022 art. 23, Circ. ADE 18/E/2021","tags":["credito-imposta","R&S","innovazione","agevolazioni-automatiche","calcolo"],"frequenza":"ricorrente","complessita":"alta"},{"id":"FA-008","area":"Finanza agevolata","sotto_area":"Crediti d'imposta e agevolazioni automatiche","nome":"Credito d'imposta Formazione 4.0","descrizione":"Verifica i requisiti e calcola il credito d'imposta per la formazione del personale su competenze tecnologiche.","input_atteso":"Registro presenze corsi, categorie di lavoratori coinvolti, spese di formazione per tipologia, attestazione soggetto formatore","output_atteso":"Calcolo credito spettante per dimensione aziendale e tipologia di formazione, checklist requisiti, note per la relazione di accompagnamento","normativa":"Art. 1 cc. 46-56 L. 205/2017, Circ. MISE 412088/2018","tags":["credito-imposta","formazione","4.0","agevolazioni-automatiche","calcolo"],"frequenza":"ricorrente","complessita":"media"},{"id":"FA-009","area":"Finanza agevolata","sotto_area":"Rendicontazione e gestione post-concessione","nome":"Analisi spese ammissibili da export contabilit\u00e0","descrizione":"Classifica le spese di un progetto agevolato in ammissibili e non ammissibili secondo il bando, partendo dall'export contabile.","input_atteso":"Export contabilit\u00e0 (CSV/Excel) con date, fornitori, importi, descrizioni + criteri di ammissibilit\u00e0 del bando (testo o punti)","output_atteso":"Tabella spese con colonna ammissibilit\u00e0 (s\u00ec/no/parziale), motivazione, importo ammissibile, totale ammissibile vs totale sostenuto","normativa":"Variabile per bando. Reg. UE 1303/2013 per fondi strutturali","tags":["finanza-agevolata","rendicontazione","spese-ammissibili","SAL","post-concessione"],"frequenza":"ricorrente","complessita":"media"},{"id":"FA-010","area":"Finanza agevolata","sotto_area":"Rendicontazione e gestione post-concessione","nome":"Relazione SAL / rendiconto","descrizione":"Redige la relazione di stato avanzamento lavori o il rendiconto finale di un progetto agevolato sulla traccia richiesta dall'ente erogatore.","input_atteso":"Note sullo stato avanzamento del progetto, spese sostenute, attivit\u00e0 svolte, risultati raggiunti, traccia sezioni richieste dall'ente","output_atteso":"Relazione SAL strutturata, pronta per la trasmissione all'ente, con sezioni: attivit\u00e0 svolte, risultati, spese, scostamenti, prospettive","normativa":"Variabile per bando","tags":["finanza-agevolata","rendicontazione","SAL","post-concessione","relazione"],"frequenza":"ricorrente","complessita":"media"},{"id":"FA-011","area":"Finanza agevolata","sotto_area":"Fiscalit\u00e0 dei contributi ricevuti","nome":"Tassabilit\u00e0 contributi ricevuti","descrizione":"Analizza la natura fiscale di un contributo pubblico ricevuto e determina il trattamento IRES, IRAP e IVA applicabile.","input_atteso":"Descrizione del contributo (decreto di concessione o sintesi), importo, finalit\u00e0 (conto capitale / conto esercizio / conto impianti), anno di incasso","output_atteso":"Analisi fiscale: trattamento IRES (concorre/non concorre alla base imponibile, in quale esercizio), trattamento IRAP, trattamento IVA, scrittura contabile consigliata","normativa":"Artt. 85, 88, 109 TUIR; DPR 633/72 art. 2; OIC 12","tags":["fiscalit\u00e0","contributi","IRES","IRAP","IVA","finanza-agevolata"],"frequenza":"ricorrente","complessita":"media"},{"id":"FA-012","area":"Finanza agevolata","sotto_area":"Fiscalit\u00e0 dei contributi ricevuti","nome":"De minimis \u2014 check e registro","descrizione":"Verifica il rispetto della soglia de minimis e costruisce o aggiorna il registro degli aiuti ricevuti.","input_atteso":"Elenco contributi pubblici ricevuti negli ultimi 3 esercizi fiscali con importo, data, ente erogatore, norma di riferimento","output_atteso":"Tabella registro de minimis aggiornata, totale cumulato per i 3 anni, verifica rispetto soglia 300.000\u20ac, margine residuo disponibile","normativa":"Reg. UE 2831/2023, Reg. UE 717/2014 (de minimis agricoltura)","tags":["de-minimis","aiuti-di-stato","registro","soglia","finanza-agevolata"],"frequenza":"ricorrente","complessita":"media"},{"id":"BS-001","area":"Beni strumentali","sotto_area":"Pianificazione e scelta dello strumento","nome":"Screening agevolazioni piano investimento","descrizione":"Identifica tutti gli strumenti agevolativi cumulabili per un piano di investimento in beni strumentali, incluse le novit\u00e0 della Legge di Bilancio 2026.","input_atteso":"Tipo di bene da acquistare, importo investimento, settore ATECO, dimensione impresa, localizzazione (regione / ZES?), anno previsto acquisto","output_atteso":"Matrice strumenti applicabili: Nuova Sabatini, iperammortamento 2026, ZES Unica, crediti d'imposta residui, con aliquote, cumulabilit\u00e0 e beneficio stimato","normativa":"L. 199/2025 (LdB 2026) art. 1 cc. 427-429, DL MIMIT Nuova Sabatini, L. 160/2019","tags":["beni-strumentali","pianificazione","iperammortamento","Sabatini","ZES","LdB2026"],"frequenza":"ricorrente","complessita":"alta"},{"id":"BS-002","area":"Beni strumentali","sotto_area":"Pianificazione e scelta dello strumento","nome":"Simulazione beneficio economico combinato","descrizione":"Calcola il beneficio economico netto complessivo di un investimento in beni strumentali cumulando tutti gli strumenti applicabili.","input_atteso":"Importo investimento, tipo bene (ordinario / Allegato A / Allegato B), dimensione impresa, sede (ZES s\u00ec/no), anno acquisto, aliquota ammortamento civilistico","output_atteso":"Tabella con: costo lordo, benefici per strumento (\u20ac), costo netto effettivo, % risparmio sul costo, piano temporale dei benefici per anno","normativa":"L. 199/2025 art. 1 cc. 427-429, DM 31.12.1988, DL MIMIT Nuova Sabatini","tags":["beni-strumentali","calcolo","simulazione","beneficio","cumulo-agevolazioni"],"frequenza":"ricorrente","complessita":"alta"},{"id":"BS-003","area":"Beni strumentali","sotto_area":"Pianificazione e scelta dello strumento","nome":"Classificazione bene 4.0 o ordinario","descrizione":"Analizza la scheda tecnica di un bene strumentale e determina se rientra negli Allegati A o B (beni 4.0) o \u00e8 un bene ordinario, verificando anche il requisito di origine UE/SEE per l'iperammortamento 2026.","input_atteso":"Descrizione tecnica del bene, scheda tecnica del fornitore (anche in estratto), paese di produzione se noto","output_atteso":"Classificazione: Allegato A / Allegato B / ordinario, con motivazione; verifica origine UE/SEE; requisiti di interconnessione da soddisfare; aliquota iperammortamento applicabile","normativa":"L. 232/2016 Allegati A e B, L. 199/2025 art. 1 c. 429","tags":["beni-strumentali","classificazione","4.0","Allegato-A","Allegato-B","iperammortamento"],"frequenza":"ricorrente","complessita":"media"},{"id":"BS-004","area":"Beni strumentali","sotto_area":"Iperammortamento 2026","nome":"Calcolo maxi-deduzione iperammortamento 2026","descrizione":"Calcola la maggiorazione del costo fiscale e il piano di deduzioni IRES/IRPEF anno per anno per un investimento agevolato LdB 2026.","input_atteso":"Costo acquisto bene, coefficiente ammortamento DM 31.12.1988, dimensione investimento (fascia: \u22642,5M / 2,5-10M / 10-20M), anno acquisto, forma giuridica impresa","output_atteso":"Piano dettagliato: costo civilistico, maggiorazione (180%/100%/50%), base fiscale maggiorata, quota ammortamento fiscale anno per anno, risparmio IRES per anno, totale beneficio","normativa":"L. 199/2025 art. 1 cc. 427-429, DM 31.12.1988","tags":["beni-strumentali","iperammortamento","LdB2026","calcolo","IRES","maxi-deduzione"],"frequenza":"ricorrente","complessita":"alta"},{"id":"BS-005","area":"Beni strumentali","sotto_area":"Iperammortamento 2026","nome":"Perizia tecnica / autodichiarazione interconnessione","descrizione":"Produce la bozza della perizia tecnica o dell'autodichiarazione del legale rappresentante che attesta i requisiti di interconnessione del bene 4.0 al sistema aziendale.","input_atteso":"Descrizione tecnica del bene, sistema informatico aziendale a cui si connette, tipo di dati scambiati, modalit\u00e0 di interconnessione","output_atteso":"Bozza perizia tecnica asseverata (per beni >300k) o autodichiarazione (per beni \u2264300k) con tutte le sezioni: descrizione bene, requisiti tecnici soddisfatti, modalit\u00e0 di interconnessione, dichiarazione di conformit\u00e0","normativa":"L. 232/2016 Allegato A, Circ. MISE 547850/2017, DPR 445/2000","tags":["beni-strumentali","perizia","interconnessione","4.0","autodichiarazione"],"frequenza":"ricorrente","complessita":"alta"},{"id":"BS-006","area":"Beni strumentali","sotto_area":"Nuova Sabatini","nome":"Verifica ammissibilit\u00e0 PMI Nuova Sabatini","descrizione":"Verifica il possesso di tutti i requisiti soggettivi e oggettivi per accedere alla Nuova Sabatini, inclusi i requisiti negativi.","input_atteso":"Dati impresa: forma giuridica, ATECO, dipendenti, fatturato/bilancio, sede, situazione finanziaria (procedure concorsuali, debiti fiscali, aiuti incompatibili)","output_atteso":"Checklist requisiti con esito pass/fail/da-verificare per ciascuno, giudizio complessivo di ammissibilit\u00e0, documenti da predisporre","normativa":"DM 25.01.2016 e circolari MIMIT, Raccomandazione CE 2003/361","tags":["beni-strumentali","Sabatini","ammissibilit\u00e0","PMI","verifica"],"frequenza":"ricorrente","complessita":"media"},{"id":"BS-007","area":"Beni strumentali","sotto_area":"Nuova Sabatini","nome":"Calcolo contributo Sabatini e confronto leasing vs acquisto","descrizione":"Calcola il contributo Sabatini atteso e confronta la convenienza economica tra acquisto diretto e leasing finanziario.","input_atteso":"Importo investimento, tipo bene (ordinario / 4.0 / green), durata finanziamento (3-5 anni), tasso bancario offerto, aliquota ammortamento, opzione leasing disponibile","output_atteso":"Calcolo contributo Sabatini (importo attualizzato), confronto acquisto vs leasing su costo effettivo netto, raccomandazione motivata","normativa":"DM 25.01.2016, OIC 16, art. 102 TUIR","tags":["beni-strumentali","Sabatini","calcolo","leasing","acquisto","TCO"],"frequenza":"ricorrente","complessita":"alta"},{"id":"BS-008","area":"Beni strumentali","sotto_area":"Aspetti fiscali e contabili","nome":"Piano ammortamento civilistico vs fiscale","descrizione":"Costruisce il piano di ammortamento completo evidenziando le differenze tra quota civilistica e fiscale, con effetti su imposte differite.","input_atteso":"Costo acquisto, data messa in funzione, coefficiente DM 31.12.1988, eventuale maggiorazione iperammortamento, vita utile stimata civilistica","output_atteso":"Tabella piano ammortamento anno per anno: quota civilistica, quota fiscale ordinaria, quota fiscale maggiorata (se 4.0), differenza temporanea, DTA/DTL generata","normativa":"OIC 16, OIC 25, DM 31.12.1988, art. 102 TUIR, L. 199/2025","tags":["beni-strumentali","ammortamento","DTA","imposte-differite","OIC16","fiscale"],"frequenza":"ricorrente","complessita":"media"},{"id":"BS-009","area":"Beni strumentali","sotto_area":"Gestione post-acquisto","nome":"Registro beni agevolati e vincoli conservativi","descrizione":"Crea o aggiorna il registro dei beni soggetti a vincoli agevolativi, con alert su scadenze e obblighi di localizzazione.","input_atteso":"Elenco beni acquistati con agevolazione (Sabatini, iperammortamento, ZES), date acquisto, importi, agevolazioni ricevute, sede di installazione","output_atteso":"Registro strutturato con: bene, agevolazione, data acquisto, fine vincolo, obbligo localizzazione, alert scadenze, note su possibile sostituzione","normativa":"DM 25.01.2016 (Sabatini), L. 199/2025 art. 1 c. 430 (sostituzione bene)","tags":["beni-strumentali","post-acquisto","registro","vincoli","compliance"],"frequenza":"occasionale","complessita":"bassa"},{"id":"BS-010","area":"Beni strumentali","sotto_area":"Gestione post-acquisto","nome":"Pianificazione compensazione crediti F24","descrizione":"Pianifica l'utilizzo in compensazione F24 dei crediti d'imposta per beni strumentali, rispettando le quote annuali e i codici tributo.","input_atteso":"Tipo e importo credito d'imposta, anno di maturazione, regole di utilizzo (quote annuali, anno di prima utilizzabilit\u00e0), debiti fiscali e contributivi previsti","output_atteso":"Piano di compensazione anno per anno con importo quota utilizzabile, codice tributo, verifica capienza fiscale, avvertenze su comunicazione preventiva","normativa":"Art. 17 D.Lgs. 241/1997, art. 34 L. 388/2000, decreti direttoriali MIMIT","tags":["beni-strumentali","credito-imposta","F24","compensazione","pianificazione"],"frequenza":"ricorrente","complessita":"media"},{"id":"SOC-001","area":"Societario","sotto_area":"Costituzione e scelta forma giuridica","nome":"Confronto forme giuridiche","descrizione":"Produce una tabella comparativa motivata tra le principali forme giuridiche per orientare la scelta del cliente.","input_atteso":"Tipo di attivit\u00e0, numero e profilo soci, capitale disponibile, obiettivi (responsabilit\u00e0 limitata, ottimizzazione fiscale, governance, exit futura)","output_atteso":"Tabella comparativa SRL / SPA / SAS / SNC / impresa individuale con: responsabilit\u00e0, fiscalit\u00e0, governance, costi di gestione, adeguatezza al profilo cliente; raccomandazione motivata","normativa":"Artt. 2247-2510 cc, TUIR","tags":["societario","costituzione","forma-giuridica","SRL","SPA","holding"],"frequenza":"occasionale","complessita":"media"},{"id":"SOC-002","area":"Societario","sotto_area":"Costituzione e scelta forma giuridica","nome":"Bozza statuto SRL / SPA","descrizione":"Genera la bozza dello statuto con clausole standard e clausole specifiche richieste dal cliente.","input_atteso":"Forma giuridica, oggetto sociale, capitale, numero soci, clausole speciali richieste (prelazione, drag-along, tag-along, quorum rafforzati, voto maggiorato)","output_atteso":"Bozza statuto completa con tutti gli articoli obbligatori e le clausole personalizzate, pronta per la revisione del notaio","normativa":"Artt. 2462-2483 cc (SRL), artt. 2325-2451 cc (SPA)","tags":["societario","costituzione","statuto","SRL","SPA","clausole"],"frequenza":"occasionale","complessita":"alta"},{"id":"SOC-003","area":"Societario","sotto_area":"Costituzione e scelta forma giuridica","nome":"Patto parasociale","descrizione":"Redige la bozza di patto parasociale tra soci con clausole di lock-up, governance, exit e vesting.","input_atteso":"Numero e ruolo dei soci, durata patto, clausole richieste (lock-up, diritto di co-vendita, obbligo co-vendita, earn-out, vesting, governance decisioni strategiche)","output_atteso":"Bozza patto parasociale strutturata con: premesse, definizioni, obblighi di mantenimento, diritti di trasferimento, governance, durata e recesso, foro competente","normativa":"Art. 2341-bis e ter cc, art. 122 TUF","tags":["societario","costituzione","patto-parasociale","drag-along","tag-along","vesting"],"frequenza":"occasionale","complessita":"alta"},{"id":"SOC-004","area":"Societario","sotto_area":"Avvio operativo","nome":"Checklist adempimenti apertura nuova societ\u00e0","descrizione":"Produce la checklist completa di tutti gli adempimenti amministrativi, fiscali e previdenziali per l'avvio operativo di una nuova societ\u00e0.","input_atteso":"Forma giuridica, settore di attivit\u00e0 (ATECO), sede, numero soci e amministratori, presenza dipendenti","output_atteso":"Checklist strutturata per ente (ADE, CCIAA, Comune, INPS, INAIL, banca) con: adempimento, termine, responsabile, documenti necessari, note","normativa":"DPR 633/72, L. 383/2001, D.Lgs. 231/2007, art. 2478 cc","tags":["societario","avvio","partita-IVA","adempimenti","CCIAA","INPS"],"frequenza":"ricorrente","complessita":"media"},{"id":"SOC-005","area":"Societario","sotto_area":"Avvio operativo","nome":"Apertura conto corrente societario \u2014 documento KYC/AML","descrizione":"Prepara il documento di presentazione alla banca e le dichiarazioni AML/UBO necessarie per l'apertura del conto corrente societario.","input_atteso":"Dati societari (denominazione, CF, sede, oggetto), dati amministratori e soci con quote, titolare effettivo, attivit\u00e0 svolta e flussi finanziari previsti","output_atteso":"Documento di presentazione alla banca + dichiarazione titolare effettivo + profilo AML (scopo rapporto, origine fondi, volume transazioni previsto)","normativa":"D.Lgs. 231/2007, art. 20 D.Lgs. 231/2007 (titolare effettivo)","tags":["societario","avvio","conto-corrente","AML","KYC","titolare-effettivo"],"frequenza":"occasionale","complessita":"media"},{"id":"SOC-006","area":"Societario","sotto_area":"Verbali CdA","nome":"Verbale CdA \u2014 approvazione bilancio e destinazione utili","descrizione":"Genera il verbale della riunione del Consiglio di Amministrazione per l'approvazione del progetto di bilancio e la delibera sulla destinazione dell'utile.","input_atteso":"Data riunione, presenti, dati bilancio sintetici (utile/perdita, principali voci), proposta destinazione utile (dividendo, riserva, portato a nuovo)","output_atteso":"Verbale CdA completo con: apertura, verifica quorum, illustrazione progetto bilancio, delibera approvazione, delibera destinazione utile, chiusura","normativa":"Artt. 2423, 2429, 2433 cc","tags":["societario","verbale","CdA","bilancio","utile","dividendo"],"frequenza":"ricorrente","complessita":"media"},{"id":"SOC-007","area":"Societario","sotto_area":"Verbali CdA","nome":"Verbale CdA \u2014 deleghe e procure","descrizione":"Genera il verbale CdA per l'attribuzione o modifica di deleghe operative e la conferimento di procure speciali o generali.","input_atteso":"Delegato (nome, qualifica), tipo di delega (gestione ordinaria, firma banca, contratti fino a X\u20ac, rappresentanza fiscale, ecc.), limiti e condizioni, durata","output_atteso":"Verbale CdA completo con delibera di attribuzione delega e testo della procura allegata, con elencazione puntuale dei poteri conferiti e dei limiti","normativa":"Artt. 2381, 2384 cc (SPA), art. 2475 cc (SRL)","tags":["societario","verbale","CdA","deleghe","procure","poteri-firma"],"frequenza":"ricorrente","complessita":"media"},{"id":"SOC-008","area":"Societario","sotto_area":"Verbali CdA","nome":"Verbale CdA \u2014 nomine e compensi organi","descrizione":"Genera il verbale CdA per la nomina di dirigenti, direttori, responsabili di funzione e la determinazione dei compensi degli organi societari.","input_atteso":"Soggetto nominato, ruolo, data decorrenza, compenso annuale lordo, eventuali benefit o bonus, durata incarico","output_atteso":"Verbale CdA con delibera di nomina, definizione delle mansioni, determinazione del compenso e condizioni dell'incarico","normativa":"Artt. 2389, 2402 cc, D.Lgs. 81/2015","tags":["societario","verbale","CdA","nomine","compensi","amministratori"],"frequenza":"ricorrente","complessita":"media"},{"id":"SOC-009","area":"Societario","sotto_area":"Verbali CdA","nome":"Verbale CdA \u2014 operazioni con parti correlate","descrizione":"Genera il verbale CdA per l'approvazione di operazioni con parti correlate, con gestione del conflitto di interessi.","input_atteso":"Descrizione operazione, controparte correlata (nome, relazione con la societ\u00e0), condizioni economiche, motivazione dell'operazione, posizione degli amministratori interessati","output_atteso":"Verbale CdA con: identificazione della correlazione, dichiarazione di interesse ex art. 2391 cc, astensione del consigliere interessato, delibera con motivazione e condizioni di mercato","normativa":"Art. 2391 cc, Reg. Consob 17221/2010 (per quotate)","tags":["societario","verbale","CdA","parti-correlate","conflitto-interessi","OPC"],"frequenza":"occasionale","complessita":"alta"},{"id":"SOC-010","area":"Societario","sotto_area":"Assemblee dei soci","nome":"Verbale assemblea ordinaria \u2014 approvazione bilancio","descrizione":"Genera il verbale dell'assemblea ordinaria dei soci per l'approvazione del bilancio d'esercizio.","input_atteso":"Data, luogo, soci presenti con quote, presidente e segretario, dati bilancio sintetici, destinazione utile proposta dal CdA, presenza organo di controllo","output_atteso":"Verbale assemblea completo con: apertura, verifica quorum, illustrazione bilancio, intervento CdS/revisore, delibera approvazione bilancio, delibera destinazione utile, chiusura","normativa":"Artt. 2364, 2429, 2433 cc","tags":["societario","assemblea","bilancio","verbale","soci","utile"],"frequenza":"ricorrente","complessita":"media"},{"id":"SOC-011","area":"Societario","sotto_area":"Assemblee dei soci","nome":"Avviso di convocazione assemblea e ordine del giorno","descrizione":"Genera l'avviso di convocazione dell'assemblea con l'ordine del giorno, rispettando i termini e le modalit\u00e0 statutarie.","input_atteso":"Tipo assemblea (ordinaria/straordinaria), data e luogo proposti, punti all'ordine del giorno, modalit\u00e0 di convocazione previste dallo statuto (PEC, raccomandata, ecc.), eventuali seconda convocazione","output_atteso":"Testo avviso di convocazione con: intestazione, data, luogo, prima e seconda convocazione, ordine del giorno puntuale, modalit\u00e0 di partecipazione, firma","normativa":"Artt. 2366, 2479-bis cc","tags":["societario","assemblea","convocazione","ordine-del-giorno","termini"],"frequenza":"ricorrente","complessita":"bassa"},{"id":"SOC-012","area":"Societario","sotto_area":"Operazioni straordinarie","nome":"Progetto di fusione \u2014 bozza relazione organo amministrativo","descrizione":"Redige la relazione dell'organo amministrativo al progetto di fusione che illustra e giustifica l'operazione.","input_atteso":"Societ\u00e0 coinvolte (incorporante e incorporata), motivazioni della fusione, rapporto di cambio proposto, metodo di valutazione utilizzato, impatti sui soci","output_atteso":"Bozza relazione organo amministrativo ex art. 2501-quinquies cc con: illustrazione operazione, motivazioni, rapporto di cambio e metodo, impatto sui soci e sui terzi","normativa":"Artt. 2501-2505-quater cc","tags":["societario","fusione","operazione-straordinaria","relazione","rapporto-cambio"],"frequenza":"occasionale","complessita":"alta"},{"id":"SOC-013","area":"Societario","sotto_area":"Perizie e valutazioni","nome":"Perizia di stima ex art. 2465 cc (conferimento beni in natura SRL)","descrizione":"Redige la perizia giurata di stima dei beni in natura o crediti conferiti nel capitale di una SRL.","input_atteso":"Descrizione del bene conferito (immobile, azienda, quote, crediti, marchio), dati del conferente, valore proposto per il conferimento, metodo di valutazione da applicare","output_atteso":"Bozza perizia giurata con: identificazione bene, descrizione metodologia, analisi e calcolo, conclusione sul valore, dichiarazione di indipendenza","normativa":"Art. 2465 cc, art. 2343 cc (SPA)","tags":["societario","perizia","conferimento","valutazione","art-2465","beni-in-natura"],"frequenza":"occasionale","complessita":"alta"},{"id":"SOC-014","area":"Societario","sotto_area":"Perizie e valutazioni","nome":"Valutazione quote societarie","descrizione":"Produce la valutazione delle quote di una SRL o delle azioni di una SPA per cessione, recesso, donazione o contenzioso.","input_atteso":"Bilanci ultimi 3 anni (dati sintetici o tabella), settore di attivit\u00e0, posizione competitiva, eventuali multipli di mercato disponibili, finalit\u00e0 della valutazione","output_atteso":"Relazione di valutazione con: metodi applicati (patrimoniale, reddituale, DCF, multipli), risultati per metodo, valore conclusivo con range, note sui criteri","normativa":"Artt. 2437-ter (recesso SPA), 2473 (recesso SRL), principi OIV","tags":["societario","perizia","valutazione-quote","DCF","multipli","recesso"],"frequenza":"ricorrente","complessita":"alta"},{"id":"SOC-015","area":"Societario","sotto_area":"Perizie e valutazioni","nome":"Relazione ex art. 2086 cc \u2014 assetti adeguati","descrizione":"Redige la relazione dell'organo amministrativo sugli assetti organizzativi, amministrativi e contabili adeguati alla natura e dimensione dell'impresa.","input_atteso":"Dati societari, settore, dimensione (dipendenti, fatturato), struttura organizzativa esistente, sistemi contabili e di controllo adottati","output_atteso":"Relazione sugli assetti adeguati con: descrizione struttura organizzativa, sistema amministrativo-contabile, sistema di controllo interno, procedure di rilevazione crisi, piano di miglioramento se necessario","normativa":"Art. 2086 cc, D.Lgs. 14/2019 CCII","tags":["societario","assetti-adeguati","art-2086","governance","crisi","CCII"],"frequenza":"ricorrente","complessita":"alta"},{"id":"SOC-016","area":"Societario","sotto_area":"Compliance societaria continua","nome":"Dichiarazione titolare effettivo (UBO)","descrizione":"Analizza la catena di controllo societario e produce la dichiarazione del titolare effettivo per il Registro Imprese.","input_atteso":"Struttura societaria (soci, quote, eventuali holding sopra), dati anagrafici dei soci persone fisiche, natura del controllo (diretto/indiretto/di fatto)","output_atteso":"Analisi della catena di controllo, identificazione del/dei titolari effettivi con percentuale di partecipazione consolidata, bozza dichiarazione per il Registro Imprese","normativa":"Art. 20 D.Lgs. 231/2007, DM 11.03.2022 (Registro TE)","tags":["societario","AML","titolare-effettivo","UBO","registro-imprese","antiriciclaggio"],"frequenza":"ricorrente","complessita":"media"},{"id":"SOC-017","area":"Societario","sotto_area":"Compliance societaria continua","nome":"Adeguata verifica AML \u2014 fascicolo cliente","descrizione":"Costruisce il fascicolo di adeguata verifica antiriciclaggio del cliente per lo studio del commercialista.","input_atteso":"Dati cliente (persona fisica o giuridica), attivit\u00e0 svolta, struttura proprietaria, scopo del rapporto professionale, operazioni previste","output_atteso":"Fascicolo AML con: scheda identificazione cliente, identificazione titolare effettivo, profilo di rischio (basso/medio/alto) con motivazione, misure di adeguata verifica applicate","normativa":"D.Lgs. 231/2007, Regole tecniche CNDCEC, Istruzioni UIF","tags":["societario","AML","adeguata-verifica","fascicolo-cliente","rischio","UIF"],"frequenza":"ricorrente","complessita":"media"},{"id":"SOC-018","area":"Societario","sotto_area":"Scioglimento e liquidazione","nome":"Verbale assemblea scioglimento e nomina liquidatore","descrizione":"Genera il verbale dell'assemblea straordinaria per la delibera di scioglimento volontario e la nomina del liquidatore.","input_atteso":"Data, soci presenti con quote, causa di scioglimento (volontaria), liquidatore nominato con dati anagrafici, poteri conferiti al liquidatore","output_atteso":"Verbale assemblea straordinaria con: delibera di scioglimento, nomina liquidatore con poteri, modalit\u00e0 di pubblicit\u00e0","normativa":"Artt. 2484-2496 cc","tags":["societario","scioglimento","liquidazione","assemblea","liquidatore"],"frequenza":"occasionale","complessita":"media"},{"id":"SOC-019","area":"Societario","sotto_area":"Scioglimento e liquidazione","nome":"Bilancio finale di liquidazione e piano di riparto","descrizione":"Redige il bilancio finale di liquidazione e il piano di riparto tra i soci dell'attivo residuo.","input_atteso":"Attivo residuo dopo pagamento debiti, composizione del patrimonio netto (capitale, riserve, utili/perdite accumulate), numero soci e quote di partecipazione","output_atteso":"Bilancio finale di liquidazione semplificato, piano di riparto con calcolo quota per socio, nota sui crediti d'imposta e aspetti fiscali della liquidazione","normativa":"Artt. 2492-2496 cc, art. 47 TUIR (redditi di liquidazione)","tags":["societario","liquidazione","bilancio-finale","riparto","cancellazione"],"frequenza":"occasionale","complessita":"alta"},{"id":"FIS-001","area":"Fiscale","sotto_area":"Mapping piano dei conti","nome":"Mapping PdC gestionale \u2192 CEE","descrizione":"Trasforma un piano dei conti gestionale (da qualsiasi gestionale) nelle voci del bilancio CEE art. 2424-2425 cc.","input_atteso":"Export CSV o tabella del piano dei conti con: codice conto, descrizione, saldo dare, saldo avere (o saldo netto con segno). Indicare il gestionale di provenienza se noto (Teamsystem, Zucchetti, Profis, ecc.)","output_atteso":"Tabella di mapping con colonne: codice conto / descrizione conto / saldo / voce CEE (es. B.II.1) / sezione (SP attivo / SP passivo / CE) / importo nella voce CEE. Totali per voce CEE pronti per il bilancio.","normativa":"Artt. 2424, 2425, 2426 cc, OIC 12","tags":["fiscale","mapping","BdV","CEE","riclassificazione","bilancio"],"frequenza":"ricorrente","complessita":"alta"},{"id":"FIS-002","area":"Fiscale","sotto_area":"Mapping piano dei conti","nome":"Mapping PdC gestionale \u2192 quadri Unico","descrizione":"Mappa i saldi del piano dei conti sulle righe dei quadri RF/RG/RS del modello Unico SC o SP.","input_atteso":"Saldi del BdV rettificato (post assestamento), forma giuridica e regime contabile del soggetto (ordinario/semplificato)","output_atteso":"Tabella di pre-compilazione Unico con: codice conto / descrizione / importo / quadro / rigo Unico / nota (variazione fiscale se necessaria)","normativa":"TUIR, istruzioni Unico SC/SP anno corrente","tags":["fiscale","mapping","Unico","RF","RG","dichiarazione-fiscale"],"frequenza":"ricorrente","complessita":"alta"},{"id":"FIS-003","area":"Fiscale","sotto_area":"Mapping piano dei conti","nome":"Normalizzazione tra piani dei conti diversi","descrizione":"Produce la tabella di corrispondenza tra il piano dei conti del gestionale A e il piano dei conti del gestionale B, per migrazione o consolidato.","input_atteso":"Piano dei conti gestionale A (codice + descrizione), piano dei conti gestionale B (codice + descrizione). Indicare il contesto (migrazione software / consolidato / comparazione)","output_atteso":"Tabella di corrispondenza conto-per-conto con: conto A / descrizione A / conto B corrispondente / descrizione B / note sulle differenze di trattamento contabile","normativa":"OIC principi contabili italiani","tags":["fiscale","mapping","piano-dei-conti","migrazione","consolidato","gestionale"],"frequenza":"occasionale","complessita":"media"},{"id":"FIS-004","area":"Fiscale","sotto_area":"Mapping piano dei conti","nome":"Mapping bilancio CEE \u2192 tassonomia XBRL","descrizione":"Produce la tabella di corrispondenza tra le voci del bilancio CEE e i tag della tassonomia XBRL italiana per il deposito al Registro Imprese.","input_atteso":"Lista delle voci CEE con importi (SP e CE), tipo di bilancio (ordinario / abbreviato / micro), anno di riferimento","output_atteso":"Tabella di mapping voce CEE \u2192 namespace e tag XBRL it-gaap, con indicazione del tipo (istante/durata), periodo di riferimento, unit\u00e0 di misura (EUR)","normativa":"Tassonomia XBRL CCIAA vigente, D.Lgs. 139/2015, DM 23.01.2019","tags":["fiscale","XBRL","tassonomia","CCIAA","deposito","bilancio"],"frequenza":"ricorrente","complessita":"alta"},{"id":"FIS-005","area":"Fiscale","sotto_area":"BdV e bilancio CEE","nome":"BdV \u2192 Stato Patrimoniale art. 2424 cc","descrizione":"Trasforma i saldi del bilancio di verifica rettificato nel formato dello Stato Patrimoniale civilistico con tutte le sezioni.","input_atteso":"BdV rettificato (post scritture di assestamento) con codici conto, descrizioni e saldi. Eventuale tabella di mapping PdC\u2192CEE se gi\u00e0 disponibile.","output_atteso":"Stato Patrimoniale completo art. 2424 cc con: sezione attivo (A immobilizzazioni, B attivo circolante, C ratei/risconti, D crediti vs soci) e passivo (A PN, B fondi, C TFR, D debiti, E ratei/risconti), con totali e subtotali","normativa":"Art. 2424 cc, OIC 12","tags":["fiscale","BdV","stato-patrimoniale","CEE","riclassificazione","art-2424"],"frequenza":"ricorrente","complessita":"alta"},{"id":"FIS-006","area":"Fiscale","sotto_area":"BdV e bilancio CEE","nome":"BdV \u2192 Conto Economico art. 2425 cc","descrizione":"Trasforma i saldi dei conti economici del BdV nel formato del Conto Economico civilistico scalare.","input_atteso":"BdV rettificato \u2014 soli conti economici (ricavi, costi, oneri finanziari, proventi/oneri straordinari)","output_atteso":"Conto Economico scalare art. 2425 cc con sezioni A (valore della produzione), B (costi della produzione), differenza A-B, C (proventi/oneri finanziari), D (rettifiche valore attivit\u00e0 finanziarie), E (proventi/oneri straordinari), imposte, utile/perdita","normativa":"Art. 2425 cc, OIC 12, D.Lgs. 139/2015","tags":["fiscale","BdV","conto-economico","CEE","riclassificazione","art-2425"],"frequenza":"ricorrente","complessita":"alta"},{"id":"FIS-007","area":"Fiscale","sotto_area":"BdV e bilancio CEE","nome":"Check anomalie BdV pre-riclassificazione","descrizione":"Analizza il bilancio di verifica grezzo e segnala le anomalie da correggere prima di procedere alla riclassificazione CEE.","input_atteso":"BdV con codici conto, descrizioni e saldi dare/avere","output_atteso":"Report anomalie con: tipo di anomalia, conto interessato, saldo anomalo, possibile causa, azione correttiva suggerita","normativa":"OIC 11, OIC 16, OIC 15, OIC 19","tags":["fiscale","BdV","anomalie","check","pre-chiusura","qualit\u00e0-dato"],"frequenza":"ricorrente","complessita":"media"},{"id":"FIS-008","area":"Fiscale","sotto_area":"BdV e bilancio CEE","nome":"Riclassificazione CE gestionale (EBITDA)","descrizione":"Riclassifica il Conto Economico CEE in formato gestionale con EBITDA, per reporting interno o presentazione a istituti di credito.","input_atteso":"CE art. 2425 cc con importi compilati","output_atteso":"CE riclassificato con: Ricavi netti, Costo del venduto, Margine lordo, EBITDA, EBIT, EBT, Utile netto. Con percentuali sui ricavi e confronto anno precedente se disponibile","normativa":"OIC 12, best practice analisi finanziaria","tags":["fiscale","riclassificazione","EBITDA","CE-gestionale","analisi-finanziaria"],"frequenza":"ricorrente","complessita":"media"},{"id":"FIS-009","area":"Fiscale","sotto_area":"Calcolo imposte","nome":"Tax computation IRES","descrizione":"Calcola l'imponibile IRES partendo dal CE civilistico, applicando le variazioni fiscali in aumento e in diminuzione.","input_atteso":"CE civilistico con importi per voce (o BdV gi\u00e0 riclassificato), eventuali dati specifici: interessi passivi, quota auto, quota telefoni, spese rappresentanza, perdite pregresse, ACE se applicabile","output_atteso":"Tax computation strutturata: utile civilistico \u2192 variazioni in aumento \u2192 variazioni in diminuzione \u2192 imponibile IRES \u2192 IRES 24% \u2192 IRES da versare (al netto acconti)","normativa":"TUIR artt. 81-142, artt. 96, 102, 108, 109, 164","tags":["fiscale","IRES","tax-computation","variazioni-fiscali","imposte","calcolo"],"frequenza":"ricorrente","complessita":"alta"},{"id":"FIS-010","area":"Fiscale","sotto_area":"Calcolo imposte","nome":"Calcolo IRAP \u2014 metodo da bilancio","descrizione":"Calcola la base imponibile IRAP per le societ\u00e0 di capitali con il metodo da bilancio (differenza tra valore e costi della produzione).","input_atteso":"CE civilistico con importi per sezione A e B art. 2425 cc, dati specifici: costo del lavoro (per eventuale deduzione), interessi passivi inclusi nei costi, contributi","output_atteso":"Calcolo IRAP: valore della produzione \u2192 deduzioni \u2192 base imponibile \u2192 aliquota \u2192 imposta. Con dettaglio delle deduzioni per il costo del lavoro ex art. 11 D.Lgs. 446/97","normativa":"D.Lgs. 446/1997 artt. 5-11, aliquote regionali vigenti","tags":["fiscale","IRAP","calcolo","metodo-bilancio","base-imponibile"],"frequenza":"ricorrente","complessita":"media"},{"id":"FIS-011","area":"Fiscale","sotto_area":"Calcolo imposte","nome":"Calcolo IRPEF persone fisiche","descrizione":"Calcola l'IRPEF lorda e netta per una persona fisica con redditi di lavoro autonomo, impresa o diversi, applicando scaglioni, detrazioni e addizionali.","input_atteso":"Redditi per categoria (lavoro autonomo, impresa, fabbricati, capitale, diversi), oneri deducibili, detrazioni spettanti (lavoro, familiari a carico), regione e comune di residenza","output_atteso":"Calcolo IRPEF: reddito complessivo \u2192 reddito imponibile \u2192 IRPEF lorda per scaglione \u2192 detrazioni \u2192 IRPEF netta \u2192 addizionale regionale \u2192 addizionale comunale \u2192 totale dovuto","normativa":"TUIR artt. 11-13, L. 234/2021 (assegno unico), aliquote addizionali regionali/comunali vigenti","tags":["fiscale","IRPEF","calcolo","scaglioni","detrazioni","persone-fisiche"],"frequenza":"ricorrente","complessita":"media"},{"id":"FIS-012","area":"Fiscale","sotto_area":"Variazioni fiscali","nome":"Identificazione variazioni fiscali da CE civilistico","descrizione":"Analizza il CE civilistico e identifica automaticamente tutte le variazioni fiscali in aumento e in diminuzione applicabili.","input_atteso":"CE civilistico con descrizione dettagliata dei conti (non solo voci aggregate), importi per voce","output_atteso":"Lista variazioni fiscali con: tipo (aumento/diminuzione), importo civilistico, importo fiscalmente rilevante, delta, norma TUIR di riferimento, note","normativa":"TUIR artt. 96, 102, 106, 108, 109, 164","tags":["fiscale","variazioni-fiscali","TUIR","deducibilit\u00e0","IRES","analisi"],"frequenza":"ricorrente","complessita":"alta"},{"id":"FIS-013","area":"Fiscale","sotto_area":"Variazioni fiscali","nome":"Calcolo ROL e deducibilit\u00e0 interessi passivi art. 96 TUIR","descrizione":"Calcola il Risultato Operativo Lordo (ROL) e determina la quota di interessi passivi deducibili nell'esercizio.","input_atteso":"CE con: EBIT (o dati per calcolarlo), ammortamenti, svalutazioni, interessi passivi totali, interessi attivi, eventuali eccedenze ROL degli esercizi precedenti non ancora utilizzate","output_atteso":"Calcolo ROL, interessi passivi deducibili (30% ROL), interessi eccedenti da riportare, utilizzo eccedenze pregresse, variazione in aumento definitiva","normativa":"Art. 96 TUIR, Circ. ADE 19/E/2009","tags":["fiscale","ROL","interessi-passivi","art-96-TUIR","deducibilit\u00e0","calcolo"],"frequenza":"ricorrente","complessita":"alta"},{"id":"FIS-014","area":"Fiscale","sotto_area":"Variazioni fiscali","nome":"Gestione perdite fiscali pregresse","descrizione":"Pianifica l'utilizzo ottimale delle perdite fiscali pregresse, rispettando il limite dell'80% dell'imponibile e la distinzione tra perdite illimitate e limitate.","input_atteso":"Imponibile IRES dell'esercizio (prima dell'utilizzo perdite), registro perdite pregresse con anno di formazione e importo, indicazione se alcune perdite sono illimitate (primo triennio attivit\u00e0)","output_atteso":"Piano ottimale di utilizzo perdite: perdite utilizzabili per tipo, limite 80% applicato, perdite residue per anno, risparmio fiscale generato, perdite in scadenza da prioritizzare","normativa":"Art. 84 TUIR","tags":["fiscale","perdite-fiscali","pianificazione","IRES","riporto-perdite"],"frequenza":"ricorrente","complessita":"media"},{"id":"FIS-015","area":"Fiscale","sotto_area":"IVA","nome":"Check liquidazione IVA periodica","descrizione":"Verifica la correttezza della liquidazione IVA periodica (mensile o trimestrale) partendo dall'export dei registri.","input_atteso":"Export registro IVA vendite e acquisti del periodo con: data, numero documento, fornitore/cliente, imponibile, aliquota, IVA. Liquidazione precedente (credito/debito riportato).","output_atteso":"Verifica liquidazione: IVA a debito, IVA a credito, differenza, credito riportato, IVA da versare/a credito. Alert su aliquote anomale, operazioni senza IVA da verificare, reverse charge.","normativa":"DPR 633/72, artt. 17-19-bis2, 27, 33","tags":["fiscale","IVA","liquidazione","check","registri","F24"],"frequenza":"ricorrente","complessita":"media"},{"id":"FIS-016","area":"Fiscale","sotto_area":"IVA","nome":"Calcolo pro-rata IVA e rettifica annuale","descrizione":"Calcola il pro-rata di detraibilit\u00e0 IVA per le imprese con operazioni miste (imponibili ed esenti) e determina la rettifica annuale.","input_atteso":"Volume operazioni imponibili e non esenti dell'anno, volume operazioni esenti (con dettaglio per tipo), IVA sugli acquisti dell'anno per categoria, pro-rata provvisorio applicato nel corso dell'anno","output_atteso":"Calcolo pro-rata definitivo, confronto con pro-rata provvisorio, rettifica IVA a credito da recuperare o restituire, rettifica su beni ammortizzabili ex art. 19-bis2","normativa":"DPR 633/72 artt. 19-19-bis2","tags":["fiscale","IVA","pro-rata","rettifica","operazioni-miste","detraibilit\u00e0"],"frequenza":"occasionale","complessita":"alta"},{"id":"FIS-017","area":"Fiscale","sotto_area":"Imposte differite","nome":"Calcolo DTA/DTL e movimentazione","descrizione":"Calcola le imposte differite attive (DTA) e passive (DTL) e produce la tabella di movimentazione per la nota integrativa.","input_atteso":"Differenze temporanee per tipologia (ammortamenti, svalutazioni crediti, fondi rischi, leasing finanziario, ecc.) con importi civilistici e fiscali, perdite fiscali reportabili, aliquota IRES applicabile","output_atteso":"Tabella DTA/DTL con: tipo differenza / importo differenza temporanea / DTA o DTL / movimentazione (formazione/utilizzo) / saldo a fine esercizio. Scritture contabili OIC 25.","normativa":"OIC 25, art. 83 TUIR","tags":["fiscale","imposte-differite","DTA","DTL","OIC25","calcolo"],"frequenza":"ricorrente","complessita":"alta"},{"id":"FIS-018","area":"Fiscale","sotto_area":"Indici e analisi","nome":"Cruscotto indici di bilancio","descrizione":"Calcola il set completo di indici di bilancio da un CEE, con commento e benchmark di settore.","input_atteso":"SP e CE art. 2424-2425 compilati, settore di attivit\u00e0, dati anno precedente se disponibili","output_atteso":"Cruscotto indici: redditivit\u00e0 (ROE, ROI, ROS, EBITDA margin), liquidit\u00e0 (current ratio, quick ratio), solidit\u00e0 (debt/equity, PFN/EBITDA, debt ratio), efficienza (rotazione crediti/debiti/magazzino), rating Altman Z-score. Con commento per ciascun gruppo.","normativa":"Best practice analisi finanziaria, modello Altman","tags":["fiscale","indici","bilancio","ROE","EBITDA","analisi-finanziaria","Z-score"],"frequenza":"ricorrente","complessita":"media"},{"id":"FIS-019","area":"Fiscale","sotto_area":"Indici e analisi","nome":"Riconciliazione F24 vs dichiarazioni","descrizione":"Riconcilia i versamenti F24 effettuati con le imposte dichiarate, identificando omessi versamenti, eccedenze e ravvedimenti necessari.","input_atteso":"Export F24 effettuati nell'anno con codici tributo, importi e date + imposte dichiarate da Unico (IRES, IRAP, ritenute, contributi)","output_atteso":"Tabella riconciliazione per tributo: dichiarato / versato / differenza / status (OK / omesso / eccedenza) / eventuale ravvedimento da effettuare con calcolo sanzioni e interessi","normativa":"Art. 13 D.Lgs. 472/1997, tasso interessi legali vigente","tags":["fiscale","F24","riconciliazione","ravvedimento","omessi-versamenti","compliance"],"frequenza":"ricorrente","complessita":"media"},{"id":"FIS-020","area":"Fiscale","sotto_area":"Documenti narrativi","nome":"Nota integrativa \u2014 bilancio abbreviato","descrizione":"Redige la nota integrativa per il bilancio abbreviato art. 2435-bis cc, con tutte le sezioni obbligatorie e le tabelle numeriche.","input_atteso":"SP e CE compilati, criteri contabili adottati, movimentazione immobilizzazioni, crediti e debiti per scadenza, impegni fuori bilancio, DTA/DTL calcolate, compensi organi","output_atteso":"Nota integrativa completa strutturata per sezioni: criteri di valutazione, immobilizzazioni (tabella), crediti/debiti per scadenza, imposte differite, compensi organi, eventi successivi, altre informazioni","normativa":"Artt. 2427, 2435-bis cc, OIC 11-29","tags":["fiscale","nota-integrativa","bilancio-abbreviato","OIC","documento-narrativo"],"frequenza":"ricorrente","complessita":"alta"},{"id":"FIS-021","area":"Fiscale","sotto_area":"Documenti narrativi","nome":"Relazione sulla gestione art. 2428 cc","descrizione":"Redige la relazione sulla gestione dell'organo amministrativo che accompagna il bilancio d'esercizio.","input_atteso":"Dati bilancio (principali variazioni rispetto all'anno precedente), descrizione andamento gestionale, settore di attivit\u00e0, eventi principali dell'esercizio, prospettive anno corrente, rischi principali","output_atteso":"Relazione sulla gestione completa con: analisi andamento gestione, KPI principali, rischi e incertezze, ricerca e sviluppo, azioni proprie, fatti di rilievo dopo la chiusura, evoluzione prevedibile","normativa":"Art. 2428 cc, OIC 1","tags":["fiscale","relazione-gestione","art-2428","bilancio","documento-narrativo"],"frequenza":"ricorrente","complessita":"media"},{"id":"FIS-022","area":"Fiscale","sotto_area":"Documenti narrativi","nome":"Risposta avvisi bonari e controdeduzioni PVC","descrizione":"Redige la risposta a un avviso bonario o le controdeduzioni a un processo verbale di constatazione dell'Agenzia delle Entrate.","input_atteso":"Testo dell'avviso bonario o del PVC (o sintesi dei rilievi), documentazione a supporto disponibile, argomenti difensivi identificati dal commercialista","output_atteso":"Bozza risposta/controdeduzioni strutturata con: riepilogo rilievi, contestazione punto per punto con argomentazioni normative e giurisprudenziali, eventuale adesione parziale motivata","normativa":"L. 212/2000 (Statuto del contribuente), D.Lgs. 218/1997, D.Lgs. 546/1992","tags":["fiscale","contenzioso","avviso-bonario","PVC","controdeduzioni","ADE"],"frequenza":"occasionale","complessita":"alta"},{"id":"FIS-023","area":"Fiscale","sotto_area":"Tax planning","nome":"Analisi struttura holding e ottimizzazione fiscale","descrizione":"Analizza l'opportunit\u00e0 di strutturare una holding e i benefici fiscali attesi (PEX, consolidato fiscale, distribuzione dividendi).","input_atteso":"Struttura attuale (societ\u00e0 operative, partecipazioni, dati reddituali), obiettivi (exit, passaggio generazionale, ottimizzazione distribuzione utili, protezione patrimoniale)","output_atteso":"Analisi comparativa struttura attuale vs struttura con holding: risparmio fiscale atteso, costi di strutturazione, timeline, rischi fiscali, raccomandazione","normativa":"Artt. 87-89, 117-129 TUIR, art. 10-bis L. 212/2000","tags":["fiscale","tax-planning","holding","PEX","consolidato","pianificazione"],"frequenza":"occasionale","complessita":"alta"},{"id":"SIN-001","area":"Verifiche sindacali","sotto_area":"Verbali riunioni CdS","nome":"Verbale riunione ordinaria CdS","descrizione":"Genera il verbale della riunione trimestrale del Collegio Sindacale con le sezioni obbligatorie ex art. 2404 cc.","input_atteso":"Data riunione, sindaci presenti, punti all'ordine del giorno trattati, esito delle verifiche svolte nel trimestre (note sintetiche), eventuali rilievi o osservazioni","output_atteso":"Verbale CdS completo con: apertura, presenti, attivit\u00e0 di vigilanza svolta, verifiche effettuate, osservazioni, deliberazioni, chiusura e firme","normativa":"Artt. 2403-2409 cc, D.Lgs. 39/2010","tags":["sindacale","verbale","CdS","vigilanza","art-2404"],"frequenza":"ricorrente","complessita":"media"},{"id":"SIN-002","area":"Verifiche sindacali","sotto_area":"Verbali riunioni CdS","nome":"Verbale CdS con rilievi formali agli amministratori","descrizione":"Genera il verbale CdS quando sono emerse anomalie che richiedono la formulazione di rilievi formali all'organo amministrativo.","input_atteso":"Anomalia rilevata (descrizione), gravit\u00e0 (rilievo informale / formale / grave irregolarit\u00e0), risposta degli amministratori se gi\u00e0 ricevuta, azioni correttive richieste","output_atteso":"Verbale CdS con sezione rilievi: descrizione anomalia, fondamento normativo, richiesta di chiarimenti/azioni correttive, termine per la risposta, documentazione del follow-up","normativa":"Artt. 2403-bis, 2406, 2409 cc, D.Lgs. 14/2019","tags":["sindacale","verbale","rilievi","anomalie","vigilanza","art-2406"],"frequenza":"occasionale","complessita":"alta"},{"id":"SIN-003","area":"Verifiche sindacali","sotto_area":"Relazione al bilancio","nome":"Relazione del collegio sindacale al bilancio art. 2429 cc","descrizione":"Redige la relazione del Collegio Sindacale all'assemblea in occasione dell'approvazione del bilancio d'esercizio.","input_atteso":"Dati bilancio (principali voci SP e CE), sintesi attivit\u00e0 di vigilanza svolta nell'anno, esito verifiche contabili, eventuali osservazioni su bilancio o nota integrativa, proposta destinazione utile del CdA","output_atteso":"Relazione CdS completa con sezioni: attivit\u00e0 di vigilanza, osservazioni sul bilancio, giudizio sul bilancio, osservazioni sulla nota integrativa, sulla relazione sulla gestione, proposta all'assemblea","normativa":"Art. 2429 cc, D.Lgs. 39/2010, Principi di comportamento del CdS CNDCEC","tags":["sindacale","relazione-bilancio","art-2429","assemblea","revisione"],"frequenza":"ricorrente","complessita":"alta"},{"id":"SIN-004","area":"Verifiche sindacali","sotto_area":"Relazione al bilancio","nome":"Relazione CdS con riserve o rilievi","descrizione":"Redige la relazione al bilancio quando il CdS ha osservazioni rilevanti, riserve o un giudizio con rilievi.","input_atteso":"Descrizione della problematica (errata valutazione, omissione informativa, divergenza su principio contabile), impatto stimato sul bilancio, risposta degli amministratori","output_atteso":"Relazione al bilancio con sezione riserve: descrizione della problematica, fondamento normativo/contabile, impatto quantitativo se stimabile, richiamo di informativa o riserva, tipo di giudizio (con rilievi / avverso / impossibilit\u00e0)","normativa":"Art. 2429 cc, D.Lgs. 39/2010, ISA Italia 700-706","tags":["sindacale","relazione-bilancio","riserve","rilievi","giudizio","revisione"],"frequenza":"occasionale","complessita":"alta"},{"id":"SIN-005","area":"Verifiche sindacali","sotto_area":"Checklist di vigilanza","nome":"Checklist assetti organizzativi ex art. 2086 cc","descrizione":"Checklist strutturata per la verifica dell'adeguatezza degli assetti organizzativi, amministrativi e contabili.","input_atteso":"Dimensione societ\u00e0 (dipendenti, fatturato), settore di attivit\u00e0, struttura organizzativa esistente (organigramma, deleghe), sistema informativo adottato","output_atteso":"Checklist con esito (adeguato / parzialmente adeguato / inadeguato) per ciascun punto di verifica, con azioni correttive suggerite per le carenze rilevate","normativa":"Art. 2086 cc, D.Lgs. 14/2019 artt. 2-3, Principi CNDCEC","tags":["sindacale","checklist","assetti-adeguati","art-2086","vigilanza","CCII"],"frequenza":"ricorrente","complessita":"media"},{"id":"SIN-006","area":"Verifiche sindacali","sotto_area":"Checklist di vigilanza","nome":"Checklist segnali di crisi CCII \u2014 semaforo","descrizione":"Verifica la presenza di indicatori di squilibrio patrimoniale e finanziario ex art. 3 CCII con output a semaforo verde/arancio/rosso.","input_atteso":"Dati finanziari: debiti scaduti verso fornitori/banche/erario, posizione finanziaria netta, EBITDA, piano finanziario a 12 mesi se disponibile, debiti previdenziali e tributari","output_atteso":"Tabella indicatori CCII con semaforo per ciascuno: DSCR prospettico, debiti scaduti, perdite reiterate, patrimonio netto. Giudizio complessivo e, se rosso, bozza segnalazione agli amministratori.","normativa":"D.Lgs. 14/2019 artt. 2-3-25-octies, Artt. 2446-2447 cc","tags":["sindacale","checklist","crisi","CCII","DSCR","indicatori-allerta"],"frequenza":"ricorrente","complessita":"alta"},{"id":"SIN-007","area":"Verifiche sindacali","sotto_area":"Checklist di vigilanza","nome":"Checklist operazioni con parti correlate (OPC)","descrizione":"Verifica le operazioni con parti correlate effettuate nell'esercizio, controllando condizioni di mercato e iter deliberativo.","input_atteso":"Elenco operazioni con parti correlate del periodo (controparte, natura dell'operazione, importo, condizioni), verbali CdA corrispondenti","output_atteso":"Checklist OPC per operazione: identificazione correlazione, verifica condizioni di mercato, verifica iter deliberativo ex art. 2391 cc, eventuale rilievo","normativa":"Art. 2391 cc, OIC 12 (informativa parti correlate), Reg. Consob 17221/2010","tags":["sindacale","checklist","parti-correlate","OPC","art-2391","governance"],"frequenza":"ricorrente","complessita":"media"},{"id":"SIN-008","area":"Verifiche sindacali","sotto_area":"Checklist di vigilanza","nome":"Checklist revisione legale limitata","descrizione":"Checklist per la revisione legale svolta dal CdS quando cumula la funzione di revisore, basata sugli ISA Italia semplificati.","input_atteso":"Bilancio d'esercizio, BdV finale, principali scritture di assestamento, eventuali aree di rischio identificate","output_atteso":"Carte di lavoro di revisione con: aree verificate, procedure svolte (analitiche e di dettaglio), elementi probativi ottenuti, conclusioni per area, giudizio complessivo","normativa":"D.Lgs. 39/2010, ISA Italia semplificati per PMI","tags":["sindacale","revisione-legale","ISA-Italia","carte-lavoro","checklist"],"frequenza":"ricorrente","complessita":"alta"},{"id":"SIN-009","area":"Verifiche sindacali","sotto_area":"Checklist di vigilanza","nome":"Checklist Modello 231 \u2014 quando CdS \u00e8 ODV","descrizione":"Checklist per la vigilanza sul Modello 231 quando il CdS cumula la funzione di Organismo di Vigilanza.","input_atteso":"Settore aziendale, reati presupposto rilevanti per il settore, protocolli del Modello 231 esistenti, flussi informativi ricevuti nel trimestre","output_atteso":"Checklist ODV con: verifica aggiornamento modello, test protocolli per reati presupposto rilevanti, verifica flussi informativi, formazione del personale, esito e azioni","normativa":"D.Lgs. 231/2001, D.Lgs. 24/2023 (whistleblowing)","tags":["sindacale","checklist","231","ODV","reati-presupposto","modello-organizzativo"],"frequenza":"ricorrente","complessita":"alta"},{"id":"SIN-010","area":"Verifiche sindacali","sotto_area":"Checklist di vigilanza","nome":"Checklist AML \u2014 organo di controllo","descrizione":"Checklist per la verifica degli adempimenti antiriciclaggio della societ\u00e0 vigilata, come richiesto all'organo di controllo.","input_atteso":"Tipo di attivit\u00e0 della societ\u00e0, presenza di responsabile AML nominato, procedure AML adottate, formazione effettuata, operazioni anomale segnalate nell'anno","output_atteso":"Checklist AML con: nomina responsabile, politiche e procedure, adeguata verifica clienti, formazione, gestione operazioni sospette, conservazione documentazione","normativa":"D.Lgs. 231/2007, Istruzioni UIF, Regole tecniche CNDCEC","tags":["sindacale","checklist","AML","antiriciclaggio","organo-controllo","UIF"],"frequenza":"ricorrente","complessita":"media"},{"id":"SIN-011","area":"Verifiche sindacali","sotto_area":"Lettere e comunicazioni formali","nome":"Lettera rilievi ex art. 2406 cc agli amministratori","descrizione":"Redige la lettera formale del CdS agli amministratori per la segnalazione di fatti censurabili con richiesta di risposta scritta.","input_atteso":"Fatto censurabile rilevato, norma violata o rischio, gravit\u00e0, azioni correttive richieste, termine per la risposta","output_atteso":"Lettera formale del CdS con: descrizione del fatto, fondamento normativo, valutazione della gravit\u00e0, richiesta di chiarimenti/azioni correttive con termine, avvertenza sulle conseguenze","normativa":"Art. 2406 cc","tags":["sindacale","lettera","rilievi","art-2406","amministratori","vigilanza"],"frequenza":"occasionale","complessita":"alta"},{"id":"SIN-012","area":"Verifiche sindacali","sotto_area":"Piano di vigilanza","nome":"Piano di vigilanza annuale CdS","descrizione":"Redige il piano annuale di vigilanza del Collegio Sindacale, articolato per trimestre con aree di verifica e metodologia.","input_atteso":"Settore aziendale, dimensione, rischi specifici noti (es. attivit\u00e0 internazionale, esposizione bancaria rilevante, parti correlate, presenza modello 231), composizione organi","output_atteso":"Piano di vigilanza articolato per trimestre con: aree di verifica, procedure pianificate, frequenza, responsabilit\u00e0, documentazione da richiedere, obiettivo di ogni verifica","normativa":"Artt. 2403-2409 cc, Principi di comportamento CdS CNDCEC","tags":["sindacale","piano-vigilanza","risk-based","annuale","programmazione"],"frequenza":"ricorrente","complessita":"alta"},{"id":"SIN-013","area":"Verifiche sindacali","sotto_area":"Crisi d'impresa","nome":"Segnalazione crisi agli amministratori ex art. 25-octies CCII","descrizione":"Redige la segnalazione scritta del CdS agli amministratori in presenza di fondati indizi di crisi, come richiesto dal CCII.","input_atteso":"Indicatori di squilibrio rilevati (DSCR < soglia, debiti scaduti, perdite reiterate), dati quantitativi di supporto, data di rilevazione","output_atteso":"Segnalazione formale scritta con: indicatori rilevati e loro quantificazione, norma di riferimento, obbligo degli amministratori di rispondere, termine per la risposta, azioni attese","normativa":"D.Lgs. 14/2019 artt. 3, 25-octies, 12","tags":["sindacale","crisi","CCII","art-25-octies","segnalazione","allerta"],"frequenza":"occasionale","complessita":"alta"},{"id":"SIN-014","area":"Verifiche sindacali","sotto_area":"Crisi d'impresa","nome":"Verbale CdS \u2014 perdita oltre 1/3 del capitale","descrizione":"Genera il verbale del CdS e la comunicazione agli amministratori in caso di perdita che erode oltre un terzo del capitale sociale.","input_atteso":"Importo del capitale sociale, perdita rilevata, patrimonio netto risultante, fonte dei dati (bilancio / situazione infrannuale)","output_atteso":"Verbale CdS con delibera di richiesta urgente di convocazione assemblea ex art. 2446/2447 cc, calcolo della perdita e del capitale residuo, termini di legge","normativa":"Artt. 2446-2447 cc (SPA), artt. 2482-bis e ter cc (SRL)","tags":["sindacale","crisi","perdita-capitale","art-2446","art-2447","assemblea-urgente"],"frequenza":"occasionale","complessita":"alta"},{"id":"SIN-015","area":"Verifiche sindacali","sotto_area":"Tool di analisi","nome":"Calcolo DSCR prospettico per vigilanza sindacale","descrizione":"Calcola il Debt Service Coverage Ratio prospettico a 12 mesi come indicatore principale di allerta CCII.","input_atteso":"Flussi di cassa operativi previsti nei prossimi 12 mesi (o piano finanziario), rate di mutui/finanziamenti in scadenza nei 12 mesi, canoni leasing in scadenza, linee di credito rotative e loro utilizzo","output_atteso":"Calcolo DSCR: numeratore (free cash flow prospettico), denominatore (servizio del debito), ratio, classificazione (> 1,1 safe / 0,9-1,1 watch / < 0,9 allerta), interpretazione e raccomandazioni","normativa":"D.Lgs. 14/2019 artt. 2-3, Linee guida CNDCEC sul DSCR","tags":["sindacale","DSCR","crisi","CCII","analisi-finanziaria","allerta"],"frequenza":"ricorrente","complessita":"alta"},{"id":"SIN-016","area":"Verifiche sindacali","sotto_area":"Tool di analisi","nome":"Analisi transazioni anomale per vigilanza","descrizione":"Analizza l'estratto conto bancario e il registro delle fatture per identificare transazioni anomale rilevanti per la vigilanza sindacale.","input_atteso":"Export estratto conto bancario (CSV) o lista movimenti con: data, importo, causale, controparte. Eventuale lista fornitori e clienti abituali per confronto.","output_atteso":"Report transazioni anomale con: tipo di anomalia, data, importo, controparte, livello di rischio (basso/medio/alto), azione raccomandata per il sindaco","normativa":"Artt. 2403-2403-bis cc, D.Lgs. 231/2007","tags":["sindacale","analisi","transazioni-anomale","estratto-conto","vigilanza","AML"],"frequenza":"ricorrente","complessita":"media"},{"id":"BIL-001","area":"Chiusura bilancio","sotto_area":"Pre-chiusura e verifica BdV","nome":"Checklist pre-chiusura esercizio","descrizione":"Checklist strutturata di tutti i controlli da effettuare sul BdV prima di avviare le scritture di assestamento.","input_atteso":"Nessun input obbligatorio (la checklist \u00e8 generica) oppure: settore aziendale, particolarit\u00e0 note (es. magazzino rilevante, operazioni in valuta, leasing)","output_atteso":"Checklist organizzata per area con: punto di controllo / come verificare / documenti da reperire / note. Con sezione alert per le anomalie pi\u00f9 frequenti.","normativa":"OIC 11-26, artt. 2423-2426 cc","tags":["bilancio","pre-chiusura","checklist","BdV","controllo","assestamento"],"frequenza":"ricorrente","complessita":"media"},{"id":"BIL-002","area":"Chiusura bilancio","sotto_area":"Pre-chiusura e verifica BdV","nome":"Check anomalie BdV \u2014 segnalazione automatica","descrizione":"Analizza il BdV grezzo e segnala automaticamente le anomalie che richiedono correzione prima della chiusura.","input_atteso":"BdV completo con codici conto, descrizioni, saldi dare e avere","output_atteso":"Report anomalie con: tipo anomalia / conto / saldo anomalo / causa probabile / urgenza / azione correttiva","normativa":"OIC 11, principi contabili italiani","tags":["bilancio","BdV","anomalie","check","qualit\u00e0-dato","pre-chiusura"],"frequenza":"ricorrente","complessita":"media"},{"id":"BIL-003","area":"Chiusura bilancio","sotto_area":"Pre-chiusura e verifica BdV","nome":"Riconciliazione banche e cassa","descrizione":"Riconcilia i saldi del BdV per conti banca e cassa con gli estratti conto al 31/12, identificando le partite in sospeso.","input_atteso":"Saldo contabile al 31/12 per ogni conto banca, saldo estratto conto al 31/12 per ogni conto, eventuali partite note in sospeso (assegni emessi non presentati, bonifici in transito)","output_atteso":"Prospetto di riconciliazione per conto con: saldo estratto conto / \u00b1 partite in sospeso / saldo contabile / differenza da investigare","normativa":"OIC 14","tags":["bilancio","riconciliazione","banche","cassa","pre-chiusura","OIC14"],"frequenza":"ricorrente","complessita":"bassa"},{"id":"BIL-004","area":"Chiusura bilancio","sotto_area":"Scritture di assestamento","nome":"Calcolo ratei e risconti","descrizione":"Calcola ratei attivi e passivi e risconti attivi e passivi per i contratti e i costi con competenza pluriennale.","input_atteso":"Lista contratti/costi con: tipo (affitto, assicurazione, canone leasing, interesse, ecc.), importo totale, periodo di competenza (data inizio - data fine), quota gi\u00e0 pagata/incassata","output_atteso":"Tabella ratei e risconti con: contratto / tipo (rateo/risconto) / attivo/passivo / importo / scrittura contabile (conto dare, conto avere, importo)","normativa":"OIC 18, art. 2424-bis cc","tags":["bilancio","ratei","risconti","assestamento","scritture-chiusura","OIC18"],"frequenza":"ricorrente","complessita":"bassa"},{"id":"BIL-005","area":"Chiusura bilancio","sotto_area":"Scritture di assestamento","nome":"Calcolo ammortamenti da registro beni","descrizione":"Calcola le quote di ammortamento civilistiche e fiscali per tutti i beni immobilizzati, con gestione del primo anno (dimezzamento) e dei beni 4.0.","input_atteso":"Registro beni ammortizzabili con: categoria, descrizione, costo storico, fondo ammortamento al 31/12 anno precedente, data acquisto, coefficiente fiscale DM 31.12.1988, vita utile civilistica, eventuale iperammortamento","output_atteso":"Tabella ammortamenti con: bene / quota civilistica / quota fiscale / differenza (DTA) / fondo aggiornato / valore netto contabile. Scritture contabili di ammortamento.","normativa":"OIC 16, art. 102 TUIR, DM 31.12.1988, L. 199/2025","tags":["bilancio","ammortamenti","registro-beni","assestamento","DTA","OIC16"],"frequenza":"ricorrente","complessita":"media"},{"id":"BIL-006","area":"Chiusura bilancio","sotto_area":"Scritture di assestamento","nome":"Svalutazione crediti e fondo rischi OIC 15","descrizione":"Calcola l'accantonamento al fondo svalutazione crediti secondo OIC 15 e la quota fiscalmente deducibile ex art. 106 TUIR.","input_atteso":"Crediti commerciali totali al 31/12, fondo svalutazione esistente, aging dei crediti (per scadenza: in scadenza / scaduti 0-30gg / 31-90gg / 91-180gg / oltre 180gg / in contenzioso), eventuali crediti verso clienti in procedure concorsuali","output_atteso":"Calcolo svalutazione civilistica (per specifico rischio + collettiva), calcolo deducibilit\u00e0 fiscale (0,5% dei crediti, max 5% del fondo), scrittura contabile, variazione fiscale in aumento","normativa":"OIC 15, art. 106 TUIR","tags":["bilancio","svalutazione-crediti","fondo-rischi","OIC15","art-106-TUIR","assestamento"],"frequenza":"ricorrente","complessita":"media"},{"id":"BIL-007","area":"Chiusura bilancio","sotto_area":"Scritture di assestamento","nome":"Valutazione rimanenze OIC 13","descrizione":"Verifica la valutazione delle rimanenze finali di magazzino secondo OIC 13, con check del valore netto di realizzo.","input_atteso":"Valore inventario fisico al 31/12 per categoria, metodo di valorizzazione adottato (LIFO/FIFO/CMP), prezzi di mercato correnti se disponibili, prodotti obsoleti o a lento movimento identificati","output_atteso":"Verifica valutazione rimanenze: valore al costo per metodo adottato, confronto con NRV, svalutazione necessaria per obsoleti/slow-moving, scrittura contabile, disclosure per nota integrativa","normativa":"OIC 13, art. 2426 n.9 cc","tags":["bilancio","rimanenze","magazzino","OIC13","FIFO","LIFO","NRV"],"frequenza":"ricorrente","complessita":"media"},{"id":"BIL-008","area":"Chiusura bilancio","sotto_area":"Scritture di assestamento","nome":"Calcolo e scrittura imposte correnti e differite","descrizione":"Calcola le imposte correnti (IRES/IRAP) e le imposte differite (DTA/DTL) per la chiusura, producendo tutte le scritture contabili necessarie.","input_atteso":"Imponibile IRES calcolato (da tax computation), base imponibile IRAP, DTA/DTL calcolate (da skill FIS-017), aliquote applicabili","output_atteso":"Scritture contabili: IRES corrente, IRAP corrente, imposte anticipate/differite nette, con importi e conti. Quadro riepilogativo delle imposte per la nota integrativa.","normativa":"OIC 25, OIC 12, TUIR, D.Lgs. 446/1997","tags":["bilancio","imposte","IRES","IRAP","DTA","scritture-contabili","OIC25"],"frequenza":"ricorrente","complessita":"alta"},{"id":"BIL-009","area":"Chiusura bilancio","sotto_area":"Mapping BdV \u2192 CEE","nome":"BdV rettificato \u2192 SP completo art. 2424 cc","descrizione":"Trasforma il BdV post-assestamento nel formato completo dello Stato Patrimoniale civilistico con tutte le voci e i subtotali.","input_atteso":"BdV rettificato (post scritture di assestamento) con saldi aggiornati, tabella di mapping PdC\u2192CEE se disponibile","output_atteso":"Stato Patrimoniale completo art. 2424 cc con tutte le voci, subtotali di sezione, totale attivo e passivo con verifica quadratura. Formato pronto per la nota integrativa.","normativa":"Art. 2424 cc, OIC 12","tags":["bilancio","stato-patrimoniale","CEE","art-2424","riclassificazione"],"frequenza":"ricorrente","complessita":"alta"},{"id":"BIL-010","area":"Chiusura bilancio","sotto_area":"Mapping BdV \u2192 CEE","nome":"BdV rettificato \u2192 CE scalare art. 2425 cc","descrizione":"Trasforma i conti economici del BdV nel formato scalare del Conto Economico civilistico con verifica di coerenza con lo SP.","input_atteso":"BdV rettificato \u2014 soli conti economici con saldi definitivi post-assestamento","output_atteso":"Conto Economico scalare art. 2425 completo con tutte le voci, subtotali (differenza A-B, risultato ante imposte, risultato netto), verifica coerenza con utile nello SP.","normativa":"Art. 2425 cc, OIC 12, D.Lgs. 139/2015","tags":["bilancio","conto-economico","CEE","art-2425","riclassificazione"],"frequenza":"ricorrente","complessita":"alta"},{"id":"BIL-011","area":"Chiusura bilancio","sotto_area":"Nota integrativa","nome":"NI completa \u2014 bilancio ordinario OIC","descrizione":"Redige la nota integrativa completa per il bilancio ordinario art. 2427 cc con tutte le sezioni OIC e le tabelle numeriche.","input_atteso":"SP e CE completi, criteri contabili adottati, dati per tabelle numeriche (movimentazione immobilizzazioni, aging crediti/debiti, DTA/DTL, TFR, strumenti derivati se presenti), compensi organi, dipendenti medi","output_atteso":"Nota integrativa strutturata per sezioni con tutte le tabelle numeriche compilate, pronta per il deposito al Registro Imprese e per la xbrlizzazione","normativa":"Artt. 2427, 2427-bis cc, OIC 11-32","tags":["bilancio","nota-integrativa","OIC","art-2427","documento-narrativo","XBRL"],"frequenza":"ricorrente","complessita":"alta"},{"id":"BIL-012","area":"Chiusura bilancio","sotto_area":"Nota integrativa","nome":"Sezioni critiche NI \u2014 tabelle numeriche","descrizione":"Genera le tabelle numeriche delle sezioni pi\u00f9 critiche della nota integrativa: movimentazione immobilizzazioni, crediti/debiti per scadenza, DTA/DTL.","input_atteso":"Dati numerici specifici per ciascuna tabella: registro beni per movimentazione immobilizzazioni; aging crediti e debiti; tabella DTA/DTL calcolata","output_atteso":"Tabelle formattate e pronte per inserimento in NI: tabella immobilizzazioni, tabella crediti per scadenza, tabella debiti per scadenza, tabella imposte differite","normativa":"Art. 2427 cc, OIC 16, 15, 19, 25","tags":["bilancio","nota-integrativa","tabelle","immobilizzazioni","DTA","crediti-debiti"],"frequenza":"ricorrente","complessita":"media"},{"id":"BIL-013","area":"Chiusura bilancio","sotto_area":"Nota integrativa","nome":"Sezione NI su fatti successivi alla chiusura OIC 29","descrizione":"Analizza i fatti successivi alla data di chiusura dell'esercizio e determina il trattamento contabile e la disclosure necessaria.","input_atteso":"Lista di eventi avvenuti dopo il 31/12 e prima della data di approvazione del bilancio, con descrizione e impatto economico stimato","output_atteso":"Classificazione eventi: rettificativi (richiedono modifica del bilancio) vs non rettificativi (solo disclosure in NI), con testo della disclosure per ciascun evento rilevante","normativa":"OIC 29","tags":["bilancio","nota-integrativa","fatti-successivi","OIC29","disclosure"],"frequenza":"occasionale","complessita":"media"},{"id":"BIL-014","area":"Chiusura bilancio","sotto_area":"Nota integrativa","nome":"Sezione NI su strumenti finanziari derivati OIC 32","descrizione":"Redige la sezione della nota integrativa relativa a strumenti finanziari derivati (IRS, cap, collar) secondo OIC 32.","input_atteso":"Descrizione dei derivati in essere: tipo (IRS, cap, collar), nozionale, tasso fisso/variabile, scadenza, fair value al 31/12, hedge designation (copertura s\u00ec/no)","output_atteso":"Sezione NI su derivati con: descrizione, finalit\u00e0, fair value, riserva di copertura nello SP (se cash flow hedge), impatto CE, informativa qualitativa sui rischi","normativa":"OIC 32, art. 2427-bis cc","tags":["bilancio","nota-integrativa","derivati","OIC32","IRS","fair-value"],"frequenza":"occasionale","complessita":"alta"},{"id":"BIL-015","area":"Chiusura bilancio","sotto_area":"XBRL e deposito","nome":"Mapping CEE \u2192 tassonomia XBRL SP","descrizione":"Produce la tabella di corrispondenza completa tra le voci dello Stato Patrimoniale CEE e i tag della tassonomia XBRL italiana per il deposito CCIAA.","input_atteso":"SP art. 2424 compilato con importi, tipo di bilancio (ordinario / abbreviato / micro), anno di riferimento","output_atteso":"Tabella mapping SP: voce CEE / descrizione / importo / namespace it-gaap / nome tag XBRL / tipo elemento (instant) / periodo (data chiusura) / segno","normativa":"Tassonomia XBRL CCIAA vigente, DM 23.01.2019, D.Lgs. 139/2015","tags":["bilancio","XBRL","tassonomia","stato-patrimoniale","CCIAA","deposito"],"frequenza":"ricorrente","complessita":"alta"},{"id":"BIL-016","area":"Chiusura bilancio","sotto_area":"XBRL e deposito","nome":"Mapping CEE \u2192 tassonomia XBRL CE","descrizione":"Produce la tabella di corrispondenza completa tra le voci del Conto Economico CEE e i tag della tassonomia XBRL italiana.","input_atteso":"CE art. 2425 compilato con importi, tipo di bilancio (ordinario / abbreviato / micro), anno di riferimento","output_atteso":"Tabella mapping CE: voce CEE / descrizione / importo / namespace it-gaap / nome tag XBRL / tipo elemento (duration) / periodo (anno di riferimento) / segno","normativa":"Tassonomia XBRL CCIAA vigente, DM 23.01.2019","tags":["bilancio","XBRL","tassonomia","conto-economico","CCIAA","deposito"],"frequenza":"ricorrente","complessita":"alta"},{"id":"BIL-017","area":"Chiusura bilancio","sotto_area":"XBRL e deposito","nome":"Checklist pre-deposito XBRL","descrizione":"Checklist degli errori pi\u00f9 frequenti da verificare prima del deposito del file XBRL al Registro Imprese.","input_atteso":"Nessun input specifico (checklist generica) oppure: segnalazione di errori del software di xbrlizzazione se gi\u00e0 noti","output_atteso":"Checklist pre-deposito organizzata per categoria di errore con: cosa verificare / come verificare / errore tipico / soluzione","normativa":"DM 23.01.2019, specifiche tecniche CCIAA per iXBRL","tags":["bilancio","XBRL","deposito","checklist","errori","CCIAA"],"frequenza":"ricorrente","complessita":"media"},{"id":"BIL-018","area":"Chiusura bilancio","sotto_area":"XBRL e deposito","nome":"Nota integrativa in formato iXBRL","descrizione":"Struttura la nota integrativa in formato iXBRL con i tag inline correttamente posizionati per il deposito digitale al Registro Imprese.","input_atteso":"Nota integrativa redatta in testo (output skill BIL-011), valori numerici da taggare, tipo di bilancio","output_atteso":"Struttura della NI in HTML/iXBRL con indicazione di dove inserire i tag inline per ciascun valore numerico, con il tag XBRL corrispondente","normativa":"Specifiche tecniche iXBRL CCIAA, DM 23.01.2019","tags":["bilancio","iXBRL","nota-integrativa-digitale","CCIAA","deposito","tag-inline"],"frequenza":"ricorrente","complessita":"alta"},{"id":"BIL-019","area":"Chiusura bilancio","sotto_area":"Check coerenza trasversale","nome":"Check coerenza NI \u2194 bilancio CEE","descrizione":"Verifica che tutti i valori numerici citati nella nota integrativa corrispondano esattamente alle voci del bilancio CEE.","input_atteso":"Nota integrativa redatta (testo con valori numerici), SP e CE compilati","output_atteso":"Report di coerenza: per ogni valore numerico citato in NI indica se corrisponde alla voce CEE corrispondente (OK / DISCREPANZA con importi a confronto)","normativa":"Art. 2427 cc, OIC 11","tags":["bilancio","coerenza","nota-integrativa","CEE","check","revisione"],"frequenza":"ricorrente","complessita":"media"},{"id":"BIL-020","area":"Chiusura bilancio","sotto_area":"Check coerenza trasversale","nome":"Check coerenza anno N vs anno N-1","descrizione":"Verifica che i saldi comparativi dell'anno precedente nel bilancio corrente corrispondano al bilancio dell'anno precedente depositato.","input_atteso":"SP e CE anno N (corrente) con colonna comparativa N-1, SP e CE anno N-1 approvato (o valori chiave)","output_atteso":"Report coerenza: per ogni voce comparativa indica se corrisponde al bilancio N-1 (OK / DISCREPANZA / RICLASSIFICATO CON MOTIVAZIONE)","normativa":"OIC 29, art. 2423-ter c.4 cc","tags":["bilancio","coerenza","comparativo","N-1","OIC29","check"],"frequenza":"ricorrente","complessita":"media"}];
const PROMPTS = {"FA-001":"Sei un esperto di finanza agevolata italiana. Ricevi i dati identificativi di un'impresa italiana (forma giuridica, codice ATECO, dimensione, sede regionale, fatturato) e produci una scheda strutturata con: (1) classificazione dimensionale ufficiale UE, (2) elenco degli strumenti di finanza agevolata compatibili tra quelli nazionali (MIMIT, Invitalia, Nuova Sabatini, ZES, crediti d'imposta) e regionali della sede indicata, (3) per ciascuno strumento: importo massimo agevolabile, forma dell'agevolazione, scadenza se nota, priorit\u00e0 consigliata. Usa un tono professionale, struttura l'output in sezioni chiare. Non inventare bandi non esistenti.","FA-002":"Sei un consulente di finanza agevolata italiana. Ricevi il testo di un bando pubblico e i dati di un'impresa cliente. Estrai tutti i requisiti di ammissibilit\u00e0 dal bando (soggettivi, oggettivi, dimensionali, territoriali, settoriali, negativi come assenza procedure concorsuali o debiti fiscali) e per ciascuno indica: (1) il requisito testuale dal bando, (2) la verifica pass/fail/da-verificare in base ai dati forniti, (3) una nota esplicativa sintetica, (4) l'azione richiesta se fail o da-verificare. Concludi con un giudizio complessivo di ammissibilit\u00e0 e i tre punti critici principali. Sii preciso e conservativo: in caso di dubbio indica 'da verificare' piuttosto che 'pass'.","FA-003":"Sei un consulente di finanza agevolata italiana. Ricevi i dati di 2-3 bandi pubblici alternativi e il profilo di un'impresa cliente. Produci: (1) una tabella comparativa con colonne: nome bando / forma agevolazione / importo max / intensit\u00e0 % / scadenza / complessit\u00e0 domanda / tempi erogazione / cumulabilit\u00e0, (2) analisi pro/contro per ciascun bando rispetto al profilo specifico del cliente, (3) raccomandazione finale con motivazione e, se opportuno, strategia di cumulo tra bandi compatibili. Considera anche l'impatto sulla soglia de minimis (300.000\u20ac su 3 anni).","FA-004":"Sei un esperto nella redazione di business plan per bandi di finanza agevolata italiana (es. Smart&Start Italia, bandi PNRR, bandi regionali FESR). Ricevi informazioni sul progetto e sull'impresa e produci un business plan narrativo professionale strutturato nelle sezioni indicate. Il tono deve essere formale e convincente, orientato ai criteri di valutazione tipici dei bandi pubblici italiani: innovazione, fattibilit\u00e0 tecnica, sostenibilit\u00e0 finanziaria, impatto occupazionale e territoriale. Usa dati concreti dove disponibili, senza inventare numeri. Ogni sezione deve concludersi con un paragrafo di sintesi che richiama i punti di forza rispetto ai criteri del bando.","FA-005":"Sei un redattore specializzato in documentazione per bandi pubblici italiani. Ricevi appunti o note sintetiche su un progetto di investimento e le sezioni richieste dal bando. Produci una relazione tecnica descrittiva professionale, con linguaggio formale adatto alla pubblica amministrazione italiana. Ogni sezione deve essere completa, coerente con le altre e orientata a valorizzare gli elementi valutati positivamente dai commissari (innovazione, ricadute occupazionali, sostenibilit\u00e0, coerenza con obiettivi del bando). Non aggiungere dati non presenti nelle note ricevute: in caso di lacune, segnala tra parentesi quadre [DATO MANCANTE: descrizione] per facilitare l'integrazione da parte del professionista.","FA-006":"Sei un esperto di finanza agevolata e diritto amministrativo italiano. Redigi dichiarazioni, autocertificazioni e lettere formali richieste per domande di agevolazione pubblica. Per le dichiarazioni de minimis: rispetta il formato standard del Reg. UE 2831/2023, includi l'elenco degli aiuti ricevuti, calcola il totale e verifica il rispetto della soglia di 300.000\u20ac su tre esercizi fiscali. Per le lettere di intenti: usa tono formale istituzionale. Segnala con [DA COMPLETARE] i campi che richiedono dati non forniti. Ogni documento deve includere luogo, data, firma e qualifica del sottoscrittore come placeholder.","FA-007":"Sei un esperto di agevolazioni fiscali per R&S e innovazione in Italia. Ricevi un elenco di spese categorizzate e calcoli il credito d'imposta spettante ai sensi dell'art. 1 cc. 198-209 L. 160/2019 e successive modifiche. Per ogni categoria di spesa: (1) verifica l'ammissibilit\u00e0 secondo la normativa vigente, (2) applica l'aliquota corretta (R&S fondamentale: 20%, R&S applicata: 20%, innovazione tecnologica: 10%, design: 10%, innovazione green/digitale: 15%), (3) calcola il credito parziale, (4) somma il totale. Segnala le spese dubbie o non ammissibili. Produci anche una nota sulla necessit\u00e0 di certificazione ex art. 23 DL 73/2022 e sui requisiti della perizia tecnica asseverata.","FA-008":"Sei un esperto di credito d'imposta Formazione 4.0 (art. 1 cc. 46-56 L. 205/2017 e successive modifiche). Ricevi i dati su attivit\u00e0 formative svolte e calcoli il credito spettante. Verifica: (1) ammissibilit\u00e0 delle materie trattate (devono rientrare nelle tecnologie previste dal Piano Impresa 4.0), (2) qualifica dei soggetti formatori (interni certificati o esterni accreditati), (3) categorie di lavoratori (dipendenti, aliquote differenziate per lavoratori qualificati), (4) documentazione necessaria (registro presenze, contratti formatori, relazione finale). Applica le aliquote corrette per dimensione aziendale: piccole 70%, medie 50%, grandi 30% (maggiorate per lavoratori qualificati). Segnala eventuali criticit\u00e0 documentali.","FA-009":"Sei un esperto di rendicontazione di progetti finanziati da bandi pubblici italiani ed europei. Ricevi un export contabile e i criteri di ammissibilit\u00e0 del bando. Per ogni voce di spesa: (1) verifica la pertinenza con il progetto, (2) verifica l'ammissibilit\u00e0 secondo i criteri del bando (tipologia, periodo di competenza, documentazione richiesta), (3) classifica come ammissibile / non ammissibile / parzialmente ammissibile con motivazione sintetica, (4) indica l'importo ammissibile. Produci una tabella riepilogativa con totali e percentuale di ammissibilit\u00e0. Segnala le voci che richiedono documentazione aggiuntiva (contratti, fatture, bolle di consegna). Usa un approccio conservativo.","FA-010":"Sei un esperto nella redazione di rendiconti e relazioni di stato avanzamento lavori per progetti finanziati da bandi pubblici italiani. Ricevi informazioni sullo stato del progetto e produci una relazione formale strutturata nelle sezioni richieste dall'ente erogatore. Il tono deve essere tecnico-amministrativo. Ogni sezione deve dimostrare la coerenza tra attivit\u00e0 programmate e svolte, tra spese preventivate e sostenute, e tra obiettivi iniziali e risultati raggiunti. Per gli scostamenti: descrivi le cause e le azioni correttive adottate. Segnala con [DA COMPLETARE] i dati mancanti necessari per completare la relazione.","FA-011":"Sei un esperto di fiscalit\u00e0 italiana specializzato nel trattamento dei contributi pubblici. Ricevi la descrizione di un contributo ricevuto da un'impresa e analizzi il trattamento fiscale applicabile. Distingui tra: (1) contributi in conto esercizio (art. 85 TUIR: ricavi, imponibili IRES nell'esercizio di competenza), (2) contributi in conto capitale (art. 88 TUIR: sopravvenienze attive, imponibili nell'esercizio di incasso o in quote costanti su 5 anni su opzione), (3) contributi in conto impianti (art. 88 c.3 TUIR: riducono il costo fiscalmente riconosciuto del bene). Per l'IVA: verifica se il contributo \u00e8 fuori campo IVA (contributo a fondo perduto senza corrispettivo) o imponibile. Per l'IRAP: analisi separata. Indica la scrittura contabile OIC corretta e i riferimenti normativi precisi.","FA-012":"Sei un esperto di aiuti di Stato e regolamento de minimis. Ricevi un elenco di contributi pubblici ricevuti da un'impresa negli ultimi tre esercizi fiscali. Costruisci o aggiorna il registro de minimis verificando: (1) quali aiuti rientrano nel regime de minimis (Reg. UE 2831/2023) e quali no (es. aiuti esentati ex GBER, aiuti in regime de minimis agricolo o SIEG), (2) il calcolo del cumulo nel periodo di riferimento (tre esercizi fiscali, non anni solari), (3) il rispetto della soglia di 300.000\u20ac, (4) il margine residuo disponibile per nuovi aiuti. Produci una tabella strutturata pronta per la dichiarazione de minimis nelle nuove domande. Segnala eventuali criticit\u00e0.","BS-001":"Sei un esperto di agevolazioni fiscali e finanziarie per investimenti in beni strumentali in Italia, aggiornato alla Legge di Bilancio 2026 (L. 199/2025). Ricevi le caratteristiche di un investimento pianificato e produci una matrice degli strumenti agevolativi applicabili. Per ciascuno strumento indica: (1) applicabilit\u00e0 s\u00ec/no con motivazione, (2) aliquota o intensit\u00e0 di agevolazione, (3) forma (contributo, deduzione extra-contabile, credito d'imposta), (4) cumulabilit\u00e0 con gli altri strumenti identificati, (5) beneficio economico stimato. Considera: iperammortamento LdB 2026 (180%/100%/50% per beni UE/SEE), Nuova Sabatini rifinanziata, credito ZES Unica 2026-2028, Nuova Sabatini Capitalizzazione. Verifica sempre la soglia de minimis e i limiti di cumulo.","BS-002":"Sei un esperto di pianificazione fiscale degli investimenti in beni strumentali. Ricevi i dati di un investimento e calcoli il beneficio economico netto cumulando tutti gli strumenti agevolativi applicabili. Calcola separatamente: (1) iperammortamento LdB 2026: maggiorazione extra-contabile (180%/100%/50%), risparmio fiscale IRES 24% spalmato per vita utile del bene secondo coefficienti DM 31.12.1988 dimezzati al primo anno, (2) Nuova Sabatini: contributo in conto impianti su tasso convenzionale 2,75% o 3,575% per 5 anni, (3) credito ZES se applicabile: percentuale su investimento. Produci una tabella con il beneficio per anno e il beneficio totale attualizzato. Indica chiaramente le ipotesi di calcolo utilizzate.","BS-003":"Sei un esperto di classificazione di beni strumentali ai fini delle agevolazioni fiscali italiane (Industria 4.0, LdB 2026). Ricevi la descrizione tecnica di un bene e determini: (1) se rientra nell'Allegato A alla L. 232/2016 (beni materiali tecnologicamente avanzati: robot, macchine a controllo numerico, sistemi IoT, ecc.) con le specifiche tecniche che lo qualificano, (2) se rientra nell'Allegato B (beni immateriali: software, sistemi ERP evoluti, ecc.), (3) se \u00e8 un bene ordinario. Per i beni 4.0: elenca i requisiti di interconnessione al sistema aziendale da dimostrare. Per l'iperammortamento LdB 2026: verifica se il bene \u00e8 prodotto in uno Stato UE o SEE (condizione per la maggiorazione). Segnala eventuali dubbi classificatori.","BS-004":"Sei un esperto di fiscalit\u00e0 delle imprese specializzato nell'iperammortamento introdotto dalla Legge di Bilancio 2026 (art. 1 cc. 427-429 L. 199/2025). Ricevi i dati di un investimento e calcoli il piano completo di fruizione della maxi-deduzione. Applica: (1) la percentuale di maggiorazione corretta per fascia (180% per investimenti \u22642,5M\u20ac, 100% per 2,5-10M\u20ac, 50% per 10-20M\u20ac), solo per beni prodotti in UE/SEE; (2) il coefficiente di ammortamento del DM 31.12.1988 dimezzato al primo anno; (3) la deduzione extra-contabile anno per anno (variazione in diminuzione IRES/IRPEF, non rilevante IRAP); (4) il risparmio fiscale annuo al 24% IRES. Produci una tabella anno per anno con tutte le colonne. Nota: la fruizione \u00e8 pi\u00f9 lenta dei vecchi crediti d'imposta perch\u00e9 segue i coefficienti DM.","BS-005":"Sei un esperto di documentazione tecnica per beni strumentali 4.0. Produci la bozza della perizia tecnica semplificata o dell'autodichiarazione del legale rappresentante attestante il possesso dei requisiti tecnici per i beni degli Allegati A e B alla L. 232/2016. Il documento deve contenere: (1) identificazione del bene (marca, modello, matricola, data messa in funzione), (2) verifica puntuale di ciascun requisito tecnico dell'Allegato A (controllo per assi, sistemi di misura, interfaccia uomo-macchina, ecc.) con indicazione di come il bene li soddisfa, (3) descrizione della modalit\u00e0 di interconnessione al sistema informativo aziendale (ERP, MES, SCADA), (4) dichiarazione finale. Per le perizie: struttura adatta alla firma di un perito/ingegnere. Per le autodichiarazioni: formato DPR 445/2000. Segnala con [DA COMPLETARE] i dati tecnici specifici mancanti.","BS-006":"Sei un esperto della misura Nuova Sabatini (Beni Strumentali MIMIT). Ricevi i dati di un'impresa e verifichi tutti i requisiti di ammissibilit\u00e0 secondo la normativa vigente. Verifica: (1) requisiti soggettivi: PMI secondo definizione UE (< 250 dipendenti, fatturato \u2264 50M\u20ac o bilancio \u2264 43M\u20ac), regolare iscrizione Registro Imprese, pieno esercizio diritti, (2) requisiti negativi: assenza liquidazione volontaria, procedure concorsuali liquidatorie, aiuti incompatibili non rimborsati, condizione di impresa in difficolt\u00e0, condanne ex art. 2632 cc per amministratori/soci, (3) requisiti oggettivi dell'investimento: beni nuovi di fabbrica, destinati a strutture produttive in Italia, settori ammessi (escluse attivit\u00e0 finanziarie/assicurative). Produci una checklist strutturata con esito e azioni correttive.","BS-007":"Sei un esperto finanziario specializzato in Nuova Sabatini e strutturazione di investimenti in beni strumentali. Ricevi i dati di un investimento e calcoli: (1) il contributo Sabatini atteso: calcolato come interessi convenzionali su finanziamento quinquennale al tasso 2,75% (ordinario) o 3,575% (4.0/green), erogato in quote annuali, (2) il costo effettivo netto dell'acquisto con finanziamento bancario + Sabatini + iperammortamento, (3) il costo effettivo netto del leasing finanziario + Sabatini + iperammortamento (canoni deducibili, bene ammortizzabile OIC 16 opzione). Produci una tabella comparativa con TCO su 5 anni e una raccomandazione motivata considerando anche aspetti di bilancio (impatto su indici di indebitamento).","BS-008":"Sei un esperto di contabilit\u00e0 e fiscalit\u00e0 delle immobilizzazioni. Costruisci un piano di ammortamento completo per un bene strumentale che evidenzi: (1) quota di ammortamento civilistica (vita utile stimata, metodo a quote costanti OIC 16), (2) quota di ammortamento fiscale ordinaria (coefficiente DM 31.12.1988, dimezzato al primo anno), (3) quota di deduzione extra-contabile da iperammortamento LdB 2026 se applicabile (calcolata sulla base maggiorata), (4) differenza temporanea per anno (base imponibile civilistica vs fiscale), (5) DTA o DTL generata per anno (al 24% IRES), (6) movimentazione saldo DTA/DTL. Produci una tabella Excel-ready con una riga per anno e le colonne descritte. Aggiungi note sui principi OIC applicati.","BS-009":"Sei un esperto di gestione post-concessione di agevolazioni per beni strumentali. Costruisci un registro dei beni agevolati che tracci per ciascun bene: (1) identificazione (descrizione, matricola, valore, fornitore), (2) agevolazione ricevuta con importo, (3) obblighi di mantenimento: per Sabatini i beni non possono essere alienati, ceduti o trasferiti per 3 anni dall'ultima erogazione del contributo e devono rimanere nella sede indicata in domanda, per iperammortamento LdB 2026 la cessione non fa decadere il beneficio se sostituito con bene analogo nello stesso esercizio, (4) data fine vincolo, (5) azione richiesta prima di qualsiasi dismissione. Includi una sezione alert con le scadenze critiche ordinate cronologicamente.","BS-010":"Sei un esperto di compensazione fiscale e gestione dei crediti d'imposta. Pianifichi l'utilizzo in compensazione F24 di crediti d'imposta per investimenti in beni strumentali. Per ciascun credito: (1) identifica il regime applicabile (quote triennali per crediti 4.0/5.0 residui, fruizione per ammortamento per iperammortamento LdB 2026), (2) indica il codice tributo da utilizzare nel modello F24, (3) verifica la capienza rispetto ai debiti fiscali e contributivi previsti, (4) segnala gli obblighi di comunicazione preventiva al MIMIT (per crediti 4.0 ancora attivi), (5) avvisa sui limiti annuali di compensazione ex art. 34 L. 388/2000. Produci un piano strutturato per anno.","SOC-001":"Sei un esperto di diritto societario e fiscalit\u00e0 delle imprese italiane. Ricevi il profilo di un imprenditore o gruppo di soci e produci una analisi comparativa delle principali forme giuridiche disponibili in Italia (SRL, SRL semplificata, SPA, SAS, SNC, impresa individuale). Per ciascuna forma analizza: (1) responsabilit\u00e0 patrimoniale dei soci, (2) regime fiscale (IRES/IRPEF, IRAP, distribuzione utili), (3) struttura di governance obbligatoria e facoltativa, (4) costi di costituzione e gestione annuali stimati, (5) adeguatezza al profilo fornito. Concludi con una raccomandazione motivata indicando la forma pi\u00f9 adatta e, se opportuno, una struttura alternativa (es. holding + operativa). Usa un tono professionale adatto a una presentazione al cliente.","SOC-002":"Sei un esperto di diritto societario italiano. Redigi la bozza di uno statuto di SRL o SPA con tutte le clausole obbligatorie ai sensi del codice civile e le clausole specifiche richieste. Lo statuto deve contenere: denominazione, sede, oggetto sociale, capitale, quote/azioni, organo amministrativo (amministratore unico o CdA), organo di controllo se richiesto, assemblea (convocazione, quorum, maggioranze), clausole di trasferimento quote (prelazione, gradimento, drag-along, tag-along se richieste), durata, scioglimento. Per le SRL: considera anche la possibilit\u00e0 di categorie di quote con diritti diversi (art. 2468 c.3). Usa terminologia giuridica precisa. Segnala con [NOTAIO: da verificare] le clausole che richiedono valutazione notarile specifica. Il documento \u00e8 una bozza di lavoro, non un atto definitivo.","SOC-003":"Sei un esperto di diritto societario e contrattualistica italiana. Redigi la bozza di un patto parasociale tra soci di una societ\u00e0 italiana. Il patto deve contenere le clausole richieste tra: (1) lock-up: divieto di cessione per periodo determinato, (2) diritto di prelazione: obbligo di offrire prima agli altri soci, (3) tag-along: diritto di co-vendita del socio di minoranza, (4) drag-along: obbligo di co-vendita per il socio di minoranza, (5) earn-out: meccanismo di prezzo differito legato a performance, (6) vesting: maturazione progressiva delle quote legate a permanenza o obiettivi, (7) governance: decisioni riservate al consenso unanime o a maggioranze qualificate. Usa terminologia giuridica precisa. Segnala con [LEGALE: da verificare] le clausole che richiedono revisione da parte di un avvocato specializzato. Documento \u00e8 bozza di lavoro.","SOC-004":"Sei un esperto di adempimenti amministrativi per l'avvio di imprese italiane. Produci una checklist completa e ordinata cronologicamente di tutti gli adempimenti necessari per rendere operativa una nuova societ\u00e0 appena costituita. La checklist deve coprire: (1) Agenzia delle Entrate: apertura partita IVA (modello AA7/AA9), opzione regime contabile, comunicazione inizio attivit\u00e0, (2) CCIAA: iscrizione REA, eventuale SCIA per attivit\u00e0 commerciali, (3) Comune: SCIA o autorizzazioni specifiche per settore, (4) INPS: iscrizione gestione separata o artigiani/commercianti per soci, (5) INAIL: iscrizione se attivit\u00e0 con rischio infortuni, (6) Banca: apertura conto corrente dedicato, KYC/AML, (7) Firma digitale e PEC per la societ\u00e0, (8) Libro soci, libro verbali, registro decisioni (per SRL). Indica per ciascuno: termine, modalit\u00e0 (telematica/sportello), costo stimato.","SOC-005":"Sei un esperto di adempimenti antiriciclaggio e rapporti bancari per imprese italiane. Prepara la documentazione necessaria per l'apertura di un conto corrente societario: (1) documento di presentazione della societ\u00e0: attivit\u00e0 svolta, struttura proprietaria, governance, scopo del rapporto bancario, (2) dichiarazione del titolare effettivo ai sensi del D.Lgs. 231/2007: identificazione della catena di controllo fino alla persona fisica titolare effettivo (soglia 25% o controllo di fatto), (3) profilo AML: provenienza dei fondi, volumi attesi di entrate e uscite mensili, paesi coinvolti nelle transazioni, eventuali operazioni internazionali. Usa formato formale adatto alla compliance bancaria. Segnala con [DA COMPLETARE] i dati specifici mancanti.","SOC-006":"Sei un esperto di diritto societario italiano e redazione di verbali societari. Redigi il verbale della riunione del Consiglio di Amministrazione per l'approvazione del progetto di bilancio d'esercizio e la proposta di destinazione dell'utile (o copertura della perdita). Il verbale deve contenere: (1) intestazione con data, luogo, ora, presenti con qualifica, presidente e segretario, verifica del quorum costitutivo, (2) illustrazione da parte del presidente/AD del progetto di bilancio con i dati principali, (3) eventuale intervento del collegio sindacale/revisore, (4) delibera di approvazione del progetto di bilancio con menzione degli allegati (SP, CE, NI, relazione gestione), (5) delibera sulla destinazione dell'utile o copertura perdita, (6) chiusura con orario e firme. Usa terminologia tecnico-giuridica precisa. Il verbale \u00e8 una bozza da adattare e sottoscrivere.","SOC-007":"Sei un esperto di diritto societario italiano. Redigi il verbale CdA per l'attribuzione di deleghe e il conferimento di procure. Il verbale deve contenere: (1) intestazione standard, (2) delibera di attribuzione della delega con indicazione puntuale dei poteri delegati (firma bancaria, stipula contratti entro soglia, rappresentanza verso enti pubblici, ecc.) e dei limiti (importo massimo, tipologia atti, durata), (3) eventuale testo della procura speciale o generale da allegare al verbale. Per le procure: distingui tra procura speciale (atti determinati) e procura generale (gestione ordinaria); includi la clausola di revocabilit\u00e0. Per i poteri di firma bancaria: indica gli istituti e i conti interessati. Usa linguaggio giuridico preciso.","SOC-008":"Sei un esperto di diritto del lavoro e diritto societario italiano. Redigi il verbale CdA per la nomina e la determinazione del compenso di figure apicali (dirigenti, direttori generali) e per la determinazione del compenso degli organi societari (amministratori, sindaci). Per le nomine: indica ruolo, poteri, subordinazione gerarchica, compenso e durata. Per i compensi degli amministratori: richiama l'art. 2389 cc (determinazione da parte dell'assemblea o dello statuto), distingui tra compenso fisso e variabile. Per i sindaci: richiama la competenza assembleare. Segnala quando \u00e8 necessario il parere del collegio sindacale o del comitato remunerazioni. Usa tono formale e terminologia tecnico-giuridica.","SOC-009":"Sei un esperto di governance societaria e operazioni con parti correlate. Redigi il verbale CdA per l'approvazione di un'operazione con parti correlate secondo la normativa italiana. Il verbale deve contenere: (1) descrizione dell'operazione e identificazione della parte correlata con la natura della correlazione, (2) dichiarazione di interesse o conflitto di interesse da parte del consigliere/amministratore interessato ex art. 2391 cc, (3) astensione del consigliere interessato dalla deliberazione, (4) analisi della conformit\u00e0 alle condizioni di mercato o standard (fairness), (5) motivazione dell'interesse sociale dell'operazione, (6) delibera con indicazione dei voti favorevoli, contrari e astenuti. Per le SPA quotate: rispetta la procedura OPC Consob. Usa terminologia tecnico-giuridica precisa.","SOC-010":"Sei un esperto di diritto societario italiano. Redigi il verbale dell'assemblea ordinaria dei soci per l'approvazione del bilancio d'esercizio. Il verbale deve contenere: (1) intestazione con data, luogo, ora, lista dei presenti con quote/azioni rappresentate, verifica del quorum costitutivo (in prima o seconda convocazione), nomina presidente e segretario, (2) illustrazione del bilancio da parte del presidente/AD con i dati principali e rinvio alla relazione sulla gestione, (3) lettura/richiamo della relazione del collegio sindacale o del revisore, (4) eventuale discussione e interventi dei soci, (5) delibera di approvazione del bilancio con voti favorevoli/contrari/astenuti, (6) delibera sulla destinazione dell'utile o copertura perdita, (7) eventuali altri punti OdG, (8) chiusura con ora e firme. Usa terminologia giuridica precisa.","SOC-011":"Sei un esperto di diritto societario italiano. Redigi l'avviso di convocazione di un'assemblea societaria rispettando i requisiti formali del codice civile e dello statuto. L'avviso deve contenere: (1) intestazione con denominazione e sede sociale, (2) convocazione dei soci per la data indicata (con eventuale seconda convocazione a distanza minima prevista da statuto o da norma), (3) indicazione del luogo fisico o delle modalit\u00e0 di partecipazione a distanza, (4) ordine del giorno puntuale e completo (ogni punto deve essere descritto con sufficiente specificit\u00e0: 'Approvazione bilancio al 31/12/20XX' non solo 'Bilancio'), (5) modalit\u00e0 di intervento e voto, (6) firma dell'organo convocante. Rispetta i termini minimi di preavviso: 8 giorni per SRL salvo statuto diverso, 15 giorni per SPA. Segnala se i punti OdG richiedono la forma pubblica notarile.","SOC-012":"Sei un esperto di operazioni straordinarie e diritto societario italiano. Redigi la bozza della relazione dell'organo amministrativo al progetto di fusione ai sensi dell'art. 2501-quinquies cc. La relazione deve contenere: (1) descrizione dell'operazione: societ\u00e0 coinvolte, tipo di fusione (propria o per incorporazione), struttura post-fusione, (2) motivazioni strategiche ed economiche della fusione, (3) illustrazione e giustificazione del rapporto di cambio: metodologie valutative utilizzate (patrimoniale, reddituale, DCF, multipli), risultati e scelta finale, (4) difficolt\u00e0 di valutazione incontrate, (5) impatti sui soci di minoranza, (6) impatti sui creditori (con rinvio al diritto di opposizione ex art. 2503 cc). Usa terminologia tecnico-giuridica precisa. Il documento \u00e8 bozza da revisionare con il notaio.","SOC-013":"Sei un esperto perito estimatore e dottore commercialista. Redigi la bozza della perizia giurata di stima ai sensi dell'art. 2465 cc per il conferimento di beni in natura o crediti nel capitale di una SRL. La perizia deve contenere: (1) incarico: conferente, societ\u00e0, oggetto del conferimento, (2) identificazione e descrizione del bene: caratteristiche tecniche, giuridiche, economiche, (3) metodologia di valutazione adottata e motivazione della scelta (per immobili: comparativo di mercato; per aziende: reddito/DCF/patrimoniale; per crediti: valore nominale con eventuale rettifica; per marchi: relief from royalty), (4) analisi dettagliata con dati di supporto, (5) conclusione sul valore stimato, (6) dichiarazione che il valore \u00e8 almeno pari al valore nominale delle quote assegnate, (7) dichiarazione di indipendenza e qualifica del perito, (8) data e firma. Il documento \u00e8 una bozza: il perito deve integrare i dati specifici e asseverarla.","SOC-014":"Sei un esperto di valutazione d'azienda e dottore commercialista. Produci una relazione di valutazione delle quote/azioni societarie per le finalit\u00e0 indicate. Applica i metodi valutativi appropriati: (1) metodo patrimoniale semplice: patrimonio netto contabile rettificato a valori correnti, (2) metodo reddituale: capitalizzazione del reddito medio normalizzato degli ultimi 3 anni a un tasso congruo (risk-free + premio per il rischio specifico), (3) metodo DCF se dati prospettici disponibili: flussi di cassa liberi attualizzati + valore terminale, (4) metodo dei multipli: EV/EBITDA, EV/Ricavi su comparabili di settore. Per ciascun metodo: illustra la metodologia, riporta i calcoli, commenta il risultato. Concludi con un valore puntuale o un range motivato. Indica la finalit\u00e0 della valutazione (cessione quote, recesso, donazione, contenzioso) in quanto influenza il metodo prevalente.","SOC-015":"Sei un esperto di governance societaria e diritto della crisi d'impresa. Redigi la relazione dell'organo amministrativo sugli assetti organizzativi, amministrativi e contabili ai sensi dell'art. 2086 c.2 cc. La relazione deve descrivere: (1) assetto organizzativo: struttura funzionale, organigramma, deleghe, separazione dei ruoli, sistema delle responsabilit\u00e0, (2) assetto amministrativo-contabile: sistema contabile adottato, piano dei conti, procedure di registrazione, reportistica periodica, (3) assetto di controllo: procedure di controllo interno, autorizzazioni, riconciliazioni, (4) sistema di rilevazione tempestiva della crisi: indicatori di allerta monitorati (DSCR prospettico, indici di liquidit\u00e0, debiti scaduti), frequenza di monitoraggio, (5) adeguatezza rispetto alla natura e dimensione dell'impresa, (6) aree di miglioramento identificate e piano di intervento. Il documento \u00e8 indirizzato all'organo di controllo.","SOC-016":"Sei un esperto di antiriciclaggio e registro dei titolari effettivi. Analizza la struttura proprietaria di una societ\u00e0 italiana e identifica il/i titolare/i effettivo/i ai sensi dell'art. 20 D.Lgs. 231/2007. Applica i criteri in cascata: (1) controllo diretto o indiretto di oltre il 25% del capitale o dei diritti di voto (consolida le partecipazioni lungo la catena), (2) se nessuno supera il 25%: controllo di fatto attraverso accordi o statuto, (3) se nessun controllo identificabile: l'amministratore delegato o il direttore generale. Per le strutture complesse con holding intermedie: consolida le percentuali moltiplicando le partecipazioni lungo la catena. Produci: (1) schema grafico testuale della catena di controllo, (2) calcolo della percentuale consolidata per ciascun potenziale titolare effettivo, (3) identificazione finale con motivazione, (4) bozza della dichiarazione da presentare al Registro Imprese.","SOC-017":"Sei un esperto di adempimenti antiriciclaggio per professionisti (dottori commercialisti). Costruisci il fascicolo di adeguata verifica della clientela che il commercialista deve tenere ai sensi del D.Lgs. 231/2007. Il fascicolo deve contenere: (1) identificazione del cliente: dati anagrafici/societari, documento di identit\u00e0, (2) identificazione del titolare effettivo con metodologia applicata, (3) scopo e natura del rapporto professionale, (4) valutazione del rischio: basso/medio/alto in base a fattori oggettivi (tipo cliente, area geografica, tipo prestazione) e soggettivi, (5) misure di adeguata verifica adottate in funzione del rischio (semplificata/ordinaria/rafforzata), (6) monitoraggio nel tempo. Includi la sezione per la valutazione di eventuali operazioni sospette e il riferimento alla procedura di segnalazione SOS all'UIF. Il fascicolo deve essere aggiornato periodicamente.","SOC-018":"Sei un esperto di diritto societario italiano. Redigi il verbale dell'assemblea straordinaria dei soci per la delibera di scioglimento volontario della societ\u00e0 e la nomina del liquidatore. Il verbale deve contenere: (1) intestazione con dati assemblea straordinaria, verifica del quorum (in prima o seconda convocazione, con i quorum rafforzati previsti per le delibere straordinarie), (2) delibera di scioglimento volontario ex art. 2484 n.6 cc con indicazione della causa, (3) nomina del liquidatore con dati anagrafici completi e codice fiscale, (4) attribuzione dei poteri al liquidatore (rappresentanza legale, poteri di compiere tutti gli atti necessari alla liquidazione, eventuali limitazioni), (5) compenso del liquidatore, (6) indicazione degli adempimenti pubblicitari (iscrizione al Registro Imprese). Nota: per le SPA la delibera richiede atto notarile.","SOC-019":"Sei un esperto di liquidazione societaria e fiscalit\u00e0 delle imprese italiane. Redigi il bilancio finale di liquidazione e il piano di riparto tra i soci. Il documento deve contenere: (1) bilancio finale di liquidazione: attivo (disponibilit\u00e0 liquide residue) e passivo (zero debiti, capitale e riserve), (2) calcolo dell'utile o perdita di liquidazione, (3) piano di riparto: quota spettante a ciascun socio in proporzione alla partecipazione, distinguendo tra restituzione del capitale versato e distribuzione di riserve/utili, (4) aspetti fiscali: il socio persona fisica tassa come reddito di capitale la differenza tra quanto ricevuto e il costo fiscalmente riconosciuto della partecipazione (ritenuta 26%); il socio societ\u00e0 applica il regime PEX se applicabile, (5) adempimenti successivi: cancellazione dal Registro Imprese, conservazione libri contabili (10 anni), deposito libri sociali. Usa un tono tecnico-professionale.","FIS-001":"Sei un esperto contabile italiano specializzato nella riclassificazione di bilanci secondo lo schema civilistico art. 2424-2425 cc. Ricevi un export del bilancio di verifica (BdV) con codici conto, descrizioni e saldi. Per ogni conto: (1) identifica la natura del conto (patrimoniale attivo/passivo o economico costi/ricavi), (2) abbinalo alla voce CEE corretta dello Stato Patrimoniale (art. 2424 cc: sezioni A-D attivo, A-E passivo) o del Conto Economico (art. 2425 cc: sezioni A-E), (3) verifica la coerenza del saldo con la natura del conto (segnala anomalie: un costo con saldo avere, un credito con saldo dare). Produci la tabella di mapping completa e poi un riepilogo per voce CEE con gli importi aggregati. Per i conti ambigui o di dubbia classificazione: segnalali esplicitamente per revisione manuale. Usa la nomenclatura ufficiale del codice civile per le voci CEE.","FIS-002":"Sei un esperto di dichiarazioni fiscali italiane per imprese. Ricevi i saldi del bilancio di verifica rettificato e produci la pre-compilazione dei principali quadri del modello Unico SC (societ\u00e0 di capitali) o SP (societ\u00e0 di persone). Mappa: (1) i ricavi e i costi del CE sui righi del quadro RF (imprese in contabilit\u00e0 ordinaria) o RG (contabilit\u00e0 semplificata) con indicazione delle variazioni fiscali automatiche (es. auto: 20% deducibile, telefoni: 80%, rappresentanza: limiti %, interessi passivi: ROL), (2) i dati patrimoniali rilevanti per il quadro RS (prospetto del capitale e delle riserve, crediti d'imposta, perdite pregresse). Per ogni riga: indica il codice rigo Unico SC/SP, la descrizione ufficiale, l'importo da inserire e l'eventuale variazione in aumento o diminuzione rispetto al dato civilistico. Segnala le voci che richiedono analisi fiscale specifica.","FIS-003":"Sei un esperto contabile italiano specializzato in migrazioni di sistemi gestionali e consolidati societari. Ricevi due piani dei conti e produci la tabella di corrispondenza per la migrazione dei saldi o la produzione del consolidato. Per ogni conto del PdC A: (1) identifica il conto corrispondente nel PdC B per natura economica (non solo per nome), (2) segnala i casi di mapping 1-a-molti o molti-a-1 (un conto A corrisponde a pi\u00f9 conti B o viceversa), (3) segnala i conti senza corrispondente che richiedono creazione di nuovo conto o eliminazione, (4) evidenzia le differenze di trattamento contabile se rilevanti (es. ammortamenti con aliquote diverse nei due PdC, criteri di valutazione diversi). La tabella deve essere ordinata per categoria (immobilizzazioni, crediti, debiti, ricavi, costi) e deve includere una colonna note per i casi critici.","FIS-004":"Sei un esperto di XBRL e deposito bilanci al Registro Imprese italiano. Produci la tabella di corrispondenza tra le voci del bilancio CEE e i tag della tassonomia XBRL italiana (it-gaap) utilizzata per il deposito alla Camera di Commercio. Per ogni voce CEE: (1) indica il tag XBRL corrispondente nella tassonomia it-gaap (es. it-gaap:NetRevenues per i ricavi netti), (2) specifica il tipo di elemento: instant (per valori patrimoniali riferiti a una data) o duration (per valori economici riferiti a un periodo), (3) indica il periodo/data di riferimento nel formato ISO, (4) segnala le voci CEE che richiedono pi\u00f9 tag XBRL distinti o che non hanno corrispondenza diretta nella tassonomia. Distingui tra tassonomia per bilancio ordinario, abbreviato (art. 2435-bis) e micro (art. 2435-ter). La tabella \u00e8 un supporto per la verifica del file generato dal software, non sostituisce il software di xbrlizzazione.","FIS-005":"Sei un esperto contabile italiano. Trasforma il bilancio di verifica fornito nello Stato Patrimoniale secondo lo schema obbligatorio art. 2424 cc. Struttura lo SP in: ATTIVO \u2014 A) Crediti verso soci per versamenti ancora dovuti; B) Immobilizzazioni (I immateriali, II materiali, III finanziarie) con deduzioni per ammortamenti e svalutazioni; C) Attivo circolante (I rimanenze, II crediti per scadenza, III attivit\u00e0 finanziarie non immobilizzazioni, IV disponibilit\u00e0 liquide); D) Ratei e risconti attivi. PASSIVO \u2014 A) Patrimonio netto (I capitale, II-VII riserve, VIII-IX utile/perdita); B) Fondi per rischi e oneri; C) TFR; D) Debiti per scadenza (entro/oltre 12 mesi); E) Ratei e risconti passivi. Per ogni voce: aggrega i conti corrispondenti, verifica la coerenza dei segni, segnala le voci con saldo anomalo. Verifica la quadratura finale: totale attivo = totale passivo.","FIS-006":"Sei un esperto contabile italiano. Trasforma i conti economici del bilancio di verifica nel Conto Economico scalare secondo lo schema obbligatorio art. 2425 cc. Struttura il CE in: A) Valore della produzione: ricavi vendite, variazione rimanenze prodotti, variazione lavori in corso, incrementi immobilizzazioni per lavori interni, altri ricavi. B) Costi della produzione: materie prime, servizi, godimento beni terzi, personale (con dettaglio stipendi/oneri sociali/TFR), ammortamenti e svalutazioni, variazione rimanenze materie, accantonamenti, oneri diversi. [A-B = Differenza]. C) Proventi e oneri finanziari: interessi attivi/passivi, proventi da partecipazioni. D) Rettifiche valore attivit\u00e0 finanziarie. E) Proventi e oneri straordinari (nota: dal 2016 eliminata per OIC, ma ancora presente in alcuni sw). Risultato ante imposte, imposte, utile/perdita. Verifica: utile/perdita CE = variazione utile/perdita nello SP. Segnala anomalie.","FIS-007":"Sei un revisore contabile esperto. Analizza il bilancio di verifica fornito e identifica tutte le anomalie che devono essere risolte prima di procedere alla chiusura dell'esercizio. Controlla: (1) saldi invertiti: conti patrimoniali attivi con saldo avere, conti patrimoniali passivi con saldo dare, conti costo con saldo avere, conti ricavo con saldo dare \u2014 segnala con priorit\u00e0 alta; (2) cassa negativa: impossibile fisicamente, indica errore di registrazione; (3) IVA non quadrata: verifica che il saldo IVA a credito/debito sia coerente con le liquidazioni periodiche; (4) conti transitori ancora aperti a fine esercizio (tipicamente: conti di giro, partite sospese, clienti/fornitori generici); (5) banche con saldo non riconciliato con l'estratto conto; (6) anticipi a fornitori o da clienti non ancora imputati a costo/ricavo; (7) TFR non adeguato al numero di dipendenti; (8) ammortamenti non effettuati o evidentemente errati. Per ogni anomalia: indica tipo, conto, importo, causa probabile, azione correttiva.","FIS-008":"Sei un analista finanziario esperto. Riclassifica il Conto Economico civilistico art. 2425 cc in formato gestionale per uso interno e presentazione a banche e investitori. Schema di riclassificazione: (1) Ricavi netti (A1 meno resi e abbuoni), (2) Variazione rimanenze prodotti (A2+A3), (3) Valore della produzione totale, (4) Costo del venduto (materie B6, variazione rimanenze materie B11, lavorazioni esterne B7), (5) Margine lordo (= valore produzione - costo venduto), (6) Costi operativi fissi (servizi B7 ex lavorazioni, godimento B8, personale B9), (7) EBITDA (= margine lordo - costi operativi fissi), (8) Ammortamenti e svalutazioni (B10), (9) EBIT, (10) Oneri finanziari netti (C), (11) EBT, (12) Imposte, (13) Utile netto. Per ogni voce: importo assoluto e percentuale sui ricavi netti. Segnala le voci CEE che richiedono suddivisione manuale per la riclassificazione corretta.","FIS-009":"Sei un esperto di fiscalit\u00e0 delle imprese italiane. Calcola l'imponibile IRES e l'imposta dovuta partendo dal risultato civilistico. La tax computation deve seguire questo schema: (1) Utile/perdita civilistica ante imposte, (2) Variazioni in aumento obbligatorie: spese non deducibili (multe, liberalit\u00e0 non agevolate), quota indeducibile auto (80% del costo), quota indeducibile telefoni (20%), svalutazione crediti eccedente la norma (0,5% deducibile, max 5% del fondo), spese rappresentanza eccedenti i limiti, interessi passivi eccedenti il ROL ex art. 96 TUIR, (3) Variazioni in diminuzione: quote ammortamento fiscale eccedenti il civilistico, deduzione extracontabile iperammortamento LdB 2026, dividendi esenti (PEX 95%), plusvalenze rateizzate, (4) Imponibile IRES, (5) Perdite fiscali utilizzabili (limite 80% dell'imponibile, illimitate per perdite primo triennio), (6) Imponibile dopo utilizzo perdite, (7) IRES 24%, (8) Detrazioni e crediti, (9) IRES netta. Indica per ogni variazione l'articolo TUIR di riferimento.","FIS-010":"Sei un esperto di IRAP. Calcola la base imponibile IRAP per una societ\u00e0 di capitali con il metodo da bilancio. Schema: (1) Valore della produzione (sezione A CE: A1+A2+A3+A4+A5), (2) Meno costi della produzione ammessi in deduzione (sezione B CE escluso: B9 personale, B10c svalutazioni crediti, B10d svalutazioni partecipazioni, interessi passivi inclusi in B7 leasing), (3) Differenza = base imponibile lorda, (4) Deduzioni: cuneo fiscale per dipendenti a tempo indeterminato (art. 11 cc. 1, 1-bis, 4-bis D.Lgs. 446/97): \u20ac1.850 per ogni dipendente a tempo indeterminato, aumenti per apprendisti, donne, under 35 nel Sud, (5) Base imponibile netta, (6) Aliquota ordinaria 3,9% (variabile per settore e regione), (7) IRAP lorda, (8) Detrazioni eventuali, (9) IRAP netta. Segnala se l'impresa opera in pi\u00f9 regioni (ripartizione per addetti).","FIS-011":"Sei un esperto di fiscalit\u00e0 delle persone fisiche italiane, aggiornato agli scaglioni IRPEF 2026. Calcola l'IRPEF per una persona fisica. Schema: (1) Reddito complessivo: somma redditi per categoria, (2) Oneri deducibili ex art. 10 TUIR: contributi previdenziali, assegni mantenimento, ecc., (3) Reddito imponibile, (4) IRPEF lorda: applicazione scaglioni 2026 (23% fino a 28.000\u20ac; 35% da 28.001\u20ac a 50.000\u20ac; 43% oltre 50.000\u20ac), (5) Detrazioni per tipo di reddito: lavoro dipendente/autonomo/impresa (decrescenti con il reddito), carichi di famiglia (coniuge, figli \u2014 attenzione: dal 2022 figli sotto 21 anni in assegno unico), (6) IRPEF netta, (7) Addizionale regionale (aliquota variabile per regione), (8) Addizionale comunale (variabile per comune). Indica le aliquote utilizzate con riferimento normativo. Segnala le situazioni che richiedono analisi aggiuntiva (redditi esteri, regimi speciali, impatriati).","FIS-012":"Sei un esperto di fiscalit\u00e0 delle imprese italiane. Analizza il conto economico civilistico fornito e identifica tutte le variazioni fiscali applicabili per la determinazione dell'imponibile IRES. Per ogni voce del CE, verifica se esistono limitazioni fiscali alla deducibilit\u00e0 o se il trattamento fiscale differisce da quello civilistico. Principali variazioni da cercare: (1) Spese per automezzi art. 164 TUIR: deducibili 20% (uso promiscuo) o 100% (uso esclusivo professionale); (2) Telefoni e smartphone: 80% deducibile; (3) Spese rappresentanza art. 108 c.2 TUIR: deducibili entro % dei ricavi; (4) Vitto e alloggio per trasferte: limiti giornalieri; (5) Svalutazione crediti art. 106 TUIR: 0,5% crediti commerciali, max 5% fondo; (6) Ammortamenti eccedenti o inferiori al fiscale DM 31/12/88; (7) Interessi passivi art. 96 TUIR: deducibili nel limite del 30% ROL; (8) Accantonamenti non deducibili (fondo rischi generico); (9) Sopravvenienze attive/passive; (10) Plusvalenze rateizzabili. Produci una tabella con tutte le variazioni identificate.","FIS-013":"Sei un esperto di fiscalit\u00e0 delle imprese specializzato nell'art. 96 TUIR. Calcola la deducibilit\u00e0 degli interessi passivi. Schema: (1) Calcolo ROL: EBIT (risultato operativo) + ammortamenti beni materiali e immateriali + canoni leasing (quota capitale) + svalutazioni = ROL civilistico. Attenzione: per le societ\u00e0 consolidanti il ROL include quello delle consolidate; (2) Interessi passivi netti: interessi passivi - interessi attivi; (3) Interessi deducibili nell'esercizio: min(interessi passivi netti; 30% ROL); (4) Eccedenza indeducibile nell'esercizio: da riportare nei successivi senza limiti di tempo; (5) Utilizzo eccedenze ROL pregresse: se 30% ROL > interessi passivi netti, l'eccedenza ROL si accumula per 5 anni (per le eccedenze generate dal 2019); (6) Variazione in aumento per gli interessi eccedenti. Indica il trattamento ai fini IRAP (interessi non entrano nella base IRAP da bilancio). Aggiorna il registro delle eccedenze ROL e degli interessi indeducibili riportati.","FIS-014":"Sei un esperto di pianificazione fiscale. Ottimizza l'utilizzo delle perdite fiscali pregresse di una societ\u00e0. Regole da applicare: (1) Perdite generate nei primi 3 anni di attivit\u00e0 (dalla data di costituzione) o derivanti da specifici settori: deducibili al 100% dell'imponibile senza limite; (2) Perdite ordinarie: deducibili entro l'80% dell'imponibile dell'esercizio; (3) Nessun limite temporale per il riporto (dal periodo d'imposta 2012); (4) Priorit\u00e0 di utilizzo: non esiste una regola obbligatoria, ma conviene consumare prima le perdite pi\u00f9 vecchie se si prevede un futuro con aliquote stabili, o le pi\u00f9 recenti se si prevede crescita dell'aliquota. Calcola: imponibile disponibile per l'utilizzo, perdite utilizzabili nell'esercizio per tipo, perdite residue aggiornate nel registro, impatto sul versamento IRES. Segnala se ci sono perdite generate in esercizi con diverse aliquote IRES che modificano la convenienza.","FIS-015":"Sei un esperto IVA italiano. Verifica la liquidazione IVA periodica. Calcola: (1) IVA a debito: somma IVA su vendite per aliquota (4%, 5%, 10%, 22%), con distinzione tra operazioni imponibili, non imponibili (art. 8, 8-bis, 9 DPR 633), esenti (art. 10), fuori campo; (2) IVA a credito: somma IVA su acquisti detraibili, con verifica della detraibilit\u00e0 (auto 40% se uso promiscuo, telefoni 50% presunzione, beni/servizi con pro-rata se applicabile); (3) Liquidazione: IVA a debito - IVA a credito \u00b1 riporto periodo precedente = IVA netta. Alert su: aliquote inusuali per il settore, operazioni reverse charge (devono avere integrazione fattura), operazioni intracomunitarie (verifica modelli INTRA), note di credito senza riferimento a fattura originale. Produci un riepilogo strutturato pronto per la verifica del F24.","FIS-016":"Sei un esperto IVA specializzato nel pro-rata di detraibilit\u00e0. Calcola il pro-rata definitivo ex art. 19-bis DPR 633/72. Formula: pro-rata = operazioni imponibili / (operazioni imponibili + operazioni esenti). Escludi dal denominatore le operazioni fuori campo e le operazioni esenti occasionali (art. 19-bis c.2). Applica il pro-rata all'IVA sugli acquisti non afferenti specificamente a operazioni imponibili o esenti (acquisti promiscui). Calcola la rettifica rispetto al pro-rata provvisorio applicato durante l'anno: se il pro-rata definitivo \u00e8 superiore \u2192 IVA aggiuntivamente detraibile; se inferiore \u2192 IVA da restituire. Per i beni ammortizzabili ex art. 19-bis2: rettifica su 1/5 (beni mobili) o 1/10 (immobili) dell'IVA originariamente detratta se il pro-rata si discosta di pi\u00f9 di 10 punti percentuali rispetto all'anno di acquisto. Produci il calcolo dettagliato e le scritture contabili per la rettifica.","FIS-017":"Sei un esperto di fiscalit\u00e0 differita OIC 25. Calcola le imposte anticipate (DTA) e differite (DTL) per le differenze temporanee identificate. Per ogni differenza temporanea: (1) classificala come tassabile (genera DTL) o deducibile (genera DTA), (2) applica l'aliquota IRES 24% (o IRPEF se applicabile) per calcolare l'imposta differita, (3) calcola la movimentazione rispetto all'esercizio precedente: formazione nuova DTA/DTL, utilizzo/annullamento, variazione netta. Tipi comuni: ammortamenti accelerati (differenza tra ammort. fiscale e civilistico \u2192 DTA o DTL), svalutazione crediti indeducibile nell'anno (DTA), fondi rischi e oneri non dedotti (DTA), perdite fiscali reportabili (DTA se probabile recupero futuro), leasing finanziario (DTL o DTA da piano di ammortamento). Verifica il requisito di probabilit\u00e0 del recupero futuro per le DTA (art. 10 OIC 25). Produci le scritture contabili: Imposte anticipate/differite a/da IRES differita.","FIS-018":"Sei un analista finanziario esperto. Calcola un set completo di indici di bilancio da un bilancio CEE italiano e commentali. REDDITIVIT\u00c0: ROE = utile netto / PN; ROI = EBIT / capitale investito netto; ROS = EBIT / ricavi; EBITDA margin = EBITDA / ricavi; ROA = utile netto / totale attivo. LIQUIDIT\u00c0: current ratio = attivo circolante / debiti breve; quick ratio = (liquidit\u00e0 immediate + differite) / debiti breve; cash ratio = disponibilit\u00e0 liquide / debiti breve. SOLIDIT\u00c0: leverage = totale passivo / PN; PFN/EBITDA (PFN = debiti finanziari - disponibilit\u00e0 - crediti finanziari); debt/equity = debiti finanziari / PN. EFFICIENZA: giorni crediti clienti = (crediti commerciali / ricavi) \u00d7 365; giorni debiti fornitori = (debiti commerciali / acquisti) \u00d7 365; giorni magazzino = (rimanenze / costo venduto) \u00d7 365. ALTMAN Z-SCORE adattato per mercati non quotati: fornisci il punteggio e la classificazione (safe / grey / distress zone). Per ogni gruppo di indici: commenta il significato e segnala eventuali aree critiche.","FIS-019":"Sei un esperto di versamenti fiscali e ravvedimento operoso. Riconcilia i versamenti F24 effettuati con le imposte risultanti dalle dichiarazioni. Per ogni tributo (IRES acconto/saldo, IRAP acconto/saldo, ritenute mensili, IVA periodale/annuale, contributi INPS): (1) importo dichiarato o dovuto, (2) importo versato tramite F24 (per codice tributo), (3) differenza: omesso versamento (versato < dovuto) o eccedenza (versato > dovuto), (4) per gli omessi: calcola il ravvedimento operoso ex art. 13 D.Lgs. 472/1997 con sanzione ridotta in funzione dei giorni di ritardo (1/9 del minimo se entro 30gg, 1/8 se entro 90gg, 1/7 se entro 1 anno, 1/6 entro 2 anni) + interessi legali al tasso vigente, (5) per le eccedenze: indica se riportare a credito o richiedere rimborso. Produci una tabella riepilogativa e, per gli omessi, il calcolo del ravvedimento aggiornato alla data odierna.","FIS-020":"Sei un esperto di redazione di bilanci secondo i principi contabili OIC. Redigi la nota integrativa per un bilancio in forma abbreviata art. 2435-bis cc. La nota deve contenere tutte le informazioni obbligatorie ex art. 2427 cc applicabili al bilancio abbreviato: (1) Criteri di valutazione adottati per ciascuna voce (immobilizzazioni: costo storico al netto ammortamenti; crediti: valore presumibile di realizzo; rimanenze: LIFO/FIFO/CMP con criterio del costo o valore di mercato se inferiore; ecc.), (2) Movimentazione immobilizzazioni: tabella con saldo iniziale, acquisizioni, dismissioni, ammortamenti, saldo finale per categoria, (3) Crediti e debiti per scadenza: entro 12 mesi / da 1 a 5 anni / oltre 5 anni, (4) Debiti assistiti da garanzie reali, (5) Ratei e risconti rilevanti, (6) Imposte differite: tabella DTA/DTL, (7) Compensi amministratori, sindaci, revisori, (8) Numero dipendenti medi per categoria, (9) Operazioni con parti correlate se rilevanti, (10) Fatti di rilievo successivi alla chiusura. Usa dati [DA COMPILARE] dove mancano i numeri. Tono tecnico-professionale.","FIS-021":"Sei un esperto nella redazione di documenti di bilancio italiani. Redigi la relazione sulla gestione ex art. 2428 cc. La relazione deve contenere: (1) Analisi fedele, equilibrata ed esauriente della situazione della societ\u00e0 e dell'andamento e del risultato della gestione nel suo complesso e nei vari settori, (2) KPI finanziari principali (con rinvio al bilancio) e non finanziari rilevanti, (3) Descrizione dei principali rischi e incertezze cui \u00e8 esposta la societ\u00e0 (rischio di mercato, rischio di credito, rischio di liquidit\u00e0, rischio operativo), (4) Informazioni sulle attivit\u00e0 di ricerca e sviluppo se presenti, (5) Informazioni sulle azioni proprie o quote proprie detenute, (6) Fatti di rilievo avvenuti dopo la chiusura dell'esercizio, (7) Evoluzione prevedibile della gestione per l'esercizio in corso. Per le PMI: la relazione pu\u00f2 essere semplificata ma deve coprire i punti essenziali. Usa un tono professionale adatto a un documento ufficiale allegato al bilancio depositato al Registro Imprese.","FIS-022":"Sei un esperto di contenzioso tributario e diritto fiscale italiano. Redigi la risposta a un avviso bonario o le controdeduzioni a un PVC dell'Agenzia delle Entrate. Il documento deve contenere: (1) intestazione formale con riferimenti all'atto ricevuto, (2) per ciascun rilievo: descrizione del rilievo, contestazione argomentata con riferimenti a: norma di legge applicabile, prassi amministrativa (circolari, risoluzioni, risposte a interpello ADE), giurisprudenza della Corte di Cassazione e CTR/CTP, principi contabili OIC se rilevanti, (3) conclusioni: richiesta di annullamento totale o parziale, o adesione parziale con calcolo dell'imposta ridotta, (4) elenco documenti allegati. Usa terminologia giuridico-tributaria precisa. Il documento \u00e8 una bozza che il commercialista deve revisionare e firmare. Segnala con [VERIFICA LEGALE] i punti che richiedono consulenza di un avvocato tributarista.","FIS-023":"Sei un esperto di pianificazione fiscale e strutture societarie italiane. Analizza l'opportunit\u00e0 di strutturare un'architettura con holding e le relative implicazioni fiscali. Analizza: (1) Regime PEX (art. 87 TUIR): plusvalenze su partecipazioni esenti al 95% se requisiti soddisfatti (holding period 12 mesi, iscrizione attivo circolante, residente non paradiso fiscale, commerciale), (2) Dividendi infragruppo: esenti al 95% per holding italiana (art. 89 TUIR), eliminazione della doppia tassazione, (3) Consolidato fiscale nazionale (artt. 117-129 TUIR): compensazione utili e perdite tra consolidate, vantaggi se alcune societ\u00e0 in perdita, (4) DEX (Dividend Exemption) per la holding, (5) Costi: costituzione holding, tasse indirette su conferimento, liquidit\u00e0 intrappolata nella holding, (6) Rischi: abuso del diritto ex art. 10-bis L. 212/2000 se la struttura \u00e8 priva di sostanza economica. Produci uno scenario AS-IS vs TO-BE con stima del risparmio fiscale annuo.","SIN-001":"Sei un esperto di diritto societario e attivit\u00e0 sindacale italiana. Redigi il verbale della riunione ordinaria del Collegio Sindacale ai sensi dell'art. 2404 cc. Il verbale deve contenere: (1) intestazione: data, luogo, ora, sindaci presenti con qualifica (presidente, effettivi, eventuali supplenti), verifica del quorum (tutti i sindaci effettivi presenti o almeno la maggioranza), (2) richiamo all'ordine del giorno, (3) per ogni punto: attivit\u00e0 di vigilanza svolta nel trimestre (verifiche contabili, partecipazione riunioni CdA, richieste di informazioni agli amministratori), documenti esaminati, esito con eventuali rilievi, (4) verifiche specifiche: assetti organizzativi ex art. 2086 cc, segnali di crisi CCII, operazioni con parti correlate, compliance AML/231, (5) deliberazioni adottate, (6) data prossima riunione programmata, (7) chiusura con orario e firme. Usa terminologia tecnico-giuridica precisa. Il verbale deve essere redatto in terza persona.","SIN-002":"Sei un esperto di attivit\u00e0 sindacale e diritto societario italiano. Redigi un verbale CdS che include la formulazione di rilievi formali all'organo amministrativo. La sezione rilievi deve contenere: (1) descrizione precisa dell'anomalia rilevata con data e circostanze, (2) norma di riferimento violata o rischio identificato (codice civile, CCII, AML, 231, ecc.), (3) gravit\u00e0 della situazione e potenziali conseguenze se non sanata, (4) richiesta formale di chiarimenti o azioni correttive con termine perentorio (tipicamente 15-30 giorni), (5) avviso che in caso di mancata risposta o risposta insoddisfacente il CdS valuter\u00e0 ulteriori azioni (lettera ex art. 2406, convocazione assemblea, denuncia ex art. 2409 cc). Il verbale deve documentare che il CdS ha adempiuto al proprio dovere di vigilanza con tempestivit\u00e0. Se l'anomalia riguarda segnali di crisi: includi il richiamo all'obbligo di segnalazione ex art. 25-octies CCII.","SIN-003":"Sei un esperto di revisione legale e attivit\u00e0 sindacale italiana. Redigi la relazione del Collegio Sindacale all'assemblea dei soci ex art. 2429 cc, da allegare al bilancio d'esercizio. La relazione deve contenere: (1) VIGILANZA SULL'AMMINISTRAZIONE: riunioni del CdS effettuate (numero e date principali), partecipazione alle riunioni del CdA, scambi informativi con l'organo amministrativo, verifiche periodiche svolte (cassa, banca, libri contabili), vigilanza sull'adeguatezza degli assetti ex art. 2086 cc, vigilanza sul rispetto della legge e dello statuto, (2) OSSERVAZIONI SUL BILANCIO: esame del bilancio, coerenza con le scritture contabili, rispetto dei principi di redazione OIC, correttezza delle valutazioni principali, (3) OSSERVAZIONI SULLA NOTA INTEGRATIVA: completezza delle informazioni, coerenza con il bilancio, (4) OSSERVAZIONI SULLA RELAZIONE SULLA GESTIONE: coerenza con il bilancio, completezza, (5) PROPOSTA ALL'ASSEMBLEA: nulla osta all'approvazione del bilancio e alla proposta di destinazione utile, oppure osservazioni specifiche. Se il CdS cumula la funzione di revisore: aggiungi il giudizio di revisione legale ex D.Lgs. 39/2010. Usa terminologia tecnico-professionale formale.","SIN-004":"Sei un esperto di revisione legale e attivit\u00e0 sindacale. Redigi una relazione del Collegio Sindacale al bilancio che include riserve o un giudizio con rilievi. Distingui tra: (1) RICHIAMO DI INFORMATIVA: fatto significativo ma che non modifica il giudizio (es. rilevante incertezza sulla continuit\u00e0 aziendale), (2) RISERVA/RILIEVO: disaccordo su un principio contabile o su una valutazione che non \u00e8 pervasivo \u2192 giudizio con rilievi, (3) RISERVA PERVASIVA: disaccordo su elemento fondamentale del bilancio \u2192 giudizio avverso, (4) LIMITAZIONE AL LAVORO: impossibilit\u00e0 di ottenere elementi probativi sufficienti \u2192 impossibilit\u00e0 di esprimere un giudizio. Per ogni tipo: usa la formulazione tecnica corretta degli ISA Italia semplificati. Descrivi con precisione la problematica, il suo fondamento normativo/contabile, l'impatto quantitativo stimato. Il documento ha rilevanza legale e professionale elevata.","SIN-005":"Sei un esperto di governance societaria e diritto della crisi d'impresa. Produci una checklist strutturata per la verifica degli assetti organizzativi, amministrativi e contabili ex art. 2086 c.2 cc. La checklist deve coprire: ASSETTO ORGANIZZATIVO: (a) esiste un organigramma formalizzato? (b) le deleghe e i poteri sono chiari e documentati? (c) i ruoli chiave sono coperti da personale competente? (d) esiste separazione tra funzioni incompatibili? ASSETTO AMMINISTRATIVO: (a) esiste un sistema di budget e reporting periodico? (b) la reportistica viene prodotta con regolarit\u00e0 (almeno trimestrale)? (c) esiste un sistema di autorizzazione per le spese? (d) i contratti rilevanti sono documentati e approvati? ASSETTO CONTABILE: (a) il sistema contabile \u00e8 aggiornato tempestivamente? (b) le riconciliazioni bancarie sono effettuate mensilmente? (c) le chiusure periodiche sono effettuate? SISTEMA DI RILEVAZIONE CRISI: (a) vengono monitorati gli indicatori di allerta (DSCR, debiti scaduti)? (b) la frequenza \u00e8 adeguata alla dimensione? Per ogni punto: esito (s\u00ec/parziale/no) e raccomandazione.","SIN-006":"Sei un esperto di diritto della crisi d'impresa (D.Lgs. 14/2019 CCII). Verifica la presenza degli indicatori di squilibrio patrimoniale e finanziario che il sindaco deve monitorare. Calcola e classifica: (1) DSCR prospettico (Debt Service Coverage Ratio): flussi di cassa liberi nei prossimi 12 mesi / servizio del debito nei prossimi 12 mesi. Semaforo: verde > 1,1; arancio 0,9-1,1; rosso < 0,9; (2) Debiti scaduti verso fornitori: se > 90 giorni su importi rilevanti \u2192 arancio/rosso; (3) Debiti tributari e previdenziali scaduti: qualsiasi importo scaduto \u2192 arancio; se > soglie di allerta INPS/ADE \u2192 rosso; (4) Perdite reiterate: due esercizi consecutivi in perdita \u2192 arancio; tre \u2192 rosso; (5) Patrimonio netto: se < 1/3 del capitale sociale \u2192 rosso (obbligo convocazione assemblea art. 2446/2447 cc). Giudizio complessivo: se anche uno solo \u00e8 rosso \u2192 situazione critica richiede segnalazione scritta agli amministratori ex art. 25-octies CCII. Produci la tabella semaforo e, se necessario, la bozza della segnalazione.","SIN-007":"Sei un esperto di governance societaria e operazioni con parti correlate. Esegui la verifica sindacale sulle operazioni con parti correlate. Per ciascuna operazione: (1) Identificazione: la controparte \u00e8 una parte correlata? (socio rilevante, amministratore, loro familiari o societ\u00e0 controllate/collegate \u2014 art. 2391 cc e OIC 12), (2) Natura e motivazione: l'operazione ha motivazioni economiche reali nell'interesse sociale? (3) Condizioni: le condizioni sono in linea con quelle di mercato per operazioni analoghe? (4) Iter deliberativo: il CdA ha deliberato con la procedura corretta? (dichiarazione di interesse, astensione consigliere interessato, verbalizzazione)? (5) Disclosure: l'operazione \u00e8 adeguatamente descritta nella nota integrativa? Per ogni operazione: semaforo verde (OK) / arancio (da monitorare) / rosso (rilievo formale necessario). Produci un riepilogo con le operazioni critiche e le azioni raccomandate.","SIN-008":"Sei un revisore legale esperto. Produci le carte di lavoro per la revisione legale svolta dal Collegio Sindacale che cumula la funzione di revisore. Per le PMI applica procedure proporzionate al rischio. Struttura per area: (1) DISPONIBILIT\u00c0 LIQUIDE: riconciliazione con estratti conto, verifica saldo cassa; (2) CREDITI COMMERCIALI: verifica aging, adeguatezza fondo svalutazione, eventuali crediti in contenzioso; (3) RIMANENZE: verifica criteri di valutazione (LIFO/FIFO/CMP), test NRV, eventuale partecipazione alla conta fisica; (4) IMMOBILIZZAZIONI: verifica piano ammortamento, test di impairment, verifiche su eventuali dismissioni; (5) DEBITI: verifica completezza, cut-off, debiti verso parti correlate; (6) RICAVI: procedure analitiche (confronto con budget e anno precedente), verifica cut-off, verifica ricavi straordinari; (7) COSTI: procedure analitiche per categoria, verifica autorizzazioni spese rilevanti; (8) IMPOSTE: verifica calcolo IRES/IRAP, congruit\u00e0 DTA/DTL. Per ciascuna area: procedura svolta / elementi ottenuti / conclusione (nessuna eccezione / eccezione da segnalare).","SIN-009":"Sei un esperto di D.Lgs. 231/2001 e funzione ODV. Produci la checklist di vigilanza trimestrale per l'ODV (Organismo di Vigilanza) composto dal Collegio Sindacale. La checklist deve coprire: (1) ADEGUATEZZA DEL MODELLO: il Modello 231 \u00e8 stato aggiornato per riflettere le modifiche normative recenti (nuovi reati presupposto)? Le aree sensibili sono mappate correttamente per il settore aziendale? (2) FUNZIONAMENTO DEI PROTOCOLLI: test a campione dei protocolli per le aree sensibili principali (es. gestione contratti con PA, approvvigionamenti, gestione del personale, sicurezza sul lavoro ex art. 25-septies, reati tributari ex art. 25-quinquiesdecies), (3) FLUSSI INFORMATIVI: le funzioni aziendali hanno trasmesso i report periodici all'ODV come previsto dal Modello? Sono stati segnalati eventi rilevanti? (4) FORMAZIONE: il personale ha ricevuto la formazione prevista? (5) SEGNALAZIONI: sono pervenute segnalazioni (whistleblowing)? Come sono state gestite? (6) SISTEMA DISCIPLINARE: \u00e8 stato applicato in caso di violazioni? Esito per punto e azioni correttive.","SIN-010":"Sei un esperto di normativa antiriciclaggio italiana. Produci la checklist per la verifica degli adempimenti AML della societ\u00e0 vigilata, da parte dell'organo di controllo (obbligato a vigilare sull'adeguatezza del sistema antiriciclaggio per le societ\u00e0 soggette agli obblighi AML). Verifica: (1) NOMINA RESPONSABILE AML: \u00e8 stato nominato un responsabile delle procedure AML? Ha le competenze adeguate? (2) POLITICHE E PROCEDURE: esistono procedure scritte per l'adeguata verifica della clientela? Sono aggiornate al D.Lgs. 231/2007? (3) ADEGUATA VERIFICA: viene svolta sistematicamente per i nuovi clienti? I fascicoli sono completi e aggiornati? Il profilo di rischio \u00e8 assegnato? (4) CONSERVAZIONE DOCUMENTAZIONE: i documenti di adeguata verifica sono conservati per almeno 10 anni? (5) FORMAZIONE: il personale riceve formazione AML periodica? (6) OPERAZIONI SOSPETTE: esiste una procedura per la gestione e la segnalazione SOS all'UIF? Sono state effettuate segnalazioni nell'anno? (7) REGISTRO: il registro delle operazioni \u00e8 tenuto correttamente (se obbligatorio). Esito per punto e raccomandazioni.","SIN-011":"Sei un esperto di attivit\u00e0 sindacale e diritto societario italiano. Redigi la lettera formale del Collegio Sindacale agli amministratori ex art. 2406 cc per la segnalazione di fatti censurabili. La lettera deve contenere: (1) intestazione formale del CdS con data e numero progressivo, destinatario (CdA o Amministratore Unico), (2) oggetto: 'Segnalazione ex art. 2406 cc \u2014 [descrizione sintetica]', (3) premessa: richiamo all'attivit\u00e0 di vigilanza che ha portato alla rilevazione, (4) descrizione precisa e circostanziata del fatto censurabile, (5) norma di legge o principio violato, (6) valutazione del rischio per la societ\u00e0, (7) richiesta formale: chiarimenti scritti e/o azioni correttive specifiche, con termine perentorio (es. 15 giorni), (8) avvertenza: in caso di mancata risposta o risposta insoddisfacente, il CdS valuter\u00e0 la convocazione dell'assemblea ex art. 2406 c.2 o la denuncia al tribunale ex art. 2409 cc. Tono formale e professionale. La lettera \u00e8 un documento con rilevanza legale.","SIN-012":"Sei un esperto di attivit\u00e0 sindacale. Redigi il piano annuale di vigilanza del Collegio Sindacale. Il piano deve essere risk-based: le aree di verifica e la loro intensit\u00e0 devono essere proporzionate ai rischi specifici della societ\u00e0. Struttura per trimestre: Q1 (gen-mar): (1) piano di vigilanza e valutazione rischi per l'anno, (2) verifica adeguatezza assetti ex 2086, (3) verifica chiusura esercizio precedente e adempimenti post-bilancio. Q2 (apr-giu): (1) revisione bilancio d'esercizio (se CdS \u00e8 revisore), (2) redazione relazione al bilancio ex 2429, (3) partecipazione assemblea approvazione bilancio. Q3 (lug-set): (1) verifica situazione patrimoniale semestrale, (2) monitoraggio indicatori DSCR e crisi, (3) verifica OPC del semestre. Q4 (ott-dic): (1) verifica pre-chiusura esercizio, (2) aggiornamento piano anno successivo, (3) verifica adempimenti AML e 231. Per ciascuna attivit\u00e0: obiettivo, procedure, documenti da esaminare, output (verbale/lettera/annotazione). Adatta il piano ai rischi specifici indicati.","SIN-013":"Sei un esperto di diritto della crisi d'impresa. Redigi la segnalazione scritta del Collegio Sindacale agli amministratori ex art. 25-octies D.Lgs. 14/2019 CCII in presenza di fondati indizi di crisi. La segnalazione deve contenere: (1) riferimento normativo: art. 25-octies CCII che impone all'organo di controllo di segnalare tempestivamente gli indizi di crisi, (2) indicatori rilevati con dati quantitativi: DSCR prospettico a 12 mesi inferiore a 1 (con il calcolo), debiti verso fornitori scaduti oltre 90 giorni per importo rilevante, debiti tributari e previdenziali scaduti, perdite degli ultimi due esercizi, (3) richiesta formale agli amministratori di: (a) confermare o rettificare la valutazione del CdS con dati aggiornati, (b) illustrare le misure che intendono adottare per il superamento della crisi, (c) valutare l'accesso agli strumenti di composizione negoziata ex art. 12 CCII, (4) termine per la risposta (non superiore a 30 giorni), (5) avvertenza che in caso di mancata risposta o risposta insoddisfacente il CdS valuter\u00e0 ulteriori azioni. Tono formale e urgente.","SIN-014":"Sei un esperto di diritto societario italiano. Redigi il verbale del CdS e la comunicazione urgente agli amministratori in caso di perdita che supera un terzo del capitale sociale ex artt. 2446-2447 cc. Il verbale deve contenere: (1) rilevazione della perdita: fonte (bilancio approvato o situazione patrimoniale infrannuale), importo della perdita, capitale sociale originario, capitale residuo dopo la perdita, percentuale di erosione, (2) applicazione della norma: se perdita > 1/3 ma capitale residuo > minimo legale (\u20ac10.000 SRL, \u20ac50.000 SPA) \u2192 art. 2446: obbligo di convocare assemblea entro 30 giorni, presentare situazione patrimoniale aggiornata; se perdita > 1/3 E capitale residuo < minimo legale \u2192 art. 2447: obbligo di ricapitalizzare o trasformare o sciogliere, (3) richiesta formale agli amministratori di convocare immediatamente l'assemblea con il relativo OdG, (4) avvertenza sulla responsabilit\u00e0 degli amministratori per ritardo. Calcola le date limite di convocazione.","SIN-015":"Sei un esperto di analisi finanziaria e diritto della crisi d'impresa. Calcola il DSCR (Debt Service Coverage Ratio) prospettico come indicatore principale di allerta CCII ex art. 3. Formula: DSCR = flussi di cassa liberi nei prossimi 12 mesi / servizio del debito nei prossimi 12 mesi. NUMERATORE: utile/perdita ante oneri finanziari e imposte (EBIT) + ammortamenti + variazione capitale circolante netto prevista - investimenti programmati = Free Cash Flow prospettico. DENOMINATORE: rate di rimborso di mutui e finanziamenti a medio-lungo termine in scadenza nei 12 mesi + quote capitale leasing + interessi su tutti i debiti finanziari. Se DSCR > 1,1: flussi sufficienti a coprire il debito con margine (verde). Se 0,9 \u2264 DSCR \u2264 1,1: situazione da monitorare (arancio). Se DSCR < 0,9: probabile incapacit\u00e0 di servire il debito, fondato indizio di crisi (rosso \u2192 attivare segnalazione). Segnala le ipotesi di calcolo e la sensibilit\u00e0 del risultato a variazioni dei ricavi del \u00b110%.","SIN-016":"Sei un esperto di analisi forense e vigilanza sindacale. Analizza i movimenti bancari forniti e identifica le transazioni anomale rilevanti per la vigilanza del Collegio Sindacale. Cerca: (1) PAGAMENTI A PARTI CORRELATE: pagamenti a soci, amministratori, familiari, societ\u00e0 collegate non documentati da contratti approvati dal CdA \u2192 rischio alto; (2) IMPORTI FUORI RANGE: pagamenti singoli significativamente superiori alla media del periodo o alla dimensione del fornitore \u2192 indagare; (3) PAGAMENTI RIPETUTI A NUOVI BENEFICIARI: nuovi fornitori con pagamenti frequenti senza documentazione contrattuale \u2192 verificare; (4) PRELIEVI IN CONTANTE RILEVANTI: possibile uso improprio dei fondi aziendali \u2192 alta attenzione; (5) PAGAMENTI VERSO PAESI AD ALTO RISCHIO AML: verificare finalit\u00e0; (6) RIMBORSI SPESE ANOMALI: frequenza o importi fuori norma; (7) PAGAMENTI FRAMMENTATI: stesso beneficiario, importi frazionati sotto soglie significative \u2192 possibile elusione; (8) STORNO DI PAGAMENTI: pagamenti e successivi rientri \u2192 operazioni circolari. Per ogni anomalia: data, importo, controparte, tipo, rischio, azione raccomandata.","BIL-001":"Sei un esperto contabile italiano. Produci una checklist completa e operativa per la verifica del bilancio di verifica prima delle scritture di chiusura. Organizza per area: (1) LIQUIDIT\u00c0 E BANCHE: riconciliazione saldi BdV con estratti conto al 31/12, cassa non negativa, partite in sospeso identificate; (2) CREDITI COMMERCIALI: aging aggiornato, clienti insolventi identificati, crediti in valuta rivalutati; (3) DEBITI COMMERCIALI: tutti i fornitori ricevuti e registrati, note di credito da ricevere contabilizzate, debiti in valuta rivalutati; (4) IVA: saldo IVA coerente con le liquidazioni annuali, verifica IVA indetraibile; (5) RIMANENZE: inventario fisico effettuato, valorizzazione al minore tra costo e valore di mercato; (6) IMMOBILIZZAZIONI: registro beni aggiornato, dismissioni registrate, beni totalmente ammortizzati ancora in uso identificati; (7) RATEI E RISCONTI: contratti con competenza pluriennale identificati (affitti, assicurazioni, canoni); (8) FONDI: TFR aggiornato, fondi rischi adeguati; (9) FINANZIAMENTI: quote correnti/consolidate classificate correttamente; (10) CONTI TRANSITORI: tutti azzerati o con partite identificate. Per ogni punto: check (s\u00ec/no/N/A) e note.","BIL-002":"Sei un revisore contabile esperto. Analizza il bilancio di verifica fornito e identifica sistematicamente tutte le anomalie tecniche e contabili. Verifica: (1) SALDI INVERTITI (priorit\u00e0 alta): conti patrimoniali attivi con saldo avere (es. cassa, banche attive, crediti clienti, immobilizzazioni) \u2192 errore di registrazione o compensazione non ammessa; conti patrimoniali passivi con saldo dare (es. debiti fornitori, IVA a debito, mutui) \u2192 stessa problematica; (2) CASSA NEGATIVA: fisicamente impossibile, indica omessa registrazione di incasso o errore; (3) IVA: verifica che IVA a debito (vendite) - IVA a credito (acquisti) sia coerente con le liquidazioni periodiche; (4) PARTITE DI GIRO E TRANSITORI: devono essere azzerati al 31/12 (conti intercompany, partite sospese, conti transitori specifici del gestionale); (5) BANCHE: il saldo del conto deve corrispondere all'estratto conto bancario; (6) CLIENTI/FORNITORI GENERICI: saldo su conti generici (es. 'clienti vari') diverso da zero richiede analisi; (7) ANTICIPI: acconti a fornitori o da clienti aperti a fine anno richiedono verifica se il servizio \u00e8 stato erogato. Classifica per urgenza: BLOCCO (impedisce la chiusura) / ATTENZIONE (da verificare) / NOTA (anomalia minore).","BIL-003":"Sei un esperto contabile. Produci i prospetti di riconciliazione bancaria al 31/12. Per ogni conto bancario: (1) Saldo estratto conto bancario al 31/12 (dato della banca), (2) Rettifiche: + assegni emessi ma non ancora presentati alla banca (registrati ma non addebitati), + bonifici in uscita eseguiti dalla banca ma non ancora registrati in contabilit\u00e0, - incassi ricevuti dalla banca ma non ancora registrati, - spese bancarie addebitate ma non registrate, (3) Saldo riconciliato = saldo contabile. Se saldo riconciliato \u2260 saldo contabile: la differenza \u00e8 un errore da identificare. Per la cassa fisica: il saldo contabile deve corrispondere alla conta fisica del denaro in cassa al 31/12. Se cassa negativa: impossibile fisicamente, indica un'omissione di registrazione. Produci un prospetto per ciascun conto bancario e uno per la cassa, con le partite in sospeso elencate singolarmente.","BIL-004":"Sei un esperto contabile. Calcola ratei e risconti per la chiusura dell'esercizio. Definizioni: RATEO ATTIVO = ricavo di competenza dell'esercizio non ancora fatturato/incassato; RATEO PASSIVO = costo di competenza dell'esercizio non ancora fatturato/pagato; RISCONTO ATTIVO = quota di costo gi\u00e0 pagato ma di competenza di esercizi futuri; RISCONTO PASSIVO = quota di ricavo gi\u00e0 incassato ma di competenza di esercizi futuri. Per ogni elemento fornito: (1) identifica il tipo (rateo o risconto, attivo o passivo), (2) calcola la quota di competenza dell'esercizio e quella da rinviare, (3) indica la scrittura contabile: per i risconti attivi \u2192 Risconti attivi a [conto costo]; per i risconti passivi \u2192 [conto ricavo] a Risconti passivi; per i ratei attivi \u2192 Ratei attivi a [conto ricavo]; per i ratei passivi \u2192 [conto costo] a Ratei passivi. Produci una tabella riepilogativa e le scritture contabili in formato standard (conto dare / conto avere / importo / descrizione).","BIL-005":"Sei un esperto contabile e fiscale. Calcola le quote di ammortamento per la chiusura dell'esercizio. Per ogni bene: (1) AMMORTAMENTO CIVILISTICO: quota annuale = costo storico / vita utile stimata. Per il primo anno di acquisto: quota intera (non necessariamente dimezzata civilisticamente, a meno che acquisito a met\u00e0 anno \u2014 in quel caso quota proporzionale ai mesi). Verifica che il bene non sia gi\u00e0 completamente ammortizzato. (2) AMMORTAMENTO FISCALE (DM 31.12.1988): quota = costo storico \u00d7 coefficiente DM. Primo anno: quota dimezzata obbligatoriamente (art. 102 c.2 TUIR). (3) IPERAMMORTAMENTO LdB 2026 se applicabile: deduzione extra-contabile = (costo \u00d7 % maggiorazione) \u00d7 coefficiente DM / 2 per il primo anno. Questa deduzione non \u00e8 nella scrittura contabile ma \u00e8 una variazione in diminuzione nella tax computation. (4) DIFFERENZA TEMPORANEA: ammort. fiscale - ammort. civilistico = differenza che genera DTA o DTL. Produci: tabella beni, totale quote per categoria, scritture contabili (Ammortamenti a Fondo Ammortamento), tabella DTA/DTL generate.","BIL-006":"Sei un esperto contabile e fiscale. Calcola la svalutazione crediti per la chiusura dell'esercizio. CIVILISTICA (OIC 15): (1) Svalutazione specifica: per crediti verso clienti in procedure concorsuali o con gravi difficolt\u00e0 \u2192 svaluta all'importo presumibilmente recuperabile (spesso 0 o quota molto ridotta); (2) Svalutazione collettiva: per i crediti performing applicare una percentuale basata sull'esperienza storica degli insoluti, con maggiorazione per i crediti scaduti (es. 0% per crediti in scadenza, 2% per 31-90gg, 5% per 91-180gg, 20% per oltre 180gg, 50% per oltre 12 mesi). Calcola il fondo necessario e il delta rispetto al fondo esistente. FISCALE (art. 106 TUIR): deducibile nell'esercizio la quota pari allo 0,5% dei crediti commerciali al lordo del fondo, fino a quando il fondo non raggiunge il 5% del totale crediti. L'eccedenza civilistica \u00e8 indeducibile nell'anno (genera DTA). Produci la scrittura contabile e la variazione fiscale in aumento per l'eccedenza indeducibile.","BIL-007":"Sei un esperto contabile. Verifica la valutazione delle rimanenze di magazzino per la chiusura dell'esercizio secondo OIC 13. Principio del minore tra costo e valore netto di realizzo (NRV): (1) VALORE AL COSTO: secondo il metodo adottato dalla societ\u00e0: FIFO (primo entrato, primo uscito: le rimanenze sono valorizzate ai prezzi pi\u00f9 recenti), LIFO (ultimo entrato, primo uscito: le rimanenze sono ai prezzi pi\u00f9 vecchi \u2014 genera solitamente riserva LIFO), CMP (costo medio ponderato: media ponderata dei costi di acquisto). (2) VALORE NETTO DI REALIZZO (NRV): prezzo di vendita stimato meno i costi di completamento e vendita. Se NRV < costo: svalutare alla differenza \u2192 scrittura: Svalutazione rimanenze a Fondo svalutazione magazzino. (3) OBSOLESCENZA E SLOW-MOVING: identifica prodotti con giacenza superiore a X mesi senza movimentazione \u2192 svaluta in funzione del rischio di invenduto. (4) VARIAZIONE RIMANENZE: calcola la variazione rispetto al 31/12 anno precedente e la sua imputazione a CE (sezione B per materie, sezione A per prodotti finiti). Produci la tabella di valutazione e le scritture contabili.","BIL-008":"Sei un esperto contabile e fiscale. Produci tutte le scritture contabili relative alle imposte per la chiusura dell'esercizio. (1) IRES CORRENTE: Imposte correnti (CE voce 22) a Debiti tributari (SP D12) per l'IRES dell'esercizio. Se gi\u00e0 versati acconti: Debiti tributari a Acconti IRES per compensare. (2) IRAP CORRENTE: Imposte correnti a Debiti tributari per l'IRAP. (3) IMPOSTE DIFFERITE E ANTICIPATE (OIC 25): per le DTA nette positive: Imposte anticipate (SP B II) a Imposte differite attive (CE 22 negativo); per le DTL nette: Imposte differite passive (CE 22 positivo) a Fondo imposte differite (SP B 2). Se variazione netta DTA/DTL: registra solo il delta rispetto all'anno precedente. (4) SCRITTURE DI CHIUSURA: verifica che il totale imposte CE (voce 22 = IRES + IRAP +/- variazione DTA/DTL) sia coerente con il totale debiti tributari nello SP. Produci le scritture in formato: data / conto dare / conto avere / importo / descrizione. Aggiungi un quadro riepilogativo per la NI.","BIL-009":"Sei un esperto contabile italiano. Partendo dal bilancio di verifica rettificato, produci lo Stato Patrimoniale completo secondo lo schema obbligatorio art. 2424 cc. ATTIVO: A) Crediti verso soci per versamenti ancora dovuti (con distinzione parte richiamata/non richiamata); B) Immobilizzazioni: I Immateriali (costi impianto, sviluppo, concessioni, avviamento, altre \u2014 con fondi ammort. in diminuzione), II Materiali (terreni, fabbricati, impianti, attrezzature, altri \u2014 con fondi), III Finanziarie (partecipazioni per tipo, crediti per scadenza, altri titoli, strumenti derivati); C) Attivo circolante: I Rimanenze per tipo, II Crediti (clienti per scadenza, verso controllate/collegate/controllanti, verso altri per scadenza), III Attivit\u00e0 finanziarie, IV Disponibilit\u00e0 liquide; D) Ratei e risconti. PASSIVO: A) Patrimonio netto: I Capitale, II Riserva soprapprezzo, III Rivalutazione, IV Legale, V Statutarie, VI Altre, VII Riserva per operazioni di copertura, VIII Utili/perdite portati a nuovo, IX Utile/perdita esercizio; B) Fondi rischi e oneri; C) TFR; D) Debiti per tipo e scadenza; E) Ratei e risconti passivi. Verifica: totale attivo = totale passivo.","BIL-010":"Sei un esperto contabile italiano. Partendo dai conti economici del BdV, produci il Conto Economico scalare completo secondo lo schema art. 2425 cc. A) VALORE DELLA PRODUZIONE: 1 Ricavi vendite e prestazioni (netti da sconti); 2 Variazione rimanenze prodotti finiti e in corso di lavorazione (+/-); 3 Variazione lavori in corso su ordinazione; 4 Incrementi immobilizzazioni per lavori interni; 5 Altri ricavi e proventi (con separazione contributi in c/esercizio). B) COSTI DELLA PRODUZIONE: 6 Materie prime; 7 Servizi; 8 Godimento beni terzi; 9 Personale (a salari/stipendi, b oneri sociali, c TFR, d pensioni, e altri); 10 Ammortamenti e svalutazioni (a-b ammort. imm. immateriali/materiali, c sval. imm., d sval. crediti c.a.); 11 Variazione rimanenze materie; 12 Accantonamenti rischi; 13 Altri accantonamenti; 14 Oneri diversi. [A-B] = DIFFERENZA. C) FINANZIARI: 15 Proventi (da partecipazioni, altri con separazione da correlate); 16 Interessi passivi. D) RETTIFICHE. E) da 2016 eliminata. 20 Imposte. 21 Utile/perdita. Verifica: utile CE = variazione utile/perdita A IX nello SP.","BIL-011":"Sei un esperto nella redazione di bilanci secondo i principi contabili OIC. Redigi la nota integrativa completa per un bilancio ordinario ex art. 2427 cc. Struttura: (1) CRITERI DI VALUTAZIONE: per ciascuna voce di bilancio descrivi il principio contabile OIC applicato e il criterio specifico adottato (es. immobilizzazioni: costo storico al netto ammortamenti; crediti: valore presumibile di realizzo; rimanenze: LIFO/FIFO/CMP al minore tra costo e NRV); (2) MOVIMENTAZIONE IMMOBILIZZAZIONI: tabella con saldo iniziale / acquisti / dismissioni / rivalutazioni / ammortamenti anno / saldo finale \u2014 per ogni categoria; (3) CREDITI PER SCADENZA: tabella crediti entro 12 mesi / 1-5 anni / oltre 5 anni; (4) DEBITI PER SCADENZA: stessa struttura; (5) RATEI E RISCONTI: dettaglio principali componenti; (6) PATRIMONIO NETTO: movimentazione riserve; (7) FONDI RISCHI: movimentazione; (8) TFR: movimentazione; (9) IMPOSTE DIFFERITE: tabella DTA/DTL per tipo di differenza; (10) STRUMENTI FINANZIARI DERIVATI se presenti (OIC 32); (11) OPERAZIONI PARTI CORRELATE; (12) COMPENSI ORGANI; (13) DIPENDENTI MEDI; (14) IMPEGNI E GARANZIE; (15) FATTI SUCCESSIVI (OIC 29). Usa i dati numerici forniti o segnala [DA COMPILARE].","BIL-012":"Sei un esperto contabile. Produci le tabelle numeriche per le sezioni critiche della nota integrativa italiana in formato pronto per l'inserimento. TABELLA MOVIMENTAZIONE IMMOBILIZZAZIONI: colonne \u2014 categoria / saldo iniziale costo / acquisizioni / dismissioni (costo) / rivalutazioni / saldo finale costo / fondo amm. iniziale / amm. anno / dismissioni fondo / saldo finale fondo / valore netto contabile finale. Una riga per subcategoria OIC (immobilizzazioni immateriali: costi impianto, sviluppo, concessioni, avviamento, altre; immobilizzazioni materiali: terreni, fabbricati, impianti, attrezzature, altri beni; immobilizzazioni finanziarie: partecipazioni, crediti). TABELLA CREDITI PER SCADENZA: colonne \u2014 voce SP / totale / entro 12 mesi / da 1 a 5 anni / oltre 5 anni. TABELLA DEBITI PER SCADENZA: stessa struttura. TABELLA IMPOSTE DIFFERITE: colonne \u2014 tipo differenza temporanea / saldo iniziale DTA/DTL / formazione anno / utilizzo/annullamento anno / saldo finale. Usa [00.000] per i valori da compilare.","BIL-013":"Sei un esperto di principi contabili OIC. Analizza i fatti successivi alla data di chiusura dell'esercizio secondo OIC 29 e determina il trattamento appropriato. Classifica ogni evento come: (1) FATTO RETTIFICATIVO (richiede modifica del bilancio): fatti che forniscono evidenza di condizioni gi\u00e0 esistenti alla data di chiusura (es. fallimento di un cliente \u2192 aumenta la svalutazione crediti; definizione di una controversia legale gi\u00e0 in essere \u2192 adegua il fondo rischi; scoperta di un errore o frode), (2) FATTO NON RETTIFICATIVO (solo disclosure in NI): fatti nuovi che si verificano dopo la chiusura (es. acquisizione o cessione di partecipazioni, incendio o calamit\u00e0, emissione di nuove azioni, variazioni significative nei tassi di cambio, perdite rilevanti su investimenti). Per i fatti rettificativi: indica quale voce di bilancio modificare e come. Per i fatti non rettificativi rilevanti: produci il testo della disclosure in nota integrativa con: descrizione del fatto, stima dell'impatto finanziario se determinabile, o dichiarazione che l'impatto non \u00e8 determinabile.","BIL-014":"Sei un esperto di strumenti finanziari derivati e principi contabili OIC 32. Redigi la sezione della nota integrativa sugli strumenti finanziari derivati. La sezione deve contenere: (1) DESCRIZIONE DEI DERIVATI: per ciascuno strumento: tipo (interest rate swap, cap, collar, forward, opzione), finalit\u00e0 (copertura del rischio di tasso / cambio / prezzo vs speculativo), controparte, importo nozionale, tasso fisso/variabile, scadenza; (2) FAIR VALUE: valore equo al 31/12 per ciascun derivato (positivo = attivit\u00e0 finanziaria; negativo = passivit\u00e0 finanziaria); (3) CONTABILIZZAZIONE: se designato come strumento di copertura: tipo (fair value hedge / cash flow hedge), efficacia della copertura, movimentazione della riserva di copertura nello SP; se non designato come copertura: variazione fair value imputata al CE (D15 o D18); (4) RISCHI: informativa qualitativa sui rischi di tasso, di credito (controparte), di liquidit\u00e0 del derivato. Per gli IRS su mutui a tasso variabile (caso pi\u00f9 frequente nelle PMI): descrivi lo swap come copertura del rischio di tasso, indica il nozionale residuo allineato al mutuo sottostante.","BIL-015":"Sei un esperto di XBRL e tassonomia italiana per il deposito dei bilanci al Registro Imprese. Produci la tabella di mapping delle voci dello Stato Patrimoniale verso i tag della tassonomia it-gaap italiana (versione CCIAA vigente). Per ogni voce dello SP art. 2424 cc: (1) indica il tag XBRL corrispondente nel namespace it-gaap (es. Immobilizzazioni immateriali - Costi di impianto e ampliamento \u2192 it-gaap:IntangibleAssetsStartUpCosts), (2) specifica il tipo: tutti i valori patrimoniali sono 'instant' (riferiti alla data di chiusura), (3) indica il periodo: la data di chiusura esercizio in formato YYYY-MM-DD, (4) indica il segno convenzionale XBRL (i valori di attivo e passivo sono sempre positivi nella tassonomia it-gaap; le deduzioni come fondi ammortamento sono anch'esse positive ma sottratte dal totale), (5) segnala le voci per cui la tassonomia it-gaap prevede dettagli aggiuntivi rispetto allo SP (es. partecipazioni suddivise per tipo). Distingui tra tassonomia per bilancio ordinario e abbreviato. La tabella \u00e8 un supporto per la verifica del file XBRL generato dal software.","BIL-016":"Sei un esperto di XBRL e tassonomia italiana. Produci la tabella di mapping delle voci del Conto Economico verso i tag della tassonomia it-gaap italiana. Per ogni voce del CE art. 2425 cc: (1) indica il tag XBRL nel namespace it-gaap (es. Ricavi delle vendite e delle prestazioni \u2192 it-gaap:NetRevenues; Costo delle materie prime \u2192 it-gaap:CostOfRawMaterialsAndConsumables), (2) tutti i valori economici sono 'duration' (riferiti al periodo annuale), (3) il periodo \u00e8 espresso come coppia data-inizio / data-fine dell'esercizio, (4) nel CE XBRL i costi sono positivi e i ricavi positivi \u2014 la struttura scalare viene ricostruita dalla tassonomia (non dai segni dei valori), (5) segnala le voci del CE che nella tassonomia it-gaap richiedono la compilazione di pi\u00f9 tag distinti (es. il personale suddiviso nelle sottovoci a-e). Nota importante: le variazioni di rimanenze (A2 e B11) hanno segno convenzionale specifico in XBRL \u2014 segnala come gestirle correttamente. Distingui tassonomia bilancio ordinario vs abbreviato.","BIL-017":"Sei un esperto di deposito bilanci XBRL al Registro Imprese italiano. Produci una checklist operativa degli errori pi\u00f9 frequenti da verificare prima del deposito del file iXBRL. Organizza per categoria: (1) QUADRATURA: totale attivo = totale passivo (verifica nella struttura XBRL, non solo nel PDF); utile/perdita SP = utile/perdita CE; patrimonio netto = somma delle componenti; (2) TAG OBBLIGATORI: verifica che tutti i tag obbligatori della tassonomia siano presenti (il software di xbrlizzazione produce di solito un report degli errori di validazione); (3) CONTESTI: ogni tag deve avere il contesto corretto \u2014 i valori patrimoniali devono avere contesto 'instant' alla data di chiusura; i valori economici devono avere contesto 'duration' per l'intero esercizio; i valori comparativi dell'anno precedente devono avere il contesto corrispondente all'anno precedente; (4) VALORI COMPARATIVI: lo SP deve riportare i valori al 31/12 anno corrente E al 31/12 anno precedente; il CE deve riportare l'anno corrente e il precedente; (5) SEGNI: nella tassonomia it-gaap tutti i valori sono positivi \u2014 errori di segno generano errori di quadratura; (6) UNIT\u00c0 DI MISURA: tutti i valori devono essere in EUR, non in migliaia; (7) NOTA INTEGRATIVA iXBRL: verifica che i tag inline nella NI riportino i valori identici al bilancio numerico; (8) COERENZA PDF-XBRL: i valori nel PDF allegato devono coincidere esattamente con quelli nel file XBRL.","BIL-018":"Sei un esperto di iXBRL e nota integrativa digitale per il deposito al Registro Imprese italiano. Il formato iXBRL (inline XBRL) incorpora i tag XBRL direttamente nel documento HTML della nota integrativa, cos\u00ec che il documento sia leggibile dagli esseri umani (come PDF) e machine-readable (per XBRL). Produci la struttura della nota integrativa indicando: (1) per ogni valore numerico citato nella NI che corrisponde a un tag della tassonomia it-gaap: il codice HTML da utilizzare per il tag inline XBRL (es. <ix:nonFraction name='it-gaap:NetRevenues' contextRef='CY2025' unitRef='EUR' decimals='0'>1.234.567</ix:nonFraction>), (2) i valori testuali che richiedono tag ix:nonNumeric con il tag tassonomia corrispondente, (3) i valori che NON richiedono tag XBRL (testo narrativo generico). Fornisci esempi concreti per le sezioni principali della NI: criteri di valutazione, tabella immobilizzazioni, compensi organi, dipendenti. Nota: il file iXBRL definitivo viene generato dal software dedicato \u2014 questo output \u00e8 una guida operativa per la verifica.","BIL-019":"Sei un revisore contabile esperto. Verifica la coerenza tra la nota integrativa e il bilancio CEE (SP e CE). Per ogni valore numerico citato nella nota integrativa: (1) identifica la voce CEE corrispondente, (2) confronta i valori, (3) segnala le discrepanze. Aree critiche da verificare sistematicamente: (a) movimentazione immobilizzazioni: saldo iniziale deve = valore netto SP anno precedente; saldo finale deve = valore netto SP anno corrente; (b) tabella crediti per scadenza: totale deve = voce C.II dello SP; (c) tabella debiti per scadenza: totale deve = sezione D dello SP; (d) movimentazione TFR: saldo finale deve = voce C dello SP; (e) movimentazione fondi: saldo finale deve = voce B dello SP; (f) imposte: IRES+IRAP in NI devono = voce 22 del CE; (g) compensi organi: totale compensi amministratori deve = quota identificabile in B9 del CE; (h) dipendenti: costo medio per dipendente deve essere coerente con costo personale CE. Produci un report con due colonne: valore in NI / valore nel bilancio / esito.","BIL-020":"Sei un revisore contabile. Verifica la coerenza tra i valori comparativi dell'anno precedente nel bilancio corrente e il bilancio dell'anno precedente effettivamente approvato. Controlla: (1) Per ogni voce dello SP: saldo al 31/12/N-1 nel bilancio corrente = saldo al 31/12/N-1 nel bilancio approvato l'anno scorso? (2) Per ogni voce del CE: dati anno N-1 nel bilancio corrente = dati anno N-1 nel bilancio approvato? (3) RICLASSIFICHE OIC 29: se un valore dell'anno precedente \u00e8 stato riclassificato (per adeguamento a cambio di principio contabile o per correzione di un errore), verifica che: la riclassifica sia descritta nella NI (sezione cambiamenti di principi contabili o correzione errori OIC 29), l'impatto sia quantificato, il patrimonio netto di apertura sia stato rettificato se necessario. (4) VARIAZIONI PN: verifica che il PN di apertura dell'anno N = PN di chiusura dell'anno N-1 + eventuali rettifiche da riapertura. Segnala tutte le discrepanze con indicazione dell'importo della differenza e della probabile causa."};


const DEMO_OUTPUT = `**Analisi completata**

Di seguito il risultato strutturato sulla base dei dati forniti.

---

**§ 1 — Quadro di riferimento**
Sulla base delle informazioni ricevute, si elabora secondo la normativa vigente applicabile.

**§ 2 — Elaborazione**
Dati processati secondo la procedura ottimale. Tutti i riferimenti normativi verificati alla data corrente.

**§ 3 — Output**
Il documento è una bozza professionale da revisionare prima dell'uso. I campi [DA COMPLETARE] richiedono dati specifici del cliente.

---

> ⚠️ *Bozza generata da AI — validare prima dell'utilizzo professionale.*`;

const normalize=s=>(s||"").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"");
const truncate=(s,n)=>s&&s.length>n?s.slice(0,n)+"…":s;

// ─── Markdown renderer inline ───────────────────────
function parseLine(text){
  const parts=[];const re=/(\*\*[^*\n]+\*\*|\*[^*\n]+\*|`[^`\n]+`)/g;
  let last=0,m;
  while((m=re.exec(text))!==null){
    if(m.index>last)parts.push(text.slice(last,m.index));
    const t=m[0];
    if(t.startsWith("**"))parts.push(<strong key={m.index}>{t.slice(2,-2)}</strong>);
    else if(t.startsWith("*"))parts.push(<em key={m.index}>{t.slice(1,-1)}</em>);
    else parts.push(<code key={m.index} style={{background:"#f0ede8",padding:"1px 5px",borderRadius:3,fontSize:"0.92em",fontFamily:"monospace"}}>{t.slice(1,-1)}</code>);
    last=m.index+t.length;
  }
  if(last<text.length)parts.push(text.slice(last));
  return parts;
}
function RenderMd({text}){
  if(!text)return null;
  return text.split("\n").map((line,i)=>{
    if(/^#{3}\s/.test(line))return<h3 key={i} style={{fontFamily:"Georgia,serif",fontSize:15,margin:"14px 0 4px",color:"#1a1a1a"}}>{line.slice(4)}</h3>;
    if(/^#{2}\s/.test(line))return<h2 key={i} style={{fontFamily:"Georgia,serif",fontSize:17,margin:"16px 0 6px",color:"#1a1a1a"}}>{line.slice(3)}</h2>;
    if(/^#{1}\s/.test(line))return<h1 key={i} style={{fontFamily:"Georgia,serif",fontSize:20,margin:"18px 0 8px",color:"#1a1a1a"}}>{line.slice(2)}</h1>;
    if(line.trim()==="---")return<hr key={i} style={{border:"none",borderTop:"1px solid #e0dbd2",margin:"12px 0"}}/>;
    if(/^>\s/.test(line))return<blockquote key={i} style={{borderLeft:"3px solid #ccc",margin:"8px 0",padding:"4px 12px",color:"#666",fontStyle:"italic",background:"#f9f8f5",borderRadius:"0 6px 6px 0"}}>{parseLine(line.slice(2))}</blockquote>;
    if(!line.trim())return<div key={i} style={{height:8}}/>;
    return<div key={i} style={{marginBottom:2,lineHeight:1.8}}>{parseLine(line)}</div>;
  });
}

// ─── Download helpers ────────────────────────────────
function mdToHtml(text){
  return(text||"").split("\n").map(line=>{
    if(/^### /.test(line))return`<h3>${line.slice(4)}</h3>`;
    if(/^## /.test(line))return`<h2>${line.slice(3)}</h2>`;
    if(/^# /.test(line))return`<h1>${line.slice(2)}</h1>`;
    if(line.trim()==="---")return"<hr/>";
    if(/^> /.test(line))return`<blockquote>${line.slice(2)}</blockquote>`;
    if(!line.trim())return"<br/>";
    return`<p>${line.replace(/\*\*([^*]+)\*\*/g,"<strong>$1</strong>").replace(/\*([^*]+)\*/g,"<em>$1</em>").replace(/`([^`]+)`/g,"<code>$1</code>")}</p>`;
  }).join("");
}
function downloadAsWord(text,filename){
  const html=`<!DOCTYPE html><html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word"><head><meta charset="utf-8"><style>body{font-family:Arial,sans-serif;font-size:11pt;margin:2cm;line-height:1.6}h1,h2,h3{font-family:Georgia,serif;color:#1a1a1a}hr{border:1px solid #ccc}blockquote{border-left:3px solid #ccc;padding-left:12px;color:#666;font-style:italic}code{background:#f0ede8;padding:1px 4px;font-family:monospace}p{margin:4px 0}</style></head><body>${mdToHtml(text)}</body></html>`;
  const blob=new Blob(["\ufeff",html],{type:"application/msword"});
  const url=URL.createObjectURL(blob);
  const a=document.createElement("a");a.href=url;a.download=filename+".doc";a.click();
  setTimeout(()=>URL.revokeObjectURL(url),1000);
}
function downloadAsPDF(text,filename){
  const win=window.open("","_blank","width=800,height=700");
  if(!win)return;
  win.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8"><title>${filename}</title><style>body{font-family:Arial,sans-serif;font-size:11pt;margin:2cm;line-height:1.6;color:#222}h1,h2,h3{font-family:Georgia,serif}hr{border:1px solid #ccc}blockquote{border-left:3px solid #ccc;padding-left:12px;color:#666;font-style:italic}code{background:#f0ede8;padding:1px 4px;font-family:monospace}@media print{body{margin:1.5cm}}p{margin:4px 0}</style></head><body>${mdToHtml(text)}<script>window.onload=function(){window.print();}<\/script></body></html>`);
  win.document.close();
}
function matchSearch(sk,q){if(!q)return true;const n=normalize(q);return[sk.nome,sk.descrizione,sk.area,sk.sotto_area,...(sk.tags||[])].some(f=>normalize(String(f||"")).includes(n));}

function useStream(trigger,text,speed=18){
  const[disp,setDisp]=useState("");const[done,setDone]=useState(false);
  useEffect(()=>{if(!trigger){setDisp("");setDone(false);return;}setDisp("");setDone(false);
    let i=0;const iv=setInterval(()=>{i+=speed;setDisp(text.slice(0,i));if(i>=text.length){setDisp(text);setDone(true);clearInterval(iv);}},30);
    return()=>clearInterval(iv);},[trigger]);
  return{disp,done};
}

function Badge({label,color,bg,small}){
  return<span style={{display:"inline-block",padding:small?"1px 8px":"2px 10px",fontSize:small?9:10,fontWeight:700,fontFamily:"Arial,sans-serif",color:color||"#888",background:"transparent",border:`1px solid ${color||"#D8D4CE"}`,letterSpacing:"0.08em",textTransform:"uppercase",marginRight:4,marginBottom:4}}>{label}</span>;
}
function Pill({label,active,onClick,color}){
  return<button onClick={onClick} style={{border:`1px solid ${active?"#0A0B0F":"#D8D4CE"}`,padding:"5px 14px",fontSize:11,fontFamily:"Arial,sans-serif",cursor:"pointer",background:active?"#0A0B0F":"transparent",color:active?"#F1EFE8":"#888",fontWeight:700,letterSpacing:"0.1em",textTransform:"uppercase",transition:"all .15s"}}>{label}</button>;
}

// ─────────────────────────────────────────────────────
// FAQ Modal
// ─────────────────────────────────────────────────────
function FAQModal({onClose}){
  const[open,setOpen]=useState(null);
  const toggle=key=>setOpen(o=>o===key?null:key);
  return(
    <div style={{position:"fixed",inset:0,background:"#00000088",zIndex:3000,display:"flex",alignItems:"center",justifyContent:"center",padding:16,overflowY:"auto"}} onClick={onClose}>
      <div onClick={e=>e.stopPropagation()} style={{background:"#fff",borderRadius:14,width:"100%",maxWidth:760,maxHeight:"90vh",overflowY:"auto",boxShadow:"0 8px 48px #0005"}}>
        <div style={{background:C.nox,padding:"20px 24px",borderRadius:"12px 12px 0 0",display:"flex",justifyContent:"space-between",alignItems:"center",position:"sticky",top:0,zIndex:10}}>
          <div>
            <div style={{fontFamily:"Georgia,serif",fontSize:20,fontWeight:700,color:"#fff"}}>Domande frequenti</div>
            <div style={{fontSize:12,color:"#888",fontFamily:"Arial,sans-serif",marginTop:2}}>Privacy, sicurezza, file scaricati, piattaforma</div>
          </div>
          <button onClick={onClose} style={{background:"none",border:"none",color:"#888",fontSize:22,cursor:"pointer"}}>×</button>
        </div>
        <div style={{padding:"20px 24px"}}>
          {FAQ_SECTIONS.map((sec,si)=>(
            <div key={si} style={{marginBottom:24}}>
              <div style={{fontFamily:"Arial,sans-serif",fontSize:13,fontWeight:700,color:C.aurum,letterSpacing:"0.08em",marginBottom:10,display:"flex",alignItems:"center",gap:6}}>
                {sec.section}
              </div>
              {sec.items.map((item,ii)=>{
                const key=`${si}-${ii}`;
                const isOpen=open===key;
                return(
                  <div key={ii} style={{borderRadius:8,border:"1px solid #eee",marginBottom:6,overflow:"hidden"}}>
                    <button onClick={()=>toggle(key)} style={{width:"100%",background:isOpen?"#f9f8f5":"#fff",border:"none",cursor:"pointer",padding:"12px 16px",display:"flex",justifyContent:"space-between",alignItems:"center",textAlign:"left"}}>
                      <span style={{fontFamily:"Arial,sans-serif",fontSize:13.5,fontWeight:isOpen?700:500,color:C.nox,lineHeight:1.4}}>{item.q}</span>
                      <span style={{fontSize:16,color:isOpen?C.aurum:C.gray,marginLeft:12,flexShrink:0,transition:"transform .2s",transform:isOpen?"rotate(180deg)":"none"}}>▾</span>
                    </button>
                    {isOpen&&(
                      <div style={{padding:"12px 16px 14px",background:"#f9f8f5",borderTop:"1px solid #eee"}}>
                        <p style={{fontFamily:"Arial,sans-serif",fontSize:13.5,color:"#333",lineHeight:1.75,margin:0}}>{item.a}</p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ))}
          <div style={{borderTop:"1px solid #eee",paddingTop:16,textAlign:"center",fontSize:12,color:C.gray,fontFamily:"Arial,sans-serif"}}>
            Non hai trovato risposta? Scrivici su <strong>contatti</strong> o consulta il <strong>Manifesto</strong>.
          </div>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────
// Download Panel
// ─────────────────────────────────────────────────────
function DownloadPanel({skill,allSkills}){
  const[scope,setScope]=useState("single");
  const[downloaded,setDownloaded]=useState(null);
  const[guideOpen,setGuideOpen]=useState(null);

  const collection=allSkills.filter(s=>s.sotto_area===skill.sotto_area);
  const targetSkills=scope==="single"?[skill]:collection;

  function handleDownload(p){
    const content=FORMATTERS[p.id](targetSkills);
    const base=scope==="single"?slugify(skill.nome):`xnunc-${slugify(skill.sotto_area)}`;
    downloadFile(content,`${base}_${p.id}.${p.ext}`,p.mime);
    setDownloaded(p.id);
    setTimeout(()=>setDownloaded(null),2500);
  }

  return(
    <div style={{borderRadius:10,border:"1.5px solid #e8e4dc",overflow:"hidden",marginTop:16}}>
      {/* Header */}
      <div style={{background:C.nox,padding:"10px 16px",display:"flex",alignItems:"center",gap:8}}>
        <span style={{fontSize:13}}>⬇</span>
        <span style={{fontFamily:"Arial,sans-serif",fontSize:12,fontWeight:700,color:C.aurum,letterSpacing:"0.08em"}}>ESPORTA SKILL PER LA TUA AI</span>
      </div>

      {/* No auto-update notice */}
      <div style={{background:"#FFFBEB",borderBottom:"1px solid #FDE68A",padding:"8px 16px",display:"flex",gap:8,alignItems:"flex-start"}}>
        <span style={{fontSize:13,flexShrink:0,marginTop:1}}>⚠️</span>
        <span style={{fontSize:12,color:"#92400E",fontFamily:"Arial,sans-serif",lineHeight:1.5}}>
          <strong>Versione statica — nessun aggiornamento automatico.</strong> Il file scaricato corrisponde alla versione corrente (v1.0). Se la community migliora questa skill, dovrai riscaricarla manualmente per ottenere la versione aggiornata.
        </span>
      </div>

      {/* Scope selector */}
      <div style={{padding:"10px 16px",background:"#f9f8f5",borderBottom:"1px solid #eee",display:"flex",gap:8,alignItems:"center",flexWrap:"wrap"}}>
        <span style={{fontSize:10,fontWeight:700,color:C.gray,fontFamily:"Arial,sans-serif",letterSpacing:"0.08em"}}>CONTENUTO</span>
        <button onClick={()=>setScope("single")} style={{padding:"4px 12px",borderRadius:8,border:"none",cursor:"pointer",background:scope==="single"?C.nox:"#eee",color:scope==="single"?"#fff":"#555",fontSize:12,fontFamily:"Arial,sans-serif",fontWeight:scope==="single"?700:400}}>
          Solo questa skill
        </button>
        <button onClick={()=>setScope("collection")} style={{padding:"4px 12px",borderRadius:8,border:"none",cursor:"pointer",background:scope==="collection"?C.nox:"#eee",color:scope==="collection"?"#fff":"#555",fontSize:12,fontFamily:"Arial,sans-serif",fontWeight:scope==="collection"?700:400}}>
          Raccolta — {skill.sotto_area}
          <span style={{marginLeft:5,background:scope==="collection"?C.aurum:"#bbb",color:"#fff",borderRadius:8,padding:"1px 6px",fontSize:10,fontWeight:700}}>{collection.length}</span>
        </button>
        {scope==="collection"&&<span style={{fontSize:11,color:C.gray,fontFamily:"Arial,sans-serif",fontStyle:"italic"}}>{collection.length} skill in un unico file</span>}
      </div>

      {/* Platform grid */}
      <div style={{padding:"12px 16px",display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
        {PLATFORMS.map(p=>(
          <div key={p.id} style={{border:`1.5px solid ${downloaded===p.id?"#1D9E75":p.color+"55"}`,borderRadius:10,overflow:"hidden",background:downloaded===p.id?"#E3F7F0":p.bg}}>
            <button onClick={()=>handleDownload(p)} style={{width:"100%",border:"none",background:"transparent",cursor:"pointer",padding:"10px 14px",textAlign:"left",display:"flex",alignItems:"center",gap:10}}>
              {PLATFORM_LOGOS[p.id]}
              <div style={{flex:1}}>
                <div style={{fontFamily:"Arial,sans-serif",fontSize:13,fontWeight:700,color:downloaded===p.id?"#1D9E75":p.color}}>
                  {downloaded===p.id?"✓ Scaricato":p.label}
                </div>
                <div style={{fontFamily:"Arial,sans-serif",fontSize:10,color:C.gray}}>{p.sub}</div>
              </div>
              <span style={{fontSize:10,fontFamily:"monospace",color:"#aaa",background:"#fff",padding:"2px 5px",borderRadius:4,border:"1px solid #eee"}}>
                .{p.ext}
              </span>
            </button>
            <div style={{padding:"0 14px 8px",fontFamily:"Arial,sans-serif",fontSize:11,color:"#666",lineHeight:1.4}}>
              {p.desc}
            </div>
            {/* How to use guide */}
            <button onClick={()=>setGuideOpen(guideOpen===p.id?null:p.id)} style={{width:"100%",background:"transparent",border:"none",borderTop:`1px solid ${p.color}22`,padding:"6px 14px",cursor:"pointer",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
              <span style={{fontFamily:"Arial,sans-serif",fontSize:11,color:p.color,fontWeight:700}}>Come si usa →</span>
              <span style={{fontSize:12,color:p.color,transform:guideOpen===p.id?"rotate(180deg)":"none",transition:"transform .2s"}}>▾</span>
            </button>
            {guideOpen===p.id&&(
              <div style={{background:p.bg,borderTop:`1px solid ${p.color}22`,padding:"10px 14px"}}>
                <ol style={{margin:0,padding:"0 0 0 16px",fontFamily:"Arial,sans-serif",fontSize:11.5,color:"#444",lineHeight:1.7}}>
                  {p.howto.map((step,i)=><li key={i} style={{marginBottom:4}}>{step}</li>)}
                </ol>
                <div style={{marginTop:8,padding:"6px 10px",background:"#fff8",borderRadius:6,border:`1px solid ${p.color}33`,fontSize:11,color:"#888",fontFamily:"Arial,sans-serif"}}>
                  ⚠️ Ricorda: questo file è una snapshot statica. Per aggiornamenti riscarica da xnunc.ai.
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      <div style={{padding:"8px 16px",background:"#f5f3ee",borderTop:"1px solid #eee"}}>
        <span style={{fontSize:11,color:C.gray,fontFamily:"Arial,sans-serif"}}>
          Il system prompt è identico su tutte le piattaforme — cambia solo il formato del file.
          {scope==="collection"&&" · I moduli vengono uniti in un unico file pronto all'importazione."}
        </span>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────
// Login Modal
// ─────────────────────────────────────────────────────
function LegalModal({tipo,onClose}){
  const isPrivacy=tipo==="privacy";
  return(
    <div style={{position:"fixed",inset:0,background:"rgba(10,11,15,0.82)",zIndex:3000,display:"flex",alignItems:"center",justifyContent:"center",padding:16}} onClick={onClose}>
      <div onClick={e=>e.stopPropagation()} style={{background:"#FAF9F7",borderRadius:4,width:"100%",maxWidth:560,maxHeight:"80vh",overflow:"hidden",display:"flex",flexDirection:"column",boxShadow:"0 20px 60px rgba(0,0,0,0.3)"}}>
        <div style={{padding:"24px 32px 20px",borderBottom:"2px solid #0A0B0F",display:"flex",justifyContent:"space-between",alignItems:"center",flexShrink:0}}>
          <div>
            <div style={{fontFamily:"Arial,sans-serif",fontSize:9,color:"#BA7517",fontWeight:700,letterSpacing:"0.2em",marginBottom:6}}>DOCUMENTO LEGALE</div>
            <div style={{fontFamily:"Georgia,serif",fontSize:19,color:"#0A0B0F"}}>{isPrivacy?"Privacy Policy":"Termini di Servizio"}</div>
          </div>
          <button onClick={onClose} style={{background:"none",border:"none",color:"#aaa",fontSize:20,cursor:"pointer"}}>×</button>
        </div>
        <div style={{padding:"24px 32px",overflowY:"auto",fontFamily:"Arial,sans-serif",fontSize:12,color:"#444",lineHeight:1.7}}>
          {isPrivacy?(
            <>
              <p style={{fontWeight:700,color:"#0A0B0F",marginBottom:8}}>Titolare del trattamento</p>
              <p style={{marginBottom:16}}>BC &amp; Studio Prof.le Consulenza Societaria Tributaria — morales@bcand.it</p>
              <p style={{fontWeight:700,color:"#0A0B0F",marginBottom:8}}>Dati raccolti</p>
              <p style={{marginBottom:16}}>xNunc raccoglie esclusivamente email e password per l'autenticazione. Non vengono raccolti dati sull'utilizzo delle skill né contenuti inseriti dall'utente: tutti gli input rimangono nel browser dell'utente (localStorage) o vengono trasmessi direttamente al provider AI scelto (Anthropic, OpenAI, Gemini) senza transito attraverso i nostri server.</p>
              <p style={{fontWeight:700,color:"#0A0B0F",marginBottom:8}}>Base giuridica</p>
              <p style={{marginBottom:16}}>Il trattamento è fondato sul contratto (art. 6 par. 1 lett. b GDPR) per la gestione dell'account.</p>
              <p style={{fontWeight:700,color:"#0A0B0F",marginBottom:8}}>Conservazione</p>
              <p style={{marginBottom:16}}>I dati di autenticazione sono conservati su infrastruttura Supabase (EU) fino alla cancellazione dell'account. L'utente può richiedere la cancellazione in qualsiasi momento dal proprio profilo.</p>
              <p style={{fontWeight:700,color:"#0A0B0F",marginBottom:8}}>Diritti dell'interessato</p>
              <p>Accesso, rettifica, cancellazione, portabilità e opposizione al trattamento: scrivere a morales@bcand.it.</p>
            </>
          ):(
            <>
              <p style={{fontWeight:700,color:"#0A0B0F",marginBottom:8}}>Accettazione</p>
              <p style={{marginBottom:16}}>Accedendo a xNunc l'utente accetta integralmente i presenti Termini. L'utilizzo è riservato a professionisti abilitati (Dottori Commercialisti, Revisori Legali) e ai loro collaboratori.</p>
              <p style={{fontWeight:700,color:"#0A0B0F",marginBottom:8}}>Natura del servizio</p>
              <p style={{marginBottom:16}}>xNunc è uno strumento di supporto professionale basato su intelligenza artificiale. Gli output generati hanno natura orientativa e non sostituiscono la consulenza professionale qualificata. L'utente è responsabile della verifica e dell'utilizzo di qualsiasi output.</p>
              <p style={{fontWeight:700,color:"#0A0B0F",marginBottom:8}}>Limitazione di responsabilità</p>
              <p style={{marginBottom:16}}>Il titolare non risponde di danni derivanti dall'utilizzo improprio degli output AI, da interruzioni del servizio o da malfunzionamenti dei provider AI di terze parti (Anthropic, OpenAI, Google).</p>
              <p style={{fontWeight:700,color:"#0A0B0F",marginBottom:8}}>Proprietà intellettuale</p>
              <p style={{marginBottom:16}}>Il catalogo delle skill, i prompt e l'interfaccia sono proprietà di BC &amp; Studio. È vietata la riproduzione senza autorizzazione scritta.</p>
              <p style={{fontWeight:700,color:"#0A0B0F",marginBottom:8}}>Foro competente</p>
              <p>Per qualsiasi controversia è competente in via esclusiva il Foro di Milano. Legge applicabile: diritto italiano.</p>
            </>
          )}
        </div>
        <div style={{padding:"16px 32px",borderTop:"1px solid #E8E4DC",flexShrink:0}}>
          <button onClick={onClose} style={{width:"100%",padding:"10px",border:"none",background:"#0A0B0F",color:"#F1EFE8",fontFamily:"Arial",fontSize:11,fontWeight:700,letterSpacing:"0.1em",textTransform:"uppercase",cursor:"pointer",borderRadius:2}}>Chiudi</button>
        </div>
      </div>
    </div>
  );
}

function LoginModal({onClose,onLogin}){
  const[tab,setTab]=useState("login");
  const[email,setEmail]=useState("");
  const[pw,setPw]=useState("");
  const[pw2,setPw2]=useState("");
  const[authError,setAuthError]=useState("");
  const[authLoading,setAuthLoading]=useState(false);
  const[resetMode,setResetMode]=useState(false);
  const[resetSent,setResetSent]=useState(false);
  const[legalModal,setLegalModal]=useState(null); // "privacy" | "termini"

  const pwMismatch=tab==="registrati"&&pw2&&pw!==pw2;
  const canSubmit=!authLoading&&email&&pw&&(tab==="login"||(pw===pw2&&pw.length>=8));

  async function handleSubmit(){
    if(resetMode){
      setAuthLoading(true);setAuthError("");
      try{await resetPassword(email);setResetSent(true);}
      catch(e){setAuthError(e.message||"Errore invio email");}
      finally{setAuthLoading(false);}
      return;
    }
    if(!canSubmit)return;
    setAuthLoading(true);setAuthError("");
    try{await onLogin(email,pw,tab);}
    catch(e){setAuthError(e.message||"Errore di accesso");}
    finally{setAuthLoading(false);}
  }

  const inputStyle={width:"100%",border:"none",borderBottom:"1px solid #D8D4CE",padding:"10px 0",background:"transparent",color:"#0A0B0F",fontSize:13,fontFamily:"Arial",outline:"none",boxSizing:"border-box"};

  return(
    <>
    {legalModal&&<LegalModal tipo={legalModal} onClose={()=>setLegalModal(null)}/>}
    <div style={{position:"fixed",inset:0,background:"rgba(10,11,15,0.72)",zIndex:2000,display:"flex",alignItems:"center",justifyContent:"center",padding:16}} onClick={onClose}>
      <div onClick={e=>e.stopPropagation()} style={{background:"#FAF9F7",borderRadius:4,width:"100%",maxWidth:400,boxShadow:"0 2px 4px rgba(0,0,0,0.06), 0 20px 60px rgba(0,0,0,0.18)",overflow:"hidden"}}>
        {/* Header */}
        <div style={{background:"#FAF9F7",padding:"28px 32px 24px",display:"flex",justifyContent:"space-between",alignItems:"center",borderBottom:"2px solid #0A0B0F"}}>
          <div>
            <div style={{fontFamily:"Arial,sans-serif",fontSize:9,color:"#BA7517",fontWeight:700,letterSpacing:"0.2em",marginBottom:8}}>{resetMode?"RECUPERO ACCESSO":"AUTENTICAZIONE"}</div>
            <div style={{fontFamily:"Georgia,serif",fontSize:21,fontWeight:400,color:"#0A0B0F"}}>{resetMode?"Recupera password":"Accedi a xNunc"}</div>
          </div>
          <button onClick={onClose} style={{background:"none",border:"none",color:"#aaa",fontSize:20,cursor:"pointer",padding:0}}>×</button>
        </div>

        {/* Tabs (solo se non in reset mode) */}
        {!resetMode&&<div style={{display:"flex",borderBottom:"2px solid #0A0B0F",padding:"0 28px",gap:4,alignItems:"flex-end"}}>
          {[["login","Accedi"],["registrati","Registrati"]].map(([t,label])=>(
            <button key={t} onClick={()=>{setTab(t);setAuthError("");setPw2("");}} style={{padding:"8px 16px",border:"none",cursor:"pointer",background:tab===t?"#0A0B0F":"none",color:tab===t?"#F1EFE8":"#aaa",fontFamily:"Arial,sans-serif",fontSize:10,fontWeight:700,letterSpacing:"0.14em",marginBottom:tab===t?"-2px":0,transition:"all .2s"}}>{label}</button>
          ))}
        </div>}

        <div style={{padding:"28px 32px",gap:14,background:"#FAF9F7",display:"flex",flexDirection:"column"}}>

          {/* Bottoni social (solo login/registrati) */}
          {!resetMode&&<>
            <div style={{display:"flex",gap:10}}>
              <button disabled title="Prossimamente" style={{flex:1,display:"flex",alignItems:"center",justifyContent:"center",gap:8,padding:"10px 14px",border:"1px solid #E8E4DC",background:"#F5F3EF",color:"#C0BDB8",fontFamily:"Arial,sans-serif",fontSize:11,fontWeight:700,letterSpacing:"0.08em",textTransform:"uppercase",cursor:"not-allowed",opacity:0.7,borderRadius:2}}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#C0BDB8"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#C0BDB8"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#C0BDB8"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#C0BDB8"/></svg>
                Google<span style={{fontSize:8,letterSpacing:"0.12em"}}>PRESTO</span>
              </button>
              <button disabled title="Prossimamente" style={{flex:1,display:"flex",alignItems:"center",justifyContent:"center",gap:8,padding:"10px 14px",border:"1px solid #E8E4DC",background:"#F5F3EF",color:"#C0BDB8",fontFamily:"Arial,sans-serif",fontSize:11,fontWeight:700,letterSpacing:"0.08em",textTransform:"uppercase",cursor:"not-allowed",opacity:0.7,borderRadius:2}}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="#C0BDB8"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>
                LinkedIn<span style={{fontSize:8,letterSpacing:"0.12em"}}>PRESTO</span>
              </button>
            </div>
            <div style={{display:"flex",alignItems:"center",gap:10}}>
              <div style={{flex:1,height:1,background:"#E8E4DC"}}/>
              <span style={{fontSize:9,color:"#C0BDB8",letterSpacing:"0.12em",textTransform:"uppercase",fontFamily:"Arial"}}>oppure</span>
              <div style={{flex:1,height:1,background:"#E8E4DC"}}/>
            </div>
          </>}

          {/* Form */}
          {resetSent?(
            <div style={{background:"#F0FAF5",border:"1px solid #A8E6C8",borderRadius:2,padding:"14px 16px",fontFamily:"Arial",fontSize:12,color:"#1D9E75",textAlign:"center",lineHeight:1.6}}>
              Email inviata a <strong>{email}</strong>.<br/>Controlla la casella e clicca il link per reimpostare la password.
              <button onClick={()=>{setResetMode(false);setResetSent(false);}} style={{display:"block",margin:"12px auto 0",background:"none",border:"none",color:"#0A0B0F",fontFamily:"Arial",fontSize:11,fontWeight:700,cursor:"pointer",letterSpacing:"0.08em",textDecoration:"underline"}}>Torna al login</button>
            </div>
          ):(
            <>
              <input value={email} onChange={e=>{setEmail(e.target.value);setAuthError("");}} placeholder="Email" type="email" onKeyDown={e=>e.key==="Enter"&&handleSubmit()} style={inputStyle}/>
              {!resetMode&&<>
                <input value={pw} onChange={e=>{setPw(e.target.value);setAuthError("");}} placeholder={tab==="registrati"?"Password (min. 8 caratteri)":"Password"} type="password" onKeyDown={e=>e.key==="Enter"&&handleSubmit()} style={{...inputStyle,borderBottomColor:pwMismatch?"#C0392B":"#D8D4CE"}}/>
                {tab==="registrati"&&<input value={pw2} onChange={e=>{setPw2(e.target.value);setAuthError("");}} placeholder="Conferma password" type="password" onKeyDown={e=>e.key==="Enter"&&handleSubmit()} style={{...inputStyle,borderBottomColor:pwMismatch?"#C0392B":"#D8D4CE"}}/>}
                {pwMismatch&&<div style={{fontSize:11,color:"#C0392B",marginTop:-8}}>Le password non coincidono</div>}
                {tab==="registrati"&&pw&&pw.length<8&&<div style={{fontSize:11,color:"#C0392B",marginTop:-8}}>Minimo 8 caratteri</div>}
              </>}
              {authError&&<div style={{fontSize:11,color:"#C0392B",padding:"6px 10px",background:"#FEF0EF",border:"1px solid #F5C6C2",borderRadius:2}}>{authError}</div>}
              <button onClick={handleSubmit} disabled={resetMode?(!email||authLoading):!canSubmit} style={{width:"100%",padding:"11px 20px",borderRadius:4,border:"none",background:(resetMode?(!email||authLoading):!canSubmit)?"#ccc":"#0A0B0F",color:"#F1EFE8",fontWeight:700,fontSize:11,cursor:(resetMode?(!email||authLoading):!canSubmit)?"not-allowed":"pointer",fontFamily:"Arial",letterSpacing:"0.1em",textTransform:"uppercase",transition:"background .2s",marginTop:4}}>
                {authLoading?"Attendere…":resetMode?"Invia email di recupero":tab==="login"?"Accedi":"Crea account"}
              </button>
              {tab==="login"&&!resetMode&&<button onClick={()=>{setResetMode(true);setAuthError("");}} style={{background:"none",border:"none",color:"#aaa",fontFamily:"Arial",fontSize:11,cursor:"pointer",padding:0,textAlign:"center",textDecoration:"underline"}}>Password dimenticata?</button>}
              {resetMode&&<button onClick={()=>{setResetMode(false);setAuthError("");}} style={{background:"none",border:"none",color:"#aaa",fontFamily:"Arial",fontSize:11,cursor:"pointer",padding:0,textAlign:"center",textDecoration:"underline"}}>← Torna al login</button>}
            </>
          )}

          {/* Footer legale */}
          <p style={{textAlign:"center",fontSize:10,color:"#aaa",margin:"4px 0 0",lineHeight:1.6}}>
            Accedendo accetti la{" "}
            <span onClick={()=>setLegalModal("privacy")} style={{color:"#0A0B0F",fontWeight:700,cursor:"pointer",textDecoration:"underline"}}>Privacy Policy</span>
            {" "}e i{" "}
            <span onClick={()=>setLegalModal("termini")} style={{color:"#0A0B0F",fontWeight:700,cursor:"pointer",textDecoration:"underline"}}>Termini di Servizio</span>.
          </p>
        </div>
      </div>
    </div>
    </>
  );
}


// ─────────────────────────────────────────────────────
// WACC Tool (embedded interactive calculator)
// ─────────────────────────────────────────────────────
const WACC_SECTORS=["Advertising","Aerospace/Defense","Air Transport","Apparel","Auto & Truck","Auto Parts","Bank (Money Center)","Banks (Regional)","Beverage (Alcoholic)","Beverage (Soft)","Broadcasting","Building Materials","Business & Consumer Services","Chemical (Basic)","Chemical (Diversified)","Chemical (Specialty)","Coal & Related Energy","Computer Services","Computers/Peripherals","Construction Supplies","Diversified","Drug (Pharmaceutical)","Education","Electrical Equipment","Electronics (Consumer & Office)","Electronics (General)","Engineering/Construction","Entertainment","Environmental & Waste","Farming/Agriculture","Financial Svcs. (Non-bank & Insurance)","Food Processing","Food Wholesalers","Furn/Home Furnishings","Green & Renewable Energy","Healthcare Products","Healthcare Support Services","Homebuilding","Hotel/Gaming","Household Products","Human Resources","Industrial Services","Information Services","Insurance (General)","Insurance (Life)","Insurance (Prop/Cas.)","Investments & Asset Mgmt.","IT Services","Machinery","Metals & Mining","Office Equipment & Services","Oil/Gas (Integrated)","Oil/Gas (Production and Exploration)","Oil/Gas (Refining & Marketing)","Oilfield Svcs/Equip.","Online (Advertising)","Online (Commerce)","Packaging & Container","Paper/Forest Products","Power","Precious Metals","Publishing & Newspapers","R.E.I.T.","Real Estate (Development)","Real Estate (General/Diversified)","Real Estate (Operations & Services)","Recreation","Restaurant/Dining","Retail (Automotive)","Retail (Building Supply)","Retail (Distributors)","Retail (General)","Retail (Grocery and Food)","Retail (Online)","Retail (Special Lines)","Rubber& Tires","Semiconductor","Semiconductor Equip","Shipbuilding & Marine","Shoe","Software (Entertainment)","Software (Internet)","Software (System & Application)","Steel","Telecom (Wireless)","Telecom. Equipment","Telecom. Services","Tobacco","Transportation","Trucking","Utility (General)","Utility (Water)"];
const WACC_CTYPES=[{id:"listed",label:"Quotata"},{id:"sme",label:"PMI non quotata"},{id:"large",label:"Grande impresa"},{id:"startup",label:"Start-up"}];
const WACC_GEOS=[{id:"it",label:"Italia",flag:"🇮🇹"},{id:"eu",label:"Europa",flag:"🇪🇺"},{id:"us",label:"USA",flag:"🇺🇸"},{id:"em",label:"Emerging",flag:"🌍"}];
const WACC_STEPS=["Contesto","Settore","Debito","Equity","Risultato"];

async function waccAI(sys,usr,web=false){
  const body={model:"claude-sonnet-4-6",max_tokens:2000,system:sys,messages:[{role:"user",content:usr}]};
  if(web) body.tools=[{type:"web_search_20250305",name:"web_search",max_uses:5}];
  const r=await fetch("/api/claude",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(body)});
  if(!r.ok) throw new Error("HTTP "+r.status);
  const d=await r.json();
  return d.content?.find(b=>b.type==="text")?.text||d.content?.[0]?.text||"";
}

function WACCTool(){
  const[step,setStep]=useState(0);
  const[inp,setInp]=useState({ct:"sme",geo:"it",sector:"",D:"",E:"",kd:"",tax:"",rf:"",erp:"",sp:"0",bu:"",sr:"0"});
  const[mkt,setMkt]=useState(null);
  const[busy,setBusy]=useState(false);
  const[err,setErr]=useState("");
  const[res,setRes]=useState(null);
  const[ai,setAi]=useState("");
  const[aiLoad,setAiLoad]=useState(false);
  const u=(k,v)=>setInp(p=>({...p,[k]:v}));
  const WB="#2C7BE5",WBG="#EBF2FD";
  const pct=(v,d=2)=>v!=null?(v*100).toFixed(d)+"%":"—";
  const fix=(v,d=2)=>v!=null?v.toFixed(d):"—";

  const fetchMkt=useCallback(async()=>{
    if(!inp.sector||!inp.geo)return;
    setBusy(true);setErr("");
    try{
      const g=inp.geo==="it"?"Italy":inp.geo==="eu"?"Europe":inp.geo==="us"?"USA":"Emerging Markets";
      const raw=await waccAI(
        'Sei un esperto di valutazione. Rispondi SOLO con JSON valido senza markdown. Campi richiesti (decimali, 0.038=3.8%): {"rfRate":number,"erp":number,"betaUnlevered":number,"defaultSpread":number,"effectiveTaxRate":number,"sizePremiumSmall":number,"dataYear":number,"notes":string}',
        'Parametri WACC per settore "'+inp.sector+'", area '+g+'. Cerca: beta Damodaran, ERP '+g+', BTP/Bund 10Y corrente, default spread, tax rate, size premium Kroll 9-10. Solo JSON.',
        true
      );
      const p=JSON.parse(raw.replace(/```json|```/g,"").trim());
      setMkt(p);
      setInp(prev=>({...prev,
        rf:String(p.rfRate??prev.rf),
        erp:String(p.erp??prev.erp),
        bu:String(p.betaUnlevered??prev.bu),
        kd:String(p.defaultSpread?(p.rfRate||parseFloat(prev.rf)||0)+p.defaultSpread:prev.kd),
        tax:String(p.effectiveTaxRate??prev.tax),
        sp:prev.ct==="sme"?String(p.sizePremiumSmall??0.02):prev.sp,
      }));
    }catch(e){setErr("Errore dati. Inserisci manualmente.");}
    setBusy(false);
  },[inp.sector,inp.geo,inp.ct]);

  useEffect(()=>{if(step===2&&inp.sector)fetchMkt();},[step]);

  const compute=()=>{
    const D=parseFloat(inp.D)||0,E=parseFloat(inp.E)||0,V=D+E;
    if(!V)return;
    const Wd=D/V,We=E/V,t=parseFloat(inp.tax)||0,kd=parseFloat(inp.kd)||0,kdN=kd*(1-t);
    const rf=parseFloat(inp.rf)||0,erp=parseFloat(inp.erp)||0,sp=parseFloat(inp.sp)||0,sr=parseFloat(inp.sr)||0;
    const bu=parseFloat(inp.bu)||0,der=E>0?D/E:0,bl=bu*(1+(1-t)*der),ke=rf+bl*erp+sp+sr,wacc=Wd*kdN+We*ke;
    const bs=[bu*.7,bu*.85,bu,bu*1.15,bu*1.3],es=[erp-.01,erp-.005,erp,erp+.005,erp+.01];
    const grid=bs.map(b=>es.map(e=>{const l=b*(1+(1-t)*der);return Wd*kdN+We*(rf+l*e+sp+sr);}));
    setRes({Wd,We,kdN,ke,wacc,bl,bu,kd,t,rf,erp,sp,sr,D,E,grid,bs,es});
  };

  useEffect(()=>{if(step===4&&!res)compute();},[step]);

  useEffect(()=>{
    if(!res||ai)return;
    setAiLoad(true);
    waccAI(
      "Sei un Dottore Commercialista esperto in valutazioni. Rispondi in italiano, max 3 paragrafi, tono professionale.",
      "WACC="+pct(res.wacc)+" Ke="+pct(res.ke)+" Kd netto="+pct(res.kdN)+" Wd="+pct(res.Wd)+" We="+pct(res.We)+" betaL="+res.bl.toFixed(2)+" Settore="+inp.sector+" ERP="+pct(res.erp)+" Rf="+pct(res.rf)+" SP="+pct(res.sp)+"\nCommenta ragionevolezza, driver principali, alert metodologici.",
      false
    ).then(t=>{setAi(t);setAiLoad(false);}).catch(()=>setAiLoad(false));
  },[res]);

  const ok=()=>{
    if(step===0)return inp.ct&&inp.geo;
    if(step===1)return inp.sector;
    if(step===2)return inp.D&&inp.E&&inp.kd&&inp.tax;
    if(step===3)return inp.rf&&inp.erp&&inp.bu;
    return true;
  };
  const iS={width:"100%",padding:"9px 12px",borderRadius:7,border:"1.5px solid #ddd",fontSize:13,fontFamily:"monospace",outline:"none",boxSizing:"border-box",background:"#fafaf8"};
  const aS={...iS,borderColor:"#86c9ac",background:"#f0faf5"};
  const bP={padding:"9px 22px",borderRadius:8,border:"none",background:WB,color:"#fff",fontWeight:700,fontSize:13,cursor:"pointer",fontFamily:"Arial,sans-serif"};
  const bG={padding:"8px 18px",borderRadius:8,border:"1px solid #ccc",background:"#fff",color:"#666",fontSize:13,cursor:"pointer",fontFamily:"Arial,sans-serif"};
  const lb={fontSize:11,fontWeight:700,color:"#888",letterSpacing:"0.07em",textTransform:"uppercase",display:"block",marginBottom:5,fontFamily:"Arial,sans-serif"};
  const nt={fontSize:11,color:"#aaa",marginTop:4,paddingLeft:10,borderLeft:"2px solid #eee",fontFamily:"Arial,sans-serif"};
  const MB=(val,label)=>(<div style={{flex:1,background:"#f9f8f5",border:"1px solid #eee",borderRadius:9,padding:"12px",textAlign:"center"}}><div style={{fontFamily:"monospace",fontSize:20,fontWeight:700,color:WB}}>{val}</div><div style={{fontSize:10,color:"#999",marginTop:3,textTransform:"uppercase",letterSpacing:"0.06em",fontFamily:"Arial,sans-serif"}}>{label}</div></div>);
  const reset=()=>{setStep(0);setRes(null);setAi("");setMkt(null);setInp({ct:"sme",geo:"it",sector:"",D:"",E:"",kd:"",tax:"",rf:"",erp:"",sp:"0",bu:"",sr:"0"});};

  return(
    <div style={{fontFamily:"Arial,sans-serif"}}>
      <div style={{display:"flex",marginBottom:20,borderBottom:"1px solid #eee",paddingBottom:12}}>
        {WACC_STEPS.map((s,i)=>(
          <div key={s} style={{flex:1,textAlign:"center"}}>
            <div style={{width:24,height:24,borderRadius:"50%",margin:"0 auto 4px",display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,fontWeight:700,background:i<step?"#1D9E75":i===step?WB:"#eee",color:i<=step?"#fff":"#aaa"}}>{i<step?"✓":i+1}</div>
            <div style={{fontSize:9,color:i===step?WB:"#aaa",textTransform:"uppercase",letterSpacing:"0.05em"}}>{s}</div>
          </div>
        ))}
      </div>

      {step===0&&(<div>
        <div style={{marginBottom:14}}>
          <span style={lb}>Tipo impresa</span>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
            {WACC_CTYPES.map(t=>(<div key={t.id} onClick={()=>u("ct",t.id)} style={{padding:"10px 12px",borderRadius:8,border:"1.5px solid "+(inp.ct===t.id?WB:"#ddd"),cursor:"pointer",background:inp.ct===t.id?WBG:"#fff",fontSize:13,fontWeight:inp.ct===t.id?700:400}}>{t.label}</div>))}
          </div>
        </div>
        <div style={{marginBottom:14}}>
          <span style={lb}>Area geografica</span>
          <div style={{display:"flex",gap:8}}>
            {WACC_GEOS.map(g=>(<div key={g.id} onClick={()=>u("geo",g.id)} style={{flex:1,padding:"10px 8px",borderRadius:8,border:"1.5px solid "+(inp.geo===g.id?WB:"#ddd"),cursor:"pointer",background:inp.geo===g.id?WBG:"#fff",textAlign:"center",fontSize:12}}><div style={{fontSize:20}}>{g.flag}</div><div style={{marginTop:3,fontWeight:inp.geo===g.id?700:400}}>{g.label}</div></div>))}
          </div>
        </div>
        <div style={{display:"flex",justifyContent:"flex-end",marginTop:16}}>
          <button style={{...bP,opacity:ok()?1:0.5}} disabled={!ok()} onClick={()=>setStep(1)}>Avanti →</button>
        </div>
      </div>)}

      {step===1&&(<div>
        <span style={lb}>Settore (tassonomia Damodaran NYU)</span>
        <select value={inp.sector} onChange={e=>u("sector",e.target.value)} style={{...iS,marginBottom:10}}>
          <option value="">— Seleziona settore —</option>
          {WACC_SECTORS.map(s=><option key={s} value={s}>{s}</option>)}
        </select>
        {inp.sector&&<div style={{background:"#f0faf5",border:"1px solid #86c9ac",borderRadius:8,padding:"10px 14px",fontSize:12,color:"#2d7d5a"}}>🌐 Nel passo successivo recupererò parametri live da Damodaran NYU, BTP 10Y e Kroll per <strong>{inp.sector}</strong></div>}
        <div style={{display:"flex",justifyContent:"space-between",marginTop:16}}>
          <button style={bG} onClick={()=>setStep(0)}>← Indietro</button>
          <button style={{...bP,opacity:ok()?1:0.5}} disabled={!ok()} onClick={()=>setStep(2)}>Avanti →</button>
        </div>
      </div>)}

      {step===2&&(<div>
        {busy&&<div style={{color:"#888",fontSize:13,marginBottom:10,display:"flex",gap:8,alignItems:"center"}}><span style={{display:"inline-block",animation:"spin 1s linear infinite"}}>⟳</span> Recupero dati live da Damodaran NYU e BTP…</div>}
        {err&&<div style={{color:"#c0392b",fontSize:12,marginBottom:10,padding:"8px 12px",background:"#fdeaea",borderRadius:7}}>{err}</div>}
        {mkt&&!busy&&<div style={{background:"#f0faf5",border:"1px solid #86c9ac",borderRadius:8,padding:"8px 12px",fontSize:12,color:"#2d7d5a",marginBottom:10}}>✅ Dati live — Anno: {mkt.dataYear} · {mkt.notes}</div>}
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:12}}>
          <div><span style={lb}>Debito D (€)</span><input type="number" placeholder="5000000" value={inp.D} onChange={e=>u("D",e.target.value)} style={iS}/></div>
          <div><span style={lb}>Equity E (€)</span><input type="number" placeholder="10000000" value={inp.E} onChange={e=>u("E",e.target.value)} style={iS}/></div>
        </div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
          <div><span style={lb}>Kd lordo {mkt&&<span style={{color:"#1D9E75",fontSize:9}}>● AUTO</span>}</span><input type="number" step="0.001" placeholder="0.050" value={inp.kd} onChange={e=>u("kd",e.target.value)} style={mkt?aS:iS}/><div style={nt}>Rf + Default Spread</div></div>
          <div><span style={lb}>Tax rate {mkt&&<span style={{color:"#1D9E75",fontSize:9}}>● AUTO</span>}</span><input type="number" step="0.01" placeholder="0.240" value={inp.tax} onChange={e=>u("tax",e.target.value)} style={mkt?aS:iS}/></div>
        </div>
        <div style={{display:"flex",justifyContent:"space-between",marginTop:16}}>
          <button style={bG} onClick={()=>setStep(1)}>← Indietro</button>
          <button style={{...bP,opacity:ok()?1:0.5}} disabled={!ok()} onClick={()=>setStep(3)}>Avanti →</button>
        </div>
      </div>)}

      {step===3&&(<div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:12}}>
          <div><span style={lb}>Rf {mkt&&<span style={{color:"#1D9E75",fontSize:9}}>● BTP 10Y</span>}</span><input type="number" step="0.001" placeholder="0.038" value={inp.rf} onChange={e=>u("rf",e.target.value)} style={mkt?aS:iS}/></div>
          <div><span style={lb}>ERP {mkt&&<span style={{color:"#1D9E75",fontSize:9}}>● AUTO</span>}</span><input type="number" step="0.001" placeholder="0.055" value={inp.erp} onChange={e=>u("erp",e.target.value)} style={mkt?aS:iS}/><div style={nt}>ERP USA + Country Risk Italia</div></div>
        </div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
          <div><span style={lb}>βU settore {mkt&&<span style={{color:"#1D9E75",fontSize:9}}>● AUTO</span>}</span><input type="number" step="0.01" placeholder="0.85" value={inp.bu} onChange={e=>u("bu",e.target.value)} style={mkt?aS:iS}/><div style={nt}>βL = βU×[1+(1−t)×D/E]</div></div>
          <div><span style={lb}>Size Premium {inp.ct==="sme"&&mkt&&<span style={{color:"#1D9E75",fontSize:9}}>● Kroll</span>}</span><input type="number" step="0.001" placeholder="0.010" value={inp.sp} onChange={e=>u("sp",e.target.value)} style={mkt&&inp.ct==="sme"?aS:iS}/></div>
        </div>
        <div style={{marginTop:12}}>
          <span style={lb}>Specific Risk (opz.)</span>
          <input type="number" step="0.001" placeholder="0.000" value={inp.sr} onChange={e=>u("sr",e.target.value)} style={iS}/>
        </div>
        <div style={{display:"flex",justifyContent:"space-between",marginTop:16}}>
          <button style={bG} onClick={()=>setStep(2)}>← Indietro</button>
          <button style={bP} onClick={()=>{setRes(null);setAi("");setStep(4);}}>Calcola WACC →</button>
        </div>
      </div>)}

      {step===4&&res&&(<div>
        <div style={{textAlign:"center",padding:"16px 0 20px",borderBottom:"1px solid #eee",marginBottom:16}}>
          <div style={{fontFamily:"monospace",fontSize:52,fontWeight:700,color:"#BA7517",lineHeight:1}}>{pct(res.wacc)}</div>
          <div style={{color:"#999",fontSize:12,marginTop:6,textTransform:"uppercase",letterSpacing:"1px"}}>WACC — {inp.sector}</div>
        </div>
        <div style={{display:"flex",gap:10,marginBottom:16}}>
          {MB(pct(res.ke),"Ke equity")}{MB(pct(res.kdN),"Kd netto")}{MB(fix(res.bl),"β levered")}{MB(pct(res.We),"Peso equity")}
        </div>
        <div style={{background:"#f9f8f5",border:"1px solid #eee",borderRadius:9,padding:"14px 16px",fontFamily:"monospace",fontSize:12,lineHeight:2,marginBottom:16}}>
          <div>WACC = <span style={{color:WB}}>{pct(res.Wd)}</span>×<span style={{color:WB}}>{pct(res.kd)}</span>×(1−<span style={{color:WB}}>{pct(res.t)}</span>)+<span style={{color:WB}}>{pct(res.We)}</span>×<span style={{color:WB}}>{pct(res.ke)}</span> = <strong style={{color:"#BA7517"}}>{pct(res.wacc)}</strong></div>
          <div>Ke = <span style={{color:WB}}>{pct(res.rf)}</span>+<span style={{color:WB}}>{fix(res.bl)}</span>×<span style={{color:WB}}>{pct(res.erp)}</span>+<span style={{color:WB}}>{pct(res.sp)}</span> = <strong style={{color:"#BA7517"}}>{pct(res.ke)}</strong></div>
          <div>βL = <span style={{color:WB}}>{fix(res.bu)}</span>×[1+(1−<span style={{color:WB}}>{pct(res.t)}</span>)×<span style={{color:WB}}>{fix(res.D/res.E)}</span>] = <strong style={{color:"#BA7517"}}>{fix(res.bl)}</strong></div>
        </div>
        <div style={{fontSize:10,fontWeight:700,color:"#888",letterSpacing:"0.08em",marginBottom:8,textTransform:"uppercase"}}>Sensitivity βU vs ERP</div>
        <div style={{overflowX:"auto",marginBottom:16}}>
          <table style={{width:"100%",borderCollapse:"collapse",fontFamily:"monospace",fontSize:11}}>
            <thead><tr>
              <th style={{background:"#f0f0f0",padding:"6px",border:"1px solid #eee",color:"#999"}}>βU\ERP</th>
              {res.es.map((e,j)=><th key={j} style={{background:"#f0f0f0",padding:"6px",border:"1px solid #eee",color:"#888"}}>{pct(e,1)}</th>)}
            </tr></thead>
            <tbody>{res.bs.map((b,i)=>(
              <tr key={i}>
                <th style={{background:"#f0f0f0",padding:"6px",border:"1px solid #eee",color:"#888"}}>{fix(b,2)}</th>
                {res.grid[i].map((w,j)=>{const c=i===2&&j===2,bg=c?"#FDF3E3":w<0.07?"#e8f7f0":w>0.11?"#fdeaea":"#fff",cl=c?"#BA7517":w<0.07?"#1D9E75":w>0.11?"#c0392b":"#555";return<td key={j} style={{background:bg,color:cl,padding:"6px",border:"1px solid #eee",textAlign:"center",fontWeight:c?700:400,boxShadow:c?"inset 0 0 0 2px #BA7517":""}}>{pct(w)}</td>;})}
              </tr>
            ))}</tbody>
          </table>
        </div>
        <div style={{background:"#EBF2FD",border:"1px solid #c0d8f5",borderRadius:9,padding:"14px 16px"}}>
          <div style={{fontSize:11,fontWeight:700,color:WB,letterSpacing:"0.07em",marginBottom:8}}>🧠 COMMENTO METODOLOGICO AI</div>
          {aiLoad&&<div style={{color:"#888",fontSize:13,display:"flex",gap:8,alignItems:"center"}}><span style={{display:"inline-block",animation:"spin 1s linear infinite"}}>⟳</span> Analisi in corso…</div>}
          {ai&&<div style={{fontSize:13,lineHeight:1.7,color:"#334",whiteSpace:"pre-wrap"}}>{ai}</div>}
        </div>
        <div style={{display:"flex",gap:8,marginTop:14,justifyContent:"flex-end"}}>
          <button style={bG} onClick={()=>setStep(3)}>← Modifica</button>
          <button style={bG} onClick={reset}>🔄 Nuovo calcolo</button>
        </div>
      </div>)}
    </div>
  );
}

// ─────────────────────────────────────────────────────
// Skill Modal
// ─────────────────────────────────────────────────────
// Icone tipo file per gli allegati
const FILE_ICON={"pdf":"📄","doc":"📝","docx":"📝","xls":"📊","xlsx":"📊","csv":"📊","txt":"📃","png":"🖼","jpg":"🖼","jpeg":"🖼","default":"📎"};
const FILE_ACCEPT=".pdf,.doc,.docx,.xls,.xlsx,.csv,.txt,.md";

// ─────────────────────────────────────────────────────
// Client-side text extraction — i file non lasciano mai il browser
// ─────────────────────────────────────────────────────
function loadScript(src){
  return new Promise((resolve,reject)=>{
    if(typeof document==="undefined"||document.querySelector(`script[src="${src}"]`)){resolve();return;}
    const s=document.createElement("script");
    s.src=src;s.onload=resolve;s.onerror=()=>reject(new Error("Script load failed: "+src));
    document.head.appendChild(s);
  });
}

async function extractTextFromFile(file){
  const ext=fileExt(file.name);

  // ── Testo semplice ──────────────────────────────────
  if(["txt","md","csv"].includes(ext)){
    return new Promise((resolve,reject)=>{
      const r=new FileReader();
      r.onload=e=>resolve(e.target.result);
      r.onerror=reject;
      r.readAsText(file);
    });
  }

  // ── PDF → PDF.js ────────────────────────────────────
  if(ext==="pdf"){
    if(!window.pdfjsLib){
      await loadScript("https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js");
      window.pdfjsLib.GlobalWorkerOptions.workerSrc=
        "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";
    }
    const buf=await file.arrayBuffer();
    const pdf=await window.pdfjsLib.getDocument({data:buf}).promise;
    let text="";
    for(let i=1;i<=pdf.numPages;i++){
      const page=await pdf.getPage(i);
      const content=await page.getTextContent();
      text+=content.items.map(it=>it.str).join(" ")+"\n";
    }
    return text.trim()||null;
  }

  // ── DOCX → Mammoth ──────────────────────────────────
  if(["doc","docx"].includes(ext)){
    if(!window.mammoth){
      await loadScript("https://cdnjs.cloudflare.com/ajax/libs/mammoth/1.6.0/mammoth.browser.min.js");
    }
    const buf=await file.arrayBuffer();
    const result=await window.mammoth.extractRawText({arrayBuffer:buf});
    return result.value.trim()||null;
  }

  // ── XLSX / XLS → SheetJS ────────────────────────────
  if(["xls","xlsx"].includes(ext)){
    if(!window.XLSX){
      await loadScript("https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js");
    }
    const buf=await file.arrayBuffer();
    const wb=window.XLSX.read(buf,{type:"array"});
    let text="";
    wb.SheetNames.forEach(name=>{
      text+=`[Foglio: ${name}]\n`;
      text+=window.XLSX.utils.sheet_to_csv(wb.Sheets[name]);
      text+="\n\n";
    });
    return text.trim()||null;
  }

  // Formato non supportato per estrazione testo
  return null;
}

// ─────────────────────────────────────────────────────
// Agenti interni xNunc — motore sotto il cofano
// ─────────────────────────────────────────────────────
const XNUNC_AGENTS=[
  {id:"luca",  nome:"xLuca",  ruolo:"Tax Advisor",      emoji:"⚖️", aree:["Fiscale","Beni strumentali","Finanza agevolata"],  desc:"Esperto di fiscalità italiana, IVA, imposte dirette e normativa tributaria."},
  {id:"marco", nome:"xMarco", ruolo:"Bilancio & Audit",  emoji:"📊", aree:["Chiusura bilancio","Verifiche sindacali"],          desc:"Specialista in chiusure di bilancio, revisione contabile e controllo interno."},
  {id:"elena", nome:"xElena", ruolo:"Big Four Advisor",  emoji:"🏢", aree:["Verifiche sindacali","Societario"],                 desc:"Standard EY/PWC/KPMG: compliance, due diligence, reportistica strutturata."},
  {id:"paolo", nome:"xPaolo", ruolo:"Strategy Partner",  emoji:"🎯", aree:["Valutazione Aziendale","Societario"],               desc:"Consulenza strategica McKinsey/Bain: analisi, piano industriale, posizionamento."},
  {id:"gianni",nome:"xGianni",ruolo:"CFO Advisor",       emoji:"💼", aree:["Valutazione Aziendale","Finanza agevolata"],        desc:"Finanza d'impresa, business plan, valutazioni aziendali, M&A."},
  {id:"sofia", nome:"xSofia", ruolo:"Tech Architect",    emoji:"⚙️", aree:[],                                                  desc:"Prompt engineering, automazione AI, architettura sistemi intelligenti."},
  {id:"sara",  nome:"xSara",  ruolo:"UX Writer",         emoji:"🎨", aree:[],                                                  desc:"Chiarezza comunicativa, output strutturati, leggibilità professionale."},
  {id:"aldo",  nome:"xAldo",  ruolo:"Legal Counsel",     emoji:"📜", aree:["Societario"],                                      desc:"Diritto societario, contrattualistica, compliance normativa italiana."},
  {id:"marta", nome:"xMarta", ruolo:"Research Analyst",  emoji:"🔍", aree:[],                                                  desc:"Ricerca normativa, aggiornamenti legislativi, analisi documentale."},
];

function getAgentsForSkill(skill){
  const domain=XNUNC_AGENTS.filter(a=>a.aree.includes(skill.area));
  const support=XNUNC_AGENTS.filter(a=>["sofia","sara"].includes(a.id));
  const all=[...new Map([...domain,...support].map(a=>[a.id,a])).values()];
  return all.slice(0,3);
}

async function callAI({skill,userInput,attachments,profile,_overridePrompt}){
  const agents=getAgentsForSkill(skill);
  const agentCtx=agents.map(a=>`${a.nome} — ${a.ruolo}: ${a.desc}`).join("\n");
  const docsCtx=skill.docsContesto?`\n\n---\nBASE DOCUMENTALE DELLA SKILL (documenti caricati dal creatore — usa come riferimento primario):\n${skill.docsContesto}`:"";
  const basePrompt=_overridePrompt||`Sei un team di esperti per studi di Dottori Commercialisti italiani.\nTeam attivo:\n${agentCtx}\n\nSKILL: ${skill.nome}\nArea: ${skill.area} / ${skill.sotto_area}\nObiettivo: ${skill.output_atteso||skill.descrizione}${docsCtx}\n\nRegole:\n- Output professionale, strutturato, pronto all'uso\n- Italiano corretto, tono da esperto\n- Non citare il provider AI né i nomi degli agenti nell'output\n- Se sono presenti documenti di base documentale, usali come fonte autorevole preferenziale\n- OBBLIGATORIO: ogni risposta deve terminare esattamente con questa riga:\n\n---\n*⚠️ Output elaborato con supporto AI — Verificare prima dell'utilizzo professionale. Non sostituisce la consulenza di un Dottore Commercialista abilitato.*`;
  const attachText=(attachments||[]).filter(a=>a.content).map(a=>`[${a.name}]\n${a.content}`).join("\n\n");
  const userMsg=[userInput,attachText?`\n---\nDocumenti allegati:\n${attachText}`:""].filter(Boolean).join("");
  const keyMode=profile?.keyMode||"xnunc";
  const provider=profile?.aiProvider||"anthropic";
  const byok=profile?.byokKey||"";
  const t0=Date.now();
  let result=""; let success=true;
  try{
    if(keyMode==="byok"&&byok){
      if(provider==="anthropic"){
        const r=await fetch("https://api.anthropic.com/v1/messages",{method:"POST",headers:{"x-api-key":byok,"anthropic-version":"2023-06-01","content-type":"application/json"},body:JSON.stringify({model:"claude-sonnet-4-6",max_tokens:4096,system:basePrompt,messages:[{role:"user",content:userMsg}]})});
        if(!r.ok){const e=await r.json().catch(()=>({}));throw new Error(e.error?.message||e.message||"Errore API Anthropic ("+r.status+")");}
        const d=await r.json();result=d.content?.find(b=>b.type==="text")?.text||d.content?.[0]?.text||"";
      } else if(provider==="openai"){
        const r=await fetch("https://api.openai.com/v1/chat/completions",{method:"POST",headers:{"Authorization":`Bearer ${byok}`,"Content-Type":"application/json"},body:JSON.stringify({model:"gpt-4o",max_tokens:4096,messages:[{role:"system",content:basePrompt},{role:"user",content:userMsg}]})});
        if(!r.ok){const e=await r.json().catch(()=>({}));throw new Error(e.error?.message||e.message||"Errore API OpenAI ("+r.status+")");}
        const d=await r.json();result=d.choices[0].message.content;
      } else if(provider==="gemini"){
        const r=await fetch("https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro:generateContent",{method:"POST",headers:{"Content-Type":"application/json","x-goog-api-key":byok},body:JSON.stringify({system_instruction:{parts:[{text:basePrompt}]},contents:[{parts:[{text:userMsg}]}]})});
        if(!r.ok){const e=await r.json().catch(()=>({}));throw new Error(e.error?.message||e.message||"Errore API Gemini ("+r.status+")");}
        const d=await r.json();result=d.candidates[0].content.parts[0].text;
      }
    } else {
      // xNunc key — via API route server-side
      const r=await fetch("/api/claude",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({model:"claude-sonnet-4-6",max_tokens:4096,system:basePrompt,messages:[{role:"user",content:userMsg}]})});
      if(!r.ok){const e=await r.json().catch(()=>({}));throw new Error(e.error?.message||e.error||e.message||"Errore API (HTTP "+r.status+")");}
      const d=await r.json();result=d.content?.find(b=>b.type==="text")?.text||d.content?.[0]?.text||"";
    }
  }catch(err){
    success=false;
    // Log anche gli errori, poi rilancia
    logAiCall({userId:profile?.id,skillId:skill?.id||skill?.skill_id,provider:keyMode==="byok"?provider:"anthropic",model:keyMode==="byok"?(provider==="openai"?"gpt-4o":"claude-sonnet-4-6"):"claude-sonnet-4-6",inputChars:(basePrompt+userMsg).length,outputChars:0,durationMs:Date.now()-t0,success:false});
    throw err;
  }
  // Log chiamata riuscita (silenzioso)
  logAiCall({userId:profile?.id,skillId:skill?.id||skill?.skill_id,provider:keyMode==="byok"?provider:"anthropic",model:keyMode==="byok"?(provider==="openai"?"gpt-4o":"claude-sonnet-4-6"):"claude-sonnet-4-6",inputChars:(basePrompt+userMsg).length,outputChars:result.length,durationMs:Date.now()-t0,success:true});
  return result;
}
function fileExt(name){return(name.split(".").pop()||"").toLowerCase();}
function fileSize(bytes){return bytes<1024*1024?`${(bytes/1024).toFixed(0)} KB`:`${(bytes/1024/1024).toFixed(1)} MB`;}

function SkillModal({skill,isLogged,onClose,onLoginRequest,profile,improvements,setImprovements}){
  const[tab,setTab]=useState("usa");
  const[input,setInput]=useState("");
  const[attachments,setAttachments]=useState([]);
  const[running,setRunning]=useState(false);
  const[aiOutput,setAiOutput]=useState(null);
  const[aiError,setAiError]=useState(null);
  const[thinkingAgents,setThinkingAgents]=useState([]);
  const[copied,setCopied]=useState(false);
  const outputRef=useRef(null);
  const fileInputRef=useRef(null);
  const ac=AREA_COLOR[skill.area]||C.gray;
  const abg=AREA_BG[skill.area]||"#f5f3ee";
  const anyLoading=attachments.some(a=>a.loading);
  const canExec=(input.trim().length>0||attachments.length>0)&&!anyLoading;

  const[dragging,setDragging]=useState(false);

  async function processFiles(files){
    for(const file of Array.from(files)){
      const ext=fileExt(file.name);
      const uid=Date.now()+Math.random();
      // Aggiungi subito il placeholder con stato "caricamento"
      setAttachments(prev=>[...prev,{uid,name:file.name,size:file.size,ext,content:null,loading:true,error:false}]);
      try{
        const content=await extractTextFromFile(file);
        setAttachments(prev=>prev.map(a=>a.uid===uid?{...a,content,loading:false}:a));
      }catch(err){
        setAttachments(prev=>prev.map(a=>a.uid===uid?{...a,loading:false,error:true}:a));
      }
    }
  }
  function handleFiles(e){processFiles(e.target.files);e.target.value="";}
  function handleDrop(e){e.preventDefault();setDragging(false);processFiles(e.dataTransfer.files);}
  function handleDragOver(e){e.preventDefault();setDragging(true);}
  function handleDragLeave(e){if(!e.currentTarget.contains(e.relatedTarget))setDragging(false);}
  function removeAttachment(uid){setAttachments(prev=>prev.filter(a=>a.uid!==uid));}

  async function execSkill(){
    if(!isLogged){onLoginRequest();return;}
    if(!canExec)return;
    const agents=getAgentsForSkill(skill);
    setThinkingAgents(agents);
    setRunning(true);setAiOutput(null);setAiError(null);
    try{
      const result=await callAI({skill,userInput:input,attachments,profile});
      setAiOutput(result);
      setTimeout(()=>outputRef.current?.scrollIntoView({behavior:"smooth"}),100);
    }catch(e){
      setAiError(e.message||"Errore durante l'elaborazione.");
    }finally{
      setRunning(false);setThinkingAgents([]);
    }
  }
  function copyPrompt(){navigator.clipboard.writeText(PROMPTS[skill.id]||"").then(()=>{setCopied(true);setTimeout(()=>setCopied(false),2000);});}

  const tabs=["usa","dettagli","scarica","storia","miglioramenti"];
  const tl={usa:skill.tipo==="tool"?"Calcolatore":"Esegui skill",dettagli:"Dettagli",scarica:"Scarica",storia:"Storia",miglioramenti:"Miglioramenti"};

  return(
    <div style={{position:"fixed",inset:0,background:"rgba(10,11,15,0.72)",zIndex:1000,display:"flex",alignItems:"flex-start",justifyContent:"center",padding:"16px 12px",overflowY:"auto"}} onClick={onClose}>
      <div onClick={e=>e.stopPropagation()} style={{background:"#FAF9F7",borderRadius:4,width:"100%",maxWidth:1160,boxShadow:"0 2px 4px rgba(0,0,0,0.06), 0 20px 60px rgba(0,0,0,0.18)",marginTop:16,marginBottom:16}}>
        <div style={{background:"#FAF9F7",padding:"28px 32px 0"}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:12}}>
            <div>
              <div style={{fontSize:9,color:"#BA7517",fontWeight:700,letterSpacing:"0.2em",fontFamily:"Arial,sans-serif",marginBottom:6}}>{skill.area.toUpperCase()}</div>
              <div style={{fontFamily:"Georgia,serif",fontSize:21,fontWeight:400,color:"#0A0B0F",lineHeight:1.3}}>{skill.nome}</div>
              <div style={{fontSize:12,color:"#aaa",fontFamily:"Arial,sans-serif",marginTop:4}}>{skill.sotto_area}</div>
            </div>
            <button onClick={onClose} style={{background:"none",border:"none",color:"#aaa",fontSize:20,cursor:"pointer",padding:0,transition:"color .2s"}} onMouseEnter={e=>e.currentTarget.style.color="#0A0B0F"} onMouseLeave={e=>e.currentTarget.style.color="#aaa"}>×</button>
          </div>
          <div style={{marginBottom:16,display:"flex",gap:4,flexWrap:"wrap"}}>
            <Badge label="v1.0" color="#aaa" bg="#E8E4DC"/>
            <Badge label={skill.complessita} color={COMP_COLOR[skill.complessita]} bg={COMP_COLOR[skill.complessita]+"22"}/>
            <Badge label={skill.frequenza} color={FREQ_COLOR[skill.frequenza]} bg={FREQ_COLOR[skill.frequenza]+"22"}/>
            {(skill.tags||[]).slice(0,3).map(t=><Badge key={t} label={t} color="#888" bg="#E8E4DC"/>)}
          </div>
          <div style={{display:"flex",borderBottom:"2px solid #0A0B0F",gap:2,alignItems:"flex-end"}}>
            {tabs.map(t=>(
              <button key={t} onClick={()=>setTab(t)}
                style={{padding:"9px 18px",border:"none",cursor:"pointer",background:tab===t?"#0A0B0F":"transparent",color:tab===t?"#F1EFE8":"#bbb",fontFamily:"Arial,sans-serif",fontSize:10,fontWeight:700,letterSpacing:"0.16em",textTransform:"uppercase",borderRadius:"4px 4px 0 0",marginBottom:tab===t?"-2px":0,display:"flex",alignItems:"center",gap:6,transition:"all .2s"}}
                onMouseEnter={e=>{if(tab!==t){e.currentTarget.style.color="#0A0B0F";}}}
                onMouseLeave={e=>{if(tab!==t){e.currentTarget.style.color="#bbb";}}}>
                {tl[t]}
                {skill.tipo==="tool"&&t==="usa"&&<span style={{fontSize:8,background:"#1D9E75",color:"#fff",padding:"2px 5px",borderRadius:2,fontWeight:700,letterSpacing:"0.06em"}}>LIVE</span>}
              </button>
            ))}
          </div>
        </div>

        <div style={{padding:"28px 32px",gap:18,background:"#FAF9F7"}}>
          {tab==="usa"&&(
            <div>
              {skill.tipo==="tool"?<WACCTool/>:(
              <><div style={{background:"#f0f9f5",border:"1px solid #b8e8d4",borderRadius:8,padding:"8px 14px",marginBottom:14,display:"flex",gap:8,alignItems:"center"}}>
                <span style={{fontSize:13}}>🔒</span>
                <span style={{fontSize:12,color:"#2d7d5a",fontFamily:"Arial,sans-serif"}}><strong>I tuoi dati non vengono salvati.</strong> L'input transita in memoria e viene scartato al termine della chiamata. Solo metadati anonimi registrati.</span>
              </div>
              <label style={{fontFamily:"Arial,sans-serif",fontSize:11,fontWeight:700,color:C.gray,letterSpacing:"0.08em",display:"block",marginBottom:5}}>INPUT RICHIESTO</label>
              <div style={{background:abg,borderRadius:8,padding:"9px 13px",borderLeft:`3px solid ${ac}`,marginBottom:10,fontSize:13,color:"#555",fontFamily:"Arial,sans-serif",lineHeight:1.6}}>{skill.input_atteso||"Descrivi il tuo caso specifico"}</div>
              {/* Drop zone */}
              <div
                onDrop={handleDrop} onDragOver={handleDragOver} onDragLeave={handleDragLeave}
                style={{position:"relative",borderRadius:10,border:`2px ${dragging?"solid":"dashed"} ${dragging?ac:"transparent"}`,background:dragging?`${ac}08`:"transparent",transition:"all .15s",padding:dragging?"2px":0}}>
                {dragging&&(
                  <div style={{position:"absolute",inset:0,borderRadius:9,display:"flex",alignItems:"center",justifyContent:"center",background:`${ac}11`,zIndex:2,pointerEvents:"none"}}>
                    <div style={{textAlign:"center"}}>
                      <div style={{fontSize:32,marginBottom:4}}>📂</div>
                      <div style={{fontFamily:"Arial,sans-serif",fontSize:13,fontWeight:700,color:ac}}>Rilascia per allegare</div>
                    </div>
                  </div>
                )}
                <textarea value={input} onChange={e=>setInput(e.target.value)} placeholder={`Es.: ${(skill.input_atteso||"").substring(0,60)}${(skill.input_atteso||"").length>60?"...":""}`} rows={5}
                  style={{width:"100%",padding:"11px",borderRadius:8,border:`1.5px solid ${input.trim()||attachments.length>0?"#ccc":"#eee"}`,fontSize:13,fontFamily:"Arial,sans-serif",lineHeight:1.6,resize:"vertical",outline:"none",boxSizing:"border-box",background:"#fff"}}/>

                {/* Allegati chips */}
                {attachments.length>0&&(
                  <div style={{display:"flex",flexWrap:"wrap",gap:6,marginTop:8,padding:"0 2px"}}>
                    {attachments.map((f)=>(
                      <div key={f.uid} style={{display:"flex",alignItems:"center",gap:5,padding:"4px 10px 4px 8px",borderRadius:20,background:f.error?"#fff0f0":f.loading?"#f5f5f5":f.content?abg:"#fffbf0",border:`1px solid ${f.error?"#ffaaaa":f.loading?"#ddd":f.content?ac+"44":"#e8a80066"}`,fontSize:12,fontFamily:"Arial,sans-serif",color:"#444"}}>
                        <span style={{fontSize:14}}>{f.loading?"⏳":f.error?"⚠️":(FILE_ICON[f.ext]||FILE_ICON.default)}</span>
                        <span style={{maxWidth:160,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{f.name}</span>
                        <span style={{color:"#aaa",fontSize:10}}>
                          {f.loading?"· lettura…":f.error?"· errore lettura":f.content?`· ${fileSize(f.size)} ✓`:`· ${fileSize(f.size)} (testo non estraibile)`}
                        </span>
                        <button onClick={()=>removeAttachment(f.uid)} style={{background:"none",border:"none",cursor:"pointer",color:"#aaa",fontSize:14,lineHeight:1,padding:"0 0 0 2px"}} title="Rimuovi">×</button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Barra inferiore: allega + caratteri + esegui */}
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginTop:10,marginBottom:20,gap:8}}>
                <div style={{display:"flex",alignItems:"center",gap:10}}>
                  <input ref={fileInputRef} type="file" multiple accept={FILE_ACCEPT} onChange={handleFiles} style={{display:"none"}}/>
                  <button onClick={()=>fileInputRef.current?.click()}
                    title="Allega un documento — il testo viene estratto nel browser, il file non lascia mai il tuo dispositivo (PDF, Word, Excel, CSV, TXT)"
                    style={{display:"flex",alignItems:"center",gap:7,padding:"7px 14px",border:"1px solid #D8D4CE",background:"transparent",color:"#888",fontSize:10,cursor:"pointer",fontFamily:"Arial,sans-serif",fontWeight:700,letterSpacing:"0.1em",textTransform:"uppercase",transition:"all .15s"}}
                    onMouseEnter={e=>{e.currentTarget.style.borderColor="#0A0B0F";e.currentTarget.style.color="#0A0B0F";}}
                    onMouseLeave={e=>{e.currentTarget.style.borderColor="#D8D4CE";e.currentTarget.style.color="#888";}}>
                    <svg width="11" height="13" viewBox="0 0 11 13" fill="none" xmlns="http://www.w3.org/2000/svg" style={{flexShrink:0}}>
                      <path d="M9.5 5.5L5 10C3.9 11.1 2.1 11.1 1 10C-0.1 8.9 -0.1 7.1 1 6L5.5 1.5C6.2 0.8 7.3 0.8 8 1.5C8.7 2.2 8.7 3.3 8 4L3.5 8.5C3.2 8.8 2.8 8.8 2.5 8.5C2.2 8.2 2.2 7.8 2.5 7.5L6.5 3.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                    Allega
                    {attachments.length>0&&<span style={{background:"#0A0B0F",color:"#F1EFE8",fontSize:9,padding:"1px 6px",fontWeight:700,letterSpacing:"0.04em"}}>{attachments.length}</span>}
                  </button>
                  <span style={{fontSize:11,color:"#ccc",fontFamily:"Arial,sans-serif"}}>{input.length>0?`${input.length} car.`:""}</span>
                </div>
                <div style={{display:"flex",gap:8}}>
                  <button onClick={execSkill} disabled={running||(isLogged&&!canExec)}
                    style={{padding:"9px 22px",borderRadius:8,border:"none",background:running?"#ccc":(isLogged&&!canExec?"#eee":ac),color:(isLogged&&!canExec)?"#aaa":"#fff",fontWeight:700,fontSize:13,cursor:"pointer",fontFamily:"Arial,sans-serif",display:"flex",alignItems:"center",gap:8,whiteSpace:"nowrap"}}>
                    {running?<><span style={{display:"inline-block",animation:"spin 1s linear infinite"}}>⟳</span>Elaborazione…</>:!isLogged?"🔒 Accedi":"▶ Lancia"}
                  </button>
                </div>
              </div>
              {/* Animazione thinking con agenti */}
              {running&&thinkingAgents.length>0&&(
                <div ref={outputRef} style={{background:"#f4f2ee",borderRadius:10,padding:"16px 20px",border:"1px solid #e8e4dc",marginBottom:8}}>
                  <div style={{fontFamily:"Arial,sans-serif",fontSize:11,fontWeight:700,color:C.gray,letterSpacing:"0.08em",marginBottom:10}}>
                    <span style={{display:"inline-block",animation:"spin 1s linear infinite",marginRight:6}}>⟳</span>Sto elaborando…
                  </div>
                  <div style={{display:"flex",flexWrap:"wrap",gap:8}}>
                    {thinkingAgents.map((a,i)=>(
                      <div key={a.id} style={{display:"flex",alignItems:"center",gap:7,padding:"6px 12px",borderRadius:20,background:"#fff",border:`1.5px solid ${[ac,C.aurum,C.caelum][i%3]}44`,fontSize:12,fontFamily:"Arial,sans-serif",color:"#555",animation:`fadeIn .4s ease ${i*0.15}s both`}}>
                        <span style={{fontSize:15}}>{a.emoji}</span>
                        <span><strong style={{color:C.nox}}>{a.nome}</strong> · {a.ruolo}</span>
                        <span style={{display:"inline-block",animation:"spin 1.2s linear infinite",color:C.aurum,fontSize:10}}>⟳</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {/* Output reale */}
              {(aiOutput||aiError)&&(
                <div ref={running?null:outputRef}>
                  <div style={{fontFamily:"Arial,sans-serif",fontSize:11,fontWeight:700,color:C.gray,letterSpacing:"0.08em",marginBottom:8,display:"flex",alignItems:"center",gap:8}}>
                    OUTPUT {aiOutput&&<span style={{color:C.viridis}}>· completato</span>}{aiError&&<span style={{color:"#C0392B"}}>· errore</span>}
                    {aiOutput&&<span style={{fontSize:10,color:"#bbb",fontWeight:400}}>via {(profile?.keyMode==="byok")?`BYOK · ${profile?.aiProvider||"anthropic"}`:"xNunc · Anthropic"}</span>}
                  </div>
                  {aiError&&(
                    <div style={{background:"#fff5f5",borderRadius:10,padding:"14px 18px",border:"1px solid #fcc",fontFamily:"Arial,sans-serif",fontSize:13,color:"#C0392B"}}>
                      ⚠️ {aiError}
                      {aiError.includes("chiave")&&<div style={{marginTop:6,fontSize:11,color:"#888"}}>Verifica la tua API key nel Profilo → tab Sicurezza.</div>}
                    </div>
                  )}
                  {aiOutput&&(
                    <>
                    <div style={{background:"#f9f8f5",borderRadius:10,padding:"22px 24px",border:"1px solid #e8e4dc",fontFamily:"Arial,sans-serif",fontSize:13.5,color:"#222",lineHeight:1.8}}>
                      <RenderMd text={aiOutput}/>
                    </div>
                    <div style={{display:"flex",gap:8,marginTop:10,justifyContent:"flex-end",alignItems:"center"}}>
                      <div style={{display:"flex",gap:8}}>
                        <button onClick={()=>{navigator.clipboard.writeText(aiOutput);setCopied(true);setTimeout(()=>setCopied(false),2000);}} style={{padding:"6px 14px",borderRadius:6,border:"1px solid #ddd",background:copied?"#E3F7F0":"#fff",color:copied?C.viridis:"#555",fontSize:12,cursor:"pointer",fontFamily:"Arial,sans-serif",display:"flex",alignItems:"center",gap:5}}>{copied?"✓ Copiato":"🗐 Copia"}</button>
                        <button onClick={()=>downloadAsWord(aiOutput,skill.nome)} style={{padding:"6px 14px",borderRadius:6,border:"none",background:C.caelum,color:"#fff",fontSize:12,cursor:"pointer",fontFamily:"Arial,sans-serif",fontWeight:700}}>⬇ Word</button>
                        <button onClick={()=>downloadAsPDF(aiOutput,skill.nome)} style={{padding:"6px 14px",borderRadius:6,border:"none",background:C.viridis,color:"#fff",fontSize:12,cursor:"pointer",fontFamily:"Arial,sans-serif",fontWeight:700}}>⬇ PDF</button>
                      </div>
                    </div>
                    </>
                  )}
                </div>
              )}
            </>)}
            </div>
          )}

          {tab==="dettagli"&&(
            <div>
              <p style={{fontFamily:"Arial,sans-serif",fontSize:14,color:"#333",lineHeight:1.7,marginBottom:16}}>{skill.descrizione}</p>
              <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(240px,1fr))",gap:12,marginBottom:14}}>
                <div style={{background:abg,borderRadius:8,padding:"12px 14px",borderLeft:`3px solid ${ac}`}}>
                  <div style={{fontSize:10,fontWeight:700,color:ac,letterSpacing:"0.1em",marginBottom:5,fontFamily:"Arial,sans-serif"}}>INPUT ATTESO</div>
                  <div style={{fontSize:13,color:"#333",fontFamily:"Arial,sans-serif",lineHeight:1.6}}>{skill.input_atteso}</div>
                </div>
                <div style={{background:"#f0f9f5",borderRadius:8,padding:"12px 14px",borderLeft:"3px solid #1D9E75"}}>
                  <div style={{fontSize:10,fontWeight:700,color:"#1D9E75",letterSpacing:"0.1em",marginBottom:5,fontFamily:"Arial,sans-serif"}}>OUTPUT ATTESO</div>
                  <div style={{fontSize:13,color:"#333",fontFamily:"Arial,sans-serif",lineHeight:1.6}}>{skill.output_atteso}</div>
                </div>
              </div>
              {skill.normativa&&<div style={{background:"#F5F3EF",borderLeft:"2px solid #D8D4CE",padding:"10px 14px",marginBottom:14,display:"flex",gap:10}}><span style={{fontSize:9,fontWeight:700,color:"#aaa",fontFamily:"Arial,sans-serif",flexShrink:0,marginTop:2,letterSpacing:"0.12em",textTransform:"uppercase"}}>Normativa</span><span style={{fontSize:12,color:"#555",fontFamily:"Arial,sans-serif",lineHeight:1.6}}>{skill.normativa}</span></div>}
              {skill.docsNomi&&skill.docsNomi.length>0&&(
                <div style={{background:"#F5F3EF",borderLeft:"2px solid #D8D4CE",padding:"10px 14px",marginBottom:14}}>
                  <div style={{fontSize:9,fontWeight:700,color:"#aaa",fontFamily:"Arial,sans-serif",letterSpacing:"0.12em",textTransform:"uppercase",marginBottom:6}}>Base documentale</div>
                  <div style={{display:"flex",flexWrap:"wrap",gap:6}}>
                    {skill.docsNomi.map((n,i)=>(
                      <span key={i} style={{fontSize:10,color:"#666",fontFamily:"Arial,sans-serif",border:"1px solid #E8E4DC",padding:"2px 10px",fontWeight:600,letterSpacing:"0.04em"}}>{n}</span>
                    ))}
                  </div>
                </div>
              )}
              <div style={{display:"flex",flexWrap:"wrap",gap:4,marginBottom:16}}>{(skill.tags||[]).map(t=><Badge key={t} label={t} color={ac}/>)}</div>
              <div style={{borderTop:"1px solid #eee",paddingTop:14,display:"flex",alignItems:"center",justifyContent:"space-between"}}>
                <div><div style={{fontFamily:"Arial,sans-serif",fontSize:12,fontWeight:700,color:C.gray,marginBottom:2}}>Istruzioni IA (System Prompt)</div><div style={{fontFamily:"Arial,sans-serif",fontSize:11,color:"#aaa"}}>Le istruzioni che guidano l'intelligenza artificiale. Identiche su Claude, ChatGPT, Copilot e Gemini.</div></div>
                <button onClick={copyPrompt} style={{padding:"7px 16px",borderRadius:8,border:`1px solid ${copied?"#1D9E75":"#ddd"}`,background:copied?"#E3F7F0":"#fff",color:copied?"#1D9E75":"#555",fontSize:12,cursor:"pointer",fontFamily:"Arial,sans-serif",fontWeight:copied?700:400,transition:"all .2s"}}>{copied?"✓ Copiato":"📋 Copia prompt"}</button>
              </div>
            </div>
          )}

          {tab==="scarica"&&(
            <div>
              <DownloadPanel skill={skill} allSkills={SKILLS}/>
            </div>
          )}

          {tab==="storia"&&(
            <div>
              <div style={{fontFamily:"Arial,sans-serif",fontSize:13,color:C.gray,marginBottom:16}}>Timeline delle versioni.</div>
              <div style={{display:"flex",gap:14,marginBottom:20}}>
                <div style={{display:"flex",flexDirection:"column",alignItems:"center"}}>
                  <div style={{width:32,height:32,borderRadius:"50%",background:ac,display:"flex",alignItems:"center",justifyContent:"center"}}><span style={{color:"#fff",fontSize:11,fontWeight:700,fontFamily:"Arial,sans-serif"}}>v1</span></div>
                  <div style={{width:2,flex:1,background:"#eee",marginTop:4}}/>
                </div>
                <div style={{flex:1,paddingTop:4}}>
                  <div style={{fontFamily:"Arial,sans-serif",fontSize:13,fontWeight:700,color:C.nox}}>v1.0 <span style={{color:C.viridis,fontSize:11}}>● Corrente</span></div>
                  <div style={{fontSize:12,color:C.gray,fontFamily:"Arial,sans-serif",marginBottom:4}}>16 Mar 2026 · <span style={{color:C.aurum,fontWeight:700}}>Redazione</span></div>
                  <div style={{fontSize:13,color:"#444",fontFamily:"Arial,sans-serif"}}>Versione iniziale pubblicata</div>
                </div>
              </div>
              <div style={{fontSize:12,color:C.gray,fontFamily:"Arial,sans-serif",fontStyle:"italic"}}>Dopo 3 miglioramenti approvati → v2.0 automatica.</div>
            </div>
          )}

          {tab==="miglioramenti"&&<MiglioramentiTab skill={skill} isLogged={isLogged} onLoginRequest={onLoginRequest} ac={ac} improvements={improvements} setImprovements={setImprovements} profile={profile}/>}
        </div>
      </div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}@keyframes fadeIn{from{opacity:0;transform:translateY(4px)}to{opacity:1;transform:translateY(0)}}`}</style>
    </div>
  );
}

// ─────────────────────────────────────────────────────
// Skill Card
// ─────────────────────────────────────────────────────
function SkillCard({skill,onClick,isLogged,favorites,setFavorites,compact,isAdmin,isHidden,onHide,onUnhide,onDelete}){
  const ac=AREA_COLOR[skill.area]||C.gray;
  const abg=AREA_BG[skill.area]||"#f5f3ee";
  const isFav=favorites&&favorites.includes(skill.id);
  function toggleFav(e){
    e.stopPropagation();
    if(!setFavorites)return;
    setFavorites(prev=>isFav?prev.filter(id=>id!==skill.id):[...prev,skill.id]);
  }
  return(
    <div onClick={onClick} className="xnunc-card"
      style={{cursor:"pointer",borderTop:"1px solid #E8E4DC",borderRight:"1px solid #E8E4DC",borderBottom:"1px solid #E8E4DC",borderLeft:`3px solid ${isHidden?"#E8A800":ac}`,background:isHidden?"#FFFDF5":"#FAF9F7",padding:"16px 16px 14px 14px",marginBottom:6,position:"relative",opacity:isHidden?0.75:1,transition:"border-left-color .15s"}}>
      {/* Controlli admin */}
      {isAdmin&&(
        <div style={{position:"absolute",top:10,right:10,display:"flex",gap:4}} onClick={e=>e.stopPropagation()}>
          {isHidden?(
            <>
              <span style={{fontSize:9,color:"#E8A800",fontFamily:"Arial,sans-serif",fontWeight:700,letterSpacing:"0.1em",alignSelf:"center",marginRight:4}}>OSCURATA</span>
              <button onClick={onUnhide} title="Ripristina"
                style={{padding:"2px 10px",border:"1px solid #1D9E75",background:"none",color:"#1D9E75",fontSize:9,fontWeight:700,cursor:"pointer",fontFamily:"Arial,sans-serif",letterSpacing:"0.08em",textTransform:"uppercase"}}>
                Ripristina
              </button>
            </>
          ):(
            <button onClick={onHide} title="Oscura"
              style={{padding:"2px 10px",border:"1px solid #D8D4CE",background:"none",color:"#aaa",fontSize:9,fontWeight:700,cursor:"pointer",fontFamily:"Arial,sans-serif",letterSpacing:"0.08em",textTransform:"uppercase"}}>
              Oscura
            </button>
          )}
          <button onClick={onDelete} title="Elimina"
            style={{padding:"2px 10px",border:"1px solid #D8D4CE",background:"none",color:"#C0392B",fontSize:9,fontWeight:700,cursor:"pointer",fontFamily:"Arial,sans-serif",letterSpacing:"0.08em",textTransform:"uppercase"}}>
            Elimina
          </button>
        </div>
      )}
      {!isAdmin&&isLogged&&setFavorites&&(
        <button onClick={toggleFav} title={isFav?"Rimuovi dai preferiti":"Aggiungi ai preferiti"}
          style={{position:"absolute",top:12,right:12,background:"none",border:"none",cursor:"pointer",fontSize:14,color:isFav?C.aurum:"#D8D4CE",lineHeight:1,padding:2,transition:"color .15s"}}>
          {isFav?"★":"☆"}
        </button>
      )}
      {!isLogged&&<div style={{position:"absolute",top:12,right:12,fontSize:11,color:"#D8D4CE",fontFamily:"Arial,sans-serif",fontWeight:700,letterSpacing:"0.06em"}}>—</div>}
      {/* Area tag */}
      <div style={{fontSize:8,fontWeight:700,color:ac,fontFamily:"Arial,sans-serif",letterSpacing:"0.18em",textTransform:"uppercase",marginBottom:8}}>{skill.area}</div>
      <div style={{display:"flex",justifyContent:"space-between",gap:8,alignItems:"flex-start"}}>
        <div style={{flex:1}}>
          <div style={{fontFamily:"Georgia,serif",fontSize:15,fontWeight:400,color:"#0A0B0F",marginBottom:4,lineHeight:1.35,paddingRight:24}}>{skill.nome}</div>
          <div style={{fontSize:10,color:"#aaa",fontFamily:"Arial,sans-serif",marginBottom:6,letterSpacing:"0.04em"}}>{skill.sotto_area}</div>
          {!compact&&<div style={{fontSize:12,color:"#666",fontFamily:"Arial,sans-serif",lineHeight:1.55}}>{truncate(skill.descrizione,110)}</div>}
          {(skill.tags||[]).length>0&&(
            <div style={{marginTop:10,display:"flex",flexWrap:"wrap",gap:4}}>
              {(skill.tags||[]).slice(0,3).map(t=><span key={t} style={{fontSize:9,color:"#888",background:"transparent",border:"1px solid #E8E4DC",padding:"1px 7px",fontFamily:"Arial,sans-serif",fontWeight:600,letterSpacing:"0.06em",textTransform:"uppercase"}}>{t}</span>)}
              {(skill.tags||[]).length>3&&<span style={{fontSize:9,color:"#bbb",fontFamily:"Arial,sans-serif"}}>+{skill.tags.length-3}</span>}
            </div>
          )}
        </div>
        <div style={{display:"flex",flexDirection:"column",alignItems:"flex-end",gap:8,flexShrink:0,paddingTop:2}}>
          <Badge label={skill.complessita} color={COMP_COLOR[skill.complessita]} small/>
          <Badge label={skill.frequenza} color={FREQ_COLOR[skill.frequenza]} small/>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────
// App
// ─────────────────────────────────────────────────────
// ─────────────────────────────────────────────────────
// ImprovementDetailView — chat + approvazione
// ─────────────────────────────────────────────────────
function ImprovementDetailView({improv,setImprovements,profile,onBack,ac}){
  const[chatMsg,setChatMsg]=useState("");
  const[noteRif,setNoteRif]=useState("");
  const[showNoteInput,setShowNoteInput]=useState(false);
  const isCreator=profile?.email===ADMIN_EMAIL;
  const isContributor=profile?.email===improv.contributorEmail;
  const st=IMPROV_STATI[improv.stato]||IMPROV_STATI.bozza;

  function inviaMsg(){
    if(!chatMsg.trim())return;
    const msg={id:Date.now(),da:`${profile?.nome||""} ${profile?.cognome||""}`.trim()||"Utente",daEmail:profile?.email||"",testo:chatMsg,data:new Date().toLocaleDateString("it-IT")};
    setImprovements(prev=>prev.map(im=>im.id===improv.id?{...im,chat:[...(im.chat||[]),msg]}:im));
    setChatMsg("");
  }
  function approvaCreatore(){
    setImprovements(prev=>prev.map(im=>im.id===improv.id?{...im,stato:"in_redazione"}:im));
    onBack();
  }
  function rifiutaCreatore(){
    setImprovements(prev=>prev.map(im=>im.id===improv.id?{...im,stato:"rifiutata_creatore",noteCreatore:noteRif||"Miglioramento rifiutato dal creatore."}:im));
    onBack();
  }

  const cf=improv.campiAggiornati||{};
  return(
    <div>
      <button onClick={onBack} style={{background:"none",border:"none",color:ac,fontSize:12,fontWeight:700,cursor:"pointer",fontFamily:"Arial,sans-serif",marginBottom:14,padding:0}}>← Torna ai miglioramenti</button>
      <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:16}}>
        <div style={{flex:1}}>
          <div style={{fontFamily:"Georgia,serif",fontSize:16,fontWeight:700,color:C.nox}}>{improv.titolo}</div>
          <div style={{fontSize:11,color:"#888",fontFamily:"Arial,sans-serif",marginTop:2}}>da {improv.contributorNome} · {improv.createdAt}</div>
        </div>
        <span style={{fontSize:11,fontWeight:700,color:st.color,background:st.color+"15",padding:"4px 10px",borderRadius:8,fontFamily:"Arial,sans-serif"}}>{st.label}</span>
      </div>

      {/* Descrizione miglioramento */}
      <div style={{background:"#F5F3EF",borderLeft:"2px solid #D8D4CE",borderRadius:0,padding:"12px 14px",marginBottom:14}}>
        <div style={{fontSize:10,fontWeight:700,color:"#888",fontFamily:"Arial,sans-serif",marginBottom:4}}>DESCRIZIONE</div>
        <div style={{fontSize:13,color:"#333",fontFamily:"Arial,sans-serif",lineHeight:1.6}}>{improv.descrizione}</div>
        {improv.cambiamenti&&<><div style={{fontSize:10,fontWeight:700,color:"#888",fontFamily:"Arial,sans-serif",marginTop:10,marginBottom:4}}>CAMBIAMENTI SPECIFICI</div><div style={{fontSize:13,color:"#333",fontFamily:"Arial,sans-serif",lineHeight:1.6}}>{improv.cambiamenti}</div></>}
      </div>

      {/* Beta fields */}
      {cf.nome&&(
        <div style={{background:"#fff",borderRadius:10,border:`1.5px solid ${C.viridis}`,padding:"14px",marginBottom:14}}>
          <div style={{fontSize:10,fontWeight:700,color:C.viridis,fontFamily:"Arial,sans-serif",marginBottom:10}}>⚡ VERSIONE BETA PROPOSTA</div>
          {[["Nome",cf.nome],["Descrizione",cf.descrizione],["Input atteso",cf.input_atteso],["Output atteso",cf.output_atteso],["Normativa",cf.normativa]].map(([k,v])=>v&&(
            <div key={k} style={{marginBottom:8}}>
              <span style={{fontSize:10,fontWeight:700,color:"#888",fontFamily:"Arial,sans-serif"}}>{k.toUpperCase()}: </span>
              <span style={{fontSize:12.5,color:"#333",fontFamily:"Arial,sans-serif",lineHeight:1.5}}>{v}</span>
            </div>
          ))}
        </div>
      )}

      {/* Bottoni approvazione creatore */}
      {isCreator&&improv.stato==="attesa_creatore"&&(
        <div style={{background:"#fffbf0",borderRadius:10,padding:"14px",border:"1px solid #e8a80066",marginBottom:14}}>
          <div style={{fontSize:12,fontWeight:700,color:C.nox,fontFamily:"Arial,sans-serif",marginBottom:10}}>Sei il creatore — approva o rifiuta questo miglioramento</div>
          {!showNoteInput
            ?<div style={{display:"flex",gap:8}}>
              <button onClick={approvaCreatore} style={{flex:1,padding:"11px 20px",borderRadius:4,border:"none",background:"#1D9E75",color:"#fff",fontSize:11,fontWeight:700,letterSpacing:"0.1em",textTransform:"uppercase",cursor:"pointer",fontFamily:"Arial"}}>Approva</button>
              <button onClick={()=>setShowNoteInput(true)} style={{flex:1,padding:"11px 20px",borderRadius:4,border:"1px solid #D8D4CE",background:"none",color:"#C0392B",fontSize:11,fontWeight:700,letterSpacing:"0.1em",textTransform:"uppercase",cursor:"pointer",fontFamily:"Arial"}}>Rifiuta</button>
            </div>
            :<div>
              <textarea value={noteRif} onChange={e=>setNoteRif(e.target.value)} placeholder="Motivo del rifiuto (opzionale)…" rows={2} style={{width:"100%",border:"none",borderBottom:"1px solid #D8D4CE",padding:"10px 0",background:"transparent",color:"#0A0B0F",fontSize:12,fontFamily:"Arial",boxSizing:"border-box",marginBottom:8,outline:"none"}}/>
              <div style={{display:"flex",gap:8}}>
                <button onClick={rifiutaCreatore} style={{flex:1,padding:"11px 20px",borderRadius:4,border:"none",background:"#C0392B",color:"#fff",fontSize:11,fontWeight:700,letterSpacing:"0.1em",textTransform:"uppercase",cursor:"pointer",fontFamily:"Arial"}}>Conferma</button>
                <button onClick={()=>setShowNoteInput(false)} style={{flex:1,padding:"11px 20px",borderRadius:4,border:"1px solid #D8D4CE",background:"none",color:"#666",fontSize:11,fontWeight:700,letterSpacing:"0.1em",textTransform:"uppercase",cursor:"pointer",fontFamily:"Arial"}}>Annulla</button>
              </div>
            </div>
          }
        </div>
      )}

      {/* Note rifiuto */}
      {improv.noteCreatore&&<div style={{background:"#fff5f5",borderRadius:8,padding:"10px 14px",marginBottom:14,border:"1px solid #fcc",fontSize:12,color:"#C0392B",fontFamily:"Arial,sans-serif"}}>Note dal creatore: {improv.noteCreatore}</div>}
      {improv.noteRedazione&&<div style={{background:"#fff5f5",borderRadius:8,padding:"10px 14px",marginBottom:14,border:"1px solid #fcc",fontSize:12,color:"#C0392B",fontFamily:"Arial,sans-serif"}}>Note dalla Redazione: {improv.noteRedazione}</div>}

      {/* Chat */}
      <div style={{fontSize:11,fontWeight:700,color:C.gray,letterSpacing:"0.08em",fontFamily:"Arial,sans-serif",marginBottom:10}}>💬 CHAT TRA CONTRIBUTOR E CREATORE</div>
      <div style={{display:"flex",flexDirection:"column",gap:10,marginBottom:14,maxHeight:260,overflowY:"auto",padding:"4px 0"}}>
        {(improv.chat||[]).length===0&&<div style={{fontSize:12,color:"#aaa",fontFamily:"Arial,sans-serif",fontStyle:"italic",textAlign:"center",padding:"16px 0"}}>Nessun messaggio ancora.</div>}
        {(improv.chat||[]).map(m=>(
          <div key={m.id} style={{display:"flex",gap:8,alignItems:"flex-start",flexDirection:m.daEmail===profile?.email?"row-reverse":"row"}}>
            <div style={{width:28,height:28,borderRadius:"50%",background:m.daEmail===ADMIN_EMAIL?C.aurum:C.purpura,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
              <span style={{color:"#fff",fontSize:10,fontWeight:700}}>{(m.da||"U")[0].toUpperCase()}</span>
            </div>
            <div style={{maxWidth:"70%",background:m.daEmail===profile?.email?"#EBF2FE":"#f5f3ee",borderRadius:10,padding:"8px 12px",border:"1px solid #e8e4dc"}}>
              <div style={{fontSize:10,fontWeight:700,color:"#888",fontFamily:"Arial,sans-serif",marginBottom:3}}>{m.da} · {m.data}</div>
              <div style={{fontSize:13,color:"#333",fontFamily:"Arial,sans-serif",lineHeight:1.5}}>{m.testo}</div>
            </div>
          </div>
        ))}
      </div>
      {(isCreator||isContributor)&&(improv.stato==="attesa_creatore"||improv.stato==="in_redazione"||improv.stato==="beta_generata")&&(
        <div style={{display:"flex",gap:8}}>
          <input value={chatMsg} onChange={e=>setChatMsg(e.target.value)} onKeyDown={e=>e.key==="Enter"&&!e.shiftKey&&inviaMsg()} placeholder="Scrivi un messaggio…" style={{flex:1,padding:"8px 12px",borderRadius:8,border:"1.5px solid #ddd",fontSize:13,fontFamily:"Arial,sans-serif",outline:"none"}}/>
          <button onClick={inviaMsg} disabled={!chatMsg.trim()} style={{padding:"8px 16px",borderRadius:8,border:"none",background:chatMsg.trim()?ac:"#eee",color:chatMsg.trim()?"#fff":"#aaa",fontSize:12,fontWeight:700,cursor:"pointer",fontFamily:"Arial,sans-serif"}}>Invia</button>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────
// MiglioramentiTab — discussione + proposte strutturate
// ─────────────────────────────────────────────────────
function MiglioramentiTab({skill,isLogged,onLoginRequest,ac,improvements,setImprovements,profile}){
  const _pubDate=new Date().toLocaleDateString("it-IT",{day:"numeric",month:"short",year:"numeric"});
  const[posts,setPosts]=useState([
    {id:1,autore:"Redazione",ruolo:"creator",avatar:"R",testo:"Skill pubblicata. Proposte di miglioramento benvenute — ogni contributo approvato vale +5 punti e avvicina la v2.0.",data:_pubDate,tipo:"nota"},
  ]);
  const[testo,setTesto]=useState("");
  const[tipo,setTipo]=useState("commento");
  const[showForm,setShowForm]=useState(false);
  const[form,setForm]=useState({titolo:"",descrizione:"",cambiamenti:""});
  const[generating,setGenerating]=useState(false);
  const[betaResult,setBetaResult]=useState(null);
  const[betaError,setBetaError]=useState("");
  const[activeImprovId,setActiveImprovId]=useState(null);
  const[showDiscussione,setShowDiscussione]=useState(false);

  const skillImprovs=(improvements||[]).filter(im=>im.skillId===skill.id);
  const myImprovs=skillImprovs.filter(im=>im.contributorEmail===(profile?.email||"__none__"));
  const approvateCnt=skillImprovs.filter(im=>im.stato==="approvata").length;

  function invia(){
    if(!testo.trim())return;
    const av=(profile?.nome?.[0]||"U").toUpperCase();
    setPosts(p=>[...p,{id:Date.now(),autore:profile?.nome||"Tu",ruolo:"contributor",avatar:av,testo,data:new Date().toLocaleDateString("it-IT"),tipo}]);
    setTesto("");
  }

  async function generaBeta(){
    if(!form.titolo.trim()||!form.descrizione.trim())return;
    setGenerating(true);setBetaError("");setBetaResult(null);
    try{
      const sys=`Sei un esperto di prompt engineering per studi di Dottori Commercialisti italiani. Ricevi una skill esistente e una proposta di miglioramento. Genera una versione migliorata. Rispondi SOLO con JSON valido senza markdown: {"nome":"...","descrizione":"...","input_atteso":"...","output_atteso":"...","normativa":"..."}`;
      const usr=`SKILL ATTUALE:\nNome: ${skill.nome}\nDescrizione: ${skill.descrizione}\nInput atteso: ${skill.input_atteso||""}\nOutput atteso: ${skill.output_atteso||""}\nNormativa: ${skill.normativa||""}\n\nPROPOSTA:\nTitolo: ${form.titolo}\nDescrizione: ${form.descrizione}\nCambiamenti: ${form.cambiamenti}\n\nGenera la versione migliorata mantenendo la struttura.`;
      const r=await fetch("/api/claude",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({model:"claude-sonnet-4-6",max_tokens:2000,system:sys,messages:[{role:"user",content:usr}]})});
      if(!r.ok)throw new Error("HTTP "+r.status);
      const d=await r.json();
      const txt=d.content?.find(b=>b.type==="text")?.text||d.content?.[0]?.text||"";
      setBetaResult(JSON.parse(txt.replace(/```json|```/g,"").trim()));
    }catch(e){setBetaError("Errore: "+e.message);}
    finally{setGenerating(false);}
  }

  function salvaBeta(){
    const improv={
      id:"improv_"+Date.now(),
      skillId:skill.id, skillNome:skill.nome, skillArea:skill.area, skillSottoArea:skill.sotto_area||"",
      contributorEmail:profile?.email||"anonimo",
      contributorNome:`${profile?.nome||""} ${profile?.cognome||""}`.trim()||"Utente",
      titolo:form.titolo, descrizione:form.descrizione, cambiamenti:form.cambiamenti,
      campiAggiornati:betaResult,
      stato:"beta_generata", chat:[], noteCreatore:"", noteRedazione:"",
      createdAt:new Date().toLocaleDateString("it-IT"),
    };
    setImprovements(prev=>[...prev,improv]);
    setShowForm(false);setBetaResult(null);setForm({titolo:"",descrizione:"",cambiamenti:""});
  }

  function inviaAlCreatore(improvId){
    setImprovements(prev=>prev.map(im=>im.id===improvId?{...im,stato:"attesa_creatore"}:im));
  }

  // Vista dettaglio improvement
  if(activeImprovId){
    const improv=(improvements||[]).find(im=>im.id===activeImprovId);
    if(improv)return <ImprovementDetailView improv={improv} setImprovements={setImprovements} profile={profile} onBack={()=>setActiveImprovId(null)} ac={ac}/>;
  }

  return(
    <div>
      {/* Discussione generale — collassabile, in cima */}
      <div style={{marginBottom:16,borderRadius:10,border:"1px solid #e8e4dc",overflow:"hidden"}}>
        <button onClick={()=>setShowDiscussione(v=>!v)}
          style={{width:"100%",display:"flex",alignItems:"center",justifyContent:"space-between",padding:"10px 14px",background:"#f9f8f5",border:"none",cursor:"pointer",fontFamily:"Arial,sans-serif"}}>
          <div style={{display:"flex",alignItems:"center",gap:8}}>
            <span style={{fontSize:11,fontWeight:700,color:C.gray,letterSpacing:"0.08em"}}>💬 DISCUSSIONE GENERALE</span>
            {posts.length>0&&<span style={{fontSize:10,background:"#e8e4dc",color:"#666",borderRadius:10,padding:"1px 7px",fontWeight:700}}>{posts.length}</span>}
          </div>
          <span style={{fontSize:13,color:"#aaa",transition:"transform .2s",display:"inline-block",transform:showDiscussione?"rotate(180deg)":"rotate(0deg)"}}>▾</span>
        </button>
        {showDiscussione&&(
          <div style={{padding:"14px"}}>
            <div style={{display:"flex",flexDirection:"column",gap:12,marginBottom:14}}>
              {posts.map(p=>(
                <div key={p.id} style={{display:"flex",gap:10,alignItems:"flex-start"}}>
                  <div style={{width:30,height:30,borderRadius:"50%",background:p.ruolo==="creator"?ac:"#7F77DD",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                    <span style={{color:"#fff",fontSize:11,fontWeight:700}}>{p.avatar}</span>
                  </div>
                  <div style={{flex:1,background:p.tipo==="nota"?"#f9f8f5":"#fff",borderRadius:10,padding:"10px 14px",border:`1px solid ${p.tipo==="proposta"?"#e8e4dc":"#f0ede8"}`}}>
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:5}}>
                      <span style={{fontFamily:"Arial,sans-serif",fontSize:12,fontWeight:700,color:p.ruolo==="creator"?ac:"#333"}}>{p.autore}{p.ruolo==="creator"&&<span style={{fontSize:9,background:ac+"22",color:ac,padding:"1px 6px",borderRadius:4,fontWeight:700,marginLeft:5}}>CREATOR</span>}</span>
                      <span style={{fontSize:10,color:"#bbb",fontFamily:"Arial,sans-serif"}}>{p.data}</span>
                    </div>
                    <div style={{fontFamily:"Arial,sans-serif",fontSize:13,color:"#333",lineHeight:1.6}}>{p.testo}</div>
                  </div>
                </div>
              ))}
            </div>
            {isLogged?(
              <div style={{background:"#f9f8f5",borderRadius:8,padding:"12px",border:"1px solid #e8e4dc"}}>
                <textarea value={testo} onChange={e=>setTesto(e.target.value)} placeholder="Scrivi un commento o una domanda sulla skill…" rows={2} style={{width:"100%",padding:"8px 10px",borderRadius:7,border:"1.5px solid #ddd",fontSize:13,fontFamily:"Arial,sans-serif",lineHeight:1.6,resize:"vertical",outline:"none",boxSizing:"border-box"}}/>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginTop:8}}>
                  <span style={{fontSize:11,color:"#aaa",fontFamily:"Arial,sans-serif"}}>+2 punti per commento</span>
                  <button onClick={invia} disabled={!testo.trim()} style={{padding:"6px 16px",borderRadius:7,border:"none",background:testo.trim()?ac:"#eee",color:testo.trim()?"#fff":"#aaa",fontSize:12,fontWeight:700,cursor:"pointer",fontFamily:"Arial,sans-serif"}}>Invia →</button>
                </div>
              </div>
            ):(
              <div style={{textAlign:"center",padding:"12px",background:"#f9f8f5",borderRadius:8,border:"1.5px dashed #ddd"}}>
                <button onClick={onLoginRequest} style={{padding:"6px 16px",borderRadius:7,border:`1px solid ${ac}`,background:"#fff",color:ac,fontSize:12,fontWeight:700,cursor:"pointer",fontFamily:"Arial,sans-serif"}}>🔒 Accedi per partecipare</button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Header progress */}
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
        <div style={{fontFamily:"Arial,sans-serif",fontSize:13,color:"#666"}}>
          <span style={{fontWeight:700,color:ac}}>{approvateCnt}/3</span> <span style={{color:"#888"}}>approvati per v2.0</span>
        </div>
        <div style={{background:"#f5f3ee",borderRadius:20,padding:"3px 12px",fontSize:11,color:"#888",fontFamily:"Arial,sans-serif"}}>{skillImprovs.length} proposte totali</div>
      </div>
      <div style={{height:4,borderRadius:2,background:"#eee",marginBottom:20,overflow:"hidden"}}>
        <div style={{height:"100%",width:`${Math.min(100,(approvateCnt/3)*100)}%`,background:ac,transition:"width .4s",borderRadius:2}}/>
      </div>

      {/* Miei miglioramenti in corso */}
      {myImprovs.length>0&&(
        <div style={{marginBottom:20}}>
          <div style={{fontSize:11,fontWeight:700,color:C.gray,letterSpacing:"0.08em",fontFamily:"Arial,sans-serif",marginBottom:8}}>I TUOI MIGLIORAMENTI</div>
          {myImprovs.map(im=>{
            const st=IMPROV_STATI[im.stato]||IMPROV_STATI.bozza;
            return(
              <div key={im.id} style={{background:"#fafaf8",borderRadius:10,padding:"10px 14px",border:"1.5px solid #e8e4dc",marginBottom:8,display:"flex",alignItems:"center",gap:8,flexWrap:"wrap"}}>
                <div style={{flex:1,minWidth:120}}>
                  <div style={{fontFamily:"Arial,sans-serif",fontSize:13,fontWeight:700,color:C.nox}}>{im.titolo}</div>
                  <div style={{fontSize:10,color:"#aaa",fontFamily:"Arial,sans-serif"}}>{im.createdAt}</div>
                </div>
                <span style={{fontSize:10,fontWeight:700,color:st.color,background:st.color+"15",padding:"3px 8px",borderRadius:8,fontFamily:"Arial,sans-serif",whiteSpace:"nowrap"}}>{st.label}</span>
                <button onClick={()=>setActiveImprovId(im.id)} style={{padding:"5px 12px",borderRadius:6,border:`1px solid ${ac}`,background:"#fff",color:ac,fontSize:11,fontWeight:700,cursor:"pointer",fontFamily:"Arial,sans-serif"}}>Apri →</button>
                {im.stato==="beta_generata"&&(
                  <button onClick={()=>inviaAlCreatore(im.id)} style={{padding:"5px 12px",borderRadius:6,border:"none",background:ac,color:"#fff",fontSize:11,fontWeight:700,cursor:"pointer",fontFamily:"Arial,sans-serif"}}>📬 Invia al creatore</button>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* CTA nuovo miglioramento strutturato */}
      {isLogged&&!showForm&&(
        <button onClick={()=>setShowForm(true)} style={{width:"100%",padding:"10px",borderRadius:10,border:`1.5px dashed ${ac}`,background:ac+"0a",color:ac,fontSize:13,fontWeight:700,cursor:"pointer",fontFamily:"Arial,sans-serif",marginBottom:16}}>
          ⚡ Proponi un miglioramento strutturato
        </button>
      )}

      {/* Form miglioramento */}
      {showForm&&(
        <div style={{background:"#f5f3ee",borderRadius:12,padding:"18px",border:`1.5px solid ${ac}44`,marginBottom:16}}>
          <div style={{fontFamily:"Arial,sans-serif",fontSize:13,fontWeight:700,color:C.nox,marginBottom:14}}>⚡ Nuovo miglioramento — genera beta</div>
          {[
            {key:"titolo",label:"Titolo",ph:"Es.: Aggiornamento normativa 2024",rows:1},
            {key:"descrizione",label:"Descrizione del cambiamento",ph:"Cosa miglioreresti e perché?",rows:3},
            {key:"cambiamenti",label:"Cambiamenti specifici (opzionale)",ph:"Dettagli tecnici, riferimenti normativi…",rows:2},
          ].map(({key,label,ph,rows})=>(
            <div key={key} style={{marginBottom:10}}>
              <div style={{fontSize:11,fontWeight:700,color:"#555",fontFamily:"Arial,sans-serif",marginBottom:4}}>{label}</div>
              {rows===1
                ?<input value={form[key]} onChange={e=>setForm(p=>({...p,[key]:e.target.value}))} placeholder={ph} style={{width:"100%",padding:"8px 10px",borderRadius:7,border:"1.5px solid #ddd",fontSize:13,fontFamily:"Arial,sans-serif",boxSizing:"border-box"}}/>
                :<textarea value={form[key]} onChange={e=>setForm(p=>({...p,[key]:e.target.value}))} placeholder={ph} rows={rows} style={{width:"100%",padding:"8px 10px",borderRadius:7,border:"1.5px solid #ddd",fontSize:13,fontFamily:"Arial,sans-serif",resize:"vertical",boxSizing:"border-box"}}/>
              }
            </div>
          ))}
          {!betaResult&&(
            <button onClick={generaBeta} disabled={generating||!form.titolo.trim()||!form.descrizione.trim()}
              style={{width:"100%",padding:"11px",border:"none",background:(generating||!form.titolo.trim()||!form.descrizione.trim())?"#E8E4DC":"#0A0B0F",color:(generating||!form.titolo.trim()||!form.descrizione.trim())?"#aaa":"#F1EFE8",fontSize:11,fontWeight:700,cursor:(generating||!form.titolo.trim()||!form.descrizione.trim())?"not-allowed":"pointer",fontFamily:"Arial,sans-serif",letterSpacing:"0.1em",textTransform:"uppercase",marginBottom:8,transition:"background .2s"}}>
              {generating?<><span style={{display:"inline-block",animation:"spin 1s linear infinite",marginRight:6}}>⟳</span>Generazione in corso…</>:"Genera versione beta con AI"}
            </button>
          )}
          {betaError&&<div style={{color:"#C0392B",fontSize:12,fontFamily:"Arial,sans-serif",marginBottom:8}}>⚠️ {betaError}</div>}
          {betaResult&&(
            <div style={{background:"#fff",borderRadius:10,padding:"14px",border:`1.5px solid ${C.viridis}`,marginBottom:10}}>
              <div style={{fontSize:11,fontWeight:700,color:C.viridis,fontFamily:"Arial,sans-serif",marginBottom:8}}>✓ BETA GENERATA — anteprima</div>
              {[["Nome",betaResult.nome],["Descrizione",betaResult.descrizione],["Input atteso",betaResult.input_atteso],["Output atteso",betaResult.output_atteso],["Normativa",betaResult.normativa]].map(([k,v])=>v&&(
                <div key={k} style={{marginBottom:6}}>
                  <span style={{fontSize:10,fontWeight:700,color:"#888",fontFamily:"Arial,sans-serif"}}>{k.toUpperCase()}: </span>
                  <span style={{fontSize:12.5,color:"#333",fontFamily:"Arial,sans-serif",lineHeight:1.5}}>{v}</span>
                </div>
              ))}
              <div style={{display:"flex",gap:8,marginTop:10}}>
                <button onClick={salvaBeta} style={{flex:1,padding:"8px",borderRadius:7,border:"none",background:C.viridis,color:"#fff",fontSize:12,fontWeight:700,cursor:"pointer",fontFamily:"Arial,sans-serif"}}>✓ Salva in sviluppo</button>
                <button onClick={()=>setBetaResult(null)} style={{padding:"8px 14px",borderRadius:7,border:"1px solid #ddd",background:"#fff",color:"#555",fontSize:12,cursor:"pointer",fontFamily:"Arial,sans-serif"}}>Rigenera</button>
              </div>
            </div>
          )}
          <button onClick={()=>{setShowForm(false);setBetaResult(null);setForm({titolo:"",descrizione:"",cambiamenti:""}); }} style={{width:"100%",padding:"7px",borderRadius:7,border:"1px solid #ddd",background:"#fff",color:"#888",fontSize:12,cursor:"pointer",fontFamily:"Arial,sans-serif"}}>Annulla</button>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────
// ManifestoModal
// ─────────────────────────────────────────────────────
function ManifestoModal({onClose}){
  return(
    <div style={{position:"fixed",inset:0,background:"#00000088",zIndex:1000,display:"flex",alignItems:"center",justifyContent:"center",padding:"16px"}} onClick={onClose}>
      <div onClick={e=>e.stopPropagation()} style={{background:C.nox,borderRadius:16,width:"100%",maxWidth:640,boxShadow:"0 8px 48px #0008",border:`2px solid ${C.aurum}`,padding:"36px 40px",maxHeight:"85vh",overflowY:"auto",color:"#fff"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:28}}>
          <div>
            <div style={{fontSize:10,color:C.aurum,fontWeight:700,letterSpacing:"0.15em",fontFamily:"Arial,sans-serif",marginBottom:8}}>MANIFESTO</div>
            <div style={{fontFamily:"Georgia,serif",fontSize:24,fontWeight:700,lineHeight:1.3}}><span style={{color:C.aurum}}>x</span>Nunc.ai</div>
          </div>
          <button onClick={onClose} style={{background:"none",border:"none",color:"#888",fontSize:22,cursor:"pointer"}}>×</button>
        </div>

        {[
          {num:"I",tit:"Ex nunc — da ora in poi",testo:"Il nome viene dal latino giuridico. Ex nunc significa effetto immediato, senza retroattività. È la nostra promessa: non stiamo ripensando il passato del tuo studio. Stiamo cambiando cosa succede da domani mattina."},
          {num:"II",tit:"Il tempo professionale non si spreca",testo:"I commercialisti italiani passano ore su adempimenti meccanici che una macchina può fare meglio, più velocemente, senza errori. Questo è uno spreco — di competenza, di energia, di valore. xNunc esiste per eliminarlo."},
          {num:"III",tit:"La conoscenza appartiene a chi la genera",testo:"I workflow che usi ogni giorno li hai costruiti tu — con anni di pratica, errori, clienti difficili. Non appartengono a un vendor. Non devono stare chiusi in un sistema proprietario. Qui restano tuoi, aperti, modificabili, forkabili."},
          {num:"IV",tit:"Open source non è ideologia — è garanzia",testo:"Se il codice è pubblico, puoi verificare cosa fa. Se il formato è aperto, puoi portare le tue skill altrove. Se la licenza è AGPL v3, nessuno può chiuderlo. La trasparenza non è un valore aggiunto: è la struttura portante."},
          {num:"V",tit:"L'AI non sostituisce il commercialista",testo:"Sostituisce la parte che ti annoia. La parte complessa — interpretare, consigliare, decidere, stare accanto al cliente — rimane tua. Sempre. È lì che vale davvero il tuo lavoro."},
          {num:"VI",tit:"La community è il prodotto",testo:"Il catalogo non lo costruiamo noi. Lo costruisci tu, con i tuoi colleghi. Ogni skill è un pezzo di conoscenza condivisa. Ogni miglioramento proposto avvicina la v2.0. Ogni punto guadagnato è un contributo reale alla professione."},
        ].map(({num,tit,testo})=>(
          <div key={num} style={{marginBottom:24,paddingBottom:24,borderBottom:"1px solid #ffffff11"}}>
            <div style={{fontFamily:"Arial,sans-serif",fontSize:9,color:C.aurum,fontWeight:700,letterSpacing:"0.15em",marginBottom:6}}>{num}</div>
            <div style={{fontFamily:"Georgia,serif",fontSize:17,fontWeight:700,marginBottom:8,color:"#fff"}}>{tit}</div>
            <div style={{fontFamily:"Arial,sans-serif",fontSize:13.5,color:"#aaa",lineHeight:1.8}}>{testo}</div>
          </div>
        ))}

        <div style={{textAlign:"center",paddingTop:8}}>
          <div style={{fontFamily:"Georgia,serif",fontSize:15,color:C.aurum,fontStyle:"italic"}}>Da adesso, lavori diversamente.</div>
          <div style={{fontSize:11,color:"#555",fontFamily:"Arial,sans-serif",marginTop:8}}>AGPL v3 · Open source · ex nunc</div>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────
// ClassificaModal
// ─────────────────────────────────────────────────────
function ClassificaModal({onClose}){
  const top=[
    {pos:1,nome:"Redazione",studio:"xNunc.ai",punti:140,skills:14,badge:"👑",color:C.aurum},
    {pos:2,nome:"—",studio:"In attesa del primo contributor",punti:0,skills:0,badge:"🥈",color:"#aaa"},
    {pos:3,nome:"—",studio:"In attesa del primo contributor",punti:0,skills:0,badge:"🥉",color:"#888"},
  ];
  const aree=[
    {area:"Fiscale",leader:"Redazione",punti:60},
    {area:"Societario",leader:"Redazione",punti:30},
    {area:"Finanza agevolata",leader:"Redazione",punti:20},
    {area:"Valutazione Aziendale",leader:"Redazione",punti:10},
  ];
  return(
    <div style={{position:"fixed",inset:0,background:"#00000088",zIndex:1000,display:"flex",alignItems:"center",justifyContent:"center",padding:"16px"}} onClick={onClose}>
      <div onClick={e=>e.stopPropagation()} style={{background:"#fff",borderRadius:16,width:"100%",maxWidth:540,boxShadow:"0 8px 48px #0004",border:`2px solid ${C.aurum}`,overflow:"hidden",maxHeight:"85vh",display:"flex",flexDirection:"column"}}>
        <div style={{background:C.nox,padding:"20px 24px",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <div>
            <div style={{fontSize:10,color:C.aurum,fontWeight:700,letterSpacing:"0.15em",fontFamily:"Arial,sans-serif",marginBottom:4}}>CLASSIFICA CONTRIBUTOR</div>
            <div style={{fontFamily:"Georgia,serif",fontSize:18,color:"#fff",fontWeight:700}}>Top della community</div>
          </div>
          <button onClick={onClose} style={{background:"none",border:"none",color:"#888",fontSize:22,cursor:"pointer"}}>×</button>
        </div>
        <div style={{padding:"20px 24px",overflowY:"auto"}}>
          {top.map(u=>(
            <div key={u.pos} style={{display:"flex",alignItems:"center",gap:14,padding:"12px 0",borderBottom:"1px solid #f0ede8"}}>
              <div style={{fontSize:20,width:28,textAlign:"center"}}>{u.badge}</div>
              <div style={{width:36,height:36,borderRadius:"50%",background:u.color,display:"flex",alignItems:"center",justifyContent:"center"}}>
                <span style={{color:"#fff",fontSize:12,fontWeight:700}}>{u.nome[0]}</span>
              </div>
              <div style={{flex:1}}>
                <div style={{fontFamily:"Arial,sans-serif",fontSize:13,fontWeight:700,color:C.nox}}>{u.nome}</div>
                <div style={{fontSize:11,color:"#aaa",fontFamily:"Arial,sans-serif"}}>{u.studio}</div>
              </div>
              <div style={{textAlign:"right"}}>
                <div style={{fontFamily:"Arial,sans-serif",fontSize:15,fontWeight:700,color:u.punti>0?C.aurum:"#ddd"}}>{u.punti}</div>
                <div style={{fontSize:10,color:"#bbb",fontFamily:"Arial,sans-serif"}}>{u.skills} skill</div>
              </div>
            </div>
          ))}

          <div style={{marginTop:20}}>
            <div style={{fontSize:10,fontWeight:700,color:C.gray,letterSpacing:"0.12em",fontFamily:"Arial,sans-serif",marginBottom:10}}>LEADER PER AREA</div>
            {aree.map(({area,leader,punti})=>(
              <div key={area} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"7px 0",borderBottom:"1px solid #f5f3ee"}}>
                <div>
                  <div style={{fontSize:12,fontWeight:700,color:C.nox,fontFamily:"Arial,sans-serif"}}>{area}</div>
                  <div style={{fontSize:11,color:"#aaa",fontFamily:"Arial,sans-serif"}}>{leader}</div>
                </div>
                <div style={{fontSize:13,fontWeight:700,color:C.aurum,fontFamily:"Arial,sans-serif"}}>{punti} pt</div>
              </div>
            ))}
          </div>

          <div style={{marginTop:20,background:"#f9f8f5",borderRadius:10,padding:"14px",border:"1.5px dashed #ddd",textAlign:"center"}}>
            <div style={{fontSize:13,color:C.nox,fontFamily:"Georgia,serif",marginBottom:4}}>Vuoi comparire in classifica?</div>
            <div style={{fontSize:12,color:C.gray,fontFamily:"Arial,sans-serif"}}>Registrati e crea la tua prima skill. +10 punti immediati.</div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────
// ProfileModal — profilo utente completo + BYOK API key
// ─────────────────────────────────────────────────────
const RUOLI_PROF=["Dottore Commercialista","Revisore Legale","Consulente del Lavoro","Avvocato tributarista","CFO / Responsabile Finance","Altro"];
const TAB_PROF=["Dati personali","Studio & albo","Sicurezza & BYOK"];

function ProfileField({label,required,children}){
  return(
    <div>
      <label style={{fontFamily:"Arial,sans-serif",fontSize:10,fontWeight:700,color:C.gray,letterSpacing:"0.1em",display:"flex",alignItems:"center",gap:4,marginBottom:5}}>
        {label}{required&&<span style={{color:"#C0392B",fontSize:11}}>*</span>}
      </label>
      {children}
    </div>
  );
}

function ProfileModal({onClose,userProfile,setUserProfile,onLogout,onDeleteAccount,onExportData,userPoints}){
  const[tab,setTab]=useState(0);
  const[nome,setNome]=useState(userProfile.nome||"");
  const[cognome,setCognome]=useState(userProfile.cognome||"");
  const[email,setEmail]=useState(userProfile.email||"");
  const[cell,setCell]=useState(userProfile.cell||"");
  const[citta,setCitta]=useState(userProfile.citta||"");
  const[studio,setStudio]=useState(userProfile.studio||"");
  const[ruolo,setRuolo]=useState(userProfile.ruolo||"");
  const[albo,setAlbo]=useState(userProfile.albo||"");
  const[web,setWeb]=useState(userProfile.web||"");
  const[byok,setByok]=useState(userProfile.byokKey||"");
  const[keyMode,setKeyMode]=useState(userProfile.keyMode||"xnunc");
  const[aiProvider,setAiProvider]=useState(userProfile.aiProvider||"anthropic");
  const[showKey,setShowKey]=useState(false);
  const[saved,setSaved]=useState(false);
  const[errors,setErrors]=useState({});
  // Password change
  const[pwAttuale,setPwAttuale]=useState("");
  const[pwNuova,setPwNuova]=useState("");
  const[pwConferma,setPwConferma]=useState("");
  const[pwMsg,setPwMsg]=useState(null); // {ok,text}
  // Delete account confirm
  const[confirmDelete,setConfirmDelete]=useState(false);

  const inputStyle=(err)=>({width:"100%",border:"none",borderBottom:`1px solid ${err?"#C0392B":"#D8D4CE"}`,padding:"10px 0",background:"transparent",color:"#0A0B0F",fontSize:13,fontFamily:"Arial",outline:"none",boxSizing:"border-box"});
  const nomeCompl=`${nome} ${cognome}`.trim();

  function valida(){
    const e={};
    if(!email.trim())e.email="Campo obbligatorio";
    else if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))e.email="Email non valida";
    if(cell.trim()&&!/^[\+]?[\d\s\-]{7,15}$/.test(cell.trim()))e.cell="Formato non valido (es. +39 333 1234567)";
    setErrors(e);
    return Object.keys(e).length===0;
  }

  function salva(){
    if(!valida())return;
    setUserProfile({nome,cognome,email,cell,citta,studio,ruolo,albo,web,byokKey:byok,keyMode,aiProvider});
    setSaved(true);
    setTimeout(()=>setSaved(false),2200);
  }

  function aggiornaPw(){
    if(!pwAttuale){setPwMsg({ok:false,text:"Inserisci la password attuale"});return;}
    if(pwNuova.length<8){setPwMsg({ok:false,text:"La nuova password deve avere almeno 8 caratteri"});return;}
    if(pwNuova!==pwConferma){setPwMsg({ok:false,text:"Le password non coincidono"});return;}
    // Mock — in produzione chiamerà un endpoint
    setPwMsg({ok:true,text:"Password aggiornata con successo"});
    setPwAttuale("");setPwNuova("");setPwConferma("");
    setTimeout(()=>setPwMsg(null),3000);
  }

  const tabLabel=["👤 Personali","🏛 Studio","🔐 Sicurezza"];

  return(
    <div style={{position:"fixed",inset:0,background:"rgba(10,11,15,0.72)",zIndex:1000,display:"flex",alignItems:"flex-start",justifyContent:"center",padding:"16px",overflowY:"auto"}} onClick={onClose}>
      <div onClick={e=>e.stopPropagation()} style={{background:"#FAF9F7",borderRadius:4,width:"100%",maxWidth:520,boxShadow:"0 2px 4px rgba(0,0,0,0.06), 0 20px 60px rgba(0,0,0,0.18)",marginTop:16,marginBottom:16,overflow:"hidden"}}>

        {/* Header */}
        <div style={{background:"#FAF9F7",padding:"28px 32px 24px",borderBottom:"2px solid #0A0B0F"}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:14}}>
            <div>
              <div style={{fontFamily:"Arial,sans-serif",fontSize:9,color:"#BA7517",fontWeight:700,letterSpacing:"0.2em",marginBottom:8}}>PROFILO</div>
              <div style={{fontFamily:"Georgia,serif",fontSize:21,fontWeight:400,color:"#0A0B0F"}}>{nomeCompl||"Il tuo profilo"}</div>
              {userPoints!==undefined&&<div style={{fontFamily:"Georgia,serif",fontSize:34,fontWeight:300,color:"#BA7517",lineHeight:1,marginTop:8}}>{userPoints}</div>}
              {userPoints!==undefined&&<div style={{fontSize:10,color:"#aaa",fontFamily:"Arial,sans-serif",letterSpacing:"0.15em",fontWeight:700,marginTop:2}}>PUNTI CONTRIBUTOR</div>}
            </div>
            <button onClick={onClose} style={{background:"none",border:"none",color:"#aaa",fontSize:20,cursor:"pointer",padding:0,transition:"color .2s"}}>×</button>
          </div>
          {/* Tab strip */}
          <div style={{display:"flex",borderBottom:"2px solid #0A0B0F",padding:"0",gap:4,alignItems:"flex-end",marginTop:16}}>
            {tabLabel.map((t,i)=>(
              <button key={i} onClick={()=>setTab(i)} style={{padding:"8px 16px",border:"none",cursor:"pointer",background:tab===i?"#0A0B0F":"none",color:tab===i?"#F1EFE8":"#aaa",fontFamily:"Arial,sans-serif",fontSize:10,fontWeight:700,letterSpacing:"0.14em",borderRadius:tab===i?"4px 4px 0 0":"4px 4px 0 0",marginBottom:tab===i?"-2px":0,transition:"all .2s"}}>
                {t.replace(/[👤🏛🔐]/g,'')}
              </button>
            ))}
          </div>
        </div>

        <div style={{padding:"22px 24px"}}>

          {/* TAB 0 — Dati personali */}
          {tab===0&&(
            <div style={{display:"flex",flexDirection:"column",gap:13}}>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
                <ProfileField label="NOME">
                  <input value={nome} onChange={e=>setNome(e.target.value)} placeholder="Giampiero" style={inputStyle()}/>
                </ProfileField>
                <ProfileField label="COGNOME">
                  <input value={cognome} onChange={e=>setCognome(e.target.value)} placeholder="Morales" style={inputStyle()}/>
                </ProfileField>
              </div>
              <ProfileField label="EMAIL" required>
                <input value={email} onChange={e=>{setEmail(e.target.value);setErrors(p=>({...p,email:undefined}));}} placeholder="nome@studio.it" type="email" style={inputStyle(errors.email)}/>
                {errors.email&&<div style={{fontSize:10,color:"#C0392B",fontFamily:"Arial,sans-serif",marginTop:3}}>{errors.email}</div>}
              </ProfileField>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
                <ProfileField label="CELLULARE">
                  <input value={cell} onChange={e=>{setCell(e.target.value);setErrors(p=>({...p,cell:undefined}));}} placeholder="+39 333 …" type="tel" style={inputStyle(errors.cell)}/>
                  {errors.cell&&<div style={{fontSize:10,color:"#C0392B",fontFamily:"Arial,sans-serif",marginTop:3}}>{errors.cell}</div>}
                </ProfileField>
                <ProfileField label="CITTÀ">
                  <input value={citta} onChange={e=>setCitta(e.target.value)} placeholder="Milano" style={inputStyle()}/>
                </ProfileField>
              </div>
            </div>
          )}

          {/* TAB 1 — Studio & albo */}
          {tab===1&&(
            <div style={{display:"flex",flexDirection:"column",gap:13}}>
              <ProfileField label="STUDIO / ENTE DI APPARTENENZA">
                <input value={studio} onChange={e=>setStudio(e.target.value)} placeholder="Studio Morales — BC&" style={inputStyle()}/>
              </ProfileField>
              <ProfileField label="QUALIFICA PROFESSIONALE">
                <select value={ruolo} onChange={e=>setRuolo(e.target.value)} style={{...inputStyle(),background:"#fff",color:ruolo?"#111":"#aaa"}}>
                  <option value="">Seleziona…</option>
                  {RUOLI_PROF.map(r=><option key={r} value={r}>{r}</option>)}
                </select>
              </ProfileField>
              <ProfileField label="N° ISCRIZIONE ALBO / ORDINE">
                <input value={albo} onChange={e=>setAlbo(e.target.value)} placeholder="Es.: ODCEC Milano — 12345/A" style={inputStyle()}/>
              </ProfileField>
              <ProfileField label="SITO WEB / LINKEDIN">
                <input value={web} onChange={e=>setWeb(e.target.value)} placeholder="https://…" type="url" style={inputStyle()}/>
              </ProfileField>
              <div style={{background:"#f9f8f5",borderRadius:8,padding:"10px 14px",display:"flex",gap:8,alignItems:"flex-start"}}>
                <span style={{fontSize:13}}>ℹ️</span>
                <span style={{fontSize:11,color:"#888",fontFamily:"Arial,sans-serif",lineHeight:1.5}}>Nome, studio e qualifica verranno mostrati pubblicamente nella classifica dei contributor. Email e cellulare rimangono privati.</span>
              </div>
            </div>
          )}

          {/* TAB 2 — Sicurezza & Chiave AI */}
          {tab===2&&(
            <div style={{display:"flex",flexDirection:"column",gap:14}}>

              {/* Modalità esecuzione */}
              <div style={{background:"#f9f8f5",borderRadius:10,padding:"16px",border:"1.5px solid #e8e4dc"}}>
                <div style={{fontFamily:"Arial,sans-serif",fontSize:10,fontWeight:700,color:C.gray,letterSpacing:"0.1em",marginBottom:12}}>MODALITÀ ESECUZIONE WIDGET</div>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
                  {[
                    {id:"xnunc",label:"Chiave xNunc",sub:"Inclusa nel piano — senza configurazione",emoji:"⚡"},
                    {id:"byok", label:"Chiave personale (BYOK)",sub:"Usa la tua API key — massimo controllo",emoji:"🔑"},
                  ].map(opt=>(
                    <div key={opt.id} onClick={()=>setKeyMode(opt.id)}
                      style={{padding:"12px 14px",borderRadius:10,border:`2px solid ${keyMode===opt.id?C.aurum:"#e0ddd8"}`,background:keyMode===opt.id?"#FDF3E3":"#fff",cursor:"pointer",transition:"all .15s"}}>
                      <div style={{display:"flex",alignItems:"center",gap:7,marginBottom:4}}>
                        <span style={{fontSize:18}}>{opt.emoji}</span>
                        <span style={{fontFamily:"Arial,sans-serif",fontSize:12,fontWeight:700,color:keyMode===opt.id?C.aurum:C.nox}}>{opt.label}</span>
                        {keyMode===opt.id&&<span style={{marginLeft:"auto",fontSize:14,color:C.aurum}}>●</span>}
                      </div>
                      <div style={{fontSize:10,color:"#888",fontFamily:"Arial,sans-serif",lineHeight:1.5}}>{opt.sub}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Se xNunc */}
              {keyMode==="xnunc"&&(
                <div style={{background:"#E3F7F0",borderRadius:10,padding:"12px 14px",border:"1px solid #b8e8d4",display:"flex",gap:10,alignItems:"flex-start"}}>
                  <span style={{fontSize:18}}>✓</span>
                  <div style={{fontFamily:"Arial,sans-serif",fontSize:12,color:"#2d7d5a",lineHeight:1.6}}>
                    <strong>Tutto incluso.</strong> I widget vengono eseguiti attraverso i server xNunc con Claude (Anthropic). Nessuna configurazione richiesta. Piano Free: <strong>20 esecuzioni/mese</strong>.
                  </div>
                </div>
              )}

              {/* Se BYOK */}
              {keyMode==="byok"&&(
                <div style={{display:"flex",flexDirection:"column",gap:12}}>
                  {/* Scelta provider */}
                  <div style={{background:"#f9f8f5",borderRadius:10,padding:"14px",border:"1px solid #eee"}}>
                    <div style={{fontFamily:"Arial,sans-serif",fontSize:10,fontWeight:700,color:C.gray,letterSpacing:"0.1em",marginBottom:10}}>PROVIDER AI</div>
                    <div style={{display:"grid",gridTemplateColumns:"repeat(2,1fr)",gap:8}}>
                      {[
                        {id:"anthropic",label:"Anthropic (Claude)",logoKey:"claude"},
                        {id:"openai",   label:"OpenAI (GPT-4o)",   logoKey:"openai"},
                        {id:"gemini",   label:"Google Gemini",     logoKey:"gemini"},
                        {id:"copilot",  label:"Copilot (Azure)",   logoKey:"copilot",disabled:true},
                      ].map(p=>(
                        <div key={p.id} onClick={()=>!p.disabled&&setAiProvider(p.id)}
                          style={{padding:"9px 12px",borderRadius:8,border:`1.5px solid ${aiProvider===p.id?C.caelum:"#ddd"}`,background:aiProvider===p.id?"#EBF2FE":"#fff",cursor:p.disabled?"not-allowed":"pointer",opacity:p.disabled?0.5:1,display:"flex",alignItems:"center",gap:7}}>
                          <PlatformLogo id={p.logoKey} size={18}/>
                          <span style={{fontFamily:"Arial,sans-serif",fontSize:11,fontWeight:aiProvider===p.id?700:400,color:aiProvider===p.id?C.caelum:"#555"}}>{p.label}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  {/* Campo chiave */}
                  <div style={{background:"#f9f8f5",borderRadius:10,padding:"14px",border:"1px solid #eee"}}>
                    <div style={{fontFamily:"Arial,sans-serif",fontSize:10,fontWeight:700,color:C.gray,letterSpacing:"0.1em",marginBottom:8}}>
                      CHIAVE API — {aiProvider.toUpperCase()}
                    </div>
                    <div style={{position:"relative"}}>
                      <input type={showKey?"text":"password"} value={byok} onChange={e=>setByok(e.target.value)}
                        placeholder={{anthropic:"sk-ant-api03-…",openai:"sk-…",gemini:"AIza…",copilot:""}[aiProvider]}
                        style={{width:"100%",padding:"9px 40px 9px 12px",borderRadius:8,border:"1.5px solid #ddd",fontSize:13,fontFamily:"monospace",outline:"none",boxSizing:"border-box",letterSpacing:byok&&!showKey?"0.1em":"normal"}}/>
                      <button onClick={()=>setShowKey(v=>!v)} style={{position:"absolute",right:10,top:"50%",transform:"translateY(-50%)",background:"none",border:"none",cursor:"pointer",fontSize:14,color:"#aaa"}}>{showKey?"🙈":"👁"}</button>
                    </div>
                    <div style={{fontSize:10,color:"#bbb",fontFamily:"Arial,sans-serif",marginTop:6,lineHeight:1.5}}>
                      Chiave salvata in locale (non inviata ai server xNunc). I dati transitano sotto il tuo account {aiProvider}.
                    </div>
                    {byok&&(
                      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginTop:8}}>
                        <div style={{display:"flex",alignItems:"center",gap:6}}>
                          <div style={{width:6,height:6,borderRadius:"50%",background:C.viridis}}/>
                          <span style={{fontSize:10,color:C.viridis,fontFamily:"Arial,sans-serif",fontWeight:700}}>Chiave configurata</span>
                        </div>
                        <button onClick={()=>setByok("")} style={{padding:"4px 10px",borderRadius:6,border:"1px solid #fcc",background:"#fff5f5",color:"#C0392B",fontSize:10,cursor:"pointer",fontFamily:"Arial,sans-serif"}}>× Rimuovi</button>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Cambio password */}
              <div style={{background:"#f9f8f5",borderRadius:10,padding:"14px",border:"1px solid #eee"}}>
                <div style={{fontFamily:"Arial,sans-serif",fontSize:10,fontWeight:700,color:C.gray,letterSpacing:"0.1em",marginBottom:8}}>CAMBIO PASSWORD</div>
                <input value={pwAttuale} onChange={e=>setPwAttuale(e.target.value)} placeholder="Password attuale" type="password" style={{...inputStyle(),marginBottom:8}}/>
                <input value={pwNuova} onChange={e=>setPwNuova(e.target.value)} placeholder="Nuova password (min. 8 caratteri)" type="password" style={{...inputStyle(),marginBottom:8}}/>
                <input value={pwConferma} onChange={e=>setPwConferma(e.target.value)} placeholder="Conferma nuova password" type="password" style={inputStyle()}/>
                {pwMsg&&<div style={{marginTop:8,fontSize:11,fontFamily:"Arial,sans-serif",color:pwMsg.ok?C.viridis:"#C0392B",fontWeight:600}}>{pwMsg.ok?"✓ ":""}{pwMsg.text}</div>}
                <button onClick={aggiornaPw} style={{marginTop:10,padding:"7px 16px",borderRadius:8,border:"none",background:C.nox,color:"#fff",fontSize:12,fontWeight:700,cursor:"pointer",fontFamily:"Arial,sans-serif"}}>Aggiorna password</button>
              </div>

              {/* Gestione account */}
              <div style={{borderTop:"1px solid #f0ede8",paddingTop:14}}>
                <div style={{fontFamily:"Arial,sans-serif",fontSize:10,fontWeight:700,color:C.gray,letterSpacing:"0.1em",marginBottom:8}}>GESTIONE ACCOUNT</div>
                {confirmDelete?(
                  <div style={{background:"#fff5f5",borderRadius:8,padding:"12px",border:"1px solid #fcc"}}>
                    <div style={{fontFamily:"Arial,sans-serif",fontSize:12,color:"#C0392B",marginBottom:10,fontWeight:600}}>⚠️ Conferma eliminazione account</div>
                    <div style={{fontSize:11,color:"#888",fontFamily:"Arial,sans-serif",marginBottom:10}}>Tutti i tuoi dati (profilo, skill in bozza, preferiti, messaggi) verranno cancellati definitivamente. L'operazione è irreversibile.</div>
                    <div style={{display:"flex",gap:8}}>
                      <button onClick={()=>setConfirmDelete(false)} style={{flex:1,padding:"6px 12px",borderRadius:6,border:"1px solid #ddd",background:"#fff",color:"#555",fontSize:11,cursor:"pointer",fontFamily:"Arial,sans-serif"}}>Annulla</button>
                      <button onClick={onDeleteAccount} style={{flex:1,padding:"6px 12px",borderRadius:6,border:"none",background:"#C0392B",color:"#fff",fontSize:11,fontWeight:700,cursor:"pointer",fontFamily:"Arial,sans-serif"}}>Sì, elimina</button>
                    </div>
                  </div>
                ):(
                  <div style={{display:"flex",gap:10}}>
                    <button onClick={onExportData} style={{padding:"6px 14px",borderRadius:6,border:"1px solid #ddd",background:"#fff",color:"#555",fontSize:11,cursor:"pointer",fontFamily:"Arial,sans-serif"}}>📥 Esporta dati</button>
                    <button onClick={()=>setConfirmDelete(true)} style={{padding:"6px 14px",borderRadius:6,border:"1px solid #fcc",background:"#fff",color:"#C0392B",fontSize:11,cursor:"pointer",fontFamily:"Arial,sans-serif"}}>Elimina account</button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Footer pulsanti */}
          <div style={{display:"flex",gap:10,marginTop:20,paddingTop:20,borderTop:"1px solid #E8E4DC",padding:"20px 0 0 0"}}>
            <button onClick={onClose} style={{flex:1,padding:"11px 20px",borderRadius:4,border:"1px solid #D8D4CE",background:"none",fontSize:11,cursor:"pointer",fontFamily:"Arial",color:"#666",fontWeight:700,letterSpacing:"0.1em",textTransform:"uppercase",transition:"all .2s"}}>Chiudi</button>
            <button onClick={salva} style={{flex:2,padding:"11px 20px",borderRadius:4,border:"none",background:saved?"#1D9E75":"#0A0B0F",color:"#fff",fontSize:11,fontWeight:700,cursor:"pointer",fontFamily:"Arial",letterSpacing:"0.1em",textTransform:"uppercase",transition:"background .3s",display:"flex",alignItems:"center",justifyContent:"center",gap:6}}>
              {saved?<>Salvato</>:<>Salva</>}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────
// Email notification via EmailJS (configurazione opzionale)
// Per attivare le notifiche:
// 1. Vai su https://emailjs.com → crea account gratuito
// 2. Crea un Service (collega Gmail/Outlook) → copia Service ID
// 3. Crea un Template con variabili {{to_email}} {{subject}} {{message}}
// 4. Copia Template ID e Public Key (tab Account → API Keys)
// 5. Sostituisci i valori EMAILJS_* qui sotto
// ─────────────────────────────────────────────────────
const EMAILJS_SERVICE  = "YOUR_SERVICE_ID";   // es. "service_gmail"
const EMAILJS_TEMPLATE = "YOUR_TEMPLATE_ID";  // es. "template_xnunc"
const EMAILJS_KEY      = "YOUR_PUBLIC_KEY";   // tab Account → API Keys
const ADMIN_EMAIL      = "morales@bcand.it";

async function notificaEmail({destinatario,oggetto,corpo}){
  if(EMAILJS_SERVICE.startsWith("YOUR"))return; // non ancora configurato
  try{
    await fetch("https://api.emailjs.com/api/v1.0/email/send",{
      method:"POST",
      headers:{"Content-Type":"application/json"},
      body:JSON.stringify({
        service_id:EMAILJS_SERVICE,
        template_id:EMAILJS_TEMPLATE,
        user_id:EMAILJS_KEY,
        template_params:{to_email:destinatario,subject:oggetto,message:corpo}
      })
    });
  }catch(e){console.log("Email non inviata:",e);}
}

// ─────────────────────────────────────────────────────
// Improvement workflow config
// ─────────────────────────────────────────────────────
const IMPROV_STATI={
  bozza:              {label:"✏️ Bozza",              color:C.caelum},
  beta_generata:      {label:"⚡ Beta pronta",         color:C.aurum},
  attesa_creatore:    {label:"⏳ Attesa creatore",     color:C.aurum},
  approvata_creatore: {label:"✓ Approv. creatore",    color:C.viridis},
  rifiutata_creatore: {label:"✗ Rif. creatore",       color:"#C0392B"},
  in_redazione:       {label:"📋 In Redazione",        color:C.caelum},
  approvata:          {label:"✅ Pubblicata",           color:C.viridis},
  rifiutata_redazione:{label:"✗ Rif. Redazione",      color:"#C0392B"},
};

// ─────────────────────────────────────────────────────
// DashboardModal — area riservata utente
// Tabs: ⭐ Preferiti | 🔧 In sviluppo | 💬 Messaggi
// ─────────────────────────────────────────────────────
const STATO_LABEL={bozza:"🔧 Bozza",in_revisione:"⏳ In revisione",approvata:"✓ Approvata"};
const STATO_COLOR={bozza:C.caelum,in_revisione:C.aurum,approvata:C.viridis};

function DashboardModal({onClose,favorites,setFavorites,draftSkills,setDraftSkills,threads,setThreads,userProfile,onTestSkill,onOpenProfile,onCreateSkill,isAdmin,improvements,setImprovements,userPoints}){
  const[tab,setTab]=useState(0);
  const[activeThread,setActiveThread]=useState(null);
  const[msgTesto,setMsgTesto]=useState("");
  const[newMsg,setNewMsg]=useState(false);
  const[newMsgOgg,setNewMsgOgg]=useState("");
  const[newMsgTesto,setNewMsgTesto]=useState("");
  const[editingId,setEditingId]=useState(null); // id draft in modifica
  const[editVals,setEditVals]=useState({}); // campi in editing

  function apriEdit(d){
    setEditingId(d.id);
    setEditVals({nome:d.nome||"",descrizione:d.descrizione||"",inputAtteso:d.inputAtteso||d.input_atteso||"",outputAtteso:d.outputAtteso||d.output_atteso||"",normativa:d.normativa||""});
  }
  function salvaEdit(id){
    setDraftSkills(prev=>prev.map(d=>d.id===id?{
      ...d,...editVals,
      // aggiorna anche snake_case per compatibilità SkillModal
      input_atteso:editVals.inputAtteso,
      output_atteso:editVals.outputAtteso,
      // reset testato se i campi sono stati modificati
      testato:false,
    }:d));
    setEditingId(null);setEditVals({});
  }

  const nomeCompl=`${userProfile.nome||""} ${userProfile.cognome||""}`.trim()||"Utente";
  const nonLettiTot=threads.reduce((n,t)=>n+(t.nonLetti||0),0);
  const favSkills=SKILLS.filter(s=>favorites.includes(s.id));

  function inviaAllRedazione(draft){
    setDraftSkills(prev=>prev.map(d=>d.id===draft.id?{...d,stato:"in_revisione"}:d));
    notificaEmail({
      destinatario:ADMIN_EMAIL,
      oggetto:`[xNunc] Nuova skill in revisione: ${draft.nome}`,
      corpo:`L'utente ${nomeCompl} ha inviato la skill "${draft.nome}" (${draft.area}) per revisione.\n\nDescrizione: ${draft.descrizione}\n\nInput atteso: ${draft.inputAtteso}\nOutput atteso: ${draft.outputAtteso}\nNormativa: ${draft.normativa}`
    });
    // Aggiungi thread di notifica nella messaggistica
    setThreads(prev=>[...prev,{
      id:Date.now(),titolo:`Skill inviata: ${draft.nome}`,con:"Redazione",avatar:"R",avatarColor:C.aurum,
      messaggi:[{id:1,da:"Sistema",testo:`Hai inviato la skill "${draft.nome}" alla Redazione. Riceverai una risposta qui appena revisionata. Di solito entro 48 ore.`,data:new Date().toLocaleDateString("it-IT"),letto:true}],
      nonLetti:0
    }]);
    setTab(2); // vai alla tab messaggi
  }

  function inviaMsgThread(thread){
    if(!msgTesto.trim())return;
    const nuovoMsg={id:Date.now(),da:nomeCompl,testo:msgTesto,data:new Date().toLocaleDateString("it-IT"),letto:true};
    setThreads(prev=>prev.map(t=>t.id===thread.id?{...t,messaggi:[...t.messaggi,nuovoMsg]}:t));
    setActiveThread(prev=>prev?{...prev,messaggi:[...prev.messaggi,nuovoMsg]}:prev);
    notificaEmail({
      destinatario:ADMIN_EMAIL,
      oggetto:`[xNunc Messaggi] Nuovo messaggio da ${nomeCompl}`,
      corpo:`Thread: ${thread.titolo}\n\nMessaggio: ${msgTesto}\n\nDa: ${nomeCompl} (${userProfile.email||"email non impostata"})`
    });
    setMsgTesto("");
  }

  function nuovoThread(){
    if(!newMsgOgg.trim()||!newMsgTesto.trim())return;
    const thread={id:Date.now(),titolo:newMsgOgg,con:"Redazione",avatar:"R",avatarColor:C.aurum,
      messaggi:[{id:1,da:nomeCompl,testo:newMsgTesto,data:new Date().toLocaleDateString("it-IT"),letto:true}],nonLetti:0};
    setThreads(prev=>[...prev,thread]);
    notificaEmail({
      destinatario:ADMIN_EMAIL,
      oggetto:`[xNunc] Nuovo messaggio da ${nomeCompl}: ${newMsgOgg}`,
      corpo:newMsgTesto+`\n\nDa: ${nomeCompl} (${userProfile.email||"email non impostata"})`
    });
    setNewMsg(false);setNewMsgOgg("");setNewMsgTesto("");
    setActiveThread(thread);
  }

  const myImprovs=(improvements||[]).filter(im=>im.contributorEmail===userProfile.email&&im.stato!=="approvata"&&im.stato!=="rifiutata_redazione");
  const pendingMyApproval=(improvements||[]).filter(im=>im.stato==="attesa_creatore"&&(isAdmin||im.contributorEmail===userProfile.email));
  const[activeDashImprov,setActiveDashImprov]=useState(null);

  const tabBar=[
    {label:"⭐ Preferiti",count:favSkills.length+draftSkills.filter(d=>d.stato==="approvata").length},
    {label:"🔧 In sviluppo",count:draftSkills.filter(d=>d.stato!=="approvata").length+(myImprovs.length)+(isAdmin?pendingMyApproval.length:0)},
    {label:"💬 Messaggi",count:nonLettiTot},
  ];

  return(
    <div style={{position:"fixed",inset:0,background:"rgba(10,11,15,0.72)",zIndex:1000,display:"flex",alignItems:"center",justifyContent:"center",padding:"24px 16px",overflowY:"auto"}} onClick={onClose}>
      <div onClick={e=>e.stopPropagation()} style={{background:"#FAF9F7",width:"100%",maxWidth:860,maxHeight:"90vh",display:"flex",flexDirection:"column",boxShadow:"0 2px 4px rgba(0,0,0,0.06), 0 20px 60px rgba(0,0,0,0.18)"}}>

        {/* Header */}
        <div style={{background:"#FAF9F7",padding:"28px 32px 24px",display:"flex",alignItems:"center",justifyContent:"space-between",flexShrink:0,borderBottom:"2px solid #0A0B0F"}}>
          <div>
            <div style={{fontFamily:"Arial,sans-serif",fontSize:9,color:"#BA7517",fontWeight:700,letterSpacing:"0.2em",marginBottom:8}}>DASHBOARD</div>
            <div style={{fontFamily:"Georgia,serif",fontSize:21,fontWeight:400,color:"#0A0B0F"}}>{nomeCompl}</div>
          </div>
          <div style={{display:"flex",gap:10,alignItems:"center"}}>
            <button onClick={onOpenProfile} style={{padding:"11px 20px",borderRadius:4,border:"1px solid #D8D4CE",background:"none",color:"#666",fontSize:10,cursor:"pointer",fontFamily:"Arial",fontWeight:700,letterSpacing:"0.1em",textTransform:"uppercase"}}>Profilo</button>
            <button onClick={onClose} style={{background:"none",border:"none",color:"#aaa",fontSize:20,cursor:"pointer",lineHeight:1,transition:"color .2s"}}>×</button>
          </div>
        </div>

        {/* Tab bar */}
        <div style={{background:"#FAF9F7",borderBottom:"2px solid #0A0B0F",display:"flex",flexShrink:0,padding:"0 28px",gap:4,alignItems:"flex-end"}}>
          {tabBar.map(({label,count},i)=>(
            <button key={i} onClick={()=>setTab(i)} style={{padding:"8px 16px",border:"none",cursor:"pointer",background:tab===i?"#0A0B0F":"none",color:tab===i?"#F1EFE8":"#aaa",fontFamily:"Arial,sans-serif",fontSize:10,fontWeight:700,letterSpacing:"0.14em",borderRadius:tab===i?"4px 4px 0 0":"4px 4px 0 0",marginBottom:tab===i?"-2px":0,display:"flex",alignItems:"center",justifyContent:"center",gap:6,transition:"all .2s"}}>
              {label}
              {count>0&&<span style={{background:tab===i?"#F1EFE8":"#E8E4DC",color:tab===i?"#0A0B0F":"#888",borderRadius:3,fontSize:9,padding:"1px 5px",fontWeight:700}}>{count}</span>}
            </button>
          ))}
        </div>

        {/* Content */}
        <div style={{flex:1,overflowY:"auto",padding:"28px 32px",background:"#FAF9F7"}}>

          {/* TAB 0 — Preferiti */}
          {tab===0&&(
            <div>
              {favSkills.length===0&&draftSkills.filter(d=>d.stato==="approvata").length===0?(
                <div style={{textAlign:"center",padding:"48px 0"}}>
                  <div style={{fontSize:32,marginBottom:8}}>☆</div>
                  <div style={{fontFamily:"Georgia,serif",fontSize:16,color:C.nox,marginBottom:6}}>Nessuna skill nei preferiti</div>
                  <div style={{fontSize:13,color:C.gray,fontFamily:"Arial,sans-serif"}}>Clicca la stella ★ su una skill del catalogo per aggiungerla qui.</div>
                </div>
              ):(
                <>
                  {favSkills.length>0&&(
                    <>
                      <div style={{fontSize:10,fontWeight:700,color:C.gray,letterSpacing:"0.1em",marginBottom:10,fontFamily:"Arial,sans-serif"}}>DAL CATALOGO · {favSkills.length}</div>
                      {favSkills.map(s=>(
                        <SkillCard key={s.id} skill={s} isLogged favorites={favorites} setFavorites={setFavorites} onClick={()=>onTestSkill(s)} compact/>
                      ))}
                    </>
                  )}
                  {draftSkills.filter(d=>d.stato==="approvata").length>0&&(
                    <>
                      <div style={{fontSize:10,fontWeight:700,color:C.gray,letterSpacing:"0.1em",marginTop:16,marginBottom:10,fontFamily:"Arial,sans-serif"}}>MIE SKILL PUBBLICATE · {draftSkills.filter(d=>d.stato==="approvata").length}</div>
                      {draftSkills.filter(d=>d.stato==="approvata").map(d=>(
                        <div key={d.id} style={{border:"1.5px solid #e8e4dc",borderRadius:10,background:"#fff",padding:"12px 16px",marginBottom:8}}>
                          <div style={{fontFamily:"Georgia,serif",fontSize:14,fontWeight:700,color:C.nox}}>{d.nome}</div>
                          <div style={{fontSize:11,color:C.viridis,fontFamily:"Arial,sans-serif",marginTop:3,fontWeight:700}}>✓ Pubblicata nel catalogo</div>
                        </div>
                      ))}
                    </>
                  )}
                </>
              )}
            </div>
          )}

          {/* TAB 1 — In sviluppo */}
          {tab===1&&(
            <><div>
              {draftSkills.filter(d=>d.stato!=="approvata").length===0?(
                <div style={{textAlign:"center",padding:"48px 0"}}>
                  <div style={{fontSize:32,marginBottom:8}}>🔧</div>
                  <div style={{fontFamily:"Georgia,serif",fontSize:16,color:C.nox,marginBottom:6}}>Nessuna skill in sviluppo</div>
                  <div style={{fontSize:13,color:C.gray,fontFamily:"Arial,sans-serif",marginBottom:16}}>Crea la tua prima skill — resta qui finché non sei pronto a inviarla alla Redazione.</div>
                  <button onClick={()=>{onClose();onCreateSkill&&onCreateSkill();}} style={{padding:"9px 20px",borderRadius:8,border:"none",background:C.aurum,color:"#fff",fontSize:13,fontWeight:700,cursor:"pointer",fontFamily:"Arial,sans-serif"}}>+ Crea skill</button>
                </div>
              ):(
                draftSkills.filter(d=>d.stato!=="approvata").map(d=>{
                  const stColor=STATO_COLOR[d.stato]||C.gray;
                  const isEditing=editingId===d.id;
                  const ev=editVals;
                  const fld=(label,key,rows)=>(
                    <div style={{marginBottom:10}}>
                      <label style={{fontFamily:"Arial,sans-serif",fontSize:9,fontWeight:700,color:C.gray,letterSpacing:"0.1em",display:"block",marginBottom:4}}>{label}</label>
                      {rows?(
                        <textarea value={ev[key]||""} onChange={e=>setEditVals(p=>({...p,[key]:e.target.value}))} rows={rows}
                          style={{width:"100%",padding:"8px 10px",borderRadius:7,border:"1.5px solid #ddd",fontSize:12,fontFamily:"Arial,sans-serif",outline:"none",boxSizing:"border-box",resize:"vertical",lineHeight:1.5}}/>
                      ):(
                        <input value={ev[key]||""} onChange={e=>setEditVals(p=>({...p,[key]:e.target.value}))}
                          style={{width:"100%",padding:"8px 10px",borderRadius:7,border:"1.5px solid #ddd",fontSize:12,fontFamily:"Arial,sans-serif",outline:"none",boxSizing:"border-box"}}/>
                      )}
                    </div>
                  );
                  return(
                    <div key={d.id} style={{border:`1.5px solid ${isEditing?C.aurum:stColor+"33"}`,borderRadius:12,background:"#fff",padding:"16px",marginBottom:12,boxShadow:"0 1px 6px #0001",transition:"border-color .2s"}}>
                      {/* Header card */}
                      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:8}}>
                        <div>
                          <div style={{fontFamily:"Georgia,serif",fontSize:15,fontWeight:700,color:C.nox}}>{d.nome}</div>
                          <div style={{fontSize:11,color:stColor,fontFamily:"Arial,sans-serif",marginTop:3,fontWeight:700}}>{STATO_LABEL[d.stato]}{d.testato&&d.stato==="bozza"&&<span style={{color:C.viridis,marginLeft:8}}>✓ Testata</span>}</div>
                        </div>
                        <div style={{display:"flex",gap:6,alignItems:"center"}}>
                          <div style={{fontSize:10,color:"#aaa",fontFamily:"Arial,sans-serif",textAlign:"right"}}>{d.area}<br/>{d.data}</div>
                          {d.stato==="bozza"&&(
                            <button onClick={()=>isEditing?setEditingId(null):apriEdit(d)}
                              title={isEditing?"Chiudi editor":"Modifica i campi della skill"}
                              style={{padding:"4px 10px",borderRadius:6,border:`1px solid ${isEditing?C.aurum:"#ddd"}`,background:isEditing?"#FDF3E3":"#fafaf8",color:isEditing?C.aurum:"#888",fontSize:11,cursor:"pointer",fontFamily:"Arial,sans-serif",fontWeight:isEditing?700:400}}>
                              {isEditing?"✕ Chiudi":"✏️ Modifica"}
                            </button>
                          )}
                        </div>
                      </div>

                      {!isEditing&&(
                        <div style={{fontSize:12,color:"#666",fontFamily:"Arial,sans-serif",lineHeight:1.6,marginBottom:12}}>{truncate(d.descrizione,140)}</div>
                      )}

                      {/* Pannello editing inline */}
                      {isEditing&&(
                        <div style={{background:"#fdfcfa",borderRadius:10,padding:"14px",border:"1px solid #e8e4dc",marginBottom:12}}>
                          <div style={{fontSize:10,fontWeight:700,color:C.aurum,letterSpacing:"0.1em",fontFamily:"Arial,sans-serif",marginBottom:12}}>MODIFICA SKILL</div>
                          {fld("NOME",          "nome",     null)}
                          {fld("DESCRIZIONE",   "descrizione", 2)}
                          {fld("INPUT ATTESO",  "inputAtteso", 2)}
                          {fld("OUTPUT ATTESO", "outputAtteso",2)}
                          {fld("NORMATIVA",     "normativa",   1)}
                          <div style={{display:"flex",gap:8,marginTop:4}}>
                            <button onClick={()=>setEditingId(null)} style={{padding:"7px 14px",borderRadius:7,border:"1px solid #ddd",background:"#fff",fontSize:12,cursor:"pointer",fontFamily:"Arial,sans-serif",color:"#555"}}>Annulla</button>
                            <button onClick={()=>salvaEdit(d.id)} style={{flex:1,padding:"7px",borderRadius:7,border:"none",background:C.aurum,color:"#fff",fontSize:12,fontWeight:700,cursor:"pointer",fontFamily:"Arial,sans-serif"}}>✓ Salva modifiche</button>
                          </div>
                          <div style={{fontSize:10,color:"#bbb",fontFamily:"Arial,sans-serif",marginTop:8}}>💡 Dopo aver salvato le modifiche dovrai testare di nuovo la skill prima di inviarla.</div>
                        </div>
                      )}

                      {/* Barra azioni */}
                      <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
                        <button onClick={()=>{
                            setDraftSkills(prev=>prev.map(x=>x.id===d.id?{...x,testato:true}:x));
                            onTestSkill({
                              ...d,
                              sotto_area: d.sottoArea||d.area||"—",
                              input_atteso: d.input_atteso||d.inputAtteso||"Descrivi il tuo caso specifico",
                              output_atteso: d.output_atteso||d.outputAtteso||d.descrizione||"",
                              complessita: d.complessita||"media",
                              frequenza: d.frequenza||"occasionale",
                              tags: d.tags||[],
                            });
                          }}
                          style={{padding:"6px 14px",borderRadius:7,border:`1px solid ${C.caelum}`,background:"#fff",color:C.caelum,fontSize:12,fontWeight:700,cursor:"pointer",fontFamily:"Arial,sans-serif"}}>
                          ▶ Fai un test
                        </button>
                        {d.stato==="bozza"&&d.testato&&(
                          isAdmin
                            ?<button onClick={()=>setDraftSkills(prev=>prev.map(x=>x.id===d.id?{...x,stato:"approvata"}:x))}
                              style={{padding:"6px 14px",borderRadius:7,border:"none",background:C.viridis,color:"#fff",fontSize:12,fontWeight:700,cursor:"pointer",fontFamily:"Arial,sans-serif"}}>
                              ✓ Pubblica
                            </button>
                            :<button onClick={()=>inviaAllRedazione(d)}
                              style={{padding:"6px 14px",borderRadius:7,border:"none",background:C.aurum,color:"#fff",fontSize:12,fontWeight:700,cursor:"pointer",fontFamily:"Arial,sans-serif"}}>
                              📬 Manda in Redazione
                            </button>
                        )}
                        {d.stato==="bozza"&&!d.testato&&(
                          <span style={{fontSize:11,color:"#aaa",fontFamily:"Arial,sans-serif",alignSelf:"center",fontStyle:"italic"}}>← Testa prima di inviare</span>
                        )}
                        {d.stato==="bozza"&&(
                          <button onClick={()=>setDraftSkills(prev=>prev.filter(x=>x.id!==d.id))}
                            style={{marginLeft:"auto",padding:"6px 14px",borderRadius:7,border:"1px solid #fcc",background:"#fff",color:"#C0392B",fontSize:12,cursor:"pointer",fontFamily:"Arial,sans-serif"}}>
                            × Elimina
                          </button>
                        )}
                        {d.stato==="in_revisione"&&(
                          <div style={{fontSize:11,color:"#aaa",fontFamily:"Arial,sans-serif",alignSelf:"center",fontStyle:"italic"}}>⏳ In attesa di revisione dalla Redazione</div>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Sezione miglioramenti in corso */}
            {activeDashImprov?(
              <div style={{padding:"0 20px 20px"}}>
                {(()=>{
                  const improv=(improvements||[]).find(im=>im.id===activeDashImprov);
                  if(!improv)return null;
                  return <ImprovementDetailView improv={improv} setImprovements={setImprovements} profile={userProfile} onBack={()=>setActiveDashImprov(null)} ac={C.aurum}/>;
                })()}
              </div>
            ):(myImprovs.length>0||(isAdmin&&pendingMyApproval.length>0))&&(
              <div style={{padding:"0 20px 20px"}}>
                <div style={{borderTop:"1px solid #eee",paddingTop:20,marginTop:8}}>
                  <div style={{fontSize:11,fontWeight:700,color:C.gray,letterSpacing:"0.08em",fontFamily:"Arial,sans-serif",marginBottom:12}}>MIGLIORAMENTI WIDGET IN CORSO</div>
                  {/* Pending approvals for creator/admin */}
                  {isAdmin&&pendingMyApproval.length>0&&(
                    <div style={{marginBottom:12}}>
                      <div style={{fontSize:11,color:C.aurum,fontWeight:700,fontFamily:"Arial,sans-serif",marginBottom:6}}>⏳ In attesa della tua approvazione ({pendingMyApproval.length})</div>
                      {pendingMyApproval.map(im=>(
                        <div key={im.id} style={{background:"#fffbf0",borderRadius:10,padding:"10px 14px",border:"1.5px solid #e8a80066",marginBottom:8,display:"flex",alignItems:"center",gap:8,flexWrap:"wrap"}}>
                          <div style={{flex:1}}>
                            <div style={{fontFamily:"Arial,sans-serif",fontSize:13,fontWeight:700,color:C.nox}}>{im.titolo}</div>
                            <div style={{fontSize:11,color:"#888",fontFamily:"Arial,sans-serif"}}>su <strong>{im.skillNome}</strong> · da {im.contributorNome}</div>
                          </div>
                          <button onClick={()=>setActiveDashImprov(im.id)} style={{padding:"5px 12px",borderRadius:6,border:`1px solid ${C.aurum}`,background:"#fff",color:C.aurum,fontSize:11,fontWeight:700,cursor:"pointer",fontFamily:"Arial,sans-serif"}}>Esamina →</button>
                        </div>
                      ))}
                    </div>
                  )}
                  {/* My contributions */}
                  {myImprovs.map(im=>{
                    const st=IMPROV_STATI[im.stato]||IMPROV_STATI.bozza;
                    return(
                      <div key={im.id} style={{background:"#fafaf8",borderRadius:10,padding:"10px 14px",border:"1.5px solid #e8e4dc",marginBottom:8,display:"flex",alignItems:"center",gap:8,flexWrap:"wrap"}}>
                        <div style={{flex:1,minWidth:120}}>
                          <div style={{fontFamily:"Arial,sans-serif",fontSize:13,fontWeight:700,color:C.nox}}>{im.titolo}</div>
                          <div style={{fontSize:11,color:"#888",fontFamily:"Arial,sans-serif"}}>su <strong>{im.skillNome}</strong> · {im.createdAt}</div>
                        </div>
                        <span style={{fontSize:10,fontWeight:700,color:st.color,background:st.color+"15",padding:"3px 8px",borderRadius:8,fontFamily:"Arial,sans-serif",whiteSpace:"nowrap"}}>{st.label}</span>
                        <button onClick={()=>setActiveDashImprov(im.id)} style={{padding:"5px 12px",borderRadius:6,border:`1px solid ${C.caelum}`,background:"#fff",color:C.caelum,fontSize:11,fontWeight:700,cursor:"pointer",fontFamily:"Arial,sans-serif"}}>Dettagli →</button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}</>
          )}

          {/* TAB 2 — Messaggi */}
          {tab===2&&(
            <div>
              {!activeThread?(
                <>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
                    <div style={{fontFamily:"Arial,sans-serif",fontSize:13,color:C.gray}}>{threads.length} conversazioni</div>
                    <button onClick={()=>setNewMsg(true)} style={{padding:"7px 14px",borderRadius:8,border:"none",background:C.aurum,color:"#fff",fontSize:12,fontWeight:700,cursor:"pointer",fontFamily:"Arial,sans-serif"}}>+ Nuovo messaggio</button>
                  </div>

                  {newMsg&&(
                    <div style={{background:"#f9f8f5",borderRadius:10,padding:"16px",marginBottom:16,border:`1.5px solid ${C.aurum}`}}>
                      <div style={{fontFamily:"Arial,sans-serif",fontSize:11,fontWeight:700,color:C.gray,letterSpacing:"0.1em",marginBottom:8}}>NUOVO MESSAGGIO ALLA REDAZIONE</div>
                      <input value={newMsgOgg} onChange={e=>setNewMsgOgg(e.target.value)} placeholder="Oggetto…"
                        style={{width:"100%",padding:"8px 12px",borderRadius:7,border:"1.5px solid #ddd",fontSize:13,fontFamily:"Arial,sans-serif",outline:"none",boxSizing:"border-box",marginBottom:8}}/>
                      <textarea value={newMsgTesto} onChange={e=>setNewMsgTesto(e.target.value)} placeholder="Scrivi il tuo messaggio…" rows={3}
                        style={{width:"100%",padding:"8px 12px",borderRadius:7,border:"1.5px solid #ddd",fontSize:13,fontFamily:"Arial,sans-serif",outline:"none",boxSizing:"border-box",resize:"vertical"}}/>
                      <div style={{display:"flex",gap:8,marginTop:8,justifyContent:"flex-end"}}>
                        <button onClick={()=>{setNewMsg(false);setNewMsgOgg("");setNewMsgTesto("");}} style={{padding:"6px 14px",borderRadius:7,border:"1px solid #ddd",background:"#fff",color:"#555",fontSize:12,cursor:"pointer",fontFamily:"Arial,sans-serif"}}>Annulla</button>
                        <button onClick={nuovoThread} disabled={!newMsgOgg.trim()||!newMsgTesto.trim()} style={{padding:"6px 14px",borderRadius:7,border:"none",background:C.aurum,color:"#fff",fontSize:12,fontWeight:700,cursor:"pointer",fontFamily:"Arial,sans-serif"}}>Invia →</button>
                      </div>
                    </div>
                  )}

                  {threads.length===0&&!newMsg&&(
                    <div style={{textAlign:"center",padding:"40px 0"}}>
                      <div style={{fontSize:32,marginBottom:8}}>💬</div>
                      <div style={{fontFamily:"Georgia,serif",fontSize:15,color:C.nox,marginBottom:6}}>Nessun messaggio</div>
                      <div style={{fontSize:13,color:C.gray,fontFamily:"Arial,sans-serif"}}>Puoi scrivere alla Redazione o avviare una conversazione con un altro professionista.</div>
                    </div>
                  )}

                  {threads.map(t=>(
                    <div key={t.id} onClick={()=>{setActiveThread(t);setThreads(prev=>prev.map(x=>x.id===t.id?{...x,nonLetti:0}:x));}}
                      style={{display:"flex",alignItems:"center",gap:12,padding:"12px 14px",borderRadius:10,border:"1.5px solid #e8e4dc",background:"#fff",marginBottom:8,cursor:"pointer",boxShadow:"0 1px 4px #0001"}}>
                      <div style={{width:36,height:36,borderRadius:"50%",background:t.avatarColor||C.aurum,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                        <span style={{color:"#fff",fontSize:13,fontWeight:700}}>{t.avatar||"R"}</span>
                      </div>
                      <div style={{flex:1,minWidth:0}}>
                        <div style={{fontFamily:"Arial,sans-serif",fontSize:13,fontWeight:t.nonLetti>0?700:400,color:C.nox,marginBottom:2}}>{t.titolo}</div>
                        <div style={{fontSize:11,color:"#aaa",fontFamily:"Arial,sans-serif",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{t.messaggi[t.messaggi.length-1]?.testo||""}</div>
                      </div>
                      <div style={{textAlign:"right",flexShrink:0}}>
                        {t.nonLetti>0&&<div style={{background:C.aurum,color:"#fff",borderRadius:10,fontSize:10,padding:"1px 6px",fontWeight:700,marginBottom:3}}>{t.nonLetti}</div>}
                        <div style={{fontSize:10,color:"#ccc",fontFamily:"Arial,sans-serif"}}>{t.messaggi[t.messaggi.length-1]?.data||""}</div>
                      </div>
                    </div>
                  ))}
                </>
              ):(
                /* Thread detail */
                <div style={{display:"flex",flexDirection:"column",height:"100%"}}>
                  <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:16,paddingBottom:12,borderBottom:"1px solid #e8e4dc"}}>
                    <button onClick={()=>setActiveThread(null)} style={{background:"none",border:"none",fontSize:18,cursor:"pointer",color:"#888",padding:"0 4px"}}>←</button>
                    <div style={{width:32,height:32,borderRadius:"50%",background:activeThread.avatarColor||C.aurum,display:"flex",alignItems:"center",justifyContent:"center"}}>
                      <span style={{color:"#fff",fontSize:11,fontWeight:700}}>{activeThread.avatar||"R"}</span>
                    </div>
                    <div style={{fontFamily:"Arial,sans-serif",fontSize:14,fontWeight:700,color:C.nox}}>{activeThread.titolo}</div>
                  </div>

                  <div style={{flex:1,display:"flex",flexDirection:"column",gap:10,marginBottom:16,minHeight:0,overflowY:"auto",paddingRight:4}}>
                    {activeThread.messaggi.map(m=>{
                      const isMine=m.da!=="Redazione"&&m.da!=="Sistema";
                      return(
                        <div key={m.id} style={{display:"flex",justifyContent:isMine?"flex-end":"flex-start"}}>
                          <div style={{maxWidth:"75%",background:isMine?C.aurum+"22":"#f5f3ee",borderRadius:isMine?"12px 12px 4px 12px":"12px 12px 12px 4px",padding:"10px 14px",border:isMine?`1px solid ${C.aurum}44`:"1px solid #eee"}}>
                            {!isMine&&<div style={{fontSize:10,fontWeight:700,color:C.aurum,fontFamily:"Arial,sans-serif",marginBottom:3}}>{m.da}</div>}
                            <div style={{fontSize:13,fontFamily:"Arial,sans-serif",color:"#333",lineHeight:1.6}}>{m.testo}</div>
                            <div style={{fontSize:10,color:"#bbb",fontFamily:"Arial,sans-serif",marginTop:4,textAlign:"right"}}>{m.data}</div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <div style={{borderTop:"1px solid #e8e4dc",paddingTop:12,flexShrink:0}}>
                    <textarea value={msgTesto} onChange={e=>setMsgTesto(e.target.value)}
                      placeholder="Scrivi un messaggio…" rows={2}
                      style={{width:"100%",padding:"9px 12px",borderRadius:8,border:"1.5px solid #ddd",fontSize:13,fontFamily:"Arial,sans-serif",outline:"none",boxSizing:"border-box",resize:"none",marginBottom:8}}
                      onKeyDown={e=>{if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();inviaMsgThread(activeThread);}}}/>
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                      <span style={{fontSize:11,color:"#bbb",fontFamily:"Arial,sans-serif"}}>↵ Invio per mandare · Shift+↵ per andare a capo</span>
                      <button onClick={()=>inviaMsgThread(activeThread)} disabled={!msgTesto.trim()} style={{padding:"7px 18px",borderRadius:8,border:"none",background:msgTesto.trim()?C.aurum:"#eee",color:msgTesto.trim()?"#fff":"#aaa",fontSize:12,fontWeight:700,cursor:"pointer",fontFamily:"Arial,sans-serif"}}>Invia →</button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────
// CreateSkillWizard — wizard multi-step con AI
// ─────────────────────────────────────────────────────
const WIZARD_STEPS=["Idea","Agenti","Struttura","Revisione","Pubblica"];
const WIZARD_AGENTS=[
  {id:"fiscale",nome:"Esperto Fiscale",emoji:"⚖️",color:C.viridis,desc:"Verifica aderenza alla normativa tributaria e contabile"},
  {id:"legale",nome:"Consulente Legale",emoji:"📜",color:C.purpura,desc:"Controlla correttezza giuridica e riferimenti normativi"},
  {id:"cfo",nome:"CFO Fractional",emoji:"📊",color:C.caelum,desc:"Valuta applicabilità pratica e impatto su processi"},
  {id:"ux",nome:"Alex — UX Specialist",emoji:"✨",color:C.aurum,desc:"Ottimizza chiarezza, struttura dell'output, usabilità"},
];

// Suggerisce agenti in base alle keyword dell'idea
function suggerisciAgenti(idea){
  const t=idea.toLowerCase();
  const sugg=[];
  if(/fiscal|tribut|impost|iva|tass|reddito|irpef|ires|acconto|dichiaraz|f24|modello|unico|730/.test(t)) sugg.push("fiscale");
  if(/contratt|legal|giuridic|normativ|societar|statuto|assembl|socio|cda|srl|spa|deliber/.test(t)) sugg.push("legale");
  if(/bilancio|finanz|budget|cash|flusso|investiment|costo|ricavo|patrimoni|cfo|margine|ebitda|utile/.test(t)) sugg.push("cfo");
  sugg.push("ux"); // Alex sempre utile per la qualità dell'output
  return sugg.length>1?sugg:["fiscale","legale","cfo","ux"];
}

const WIZARD_DOC_MAX_FILES=5;
const WIZARD_DOC_MAX_FILE_MB=2;
const WIZARD_DOC_MAX_TOTAL_MB=5;
const WIZARD_DOC_MAX_CHARS=50000;

function CreateSkillWizard({onClose,userProfile,onSaveDraft}){
  const[step,setStep]=useState(0);
  const[idea,setIdea]=useState("");
  const[agenti,setAgenti]=useState(["fiscale","ux"]);
  const[area,setArea]=useState("Fiscale");
  const[nome,setNome]=useState("");
  const[descrizione,setDescrizione]=useState("");
  const[inputAtteso,setInputAtteso]=useState("");
  const[outputAtteso,setOutputAtteso]=useState("");
  const[normativa,setNormativa]=useState("");
  const[elaborating,setElaborating]=useState(false);
  const[elaborated,setElaborated]=useState(false);
  const[published,setPublished]=useState(false);
  // File context per la skill
  const[wizardDocs,setWizardDocs]=useState([]); // [{name,size,chars,content,loading,error}]
  const wizardFileRef=useRef();

  const areas=Object.keys(AREA_COLOR);

  async function elaboraConAI(){
    if(!idea.trim())return;
    const agentiAttivi=agenti.length===0?WIZARD_AGENTS.map(a=>a.id):agenti;
    if(agenti.length===0) setAgenti(agentiAttivi);
    setElaborating(true);
    const docsCtx=wizardDocs.filter(d=>d.content&&!d.error).map(d=>`[${d.name}]\n${d.content}`).join("\n\n---\n\n");
    const agentNomi=WIZARD_AGENTS.filter(a=>agentiAttivi.includes(a.id)).map(a=>a.nome).join(", ");
    const wizardSkill={
      id:"WIZARD-TEMP",
      nome:"Nuova Skill",
      area:"Fiscale",
      sotto_area:"",
      descrizione:idea,
      input_atteso:"",
      output_atteso:"",
      normativa:"",
      tags:[],
      docsContesto:docsCtx||"",
    };
    const wizardPrompt=`Sei un esperto di AI per studi di Dottori Commercialisti italiani. Team di revisione attivo: ${agentNomi}.

L'utente vuole creare una skill AI con questa idea:
"${idea}"
${docsCtx?`\n\nBase documentale allegata:\n${docsCtx.slice(0,8000)}`:""}

Genera i campi della skill in formato JSON. Rispondi SOLO con il JSON, senza markdown, senza commenti:
{
  "nome": "Nome conciso e professionale (max 6 parole)",
  "descrizione": "Descrizione completa della skill (2-3 frasi, tono professionale)",
  "input_atteso": "Cosa deve fornire l'utente per usare la skill",
  "output_atteso": "Cosa produce la skill in output",
  "normativa": "Riferimenti normativi italiani pertinenti (oppure stringa vuota se non applicabile)",
  "tags": ["tag1","tag2","tag3"]
}`;
    try{
      const raw=await callAI({
        skill:{...wizardSkill,prompt:wizardPrompt},
        userInput:"Genera la skill",
        attachments:[],
        profile:userProfile,
        _overridePrompt:wizardPrompt
      });
      // Prova a fare il parse del JSON dalla risposta
      const match=raw.match(/\{[\s\S]*\}/);
      if(match){
        const parsed=JSON.parse(match[0]);
        if(parsed.nome) setNome(parsed.nome);
        if(parsed.descrizione) setDescrizione(parsed.descrizione);
        if(parsed.input_atteso) setInputAtteso(parsed.input_atteso);
        if(parsed.output_atteso) setOutputAtteso(parsed.output_atteso);
        if(parsed.normativa) setNormativa(parsed.normativa);
      } else {
        // Fallback: usa l'output come descrizione
        setNome(idea.split(" ").slice(0,4).map(w=>w.charAt(0).toUpperCase()+w.slice(1)).join(" "));
        setDescrizione(raw.slice(0,300));
      }
    } catch(e){
      // Fallback silenzioso se l'AI non è disponibile
      setNome(idea.split(" ").slice(0,4).map(w=>w.charAt(0).toUpperCase()+w.slice(1)).join(" "));
      setDescrizione(`Skill che ${idea.toLowerCase()}.`);
      setInputAtteso("Dati identificativi del cliente o del caso specifico.");
      setOutputAtteso("Report strutturato con analisi e raccomandazioni operative.");
    }
    setElaborating(false);
    setElaborated(true);
    setStep(2);
  }

  async function aggiungiFile(files){
    const arr=Array.from(files);
    const totFiles=wizardDocs.length+arr.length;
    if(totFiles>WIZARD_DOC_MAX_FILES){alert(`Massimo ${WIZARD_DOC_MAX_FILES} file per skill.`);return;}
    const totMB=(wizardDocs.reduce((s,d)=>s+d.size,0)+arr.reduce((s,f)=>s+f.size,0))/(1024*1024);
    if(totMB>WIZARD_DOC_MAX_TOTAL_MB){alert(`Dimensione totale massima: ${WIZARD_DOC_MAX_TOTAL_MB} MB.`);return;}
    for(const file of arr){
      if(file.size>WIZARD_DOC_MAX_FILE_MB*1024*1024){alert(`"${file.name}" supera il limite di ${WIZARD_DOC_MAX_FILE_MB} MB per file.`);continue;}
      const uid="wdoc_"+Date.now()+"_"+Math.random().toString(36).slice(2);
      setWizardDocs(p=>[...p,{uid,name:file.name,size:file.size,chars:0,content:"",loading:true,error:""}]);
      try{
        const txt=await extractTextFromFile(file);
        if(!txt){setWizardDocs(p=>p.map(d=>d.uid===uid?{...d,loading:false,error:"Formato non supportato"}:d));continue;}
        const trunc=txt.slice(0,WIZARD_DOC_MAX_CHARS);
        setWizardDocs(p=>p.map(d=>d.uid===uid?{...d,loading:false,chars:trunc.length,content:trunc}:d));
      }catch(e){
        setWizardDocs(p=>p.map(d=>d.uid===uid?{...d,loading:false,error:e.message||"Errore estrazione"}:d));
      }
    }
  }

  function salvaNelleBoze(){
    const docsContesto=wizardDocs.filter(d=>d.content&&!d.error).map(d=>`[${d.name}]\n${d.content}`).join("\n\n---\n\n");
    const draft={
      id:"DRAFT-"+Date.now(),
      nome,area,descrizione,inputAtteso,outputAtteso,normativa,
      // mapping anche in snake_case per compatibilità con SkillModal
      input_atteso:inputAtteso||"Descrivi il tuo caso specifico",
      output_atteso:outputAtteso||descrizione||"",
      sotto_area:area,
      complessita:"media",frequenza:"occasionale",
      tags:[],sottoArea:area,stato:"bozza",testato:false,
      data:new Date().toLocaleDateString("it-IT"),
      agenti,
      docsContesto: docsContesto||"",
      docsNomi: wizardDocs.filter(d=>d.content&&!d.error).map(d=>d.name),
    };
    if(onSaveDraft)onSaveDraft(draft);
    setPublished(true);
    setTimeout(()=>onClose(),2800);
  }

  const stepStyle=(i)=>({
    width:24,height:24,display:"flex",alignItems:"center",justifyContent:"center",
    background:i<step?"#0A0B0F":i===step?"#0A0B0F":"transparent",
    border:i<=step?"none":"1.5px solid #D8D4CE",
    color:i<=step?"#F1EFE8":"#C8C4BE",fontSize:10,fontWeight:700,fontFamily:"Arial,sans-serif",flexShrink:0,
    letterSpacing:"0.04em",transition:"all .2s"
  });

  if(published){
    return(
      <div style={{position:"fixed",inset:0,background:"rgba(10,11,15,0.72)",zIndex:1100,display:"flex",alignItems:"center",justifyContent:"center",padding:"16px"}}>
        <div style={{background:"#FAF9F7",borderRadius:4,width:"100%",maxWidth:400,padding:"48px 32px",textAlign:"center",boxShadow:"0 2px 4px rgba(0,0,0,0.06), 0 20px 60px rgba(0,0,0,0.18)"}}>
          <div style={{fontSize:48,marginBottom:12}}>✓</div>
          <div style={{fontFamily:"Georgia,serif",fontSize:21,fontWeight:400,color:"#0A0B0F",marginBottom:8}}>Generata!</div>
          <div style={{fontSize:13,color:"#888",fontFamily:"Arial,sans-serif",marginBottom:12,lineHeight:1.6}}>La skill è nella tua Dashboard sotto <strong>In sviluppo</strong>.<br/>Testala, quindi inviala alla Redazione.</div>
          <div style={{background:"#F5F3EF",borderLeft:"2px solid #D8D4CE",padding:"12px 14px",fontSize:12,color:"#666",fontFamily:"Arial,sans-serif",lineHeight:1.6}}>
            Dashboard → In sviluppo → Testa → Invia Redazione
          </div>
        </div>
      </div>
    );
  }

  return(
    <div style={{position:"fixed",inset:0,background:"rgba(10,11,15,0.72)",zIndex:1000,display:"flex",alignItems:"flex-start",justifyContent:"center",padding:"16px",overflowY:"auto"}} onClick={onClose}>
      <div onClick={e=>e.stopPropagation()} style={{background:"#FAF9F7",borderRadius:4,width:"100%",maxWidth:600,boxShadow:"0 2px 4px rgba(0,0,0,0.06), 0 20px 60px rgba(0,0,0,0.18)",marginTop:16,marginBottom:16}}>
        {/* Header */}
        <div style={{background:"#FAF9F7",padding:"28px 32px 24px",borderBottom:"2px solid #0A0B0F",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <div>
            <div style={{fontSize:9,color:"#BA7517",fontWeight:700,letterSpacing:"0.2em",fontFamily:"Arial,sans-serif",marginBottom:8}}>CREA SKILL</div>
            <div style={{fontFamily:"Georgia,serif",fontSize:21,fontWeight:400,color:"#0A0B0F"}}>Step {step+1} / 4</div>
          </div>
          <button onClick={onClose} style={{background:"none",border:"none",color:"#aaa",fontSize:20,cursor:"pointer",transition:"color .2s"}}>×</button>
        </div>

        {/* Step indicators — Carta */}
        <div style={{padding:"14px 32px",background:"#FAF9F7",borderBottom:"1px solid #E8E4DC",display:"flex",alignItems:"center",gap:0}}>
          {WIZARD_STEPS.map((s,i)=>(
            <div key={s} style={{display:"flex",alignItems:"center",flex:i<WIZARD_STEPS.length-1?1:"auto"}}>
              <div style={{display:"flex",alignItems:"center",gap:8}}>
                <div style={stepStyle(i)}>{i<step?"✓":i+1}</div>
                <div style={{fontSize:9,fontWeight:700,letterSpacing:"0.12em",textTransform:"uppercase",fontFamily:"Arial,sans-serif",color:i===step?"#0A0B0F":i<step?"#888":"#C8C4BE",whiteSpace:"nowrap"}}>{s}</div>
              </div>
              {i<WIZARD_STEPS.length-1&&<div style={{flex:1,height:1,background:"#E8E4DC",margin:"0 10px"}}/>}
            </div>
          ))}
        </div>

        <div style={{padding:"28px 32px",background:"#FAF9F7"}}>
          {/* Step 0: Idea */}
          {step===0&&(
            <div>
              <div style={{fontFamily:"Arial,sans-serif",fontSize:13,color:C.gray,marginBottom:16,lineHeight:1.6}}>Descrivi in italiano cosa vuoi che faccia la skill. Più sei specifico, migliore sarà il risultato dell'AI.</div>
              <textarea value={idea} onChange={e=>setIdea(e.target.value)}
                placeholder="Es.: Analizza un contratto di locazione commerciale e verifica la conformità alle norme fiscali per il locatore, identificando le detrazioni applicabili e le scadenze di registrazione…"
                rows={6} style={{width:"100%",border:"1px solid #D8D4CE",padding:"14px",background:"#fff",color:"#0A0B0F",fontSize:13,fontFamily:"Arial",lineHeight:1.7,resize:"vertical",outline:"none",boxSizing:"border-box",transition:"border-color .2s"}}
                onFocus={e=>e.target.style.borderColor="#0A0B0F"}
                onBlur={e=>e.target.style.borderColor="#D8D4CE"}/>

              {/* Documenti di contesto */}
              <div style={{marginTop:14,background:"#F5F3EF",borderLeft:"2px solid #D8D4CE",borderRadius:0,padding:"12px 14px",border:"none"}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
                  <div>
                    <div style={{fontFamily:"Arial,sans-serif",fontSize:11,fontWeight:700,color:C.gray,letterSpacing:"0.08em"}}>📎 DOCUMENTI DI CONTESTO <span style={{fontWeight:400,color:"#aaa"}}>(opzionale)</span></div>
                    <div style={{fontSize:10,color:"#aaa",fontFamily:"Arial,sans-serif",marginTop:2}}>Carica fino a {WIZARD_DOC_MAX_FILES} file · max {WIZARD_DOC_MAX_FILE_MB} MB/file · {WIZARD_DOC_MAX_TOTAL_MB} MB totale · testo estratto usato dall'AI alla creazione e all'esecuzione</div>
                  </div>
                  {wizardDocs.length<WIZARD_DOC_MAX_FILES&&(
                    <button onClick={()=>wizardFileRef.current?.click()} style={{padding:"6px 12px",borderRadius:7,border:`1px solid ${C.caelum}`,background:"#fff",color:C.caelum,fontSize:11,fontWeight:700,cursor:"pointer",fontFamily:"Arial,sans-serif",flexShrink:0}}>+ Aggiungi</button>
                  )}
                </div>
                <input ref={wizardFileRef} type="file" multiple accept={FILE_ACCEPT} style={{display:"none"}} onChange={e=>{aggiungiFile(e.target.files);e.target.value="";}}/>
                {wizardDocs.length>0&&(
                  <div style={{display:"flex",flexDirection:"column",gap:6}}>
                    {wizardDocs.map(d=>(
                      <div key={d.uid} style={{display:"flex",alignItems:"center",gap:8,background:"#fff",borderRadius:7,padding:"7px 10px",border:"1px solid #e8e4dc"}}>
                        <span style={{fontSize:14,flexShrink:0}}>{d.loading?"⟳":d.error?"⚠️":"📄"}</span>
                        <div style={{flex:1,minWidth:0}}>
                          <div style={{fontFamily:"Arial,sans-serif",fontSize:12,fontWeight:600,color:C.nox,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{d.name}</div>
                          <div style={{fontSize:10,color:d.error?"#C0392B":d.loading?"#aaa":C.viridis,fontFamily:"Arial,sans-serif"}}>
                            {d.loading?"Estrazione in corso…":d.error?d.error:`${(d.size/1024).toFixed(0)} KB · ${d.chars.toLocaleString()} caratteri estratti${d.chars>=WIZARD_DOC_MAX_CHARS?" (troncato)":""}`}
                          </div>
                        </div>
                        <button onClick={()=>setWizardDocs(p=>p.filter(x=>x.uid!==d.uid))} style={{background:"none",border:"none",color:"#bbb",fontSize:16,cursor:"pointer",lineHeight:1,padding:"0 2px"}}>×</button>
                      </div>
                    ))}
                    <div style={{fontSize:10,color:"#aaa",fontFamily:"Arial,sans-serif",marginTop:2}}>
                      Totale: {(wizardDocs.reduce((s,d)=>s+d.size,0)/1024/1024).toFixed(2)} MB · {wizardDocs.reduce((s,d)=>s+(d.chars||0),0).toLocaleString()} caratteri
                    </div>
                  </div>
                )}
                {wizardDocs.length===0&&(
                  <div onClick={()=>wizardFileRef.current?.click()} style={{border:"1.5px dashed #ddd",borderRadius:8,padding:"14px",textAlign:"center",cursor:"pointer",background:"#fff"}}
                    onDragOver={e=>{e.preventDefault();}} onDrop={e=>{e.preventDefault();aggiungiFile(e.dataTransfer.files);}}>
                    <div style={{fontSize:11,color:"#bbb",fontFamily:"Arial,sans-serif"}}>Trascina qui o clicca per caricare · PDF, DOCX, XLSX, CSV, TXT, MD</div>
                  </div>
                )}
              </div>

              <div style={{marginTop:16,display:"flex",justifyContent:"space-between",alignItems:"center",borderTop:"1px solid #E8E4DC",paddingTop:16}}>
                <div style={{fontSize:10,color:"#aaa",fontFamily:"Arial,sans-serif",letterSpacing:"0.06em"}}>{idea.length} caratteri{idea.trim().length>0&&idea.trim().length<10&&<span style={{color:"#C0392B",marginLeft:8}}>minimo 10</span>}</div>
                <button onClick={()=>{setAgenti(suggerisciAgenti(idea));setStep(1);}} disabled={idea.trim().length<10}
                  style={{padding:"11px 24px",border:"none",background:idea.trim().length>=10?"#0A0B0F":"#E8E4DC",color:idea.trim().length>=10?"#F1EFE8":"#aaa",fontSize:11,fontWeight:700,cursor:idea.trim().length>=10?"pointer":"not-allowed",fontFamily:"Arial,sans-serif",letterSpacing:"0.12em",textTransform:"uppercase",transition:"background .2s"}}>
                  Avanti
                </button>
              </div>
            </div>
          )}

          {/* Step 1: Agenti */}
          {step===1&&(
            <div>
              <div style={{marginBottom:16}}>
                <div style={{fontFamily:"Georgia,serif",fontSize:15,fontWeight:400,color:"#0A0B0F",marginBottom:4}}>Team di revisione</div>
                <div style={{fontFamily:"Arial,sans-serif",fontSize:11,color:"#aaa",lineHeight:1.6}}>Ho selezionato gli agenti più adatti alla tua skill. Puoi modificare la selezione — se non selezioni nessuno verranno usati tutti.</div>
              </div>
              <div style={{display:"flex",flexDirection:"column",marginBottom:16}}>
                {WIZARD_AGENTS.map((ag)=>{
                  const sel=agenti.includes(ag.id);
                  return(
                  <div key={ag.id} onClick={()=>setAgenti(prev=>prev.includes(ag.id)?prev.filter(x=>x!==ag.id):[...prev,ag.id])}
                    style={{display:"flex",alignItems:"center",gap:16,padding:"14px 0",borderBottom:"1px solid #F0EDE8",cursor:"pointer",borderLeft:sel?"3px solid #0A0B0F":"3px solid transparent",paddingLeft:sel?12:0,transition:"all .15s"}}>
                    {/* Initials circle */}
                    <div style={{width:28,height:28,borderRadius:"50%",background:sel?"#0A0B0F":"#E8E4DC",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,transition:"background .15s"}}>
                      <span style={{color:sel?"#F1EFE8":"#aaa",fontSize:9,fontWeight:700,fontFamily:"Arial,sans-serif"}}>{ag.nome.replace("—","").trim().substring(0,2).toUpperCase()}</span>
                    </div>
                    <div style={{flex:1,minWidth:0}}>
                      <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:2}}>
                        <div style={{fontFamily:"Arial,sans-serif",fontSize:12,fontWeight:700,color:sel?"#0A0B0F":"#666",letterSpacing:"0.04em"}}>{ag.nome}</div>
                        {sel&&<span style={{fontSize:8,fontWeight:700,letterSpacing:"0.1em",textTransform:"uppercase",color:"#BA7517",fontFamily:"Arial,sans-serif"}}>Suggerito</span>}
                      </div>
                      <div style={{fontSize:11,color:"#aaa",fontFamily:"Arial,sans-serif",lineHeight:1.4}}>{ag.desc}</div>
                    </div>
                    <div style={{width:16,height:16,flexShrink:0,border:`1.5px solid ${sel?"#0A0B0F":"#D8D4CE"}`,background:sel?"#0A0B0F":"transparent",display:"flex",alignItems:"center",justifyContent:"center",transition:"all .15s"}}>
                      {sel&&<span style={{color:"#F1EFE8",fontSize:9,fontWeight:700,lineHeight:1}}>✓</span>}
                    </div>
                  </div>
                  );
                })}
              </div>
              {agenti.length===0&&(
                <div style={{background:"#F5F3EF",borderLeft:"2px solid #BA7517",padding:"10px 14px",marginBottom:16,fontFamily:"Arial,sans-serif",fontSize:11,color:"#888"}}>
                  Nessun agente selezionato — verranno usati tutti e quattro.
                </div>
              )}
              {agenti.length>0&&(
                <div style={{background:"#F5F3EF",borderLeft:"2px solid #D8D4CE",padding:"10px 14px",marginBottom:16,fontFamily:"Arial,sans-serif",fontSize:11,color:"#666"}}>
                  <span style={{fontWeight:700,letterSpacing:"0.1em",textTransform:"uppercase",fontSize:9,color:"#aaa",display:"block",marginBottom:3}}>Agenti attivi</span>
                  {WIZARD_AGENTS.filter(a=>agenti.includes(a.id)).map(a=>a.nome).join(" · ")}
                </div>
              )}
              <div style={{display:"flex",gap:10,borderTop:"1px solid #E8E4DC",paddingTop:16}}>
                <button onClick={()=>setStep(0)} style={{padding:"11px 20px",border:"1px solid #D8D4CE",background:"none",fontSize:11,cursor:"pointer",fontFamily:"Arial,sans-serif",color:"#666",fontWeight:700,letterSpacing:"0.1em",textTransform:"uppercase"}}>Indietro</button>
                <button onClick={elaboraConAI} disabled={elaborating}
                  style={{flex:1,padding:"11px 20px",border:"none",background:elaborating?"#E8E4DC":"#0A0B0F",color:elaborating?"#aaa":"#F1EFE8",fontSize:11,fontWeight:700,cursor:elaborating?"not-allowed":"pointer",fontFamily:"Arial,sans-serif",letterSpacing:"0.1em",textTransform:"uppercase",display:"flex",alignItems:"center",justifyContent:"center",gap:8,transition:"background .2s"}}>
                  {elaborating?<><span style={{display:"inline-block",animation:"spin 1s linear infinite",fontSize:14}}>⟳</span>Elaborazione in corso…</>:"Genera con AI"}
                </button>
              </div>
            </div>
          )}

          {/* Step 2: Struttura */}
          {step===2&&(
            <div style={{display:"flex",flexDirection:"column",gap:14}}>
              <div style={{fontFamily:"Arial,sans-serif",fontSize:13,color:C.gray,marginBottom:4,lineHeight:1.6}}>Rivedi e perfeziona i campi generati dall'AI.</div>
              <div>
                <label style={{fontFamily:"Arial,sans-serif",fontSize:10,fontWeight:700,color:C.gray,letterSpacing:"0.1em",display:"block",marginBottom:5}}>NOME SKILL</label>
                <input value={nome} onChange={e=>setNome(e.target.value)} style={{width:"100%",padding:"9px 12px",borderRadius:8,border:"1.5px solid #ddd",fontSize:13,fontFamily:"Arial,sans-serif",outline:"none",boxSizing:"border-box"}}/>
              </div>
              <div>
                <label style={{fontFamily:"Arial,sans-serif",fontSize:10,fontWeight:700,color:C.gray,letterSpacing:"0.1em",display:"block",marginBottom:5}}>AREA FUNZIONALE</label>
                <select value={area} onChange={e=>setArea(e.target.value)} style={{width:"100%",padding:"9px 12px",borderRadius:8,border:"1.5px solid #ddd",fontSize:13,fontFamily:"Arial,sans-serif",outline:"none",background:"#fff"}}>
                  {areas.map(a=><option key={a}>{a}</option>)}
                </select>
              </div>
              <div>
                <label style={{fontFamily:"Arial,sans-serif",fontSize:10,fontWeight:700,color:C.gray,letterSpacing:"0.1em",display:"block",marginBottom:5}}>DESCRIZIONE</label>
                <textarea value={descrizione} onChange={e=>setDescrizione(e.target.value)} rows={3} style={{width:"100%",padding:"9px 12px",borderRadius:8,border:"1.5px solid #ddd",fontSize:13,fontFamily:"Arial,sans-serif",outline:"none",boxSizing:"border-box",resize:"vertical"}}/>
              </div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
                <div>
                  <label style={{fontFamily:"Arial,sans-serif",fontSize:10,fontWeight:700,color:C.gray,letterSpacing:"0.1em",display:"block",marginBottom:5}}>INPUT ATTESO</label>
                  <textarea value={inputAtteso} onChange={e=>setInputAtteso(e.target.value)} rows={3} style={{width:"100%",padding:"9px 12px",borderRadius:8,border:"1.5px solid #ddd",fontSize:12,fontFamily:"Arial,sans-serif",outline:"none",boxSizing:"border-box",resize:"vertical"}}/>
                </div>
                <div>
                  <label style={{fontFamily:"Arial,sans-serif",fontSize:10,fontWeight:700,color:C.gray,letterSpacing:"0.1em",display:"block",marginBottom:5}}>OUTPUT ATTESO</label>
                  <textarea value={outputAtteso} onChange={e=>setOutputAtteso(e.target.value)} rows={3} style={{width:"100%",padding:"9px 12px",borderRadius:8,border:"1.5px solid #ddd",fontSize:12,fontFamily:"Arial,sans-serif",outline:"none",boxSizing:"border-box",resize:"vertical"}}/>
                </div>
              </div>
              <div>
                <label style={{fontFamily:"Arial,sans-serif",fontSize:10,fontWeight:700,color:C.gray,letterSpacing:"0.1em",display:"block",marginBottom:5}}>NORMATIVA DI RIFERIMENTO</label>
                <input value={normativa} onChange={e=>setNormativa(e.target.value)} style={{width:"100%",padding:"9px 12px",borderRadius:8,border:"1.5px solid #ddd",fontSize:13,fontFamily:"Arial,sans-serif",outline:"none",boxSizing:"border-box"}}/>
              </div>
              <div style={{display:"flex",gap:10}}>
                <button onClick={()=>setStep(1)} style={{padding:"9px 18px",borderRadius:8,border:"1px solid #ddd",background:"#fff",fontSize:13,cursor:"pointer",fontFamily:"Arial,sans-serif",color:"#555"}}>← Indietro</button>
                <button onClick={()=>setStep(3)} disabled={!nome.trim()} style={{flex:1,padding:"9px",borderRadius:8,border:"none",background:nome.trim()?C.aurum:"#eee",color:nome.trim()?"#fff":"#aaa",fontSize:13,fontWeight:700,cursor:"pointer",fontFamily:"Arial,sans-serif"}}>Avanti →</button>
              </div>
            </div>
          )}

          {/* Step 3: Revisione + Genera versione beta */}
          {step===3&&(
            <div>
              <div style={{fontFamily:"Arial,sans-serif",fontSize:13,color:C.gray,marginBottom:16}}>Controlla i dati. Dopo la generazione puoi testarla liberamente prima di inviarla alla Redazione.</div>
              {[
                {label:"NOME",val:nome},{label:"AREA",val:area},{label:"DESCRIZIONE",val:descrizione},
                {label:"INPUT ATTESO",val:inputAtteso},{label:"OUTPUT ATTESO",val:outputAtteso},{label:"NORMATIVA",val:normativa},
              ].map(({label,val})=>(
                <div key={label} style={{marginBottom:8,padding:"9px 14px",background:"#f9f8f5",borderRadius:8,borderLeft:`3px solid ${C.aurum}`}}>
                  <div style={{fontSize:9,fontWeight:700,color:C.gray,letterSpacing:"0.12em",fontFamily:"Arial,sans-serif",marginBottom:3}}>{label}</div>
                  <div style={{fontSize:13,color:C.nox,fontFamily:"Arial,sans-serif",lineHeight:1.5}}>{val||<span style={{color:"#ccc",fontStyle:"italic"}}>non specificato</span>}</div>
                </div>
              ))}
              <div style={{background:"#E3EEF9",borderRadius:10,padding:"12px 16px",margin:"14px 0",display:"flex",gap:10,alignItems:"flex-start"}}>
                <span style={{fontSize:18,flexShrink:0}}>🔧</span>
                <div style={{fontSize:12,color:"#378ADD",fontFamily:"Arial,sans-serif",lineHeight:1.6}}>
                  La skill verrà salvata nella tua area <strong>In sviluppo</strong> come <strong>versione beta</strong>.<br/>
                  Potrai testarla, modificarla e inviarla alla Redazione solo quando sei soddisfatto del risultato.
                </div>
              </div>
              <div style={{display:"flex",gap:10}}>
                <button onClick={()=>setStep(2)} style={{padding:"9px 18px",borderRadius:8,border:"1px solid #ddd",background:"#fff",fontSize:13,cursor:"pointer",fontFamily:"Arial,sans-serif",color:"#555"}}>← Modifica</button>
                <button onClick={salvaNelleBoze} style={{flex:1,padding:"11px 20px",border:"none",background:"#0A0B0F",color:"#F1EFE8",fontSize:11,fontWeight:700,cursor:"pointer",fontFamily:"Arial,sans-serif",letterSpacing:"0.1em",textTransform:"uppercase",transition:"background .2s"}} onMouseEnter={e=>e.currentTarget.style.background="#BA7517"} onMouseLeave={e=>e.currentTarget.style.background="#0A0B0F"}>Genera versione beta</button>
              </div>
            </div>
          )}
        </div>
      </div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}

// ─────────────────────────────────────────────────────
// AdminPanelModal — pannello di controllo Redazione
// ─────────────────────────────────────────────────────
function AdminPanelModal({onClose,hiddenSkills,setHiddenSkills,deletedSkills,setDraftSkills,draftSkills,improvements,setImprovements,userProfile}){
  const[tab,setTab]=useState("catalogo"); // "catalogo" | "revisione" | "miglioramenti"
  const[confirmDelete,setConfirmDelete]=useState(null);
  const[activeImprovId,setActiveImprovId]=useState(null);
  const[noteRif,setNoteRif]=useState("");
  const[rifId,setRifId]=useState(null);
  const hiddenList=SKILLS.filter(s=>hiddenSkills.includes(s.id));
  const inRevisione=(draftSkills||[]).filter(s=>s.stato==="in_revisione");
  const inRedazione=(improvements||[]).filter(im=>im.stato==="in_redazione");

  function approvaSkill(id){
    setDraftSkills(prev=>prev.map(s=>s.id===id?{...s,stato:"approvata"}:s));
  }
  function rifiutaSkill(id,note){
    setDraftSkills(prev=>prev.map(s=>s.id===id?{...s,stato:"bozza",noteRedazione:note||"Skill rifiutata. Rivedi e reinvia."}:s));
  }
  function ripristinaSkill(id){
    setHiddenSkills(prev=>prev.filter(x=>x!==id));
  }

  return(
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.75)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:9999,fontFamily:"Arial,sans-serif"}} onClick={onClose}>
      <div style={{background:"#16180F",color:C.lux,borderRadius:16,width:"min(720px,96vw)",maxHeight:"88vh",overflowY:"auto",padding:0,boxShadow:"0 20px 60px rgba(0,0,0,0.7)",border:`1px solid ${C.aurum}44`}} onClick={e=>e.stopPropagation()}>

        {/* Header */}
        <div style={{padding:"20px 28px 16px",borderBottom:`1px solid ${C.aurum}33`,display:"flex",alignItems:"center",justifyContent:"space-between"}}>
          <div>
            <div style={{fontFamily:"Georgia,serif",fontSize:20,fontWeight:700,color:C.aurum}}>✦ Pannello Redazione</div>
            <div style={{fontSize:12,color:"#888",marginTop:3}}>Gestione skill · solo per amministratori</div>
          </div>
          <button onClick={onClose} style={{background:"none",border:"none",color:"#888",fontSize:22,cursor:"pointer",lineHeight:1}}>✕</button>
        </div>

        {/* Stats strip */}
        <div style={{display:"flex",gap:0,borderBottom:`1px solid ${C.aurum}22`}}>
          {[
            {n:SKILLS.length,label:"Skill totali",color:C.aurum},
            {n:SKILLS.length-hiddenSkills.length-deletedSkills.length,label:"Visibili",color:C.viridis},
            {n:hiddenSkills.length,label:"Oscurate",color:"#e8a800"},
            {n:deletedSkills.length,label:"Eliminate",color:"#C0392B"},
            {n:inRevisione.length,label:"In revisione",color:C.caelum},
            {n:inRedazione.length,label:"Migliorie",color:C.purpura},
          ].map(({n,label,color})=>(
            <div key={label} style={{flex:1,padding:"14px 10px",textAlign:"center",borderRight:`1px solid ${C.aurum}22`}}>
              <div style={{fontSize:22,fontWeight:700,color,fontFamily:"Georgia,serif"}}>{n}</div>
              <div style={{fontSize:10,color:"#888",marginTop:2}}>{label}</div>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div style={{display:"flex",borderBottom:`1px solid ${C.aurum}22`,padding:"0 20px"}}>
          {[["catalogo","📋 Catalogo"],["revisione","🔍 Revisione skill"],["miglioramenti","⚡ Miglioramenti"]].map(([id,label])=>(
            <button key={id} onClick={()=>{setTab(id);setActiveImprovId(null);}} style={{padding:"12px 16px",background:"none",border:"none",borderBottom:tab===id?`2px solid ${C.aurum}`:"2px solid transparent",color:tab===id?C.aurum:"#888",fontSize:13,fontWeight:tab===id?700:400,cursor:"pointer",fontFamily:"Arial,sans-serif",marginBottom:-1}}>
              {label}
              {id==="revisione"&&inRevisione.length>0&&<span style={{marginLeft:6,background:C.caelum,color:"#fff",borderRadius:8,fontSize:9,padding:"1px 5px"}}>{inRevisione.length}</span>}
              {id==="miglioramenti"&&inRedazione.length>0&&<span style={{marginLeft:6,background:C.purpura,color:"#fff",borderRadius:8,fontSize:9,padding:"1px 5px"}}>{inRedazione.length}</span>}
            </button>
          ))}
        </div>

        <div style={{padding:"20px 28px"}}>

          {/* Tab: Catalogo - skill oscurate */}
          {tab==="catalogo"&&(
            <div>
              <div style={{fontSize:14,fontWeight:700,color:C.lux,marginBottom:16}}>Skill oscurate — nascoste dal catalogo pubblico</div>
              {hiddenList.length===0?(
                <div style={{textAlign:"center",padding:"40px 0",color:"#666",fontSize:13}}>
                  <div style={{fontSize:32,marginBottom:8}}>✓</div>
                  Nessuna skill oscurata al momento.
                </div>
              ):(
                <div style={{display:"flex",flexDirection:"column",gap:10}}>
                  {hiddenList.map(s=>(
                    <div key={s.id} style={{background:"#1e2015",borderRadius:10,padding:"14px 16px",display:"flex",alignItems:"center",gap:12,border:"1px solid #333"}}>
                      <div style={{flex:1}}>
                        <div style={{fontWeight:700,fontSize:14,color:C.lux}}>{s.nome}</div>
                        <div style={{fontSize:11,color:"#888",marginTop:2}}>{s.area} · {s.sotto_area}</div>
                      </div>
                      <button onClick={()=>ripristinaSkill(s.id)} style={{padding:"6px 14px",borderRadius:6,border:`1px solid ${C.viridis}`,background:"transparent",color:C.viridis,fontSize:12,fontWeight:700,cursor:"pointer"}}>↩ Ripristina</button>
                    </div>
                  ))}
                </div>
              )}

              {deletedSkills.length>0&&(
                <div style={{marginTop:28}}>
                  <div style={{fontSize:13,fontWeight:700,color:"#C0392B",marginBottom:12}}>Skill eliminate definitivamente ({deletedSkills.length})</div>
                  <div style={{display:"flex",flexDirection:"column",gap:6}}>
                    {SKILLS.filter(s=>deletedSkills.includes(s.id)).map(s=>(
                      <div key={s.id} style={{background:"#1e1212",borderRadius:8,padding:"10px 14px",display:"flex",alignItems:"center",gap:10,border:"1px solid #3d1515"}}>
                        <span style={{fontSize:18}}>🗑</span>
                        <div style={{flex:1}}>
                          <div style={{fontSize:13,color:"#c88",textDecoration:"line-through"}}>{s.nome}</div>
                          <div style={{fontSize:10,color:"#666"}}>{s.area} · eliminata definitivamente</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Tab: Revisione skill utenti */}
          {tab==="revisione"&&(
            <div>
              <div style={{fontSize:14,fontWeight:700,color:C.lux,marginBottom:16}}>Skill inviate dagli utenti per la pubblicazione</div>
              {inRevisione.length===0?(
                <div style={{textAlign:"center",padding:"40px 0",color:"#666",fontSize:13}}>
                  <div style={{fontSize:32,marginBottom:8}}>📭</div>
                  Nessuna skill in attesa di revisione.
                </div>
              ):(
                <div style={{display:"flex",flexDirection:"column",gap:14}}>
                  {inRevisione.map(s=>(
                    <div key={s.id} style={{background:"#1a1c14",borderRadius:12,border:"1px solid #2a3a2a",padding:"16px 18px"}}>
                      <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",marginBottom:8}}>
                        <div>
                          <div style={{fontWeight:700,fontSize:15,color:C.lux}}>{s.nome||s.titolo||"Skill senza nome"}</div>
                          <div style={{fontSize:11,color:"#888",marginTop:2}}>
                            Inviata da: <span style={{color:C.aurum}}>{s.autore||"Utente anonimo"}</span> · {s.data||"Data sconosciuta"}
                          </div>
                        </div>
                        <span style={{background:"#1a3040",color:C.caelum,borderRadius:6,fontSize:10,padding:"3px 8px",fontWeight:700}}>IN REVISIONE</span>
                      </div>
                      {s.descrizione&&<div style={{fontSize:12,color:"#aaa",marginBottom:12,lineHeight:1.5}}>{s.descrizione}</div>}
                      <div style={{display:"flex",gap:8,marginTop:12}}>
                        <button onClick={()=>approvaSkill(s.id)} style={{flex:1,padding:"8px",borderRadius:8,border:"none",background:C.viridis,color:"#fff",fontSize:13,fontWeight:700,cursor:"pointer"}}>✓ Approva e pubblica</button>
                        <button onClick={()=>rifiutaSkill(s.id,"Richiesta revisione: aggiungi maggiore dettaglio alle istruzioni.")} style={{flex:1,padding:"8px",borderRadius:8,border:`1px solid #C0392B`,background:"transparent",color:"#C0392B",fontSize:13,fontWeight:700,cursor:"pointer"}}>✕ Rimanda in bozza</button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Tab: Miglioramenti in Redazione */}
          {tab==="miglioramenti"&&(
            <div>
              {activeImprovId?(
                <div>
                  {(()=>{
                    const improv=(improvements||[]).find(im=>im.id===activeImprovId);
                    if(!improv)return null;
                    const cf=improv.campiAggiornati||{};
                    return(
                      <div>
                        <button onClick={()=>{setActiveImprovId(null);setRifId(null);setNoteRif("");}} style={{background:"none",border:"none",color:C.aurum,fontSize:12,fontWeight:700,cursor:"pointer",fontFamily:"Arial,sans-serif",marginBottom:14,padding:0}}>← Torna alla lista</button>
                        <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:14}}>
                          <div style={{flex:1}}>
                            <div style={{fontFamily:"Georgia,serif",fontSize:16,fontWeight:700,color:C.lux}}>{improv.titolo}</div>
                            <div style={{fontSize:11,color:"#888",fontFamily:"Arial,sans-serif",marginTop:2}}>da {improv.contributorNome} · su <strong style={{color:C.aurum}}>{improv.skillNome}</strong> · {improv.createdAt}</div>
                          </div>
                        </div>
                        <div style={{background:"#1a1c14",borderRadius:10,padding:"12px 14px",marginBottom:12,border:"1px solid #333"}}>
                          <div style={{fontSize:10,fontWeight:700,color:"#888",fontFamily:"Arial,sans-serif",marginBottom:6}}>DESCRIZIONE</div>
                          <div style={{fontSize:13,color:"#ccc",fontFamily:"Arial,sans-serif",lineHeight:1.6}}>{improv.descrizione}</div>
                          {improv.cambiamenti&&<><div style={{fontSize:10,fontWeight:700,color:"#888",fontFamily:"Arial,sans-serif",marginTop:10,marginBottom:4}}>CAMBIAMENTI</div><div style={{fontSize:13,color:"#ccc",fontFamily:"Arial,sans-serif",lineHeight:1.6}}>{improv.cambiamenti}</div></>}
                        </div>
                        {cf.nome&&(
                          <div style={{background:"#0e1f14",borderRadius:10,border:`1px solid ${C.viridis}44`,padding:"12px 14px",marginBottom:14}}>
                            <div style={{fontSize:10,fontWeight:700,color:C.viridis,fontFamily:"Arial,sans-serif",marginBottom:8}}>⚡ VERSIONE BETA PROPOSTA</div>
                            {[["Nome",cf.nome],["Descrizione",cf.descrizione],["Input atteso",cf.input_atteso],["Output atteso",cf.output_atteso],["Normativa",cf.normativa]].map(([k,v])=>v&&(
                              <div key={k} style={{marginBottom:6}}><span style={{fontSize:10,fontWeight:700,color:"#666",fontFamily:"Arial,sans-serif"}}>{k.toUpperCase()}: </span><span style={{fontSize:12.5,color:"#bbb",fontFamily:"Arial,sans-serif",lineHeight:1.5}}>{v}</span></div>
                            ))}
                          </div>
                        )}
                        {/* Chat */}
                        <div style={{fontSize:11,fontWeight:700,color:"#888",letterSpacing:"0.08em",fontFamily:"Arial,sans-serif",marginBottom:8}}>CHAT CONTRIBUTOR ↔ CREATORE</div>
                        <div style={{background:"#111",borderRadius:10,padding:"12px",marginBottom:14,maxHeight:200,overflowY:"auto"}}>
                          {(improv.chat||[]).length===0?<div style={{color:"#555",fontSize:12,fontFamily:"Arial,sans-serif",textAlign:"center",padding:"16px 0"}}>Nessun messaggio.</div>
                            :(improv.chat||[]).map(m=>(
                              <div key={m.id} style={{marginBottom:8}}>
                                <span style={{fontSize:10,fontWeight:700,color:C.aurum,fontFamily:"Arial,sans-serif"}}>{m.da} · {m.data}</span>
                                <div style={{fontSize:12,color:"#bbb",fontFamily:"Arial,sans-serif",lineHeight:1.5,marginTop:2}}>{m.testo}</div>
                              </div>
                            ))
                          }
                        </div>
                        {/* Approvazione Redazione */}
                        {rifId===improv.id?(
                          <div>
                            <textarea value={noteRif} onChange={e=>setNoteRif(e.target.value)} placeholder="Motivo del rifiuto (opzionale)…" rows={2} style={{width:"100%",padding:"8px",borderRadius:7,border:"1px solid #444",background:"#1a1a1a",color:"#ccc",fontSize:12,fontFamily:"Arial,sans-serif",boxSizing:"border-box",marginBottom:8}}/>
                            <div style={{display:"flex",gap:8}}>
                              <button onClick={()=>{setImprovements(prev=>prev.map(im=>im.id===improv.id?{...im,stato:"rifiutata_redazione",noteRedazione:noteRif||"Miglioramento non approvato dalla Redazione."}:im));setActiveImprovId(null);setRifId(null);setNoteRif("");}} style={{flex:1,padding:"8px",borderRadius:7,border:"none",background:"#C0392B",color:"#fff",fontSize:12,fontWeight:700,cursor:"pointer",fontFamily:"Arial,sans-serif"}}>Conferma rifiuto</button>
                              <button onClick={()=>setRifId(null)} style={{padding:"8px 14px",borderRadius:7,border:"1px solid #444",background:"transparent",color:"#888",fontSize:12,cursor:"pointer",fontFamily:"Arial,sans-serif"}}>Annulla</button>
                            </div>
                          </div>
                        ):(
                          <div style={{display:"flex",gap:8}}>
                            <button onClick={()=>{setImprovements(prev=>prev.map(im=>im.id===improv.id?{...im,stato:"approvata"}:im));setActiveImprovId(null);}} style={{flex:1,padding:"10px",borderRadius:8,border:"none",background:C.viridis,color:"#fff",fontSize:13,fontWeight:700,cursor:"pointer",fontFamily:"Arial,sans-serif"}}>✓ Approva e pubblica miglioramento</button>
                            <button onClick={()=>setRifId(improv.id)} style={{padding:"10px 18px",borderRadius:8,border:`1px solid #C0392B`,background:"transparent",color:"#C0392B",fontSize:13,fontWeight:700,cursor:"pointer",fontFamily:"Arial,sans-serif"}}>✕ Rifiuta</button>
                          </div>
                        )}
                      </div>
                    );
                  })()}
                </div>
              ):inRedazione.length===0?(
                <div style={{textAlign:"center",padding:"40px 0",color:"#666",fontSize:13}}>
                  <div style={{fontSize:32,marginBottom:8}}>⚡</div>
                  Nessun miglioramento in attesa di approvazione finale.
                </div>
              ):(
                <div>
                  <div style={{fontSize:14,fontWeight:700,color:C.lux,marginBottom:16}}>Miglioramenti approvati dal creatore — in attesa della Redazione</div>
                  <div style={{display:"flex",flexDirection:"column",gap:10}}>
                    {inRedazione.map(im=>(
                      <div key={im.id} style={{background:"#1a1c14",borderRadius:12,border:`1px solid ${C.purpura}44`,padding:"14px 16px",display:"flex",alignItems:"center",gap:10}}>
                        <div style={{flex:1}}>
                          <div style={{fontWeight:700,fontSize:14,color:C.lux}}>{im.titolo}</div>
                          <div style={{fontSize:11,color:"#888",marginTop:2}}>su <span style={{color:C.aurum}}>{im.skillNome}</span> · da {im.contributorNome} · {im.createdAt}</div>
                        </div>
                        <span style={{fontSize:10,fontWeight:700,color:C.purpura,background:C.purpura+"22",padding:"3px 8px",borderRadius:8,fontFamily:"Arial,sans-serif"}}>IN REDAZIONE</span>
                        <button onClick={()=>setActiveImprovId(im.id)} style={{padding:"6px 14px",borderRadius:6,border:`1px solid ${C.aurum}`,background:"transparent",color:C.aurum,fontSize:11,fontWeight:700,cursor:"pointer",fontFamily:"Arial,sans-serif"}}>Esamina →</button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────
// localStorage helpers
// ─────────────────────────────────────────────────────
function ls(key,fallback){
  if(typeof window==="undefined")return fallback;
  try{const v=localStorage.getItem(key);return v!==null?JSON.parse(v):fallback;}
  catch{return fallback;}
}
function lsSet(key,val){
  if(typeof window==="undefined")return;
  try{localStorage.setItem(key,JSON.stringify(val));}catch{}
}

export default function App(){
  const _todayLabel=(()=>{const d=new Date();return d.toLocaleDateString("it-IT",{day:"numeric",month:"short",year:"numeric"});})();
  const DEFAULT_THREADS=[
    {id:1,titolo:"Benvenuto in xNunc",con:"Redazione",avatar:"R",avatarColor:C.aurum,
     messaggi:[{id:1,da:"Redazione",testo:"Benvenuto nella piattaforma! Siamo qui per supportarti nella creazione e revisione delle skill. Quando sei pronto a inviare una skill per la pubblicazione, usala pure o scrivici direttamente qui.",data:_todayLabel,letto:true}],
     nonLetti:0}
  ];
  const DEFAULT_PROFILE={nome:"",cognome:"",studio:"",ruolo:"",email:"",cell:"",citta:"",albo:"",web:"",byokKey:"",keyMode:"xnunc",aiProvider:"anthropic"};

  const[isLogged,setIsLogged]=useState(()=>ls("xnunc_session",{isLogged:false,isAdmin:false}).isLogged);
  const[supabaseUser,setSupabaseUser]=useState(null);

  // ── Supabase session init ───────────────────────────
  useEffect(()=>{
    // Check existing session on mount
    supabase.auth.getSession().then(({data:{session}})=>{
      if(session?.user){
        const u=session.user;
        setSupabaseUser(u);
        setIsLogged(true);
        const isAdm=u.email==="morales@bcand.it";
        setIsAdmin(isAdm);
        setLoginEmail(u.email);
        // Carica profilo da DB
        getProfile(u.id).then(p=>{
          if(p) setUserProfile(prev=>({...prev,...p,email:p.email||u.email}));
        }).catch(()=>{});
      }
    });
    // Ascolta cambi di sessione (login/logout)
    const{data:{subscription}}=supabase.auth.onAuthStateChange((_event,session)=>{
      if(session?.user){
        const u=session.user;
        setSupabaseUser(u);
        setIsLogged(true);
        const isAdm=u.email==="morales@bcand.it";
        setIsAdmin(isAdm);
        setLoginEmail(u.email);
      } else {
        setSupabaseUser(null);
        setIsLogged(false);
        setIsAdmin(false);
        setLoginEmail("");
      }
    });
    return()=>subscription.unsubscribe();
  },[]);
  // CSS globale per hover effects (inline style non supporta :hover)
  if(typeof document!=="undefined"){
    const id="xnunc-styles";
    if(!document.getElementById(id)){
      const s=document.createElement("style");
      s.id=id;
      s.textContent=`.xnunc-card{transition:background .15s,border-left-width .15s;}.xnunc-card:hover{background:#F5F2EE!important;border-left-width:5px!important;}`;
      document.head.appendChild(s);
    }
  }
  const[showLogin,setShowLogin]=useState(false);
  const[showFAQ,setShowFAQ]=useState(false);
  const[showProfile,setShowProfile]=useState(false);
  const[showCreateSkill,setShowCreateSkill]=useState(false);
  const[showManifesto,setShowManifesto]=useState(false);
  const[showClassifica,setShowClassifica]=useState(false);
  const[showDashboard,setShowDashboard]=useState(false);
  const[search,setSearch]=useState("");
  const[filterArea,setFilterArea]=useState("Tutte");
  const[filterComp,setFilterComp]=useState("Tutte");
  const[filterFreq,setFilterFreq]=useState("Tutte");
  const[activeSkill,setActiveSkill]=useState(null);
  const[favorites,setFavorites]=useState(()=>ls("xnunc_favorites",[]));
  const[draftSkills,setDraftSkills]=useState(()=>ls("xnunc_drafts",[]));
  const[threads,setThreads]=useState(()=>ls("xnunc_threads",DEFAULT_THREADS));
  const[userProfile,setUserProfile]=useState(()=>({...DEFAULT_PROFILE,...ls("xnunc_profile",{})}));
  const nonLettiTot=threads.reduce((n,t)=>n+(t.nonLetti||0),0);
  const[isAdmin,setIsAdmin]=useState(()=>ls("xnunc_session",{isLogged:false,isAdmin:false}).isAdmin);
  const[hiddenSkills,setHiddenSkills]=useState(()=>ls("xnunc_hidden",[])); // IDs oscurati (nascosti ma recuperabili)
  const[deletedSkills,setDeletedSkills]=useState(()=>ls("xnunc_deleted",[])); // IDs eliminati definitivamente
  const[showAdminPanel,setShowAdminPanel]=useState(false);

  // ── Persist state to localStorage ──────────────────
  useEffect(()=>{lsSet("xnunc_session",{isLogged,isAdmin});},[isLogged,isAdmin]);
  useEffect(()=>{lsSet("xnunc_profile",userProfile);},[userProfile]);
  useEffect(()=>{lsSet("xnunc_favorites",favorites);},[favorites]);
  useEffect(()=>{lsSet("xnunc_drafts",draftSkills);},[draftSkills]);
  useEffect(()=>{lsSet("xnunc_threads",threads);},[threads]);
  useEffect(()=>{lsSet("xnunc_hidden",hiddenSkills);},[hiddenSkills]);
  useEffect(()=>{lsSet("xnunc_deleted",deletedSkills);},[deletedSkills]);
  const[improvements,setImprovements]=useState(()=>ls("xnunc_improvements",[]));
  useEffect(()=>{lsSet("xnunc_improvements",improvements);},[improvements]);
  // loginEmail persiste per avatar fallback anche dopo refresh
  const[loginEmail,setLoginEmail]=useState(()=>ls("xnunc_loginemail",""));
  useEffect(()=>{lsSet("xnunc_loginemail",loginEmail);},[loginEmail]);
  // logout confirm
  const[showLogoutConfirm,setShowLogoutConfirm]=useState(false);

  const ADMIN_EMAIL_CHECK="morales@bcand.it";

  // ── Punti dinamici ─────────────────────────────────
  const userPoints=useMemo(()=>{
    const email=userProfile.email;
    let pts=0;
    // +10 per ogni skill pubblicata
    pts+=draftSkills.filter(d=>d.stato==="approvata"&&d.autoreEmail===email).length*10;
    // +5 per ogni miglioramento approvato
    pts+=(improvements||[]).filter(im=>im.contributorEmail===email&&im.stato==="approvata").length*5;
    // +2 per ogni messaggio nei thread (messaggi inviati dall'utente)
    threads.forEach(t=>t.messaggi?.forEach(m=>{if(m.da!=="Redazione"&&m.daEmail===email)pts+=2;}));
    return pts;
  },[userProfile.email,draftSkills,improvements,threads]);

  // ── Logout ─────────────────────────────────────────
  async function handleLogout(){
    try{ await signOut(); }catch(_){}
    setIsLogged(false);setIsAdmin(false);setSupabaseUser(null);
    setLoginEmail("");
    setShowProfile(false);setShowDashboard(false);setShowLogoutConfirm(false);
  }

  // ── Elimina account ────────────────────────────────
  function handleDeleteAccount(){
    const KEYS=["xnunc_session","xnunc_profile","xnunc_favorites","xnunc_drafts","xnunc_threads","xnunc_hidden","xnunc_deleted","xnunc_improvements","xnunc_loginemail"];
    KEYS.forEach(k=>{try{localStorage.removeItem(k);}catch(_){}});
    setIsLogged(false);setIsAdmin(false);setLoginEmail("");
    setUserProfile(DEFAULT_PROFILE);
    setFavorites([]);setDraftSkills([]);setThreads(DEFAULT_THREADS);
    setHiddenSkills([]);setDeletedSkills([]);setImprovements([]);
    setShowProfile(false);setShowDashboard(false);
  }

  // ── Esporta dati ───────────────────────────────────
  function handleExportData(){
    const data={
      esportato:new Date().toISOString(),
      profilo:userProfile,
      skillInBozza:draftSkills,
      preferiti:favorites,
      miglioramenti:improvements,
    };
    const blob=new Blob([JSON.stringify(data,null,2)],{type:"application/json"});
    const url=URL.createObjectURL(blob);
    const a=document.createElement("a");
    a.href=url;a.download=`xnunc_dati_${new Date().toISOString().slice(0,10)}.json`;
    document.body.appendChild(a);a.click();
    document.body.removeChild(a);URL.revokeObjectURL(url);
  }

  const areas=useMemo(()=>["Tutte",...Array.from(new Set(SKILLS.map(s=>s.area)))]);//eslint-disable-line
  // Admin vede tutto tranne le eliminate; utenti vedono solo le non-oscurate e non-eliminate
  const visibleSkills=useMemo(()=>SKILLS.filter(s=>isAdmin
    ?!deletedSkills.includes(s.id)
    :!hiddenSkills.includes(s.id)&&!deletedSkills.includes(s.id)
  ),[hiddenSkills,deletedSkills,isAdmin]);
  const filtered=useMemo(()=>visibleSkills.filter(s=>(filterArea==="Tutte"||s.area===filterArea)&&(filterComp==="Tutte"||s.complessita===filterComp)&&(filterFreq==="Tutte"||s.frequenza===filterFreq)&&matchSearch(s,search)),[visibleSkills,search,filterArea,filterComp,filterFreq]);

  return(
    <div style={{minHeight:"100vh",background:C.lux}}>

      {/* Navbar */}
      <div style={{background:C.nox,borderBottom:`2px solid ${C.aurum}`,position:"sticky",top:0,zIndex:500}}>
        <div style={{maxWidth:1100,margin:"0 auto",padding:"0 16px",height:52,display:"flex",alignItems:"center",justifyContent:"space-between"}}>
          <div style={{display:"flex",alignItems:"center",gap:20}}>
            <span onClick={()=>{setSearch("");setFilterArea("Tutte");setFilterComp("Tutte");setFilterFreq("Tutte");}} style={{fontFamily:"Georgia,serif",fontSize:21,fontWeight:700,cursor:"pointer"}}><span style={{color:C.aurum}}>x</span><span style={{color:"#fff"}}>Nunc</span></span>
            <span onClick={()=>document.getElementById("catalogo-section")?.scrollIntoView({behavior:"smooth"})} style={{color:"#888",fontSize:13,cursor:"pointer",fontFamily:"Arial,sans-serif",transition:"color .2s"}} onMouseEnter={e=>e.target.style.color="#fff"} onMouseLeave={e=>e.target.style.color="#888"}>Catalogo</span>
            <span onClick={()=>setShowClassifica(true)} style={{color:"#888",fontSize:13,cursor:"pointer",fontFamily:"Arial,sans-serif",transition:"color .2s"}} onMouseEnter={e=>e.target.style.color="#fff"} onMouseLeave={e=>e.target.style.color="#888"}>Classifica</span>
            <span onClick={()=>setShowManifesto(true)} style={{color:"#888",fontSize:13,cursor:"pointer",fontFamily:"Arial,sans-serif",transition:"color .2s"}} onMouseEnter={e=>e.target.style.color="#fff"} onMouseLeave={e=>e.target.style.color="#888"}>Manifesto</span>
            <span onClick={()=>setShowFAQ(true)} style={{color:C.aurum,fontSize:13,cursor:"pointer",fontFamily:"Arial,sans-serif",fontWeight:700}}>FAQ</span>
          </div>
          <div style={{display:"flex",gap:8,alignItems:"center"}}>
            {isLogged?(
              <div style={{display:"flex",alignItems:"center",gap:10}}>
                {isAdmin&&(
                  <button onClick={()=>setShowAdminPanel(true)}
                    title="Pannello Redazione — gestisci skill"
                    style={{padding:"5px 12px",borderRadius:6,border:"1px solid #e8a800",background:"#fffbee",color:"#b8860b",fontSize:11,fontWeight:700,cursor:"pointer",fontFamily:"Arial,sans-serif",display:"flex",alignItems:"center",gap:4}}>
                    ✦ Redazione {hiddenSkills.length>0&&<span style={{background:"#e8a800",color:"#fff",borderRadius:8,fontSize:9,padding:"0 5px"}}>{hiddenSkills.length} oscurate</span>}
                  </button>
                )}
                {!isAdmin&&<button onClick={()=>setShowCreateSkill(true)} style={{padding:"5px 12px",borderRadius:6,border:`1px solid ${C.aurum}`,background:"transparent",color:C.aurum,fontSize:11,fontWeight:700,cursor:"pointer",fontFamily:"Arial,sans-serif"}}>+ Crea skill</button>}
                <div onClick={()=>setShowDashboard(true)} title="La tua dashboard" style={{position:"relative",width:32,height:32,borderRadius:"50%",background:isAdmin?"#b8860b":C.aurum,display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",boxShadow:"0 2px 8px #BA751744"}}>
                  <span style={{color:"#fff",fontSize:13,fontWeight:700}}>{(userProfile.nome||userProfile.email||loginEmail||"?")[0].toUpperCase()}</span>
                  {nonLettiTot>0&&<div style={{position:"absolute",top:-4,right:-4,background:"#C0392B",color:"#fff",borderRadius:"50%",width:16,height:16,display:"flex",alignItems:"center",justifyContent:"center",fontSize:9,fontWeight:700}}>{nonLettiTot}</div>}
                </div>
                {/* Logout con conferma */}
                <button onClick={()=>setShowLogoutConfirm(true)} title="Esci dall'account"
                  style={{background:"#1a1a1a",border:"1px solid #C0392B",color:"#C0392B",borderRadius:6,padding:"5px 10px",fontSize:13,cursor:"pointer",fontFamily:"Arial,sans-serif",lineHeight:1,fontWeight:700,transition:"all .2s"}}
                  onMouseEnter={e=>{e.currentTarget.style.background="#C0392B";e.currentTarget.style.color="#fff";}}
                  onMouseLeave={e=>{e.currentTarget.style.background="#1a1a1a";e.currentTarget.style.color="#C0392B";}}>⎋</button>
              </div>
            ):(
              <>
                <button onClick={()=>setShowLogin(true)} style={{background:"none",border:"1px solid #555",color:"#aaa",borderRadius:6,padding:"5px 14px",fontSize:12,cursor:"pointer",fontFamily:"Arial,sans-serif"}}>Accedi</button>
                <button onClick={()=>setShowLogin(true)} style={{background:C.aurum,border:"none",color:"#fff",borderRadius:6,padding:"6px 14px",fontSize:12,fontWeight:700,cursor:"pointer",fontFamily:"Arial,sans-serif"}}>Registrati gratis</button>
              </>
            )}
          </div>
        </div>
      </div>

      <div style={{maxWidth:1100,margin:"0 auto",padding:"24px 16px"}}>

        {/* Hero */}
        {!isLogged&&(
          <div style={{background:C.nox,borderRadius:14,padding:"28px 36px",marginBottom:24,border:"1px solid #1a1c24"}}>
            <div style={{fontFamily:"Georgia,serif",fontSize:28,fontWeight:700,color:"#fff",marginBottom:10,lineHeight:1.3}}>Da adesso, lavori diversamente.</div>
            <div style={{fontFamily:"Georgia,serif",fontSize:17,fontWeight:400,color:C.aurum,marginBottom:6,fontStyle:"italic",letterSpacing:"0.01em"}}>Utilizza. Collabora. Crea.</div>
            <div style={{fontSize:14,color:"#aaa",fontFamily:"Arial,sans-serif",marginBottom:20,lineHeight:1.6}}>
              Skill che lavorano. Professionisti che crescono.<br/>
              <span style={{color:"#999",fontSize:12}}>Open source · I tuoi dati non escono mai · Funziona su qualsiasi AI.</span>
            </div>
            <div style={{display:"flex",gap:12,flexWrap:"wrap",alignItems:"center"}}>
              <button onClick={()=>setShowLogin(true)} style={{background:C.aurum,border:"none",color:"#fff",borderRadius:8,padding:"10px 22px",fontSize:13,fontWeight:700,cursor:"pointer",fontFamily:"Arial,sans-serif"}}>Accedi gratis</button>
              <div style={{display:"flex",gap:6,alignItems:"center"}}>
                {PLATFORMS.map(p=><span key={p.id} title={p.label}>{PLATFORM_LOGOS[p.id]}</span>)}
                <span style={{fontSize:12,color:"#555",fontFamily:"Arial,sans-serif",marginLeft:4}}>Esporta su qualsiasi AI</span>
              </div>
              <button onClick={()=>setShowFAQ(true)} style={{background:"none",border:"1px solid #333",color:"#666",borderRadius:8,padding:"8px 16px",fontSize:12,cursor:"pointer",fontFamily:"Arial,sans-serif"}}>Domande frequenti →</button>
            </div>
          </div>
        )}

        {/* Filters */}
        <div style={{background:"#fff",borderRadius:12,padding:"14px 18px",boxShadow:"0 2px 8px #0001",marginBottom:20,border:"1.5px solid #e8e4dc"}}>
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Cerca skill per nome, area, tag, normativa…"
            style={{width:"100%",padding:"9px 13px",borderRadius:8,border:`1.5px solid ${search.trim()?C.aurum:"#ddd"}`,fontSize:13.5,fontFamily:"Arial,sans-serif",outline:"none",marginBottom:10,boxSizing:"border-box",background:search.trim()?"#fff":"#fafaf8",transition:"border-color .2s"}}/>
          <div style={{display:"flex",gap:6,flexWrap:"wrap",alignItems:"center"}}>
            <div style={{display:"flex",gap:3,alignItems:"center",flexWrap:"wrap"}}>
              <span style={{fontSize:10,fontWeight:700,color:C.gray,letterSpacing:"0.1em",marginRight:2}}>AREA FUNZIONALE</span>
              {areas.map(a=><Pill key={a} label={a} active={filterArea===a} onClick={()=>setFilterArea(a)} color={AREA_COLOR[a]||C.nox}/>)}
            </div>
            <div style={{display:"flex",gap:3,alignItems:"center"}}>
              <span style={{fontSize:10,fontWeight:700,color:C.gray,letterSpacing:"0.1em",marginRight:2}}>DIFFICOLTÀ</span>
              {["Tutte","alta","media","bassa"].map(c=><Pill key={c} label={c} active={filterComp===c} onClick={()=>setFilterComp(c)} color={COMP_COLOR[c]||C.nox}/>)}
            </div>
            <div style={{display:"flex",gap:3,alignItems:"center"}}>
              <span style={{fontSize:10,fontWeight:700,color:C.gray,letterSpacing:"0.1em",marginRight:2}}>FREQUENZA D'USO</span>
              {["Tutte","ricorrente","occasionale"].map(f=><Pill key={f} label={f} active={filterFreq===f} onClick={()=>setFilterFreq(f)} color={FREQ_COLOR[f]||C.nox}/>)}
            </div>
            <div style={{marginLeft:"auto",display:"flex",alignItems:"center",gap:8}}>
              {(filterArea!=="Tutte"||filterComp!=="Tutte"||filterFreq!=="Tutte"||search.trim())&&(
                <span style={{fontSize:11,color:C.viridis,background:"#E3F7F0",padding:"2px 9px",borderRadius:12,fontWeight:700,fontFamily:"Arial,sans-serif",cursor:"pointer"}}
                  onClick={()=>{setFilterArea("Tutte");setFilterComp("Tutte");setFilterFreq("Tutte");setSearch("");}}>
                  {[filterArea!=="Tutte",filterComp!=="Tutte",filterFreq!=="Tutte",!!search.trim()].filter(Boolean).length} filtri attivi · ✕
                </span>
              )}
              <span style={{fontSize:12,color:C.gray,fontFamily:"Arial,sans-serif"}}>{filtered.length} skill</span>
            </div>
          </div>
        </div>

        {/* Grid */}
        <div id="catalogo-section"/>
        {filtered.length===0?(
          <div style={{textAlign:"center",padding:"60px 0",color:C.gray}}>
            <div style={{fontSize:32,marginBottom:8}}>🔍</div>
            <div style={{fontFamily:"Georgia,serif",fontSize:18,color:C.nox,marginBottom:8}}>Nessuna skill trovata</div>
            <div style={{fontSize:13,color:C.gray,fontFamily:"Arial,sans-serif",maxWidth:380,margin:"0 auto",lineHeight:1.6,marginBottom:20}}>Prova a rimuovere i filtri o cerca con parole diverse.</div>
            {isLogged?(
              <button onClick={()=>setShowCreateSkill(true)} style={{padding:"10px 24px",borderRadius:8,border:"none",background:C.aurum,color:"#fff",fontSize:13,fontWeight:700,cursor:"pointer",fontFamily:"Arial,sans-serif"}}>+ Crea una nuova skill</button>
            ):(
              <button onClick={()=>setShowLogin(true)} style={{padding:"10px 24px",borderRadius:8,border:`1px solid ${C.aurum}`,background:"#fff",color:C.aurum,fontSize:13,fontWeight:700,cursor:"pointer",fontFamily:"Arial,sans-serif"}}>🔒 Accedi per creare una skill</button>
            )}
          </div>
        ):(()=>{
          const g={};
          for(const s of filtered){if(!g[s.area])g[s.area]={};if(!g[s.area][s.sotto_area])g[s.area][s.sotto_area]=[];g[s.area][s.sotto_area].push(s);}
          return Object.entries(g).map(([area,sottoaree])=>(
            <div key={area} style={{marginBottom:28}}>
              <div style={{display:"flex",alignItems:"baseline",gap:12,marginBottom:16,paddingBottom:10,borderBottom:`2px solid #0A0B0F`}}>
                <span style={{fontFamily:"Georgia,serif",fontSize:18,fontWeight:400,color:"#0A0B0F"}}>{area}</span>
                <span style={{fontSize:9,color:"#aaa",fontFamily:"Arial,sans-serif",fontWeight:700,letterSpacing:"0.1em",textTransform:"uppercase"}}>{Object.values(sottoaree).reduce((a,b)=>a+b.length,0)} skill</span>
              </div>
              {Object.entries(sottoaree).map(([sa,skills])=>(
                <div key={sa} style={{marginBottom:16}}>
                  <div style={{fontSize:9,fontWeight:700,color:"#aaa",letterSpacing:"0.14em",textTransform:"uppercase",marginBottom:8,fontFamily:"Arial,sans-serif"}}>{sa}</div>
                  {skills.map(s=><SkillCard key={s.id} skill={s} isLogged={isLogged} favorites={favorites} setFavorites={isLogged?setFavorites:null} isAdmin={isAdmin} isHidden={hiddenSkills.includes(s.id)} onHide={()=>setHiddenSkills(prev=>[...prev,s.id])} onUnhide={()=>setHiddenSkills(prev=>prev.filter(x=>x!==s.id))} onDelete={()=>setDeletedSkills(prev=>[...prev,s.id])} onClick={()=>{if(!isLogged){setShowLogin(true);}else{setActiveSkill(s);}}}/>)}
                </div>
              ))}
            </div>
          ));
        })()}

        {/* Footer */}
        <div style={{marginTop:32,padding:"20px 0",borderTop:"1px solid #ddd",textAlign:"center",fontFamily:"Arial,sans-serif"}}>
          <div style={{fontSize:13,color:"#888",marginBottom:8}}>
            <span style={{fontFamily:"Georgia,serif"}}><span style={{color:C.aurum}}>x</span>Nunc.ai</span>
            {" "}· open source · AGPL v3 · ex nunc, da ora in poi
          </div>
          <div style={{display:"flex",justifyContent:"center",gap:16,fontSize:12,color:"#bbb",marginBottom:8}}>
            <span onClick={()=>setShowManifesto(true)} style={{cursor:"pointer",color:"#bbb"}} onMouseEnter={e=>e.target.style.color="#fff"} onMouseLeave={e=>e.target.style.color="#bbb"}>Manifesto</span>
            <span onClick={()=>setShowClassifica(true)} style={{cursor:"pointer",color:"#bbb"}} onMouseEnter={e=>e.target.style.color="#fff"} onMouseLeave={e=>e.target.style.color="#bbb"}>Classifica</span>
            {["Privacy Policy","Termini di servizio","Contatti"].map(l=><span key={l} style={{cursor:"pointer"}}>{l}</span>)}
            <span onClick={()=>setShowFAQ(true)} style={{cursor:"pointer",color:C.aurum,fontWeight:700}}>FAQ</span>
          </div>
          <div style={{fontSize:11,color:"#ccc"}}>Input mai salvati · Solo metadati anonimi · GDPR compliant · Platform-agnostic</div>
        </div>
      </div>

      {showLogin&&<LoginModal onClose={()=>setShowLogin(false)} onLogin={async(email,pw,tab)=>{
        if(tab==="registrati"){
          const {user}=await signUp(email,pw);
          // Profilo creato automaticamente dal trigger Supabase
          // Mostra messaggio conferma email
          setShowLogin(false);
          alert("Registrazione completata! Controlla la tua email per confermare l'account.");
        } else {
          const {user}=await signIn(email,pw);
          // La sessione viene gestita da onAuthStateChange
          setShowLogin(false);
          // Carica profilo aggiornato
          if(user){
            try{
              const p=await getProfile(user.id);
              if(p) setUserProfile(prev=>({...prev,...p,email:p.email||user.email}));
            }catch(_){}
          }
        }
      }}/>}
      {showFAQ&&<FAQModal onClose={()=>setShowFAQ(false)}/>}
      {showManifesto&&<ManifestoModal onClose={()=>setShowManifesto(false)}/>}
      {showClassifica&&<ClassificaModal onClose={()=>setShowClassifica(false)}/>}
      {showProfile&&<ProfileModal onClose={()=>setShowProfile(false)} userProfile={userProfile} setUserProfile={setUserProfile} onLogout={handleLogout} onDeleteAccount={handleDeleteAccount} onExportData={handleExportData} userPoints={userPoints}/>}
      {showDashboard&&<DashboardModal
        onClose={()=>setShowDashboard(false)}
        favorites={favorites} setFavorites={setFavorites}
        draftSkills={draftSkills} setDraftSkills={setDraftSkills}
        threads={threads} setThreads={setThreads}
        userProfile={userProfile}
        isAdmin={isAdmin}
        improvements={improvements} setImprovements={setImprovements}
        userPoints={userPoints}
        onTestSkill={s=>{setShowDashboard(false);setActiveSkill(s);}}
        onOpenProfile={()=>{setShowDashboard(false);setShowProfile(true);}}
        onCreateSkill={()=>{setShowDashboard(false);setShowCreateSkill(true);}}
      />}
      {showCreateSkill&&<CreateSkillWizard
        onClose={()=>setShowCreateSkill(false)}
        userProfile={userProfile}
        onSaveDraft={draft=>setDraftSkills(prev=>[...prev,draft])}
      />}
      {activeSkill&&<SkillModal skill={activeSkill} isLogged={isLogged} onClose={()=>setActiveSkill(null)} onLoginRequest={()=>{setActiveSkill(null);setShowLogin(true);}} profile={userProfile} improvements={improvements} setImprovements={setImprovements}/>}
      {showAdminPanel&&<AdminPanelModal
        onClose={()=>setShowAdminPanel(false)}
        hiddenSkills={hiddenSkills} setHiddenSkills={setHiddenSkills}
        deletedSkills={deletedSkills}
        draftSkills={draftSkills} setDraftSkills={setDraftSkills}
        improvements={improvements} setImprovements={setImprovements}
        userProfile={userProfile}
      />}
      {/* Logout confirm */}
      {showLogoutConfirm&&(
        <div style={{position:"fixed",inset:0,background:"rgba(10,11,15,0.72)",zIndex:2000,display:"flex",alignItems:"center",justifyContent:"center",padding:"16px"}} onClick={()=>setShowLogoutConfirm(false)}>
          <div onClick={e=>e.stopPropagation()} style={{background:"#FAF9F7",borderRadius:4,padding:"28px",maxWidth:340,width:"100%",boxShadow:"0 2px 4px rgba(0,0,0,0.06), 0 20px 60px rgba(0,0,0,0.18)",textAlign:"center"}}>
            <div style={{fontFamily:"Georgia,serif",fontSize:21,fontWeight:400,color:"#0A0B0F",marginBottom:16}}>Esci?</div>
            <div style={{fontSize:13,color:"#888",fontFamily:"Arial,sans-serif",marginBottom:24,lineHeight:1.6}}>Preferiti e bozze restano sul dispositivo. Rientrerai quando vuoi.</div>
            <div style={{display:"flex",gap:10}}>
              <button onClick={()=>setShowLogoutConfirm(false)} style={{flex:1,padding:"11px 20px",borderRadius:4,border:"1px solid #D8D4CE",background:"none",fontSize:11,cursor:"pointer",fontFamily:"Arial",color:"#666",fontWeight:700,letterSpacing:"0.1em",textTransform:"uppercase",transition:"all .2s"}}>Annulla</button>
              <button onClick={handleLogout} style={{flex:1,padding:"11px 20px",borderRadius:4,border:"none",background:"#C0392B",color:"#fff",fontSize:11,fontWeight:700,cursor:"pointer",fontFamily:"Arial",letterSpacing:"0.1em",textTransform:"uppercase",transition:"background .2s"}}>Esci</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
