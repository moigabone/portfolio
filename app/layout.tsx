import type React from "react"
import type { Metadata, Viewport } from "next"
import { Playfair_Display, Poppins } from "next/font/google"
import { site } from "@/content/portfolio"
import "./globals.css"

const playfair = Playfair_Display({
  subsets: ["latin"],
  weight: ["600"],
  display: "swap",
  variable: "--font-playfair",
})

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  display: "swap",
  variable: "--font-poppins",
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
  themeColor: "#97d9e1",
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="fr" className={`${playfair.variable} ${poppins.variable} antialiased`}>
      <body>{children}</body>
    </html>
  )
}
