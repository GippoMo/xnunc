import "./globals.css";

export const metadata = {
  metadataBase: new URL("https://xnunc.ai"),

  title: {
    default: "xNunc.ai — AI per Commercialisti",
    template: "%s | xNunc.ai",
  },
  description:
    "La piattaforma AI open-source per dottori commercialisti italiani. Skill, formulari e tool professionali costruiti da voi, per voi. Powered by Claude.",

  keywords: [
    "commercialista AI",
    "intelligenza artificiale commercialisti",
    "software commercialista",
    "formulari commercialista",
    "WACC calculator",
    "dichiarazione dei redditi AI",
    "antiriciclaggio AML",
    "contenzioso tributario",
    "xNunc",
    "AI fiscale",
    "automazione studio commercialista",
  ],

  authors: [{ name: "xNunc.ai", url: "https://xnunc.ai" }],
  creator: "xNunc.ai",
  publisher: "xNunc.ai",

  openGraph: {
    type: "website",
    locale: "it_IT",
    url: "https://xnunc.ai",
    siteName: "xNunc.ai",
    title: "xNunc.ai — Da adesso, lavori diversamente.",
    description:
      "Il catalogo AI per commercialisti italiani. Skill, formulari e tool costruiti da voi, per voi. Open source, gratuito, powered by Claude.",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "xNunc.ai — AI per Commercialisti",
      },
    ],
  },

  twitter: {
    card: "summary_large_image",
    title: "xNunc.ai — Da adesso, lavori diversamente.",
    description:
      "Il catalogo AI per commercialisti italiani. Skill, formulari e tool costruiti da voi, per voi.",
    images: ["/og-image.png"],
  },

  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },

  icons: {
    icon: "/favicon.ico",
  },

  alternates: {
    canonical: "https://xnunc.ai",
  },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebSite",
      "url": "https://xnunc.ai",
      "name": "xNunc.ai",
      "description": "La piattaforma AI open-source per dottori commercialisti italiani.",
      "inLanguage": "it-IT"
    },
    {
      "@type": "SoftwareApplication",
      "name": "xNunc.ai",
      "url": "https://xnunc.ai",
      "applicationCategory": "BusinessApplication",
      "operatingSystem": "Web",
      "description": "Catalogo AI per commercialisti italiani con skill, formulari e tool professionali. WACC Calculator, formulari societari, contenzioso tributario, antiriciclaggio.",
      "inLanguage": "it-IT",
      "offers": { "@type": "Offer", "price": "0", "priceCurrency": "EUR" },
      "author": { "@type": "Organization", "name": "xNunc.ai", "url": "https://www.xnunc.ai" },
      "license": "https://www.gnu.org/licenses/agpl-3.0.html",
      "keywords": "commercialista AI, WACC, formulari tributari, antiriciclaggio, contenzioso, fiscalita italiana"
    },
    {
      "@type": "Organization",
      "name": "xNunc.ai",
      "url": "https://xnunc.ai",
      "foundingDate": "2026",
      "knowsAbout": ["Fiscalita italiana","Diritto societario","Antiriciclaggio","Contenzioso tributario","Valutazione aziendale","WACC","Intelligenza artificiale per professionisti"]
    }
  ]
};

export default function RootLayout({ children }) {
  return (
    <html lang="it">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=5" />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
