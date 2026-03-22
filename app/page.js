// app/page.js — Server Component (nessun "use client")
// StaticShell: HTML statico letto da Googlebot (SSR)
// PortalLoader: wrapper Client Component che carica il SPA senza SSR
import StaticShell from "../components/StaticShell";
import PortalLoader from "../components/PortalLoader";

export default function Page() {
  return (
    <>
      {/* Server-rendered SEO content: visibile a Google, nascosto agli utenti */}
      <StaticShell />
      {/* Applicazione interattiva client-side */}
      <PortalLoader />
    </>
  );
}
