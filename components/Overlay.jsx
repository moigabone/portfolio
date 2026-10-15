"use client"
import { useRef } from "react"
import { Scroll, useScroll } from "@react-three/drei"
import { useFrame } from "@react-three/fiber"
import { SECTIONS, NB_SECTIONS, Section } from "./Sections"

// Chaque section est pleinement visible quand le scroll est centré dessus,
// puis s'estompe vers les sections voisines.
const FADE_SPEED = 1.4

export default function Overlay() {
  const scroll = useScroll()
  const sections = useRef([])

  // On écrit directement dans le style (pas de setState) pour éviter un rendu React par frame.
  useFrame(() => {
    const position = scroll.offset * (NB_SECTIONS - 1)
    sections.current.forEach((el, i) => {
      if (!el) return
      const opacity = Math.max(0, 1 - Math.abs(position - i) * FADE_SPEED)
      el.style.opacity = opacity
      el.style.pointerEvents = opacity > 0.5 ? "auto" : "none"
    })
  })

  return (
    <Scroll html>
      <div className="w-screen">
        {SECTIONS.map((s, i) => (
          <Section key={s.id} right={s.right} ref={(el) => (sections.current[i] = el)}>
            {s.content}
          </Section>
        ))}
      </div>
    </Scroll>
  )
}
