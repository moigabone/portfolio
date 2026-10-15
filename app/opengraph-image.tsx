import { ImageResponse } from "next/og"
import { profile } from "@/content/portfolio"

// Image d'aperçu générée automatiquement pour les partages (LinkedIn, Discord…)
export const alt = `${profile.name} — ${profile.role}`
export const size = { width: 1200, height: 630 }
export const contentType = "image/png"

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: 80,
          background: "linear-gradient(0deg, #d9afd9 0%, #97d9e1 100%)",
          color: "#0f172a",
        }}
      >
        <div style={{ fontSize: 88, fontWeight: 700 }}>{profile.name}</div>
        <div style={{ fontSize: 44, marginTop: 12 }}>{profile.role}</div>
        <div style={{ fontSize: 30, marginTop: 32, color: "#334155" }}>{profile.tagline}</div>
      </div>
    ),
    size,
  )
}
