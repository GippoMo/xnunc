// app/page.js — Server Component (nessun "use client")
// StaticShell: HTML statico letto da Google Googlebot (SSR)
// Portal: SPA interattiva caricata lato client dopo l'hydration
import dynamic from "next/dynamic";
import StaticShell from "../components/StaticShell";

const Portal = dynamic(() => import("../components/Portal"), { ssr: false });

export default function Page() {
  return (
    <>
      {/* Server-rendered SEO content: visibile a Google, nascosto agli utenti */}
      <StaticShell />
      {/* Applicazione interattiva client-side */}
      <Portal />
    </>
  );
}
