"use client"
import { useEffect, useRef, useState } from "react"
import { createAmbient } from "./ambient"
import { setLang, useContent } from "@/content/i18n"

// En haut à droite : le compteur de découvertes, le son, l'interrupteur soleil / lune et celui de la langue

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
  const { ui } = useContent()
  return (
    <button
      type="button"
      role="switch"
      aria-checked={day}
      aria-label={day ? ui.toNight : ui.toDay}
      title={day ? ui.toNight : ui.toDay}
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
  const { ui } = useContent()
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
      aria-label={on ? ui.soundOff : ui.soundOn}
      title={on ? ui.soundOff : ui.soundOn}
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

// Le compteur d'objets découverts : la scène annonce ce qui est cliquable, puis chaque clic.
// Les trouvailles sont gardées dans ce navigateur, pour reprendre la chasse à la visite suivante.
const FOUND_KEY = "portfolio:found"

function loadFound() {
  try {
    return new Set(JSON.parse(localStorage.getItem(FOUND_KEY) ?? "[]"))
  } catch {
    return new Set()
  }
}

export function Discoveries() {
  const [keys, setKeys] = useState([])
  const [found, setFound] = useState(() => new Set())
  const [fresh, setFresh] = useState(false) // un petit éclat à chaque nouvelle trouvaille
  const [open, setOpen] = useState(false) // la consigne du défi, sous le compteur
  const box = useRef(null)
  const wasDone = useRef(null) // tout était-il déjà trouvé ? (null : on ne sait pas encore)
  const { ui } = useContent()

  useEffect(() => {
    setFound(loadFound())
    const onList = (e) => setKeys(e.detail)
    const onFind = (e) =>
      setFound((current) => {
        if (current.has(e.detail)) return current
        const next = new Set(current).add(e.detail)
        try {
          localStorage.setItem(FOUND_KEY, JSON.stringify([...next]))
        } catch {}
        setFresh(true)
        return next
      })
    window.addEventListener("portfolio:discoverable", onList)
    window.addEventListener("portfolio:discover", onFind)
    return () => {
      window.removeEventListener("portfolio:discoverable", onList)
      window.removeEventListener("portfolio:discover", onFind)
    }
  }, [])
  useEffect(() => {
    if (!fresh) return
    const timer = setTimeout(() => setFresh(false), 900)
    return () => clearTimeout(timer)
  }, [fresh])

  const count = keys.filter((k) => found.has(k)).length
  const done = keys.length > 0 && count === keys.length
  // Tout est trouvé : la scène fête ça (`fresh` : à l'instant, et pas déjà au chargement de la page)
  useEffect(() => {
    if (!done) return
    window.dispatchEvent(new CustomEvent("portfolio:complete", { detail: { fresh: !wasDone.current } }))
  }, [done])
  useEffect(() => {
    if (keys.length) wasDone.current = done
  })
  // La consigne se ferme d'un clic ailleurs ou avec Échap
  useEffect(() => {
    if (!open) return
    const outside = (e) => box.current && !box.current.contains(e.target) && setOpen(false)
    const escape = (e) => e.key === "Escape" && setOpen(false)
    document.addEventListener("pointerdown", outside)
    document.addEventListener("keydown", escape)
    return () => {
      document.removeEventListener("pointerdown", outside)
      document.removeEventListener("keydown", escape)
    }
  }, [open])
  if (!keys.length) return null
  const text = done ? ui.allFound : ui.found(count, keys.length)
  return (
    <div ref={box} className="relative" data-card>
      <button
        type="button"
        aria-label={text}
        aria-expanded={open}
        aria-controls="challenge"
        title={text}
        onClick={() => setOpen((o) => !o)}
        className={`flex h-9 items-center gap-1.5 rounded-full border px-3 text-xs font-semibold tabular-nums backdrop-blur transition ${
          done ? "border-gilt bg-panel text-gilt shadow-[0_0_14px_rgb(255_211_106/0.5)]" : "border-seam bg-panel text-ash hover:text-ink"
        } ${fresh ? "scale-110 border-gilt text-gilt" : ""}`}
      >
        <svg viewBox="0 0 24 24" aria-hidden="true" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <circle cx="11" cy="11" r="6" />
          <path d="m20 20-4.5-4.5" />
        </svg>
        <span>
          {count} / {keys.length}
        </span>
      </button>
      {open && (
        <div id="challenge" role="dialog" aria-label={ui.challenge.title} className="challenge">
          <p className="challenge-title">{ui.challenge.title}</p>
          <p>{ui.challenge.rules(keys.length)}</p>
          <p className="challenge-score">{text}</p>
        </div>
      )}
    </div>
  )
}

// FR / EN, dans le style de l'interrupteur jour / nuit : le curseur glisse vers la langue choisie
export function LanguageToggle() {
  const { ui } = useContent()
  const english = ui.lang === "en"
  return (
    <button
      type="button"
      role="switch"
      aria-checked={english}
      aria-label={ui.language}
      title={ui.language}
      onClick={() => setLang(english ? "fr" : "en")}
      className="relative h-9 w-[4.5rem] overflow-hidden rounded-full border border-seam bg-gradient-to-b from-[#0d0b35] to-[#1c1960] text-[0.7rem] font-semibold"
    >
      <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-mist" aria-hidden="true">
        FR
      </span>
      <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-mist" aria-hidden="true">
        EN
      </span>
      <span
        className={`absolute top-1 grid h-7 w-7 place-items-center rounded-full bg-gilt text-night shadow-md transition-all duration-500 ease-in-out ${english ? "left-[calc(100%-2rem)]" : "left-1"}`}
        aria-hidden="true"
      >
        {english ? "EN" : "FR"}
      </span>
    </button>
  )
}

// Pour les lecteurs d'écran : ce que montre la scène 3D, et comment s'y déplacer
export function SceneDescription() {
  const { ui } = useContent()
  return <p className="sr-only">{ui.scene}</p>
}
