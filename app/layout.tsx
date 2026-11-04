import type React from "react"
import type { Metadata, Viewport } from "next"
import { Chakra_Petch, Cormorant_Garamond } from "next/font/google"
import { contact, profile, site } from "@/content/portfolio"
import "./globals.css"

// Titres : un serif de grimoire, mais sobre. Texte : la police de mes autres sites.
const cormorant = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["600"],
  display: "swap",
  variable: "--font-cormorant",
})

const chakra = Chakra_Petch({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  display: "swap",
  variable: "--font-chakra",
})

export const metadata: Metadata = {
  // Utilisée pour les liens absolus des images de partage
  metadataBase: new URL(site.url),
  title: site.title,
  description: site.description,
  keywords: ["Gabin Clavier", "portfolio", "ingénieur réseau", "cybersécurité", "ESIEA", "Ecritel", "alternance", "firewall", "Three.js", "3D"],
  authors: [{ name: profile.name, url: site.url }],
  alternates: { canonical: "/" },
  openGraph: {
    title: site.title,
    description: site.description,
    type: "website",
    url: site.url,
    siteName: site.title,
    locale: "fr_FR",
    alternateLocale: ["en_GB"],
  },
  twitter: {
    card: "summary_large_image",
    title: site.title,
    description: site.description,
  },
}

// Pour les moteurs de recherche : qui je suis, où j'étudie, où je travaille, mes profils
const person = {
  "@context": "https://schema.org",
  "@type": "Person",
  name: profile.name,
  url: site.url,
  jobTitle: "Alternant ingénieur réseau et sécurité",
  worksFor: { "@type": "Organization", name: "Ecritel" },
  alumniOf: [
    { "@type": "CollegeOrUniversity", name: "ESIEA" },
    { "@type": "CollegeOrUniversity", name: "IUT de La Roche-sur-Yon, Nantes Université" },
  ],
  knowsAbout: ["Réseau", "Cybersécurité", "Firewalls", "BGP", "Three.js"],
  sameAs: contact.links.filter((l) => l.href.startsWith("https://")).map((l) => l.href),
}

export const viewport: Viewport = {
  themeColor: "#06051a",
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="fr" className={`${cormorant.variable} ${chakra.variable} antialiased`}>
      <body>
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(person) }} />
        {children}
      </body>
    </html>
  )
}
