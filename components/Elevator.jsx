"use client"
import { useEffect, useRef } from "react"
import { useScroll } from "@react-three/drei"
import { SECTIONS, NB_SECTIONS } from "./Sections"
import { useContent } from "@/content/i18n"

// Le panneau d'ascenseur : un bouton par étage, de haut en bas comme dans l'immeuble.
// Descendre la page fait monter dans l'immeuble, de la chambre au bureau.
// `name` : la clé de son nom dans ui.floors (content/portfolio.js)
const FLOORS = [
  { key: "C", name: "C", sections: ["contact"] },
  { key: "2", name: 2, sections: ["alternance"] },
  { key: "1", name: 1, sections: ["formation", "ecole"] },
  { key: "0", name: 0, sections: ["projets", "loisirs"] },
  { key: "⌂", name: "home", sections: ["intro"] },
].map((f) => ({ ...f, indexes: f.sections.map((id) => SECTIONS.findIndex((s) => s.id === id)) }))

// Faire défiler la page jusqu'à une section (utilisé aussi par les objets cliquables de la scène)
export function scrollToSection(el, id) {
  const index = SECTIONS.findIndex((s) => s.id === id)
  el.scrollTo({ top: ((el.scrollHeight - el.clientHeight) * index) / (NB_SECTIONS - 1), behavior: "smooth" })
}

// À placer dans les ScrollControls : partage l'état du défilement avec le panneau, qui vit hors de la scène 3D
export function ScrollBridge({ target }) {
  const scroll = useScroll()
  useEffect(() => {
    target.current = scroll
  }, [scroll, target])
  return null
}

export default function Elevator({ scroll }) {
  const buttons = useRef([])
  const { ui } = useContent()

  // Au clavier : 0, 1, 2 et C mènent à l'étage, H à l'accueil
  useEffect(() => {
    const onKey = (e) => {
      if (e.ctrlKey || e.metaKey || e.altKey || e.target.closest?.("input, textarea") || !scroll.current) return
      const key = e.key.toUpperCase() === "H" ? "⌂" : e.key.toUpperCase()
      const floor = FLOORS.find((f) => f.key === key)
      if (floor) scrollToSection(scroll.current.el, floor.sections[0])
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [scroll])

  // L'étage courant s'allume, sans rendu React à chaque image
  useEffect(() => {
    let frame
    const update = () => {
      if (scroll.current) {
        const current = Math.round(scroll.current.offset * (NB_SECTIONS - 1))
        FLOORS.forEach((f, i) => {
          const el = buttons.current[i]
          if (el) el.dataset.active = f.indexes.includes(current)
        })
      }
      frame = requestAnimationFrame(update)
    }
    update()
    return () => cancelAnimationFrame(frame)
  }, [scroll])

  return (
    <nav aria-label={ui.floorsLabel} className="fixed right-4 top-1/2 z-40 hidden -translate-y-1/2 md:block">
      <ol className="flex flex-col gap-2 border border-seam bg-panel p-2 backdrop-blur">
        {FLOORS.map((f, i) => (
          <li key={f.key} className="group relative">
            <button
              type="button"
              ref={(el) => (buttons.current[i] = el)}
              onClick={() => scroll.current && scrollToSection(scroll.current.el, f.sections[0])}
              aria-label={ui.floors[f.name]}
              className="grid h-9 w-9 place-items-center rounded-full border border-[#c9a35a]/60 font-semibold text-ash transition hover:border-gilt hover:text-gilt data-[active=true]:border-gilt data-[active=true]:bg-gilt data-[active=true]:text-night data-[active=true]:shadow-[0_0_14px_rgb(255_211_106/0.6)]"
            >
              {f.key}
            </button>
            <span className="pointer-events-none absolute right-12 top-1/2 -translate-y-1/2 whitespace-nowrap border border-seam bg-panel px-2.5 py-1 text-xs text-ink opacity-0 transition group-focus-within:opacity-100 group-hover:opacity-100">
              {ui.floors[f.name]}
            </span>
          </li>
        ))}
      </ol>
    </nav>
  )
}
