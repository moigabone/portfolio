import type React from "react"
import type { Metadata, Viewport } from "next"
import { Chakra_Petch, Cormorant_Garamond } from "next/font/google"
import { site } from "@/content/portfolio"
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
  openGraph: {
    title: site.title,
    description: site.description,
    type: "website",
    locale: "fr_FR",
  },
  twitter: {
    card: "summary_large_image",
    title: site.title,
    description: site.description,
  },
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
      <body>{children}</body>
    </html>
  )
}
