import { SECTIONS, Section } from "./Sections"

// Version sans 3D, utilisée quand le navigateur ne supporte pas WebGL
export default function StaticPortfolio() {
  return (
    <main className="h-dvh overflow-y-auto">
      {SECTIONS.map((s) => (
        <Section key={s.id} right={s.right}>
          {s.content}
        </Section>
      ))}
    </main>
  )
}
