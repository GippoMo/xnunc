"use client";
import { useState, useEffect } from "react";
import { supabase } from "../../lib/supabase";

export default function ResetPasswordPage() {
  const [password, setPassword] = useState("");
  const [password2, setPassword2] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");
  const [ready, setReady] = useState(false);

  // Supabase invia il token nell'hash dell'URL — dobbiamo aspettare che sia processato
  useEffect(() => {
    supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") setReady(true);
    });
  }, []);

  async function handleReset() {
    if (password !== password2) { setError("Le password non coincidono."); return; }
    if (password.length < 8) { setError("Minimo 8 caratteri."); return; }
    setLoading(true); setError("");
    const { error } = await supabase.auth.updateUser({ password });
    if (error) { setError(error.message); setLoading(false); return; }
    setDone(true); setLoading(false);
    setTimeout(() => { window.location.href = "/"; }, 3000);
  }

  const C = { nox: "#0A0B0F", aurum: "#BA7517", lux: "#F1EFE8" };

  return (
    <div style={{ minHeight: "100vh", background: "#FAF9F7", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
      <div style={{ width: "100%", maxWidth: 400 }}>
        {/* Logo */}
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <a href="/" style={{ textDecoration: "none" }}>
            <span style={{ fontFamily: "Georgia,serif", fontSize: 28, fontWeight: 700 }}>
              <span style={{ color: C.aurum }}>x</span>
              <span style={{ color: C.nox }}>Nunc</span>
            </span>
          </a>
        </div>

        <div style={{ background: "#fff", border: "1px solid #E8E4DC", borderRadius: 4, overflow: "hidden", boxShadow: "0 2px 4px rgba(0,0,0,0.04), 0 12px 40px rgba(0,0,0,0.08)" }}>
          <div style={{ padding: "24px 32px 20px", borderBottom: "2px solid #0A0B0F" }}>
            <div style={{ fontFamily: "Arial,sans-serif", fontSize: 9, color: C.aurum, fontWeight: 700, letterSpacing: "0.2em", marginBottom: 8 }}>SICUREZZA ACCOUNT</div>
            <div style={{ fontFamily: "Georgia,serif", fontSize: 21, color: C.nox }}>Nuova password</div>
          </div>

          <div style={{ padding: "24px 32px 28px" }}>
            {done ? (
              <div style={{ textAlign: "center", padding: "16px 0" }}>
                <div style={{ fontSize: 32, marginBottom: 12 }}>✓</div>
                <div style={{ fontFamily: "Georgia,serif", fontSize: 17, color: C.nox, marginBottom: 8 }}>Password aggiornata</div>
                <div style={{ fontFamily: "Arial,sans-serif", fontSize: 12, color: "#888" }}>Stai per essere reindirizzato…</div>
              </div>
            ) : !ready ? (
              <div style={{ textAlign: "center", padding: "24px 0", fontFamily: "Arial,sans-serif", fontSize: 13, color: "#888" }}>
                Verifica link in corso…<br />
                <span style={{ fontSize: 11, color: "#bbb" }}>Se non succede nulla, richiedi un nuovo link.</span>
                <br /><br />
                <a href="/" style={{ color: C.aurum, fontSize: 12, fontWeight: 700 }}>← Torna alla home</a>
              </div>
            ) : (
              <>
                <input
                  value={password} onChange={e => { setPassword(e.target.value); setError(""); }}
                  placeholder="Nuova password (min. 8 caratteri)" type="password"
                  style={{ width: "100%", border: "none", borderBottom: "1px solid #D8D4CE", padding: "10px 0", background: "transparent", color: C.nox, fontSize: 13, fontFamily: "Arial", outline: "none", boxSizing: "border-box", marginBottom: 16 }}
                />
                <input
                  value={password2} onChange={e => { setPassword2(e.target.value); setError(""); }}
                  placeholder="Conferma password" type="password"
                  onKeyDown={e => e.key === "Enter" && handleReset()}
                  style={{ width: "100%", border: "none", borderBottom: `1px solid ${password2 && password !== password2 ? "#C0392B" : "#D8D4CE"}`, padding: "10px 0", background: "transparent", color: C.nox, fontSize: 13, fontFamily: "Arial", outline: "none", boxSizing: "border-box", marginBottom: 8 }}
                />
                {error && <div style={{ fontSize: 11, color: "#C0392B", padding: "6px 10px", background: "#FEF0EF", border: "1px solid #F5C6C2", borderRadius: 2, marginBottom: 12 }}>{error}</div>}
                <button
                  onClick={handleReset}
                  disabled={loading || !password || !password2}
                  style={{ width: "100%", padding: "11px 20px", borderRadius: 2, border: "none", background: loading || !password || !password2 ? "#ccc" : C.nox, color: C.lux, fontWeight: 700, fontSize: 11, cursor: loading || !password || !password2 ? "not-allowed" : "pointer", fontFamily: "Arial", letterSpacing: "0.1em", textTransform: "uppercase", marginTop: 8 }}>
                  {loading ? "Salvataggio…" : "Imposta nuova password"}
                </button>
              </>
            )}
          </div>
        </div>

        <div style={{ textAlign: "center", marginTop: 20 }}>
          <a href="/" style={{ fontFamily: "Arial,sans-serif", fontSize: 11, color: "#aaa", textDecoration: "none" }}>← Torna alla home</a>
        </div>
      </div>
    </div>
  );
}
