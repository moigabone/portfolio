"use client"
import { useEffect, useRef } from "react"
import { useScroll } from "@react-three/drei"
import { SECTIONS, NB_SECTIONS } from "./Sections"

// Le panneau d'ascenseur : un bouton par étage, de haut en bas comme dans l'immeuble.
// Descendre la page fait monter dans l'immeuble, de la chambre au bureau.
const FLOORS = [
  { key: "C", label: "Contact", sections: ["contact"] },
  { key: "2", label: "2e étage · Le bureau", sections: ["alternance"] },
  { key: "1", label: "1er étage · La salle de classe", sections: ["formation", "ecole"] },
  { key: "0", label: "Rez-de-chaussée · La chambre", sections: ["projets", "loisirs"] },
  { key: "⌂", label: "Accueil", sections: ["intro"] },
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
    <nav aria-label="Étages" className="fixed right-4 top-1/2 z-40 hidden -translate-y-1/2 md:block">
      <ol className="flex flex-col gap-2 border border-seam bg-panel p-2 backdrop-blur">
        {FLOORS.map((f, i) => (
          <li key={f.key} className="group relative">
            <button
              type="button"
              ref={(el) => (buttons.current[i] = el)}
              onClick={() => scroll.current && scrollToSection(scroll.current.el, f.sections[0])}
              aria-label={f.label}
              className="grid h-9 w-9 place-items-center rounded-full border border-[#c9a35a]/60 font-semibold text-ash transition hover:border-gilt hover:text-gilt data-[active=true]:border-gilt data-[active=true]:bg-gilt data-[active=true]:text-night data-[active=true]:shadow-[0_0_14px_rgb(255_211_106/0.6)]"
            >
              {f.key}
            </button>
            <span className="pointer-events-none absolute right-12 top-1/2 -translate-y-1/2 whitespace-nowrap border border-seam bg-panel px-2.5 py-1 text-xs text-ink opacity-0 transition group-focus-within:opacity-100 group-hover:opacity-100">
              {f.label}
            </span>
          </li>
        ))}
      </ol>
    </nav>
  )
}
