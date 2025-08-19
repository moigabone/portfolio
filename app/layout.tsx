import type React from "react"
import { Playfair_Display, Poppins } from "next/font/google"
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

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className={`${playfair.variable} ${poppins.variable} antialiased`}>
      <body>{children}</body>
    </html>
  )
}

export const metadata = {
      generator: 'v0.app'
    };
