"use client"
import { useEffect, useState } from "react"
import { useProgress } from "@react-three/drei"

// Écran de chargement affiché pendant le téléchargement du modèle 3D
export default function Loader() {
  const { active, progress } = useProgress()
  const [visible, setVisible] = useState(true)
  const done = !active && progress === 100

  useEffect(() => {
    if (!done) return
    const timer = setTimeout(() => setVisible(false), 600)
    return () => clearTimeout(timer)
  }, [done])

  if (!visible) return null

  return (
    <div
      role="status"
      aria-live="polite"
      className={`fixed inset-0 z-50 flex flex-col items-center justify-center gap-4 bg-night transition-opacity duration-500 ${done ? "opacity-0" : "opacity-100"}`}
    >
      <p className="font-serif text-3xl font-semibold text-parchment">Gabin Clavier</p>
      <div className="h-px w-48 overflow-hidden bg-seam">
        <div className="h-full bg-gilt transition-[width] duration-200" style={{ width: `${progress}%` }} />
      </div>
      <p className="text-xs uppercase tracking-[0.22em] text-ash">{Math.round(progress)} %</p>
    </div>
  )
}
