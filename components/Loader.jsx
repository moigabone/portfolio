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
      className={`fixed inset-0 z-50 flex flex-col items-center justify-center gap-4 bg-gradient-to-t from-[#d9afd9] to-[#97d9e1] transition-opacity duration-500 ${done ? "opacity-0" : "opacity-100"}`}
    >
      <p className="font-serif text-2xl font-semibold">Chargement…</p>
      <div className="h-1.5 w-48 overflow-hidden rounded-full bg-white/50">
        <div className="h-full bg-slate-800 transition-[width] duration-200" style={{ width: `${progress}%` }} />
      </div>
      <p className="text-sm text-slate-700">{Math.round(progress)} %</p>
    </div>
  )
}
