"use client"
import { useEffect, useRef, useState } from "react"
import { createAmbient } from "./ambient"

// En haut à droite : l'interrupteur soleil / lune et le bouton du son

function Sun() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="h-4 w-4">
      <circle cx="12" cy="12" r="4.5" fill="currentColor" />
      {[0, 45, 90, 135, 180, 225, 270, 315].map((a) => (
        <line key={a} x1="12" y1="2.5" x2="12" y2="5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" transform={`rotate(${a} 12 12)`} />
      ))}
    </svg>
  )
}

function Moon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="h-4 w-4">
      <path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5Z" fill="currentColor" />
    </svg>
  )
}

export function ThemeToggle({ day, onChange }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={day}
      aria-label={day ? "Passer en mode nuit" : "Passer en mode jour"}
      title={day ? "Passer en mode nuit" : "Passer en mode jour"}
      onClick={() => onChange(!day)}
      className={`relative h-9 w-[4.5rem] overflow-hidden rounded-full border transition-colors duration-700 ${
        day ? "border-[#9cc9ef] bg-gradient-to-b from-[#7cc3ff] to-[#cfe9ff]" : "border-seam bg-gradient-to-b from-[#0d0b35] to-[#1c1960]"
      }`}
    >
      {/* Étoiles la nuit, nuage le jour */}
      <span className={`absolute inset-0 transition-opacity duration-700 ${day ? "opacity-0" : "opacity-100"}`} aria-hidden="true">
        {[[14, 9], [22, 22], [30, 12], [18, 16]].map(([x, y]) => (
          <span key={`${x}-${y}`} className="absolute h-0.5 w-0.5 rounded-full bg-white" style={{ left: x, top: y }} />
        ))}
      </span>
      <span
        className={`absolute left-2 top-3 h-3 w-6 rounded-full bg-white/90 transition-opacity duration-700 ${day ? "opacity-100" : "opacity-0"}`}
        aria-hidden="true"
      />
      {/* Le curseur : soleil à droite le jour, lune à gauche la nuit */}
      <span
        className={`absolute top-1 grid h-7 w-7 place-items-center rounded-full shadow-md transition-all duration-700 ease-in-out ${
          day ? "left-[calc(100%-2rem)] bg-[#ffd36a] text-[#e08a1e]" : "left-1 bg-[#ecebff] text-[#8f8cc4]"
        }`}
        aria-hidden="true"
      >
        {day ? <Sun /> : <Moon />}
      </span>
    </button>
  )
}

export function SoundToggle() {
  const [on, setOn] = useState(false)
  const ambient = useRef(null)
  useEffect(() => () => ambient.current?.stop(), [])

  const toggle = () => {
    ambient.current ??= createAmbient()
    on ? ambient.current.stop() : ambient.current.start()
    setOn(!on)
  }

  return (
    <button
      type="button"
      aria-pressed={on}
      aria-label={on ? "Couper le son" : "Activer l'ambiance sonore"}
      title={on ? "Couper le son" : "Activer l'ambiance sonore"}
      onClick={toggle}
      className="grid h-9 w-9 place-items-center rounded-full border border-seam bg-panel text-ash backdrop-blur transition hover:border-gilt hover:text-gilt"
    >
      <svg viewBox="0 0 24 24" aria-hidden="true" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 9v6h4l5 4V5L8 9H4Z" fill="currentColor" />
        {on ? <path d="M16.5 8.5a5 5 0 0 1 0 7M19 6a8.5 8.5 0 0 1 0 12" /> : <path d="m17 9 5 5m0-5-5 5" />}
      </svg>
    </button>
  )
}
