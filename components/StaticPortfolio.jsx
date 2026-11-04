"use client"
import { SECTIONS, Section } from "./Sections"
import { useContent } from "@/content/i18n"

// Version sans 3D, utilisée quand le navigateur ne supporte pas WebGL
export default function StaticPortfolio() {
  const content = useContent()
  return (
    <main className="h-dvh overflow-y-auto">
      {SECTIONS.map((s) => (
        <Section key={s.id} id={s.id} right={s.right}>
          {s.content(content)}
        </Section>
      ))}
    </main>
  )
}
