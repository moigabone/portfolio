"use client"
import { Suspense, useEffect, useRef, useState } from "react"
import { createPortal } from "react-dom"
import { Canvas, useFrame, useThree } from "@react-three/fiber"
import { Environment, Lightformer, PerformanceMonitor, ScrollControls, Stars } from "@react-three/drei"
import { Color, MathUtils, NeutralToneMapping, Vector3 } from "three"
import Apartment from "./Apartment"
import DaySky from "./DaySky"
import Overlay from "./Overlay"
import Loader from "./Loader"
import Elevator, { ScrollBridge } from "./Elevator"
import StaticPortfolio from "./StaticPortfolio"
import { Discoveries, LanguageToggle, SceneDescription, SoundToggle, ThemeToggle } from "./Controls"
import { initLang } from "@/content/i18n"
import { NB_SECTIONS } from "./Sections"
import { DAYLIGHT_SPEED, parisIsDay, saveTheme, savedTheme } from "./theme"
import { QUALITY } from "./quality"

function hasWebGL() {
  try {
    const canvas = document.createElement("canvas")
    return !!(canvas.getContext("webgl2") || canvas.getContext("webgl"))
  } catch {
    return false
  }
}

// Réglages de la nuit et du jour, entre lesquels la scène glisse en douceur
const NIGHT = { sky: "#5865c8", ground: "#241a3a", hemi: 0.55, sun: "#b4c2ff", sunPower: 1.3, sunAt: [-9, 16, 10], env: 0.3 }
const DAY = { sky: "#dff1ff", ground: "#f2d4c4", hemi: 1.1, sun: "#fff0d9", sunPower: 2.4, sunAt: [9, 16, 10], env: 0.5 }

// Clair de lune bleuté la nuit, soleil chaud le jour (avec ombres), et reflets doux.
// Les lampes de chaque pièce sont gérées par Apartment. `day` est une ref : changer de thème ne refait pas le rendu de la scène.
function Lights({ day, reducedMotion }) {
  const hemi = useRef(), sun = useRef(), stars = useRef(), daylight = useRef(day.current ? 1 : 0)
  const { scene } = useThree()
  const colors = useRef({ c: new Color(), night: { sky: new Color(NIGHT.sky), ground: new Color(NIGHT.ground), sun: new Color(NIGHT.sun) }, day: { sky: new Color(DAY.sky), ground: new Color(DAY.ground), sun: new Color(DAY.sun) } })
  const sunAt = useRef({ night: new Vector3(...NIGHT.sunAt), day: new Vector3(...DAY.sunAt) })

  useFrame((_, delta) => {
    const goal = day.current ? 1 : 0
    const d = (daylight.current = reducedMotion ? goal : MathUtils.damp(daylight.current, goal, DAYLIGHT_SPEED, delta))
    const { night: n, day: j } = colors.current
    hemi.current.color.lerpColors(n.sky, j.sky, d)
    hemi.current.groundColor.lerpColors(n.ground, j.ground, d)
    hemi.current.intensity = MathUtils.lerp(NIGHT.hemi, DAY.hemi, d)
    sun.current.color.lerpColors(n.sun, j.sun, d)
    sun.current.intensity = MathUtils.lerp(NIGHT.sunPower, DAY.sunPower, d)
    sun.current.position.lerpVectors(sunAt.current.night, sunAt.current.day, d)
    scene.environmentIntensity = MathUtils.lerp(NIGHT.env, DAY.env, d)
    if (stars.current) stars.current.visible = d < 0.5
  })

  return (
    <>
      <hemisphereLight ref={hemi} />
      <directionalLight
        ref={sun}
        castShadow={QUALITY.shadows > 0}
        shadow-mapSize={[QUALITY.shadows || 512, QUALITY.shadows || 512]}
        shadow-bias={-0.0004}
        shadow-normalBias={0.04}
        shadow-camera-near={1}
        shadow-camera-far={45}
        shadow-camera-left={-11}
        shadow-camera-right={11}
        shadow-camera-top={11}
        shadow-camera-bottom={-11}
      />
      {/* Carte d'environnement générée localement (aucun fichier HDR à télécharger) */}
      <Environment resolution={256}>
        <Lightformer form="rect" intensity={2} color="#8f9cff" position={[-6, 6, 8]} scale={[10, 6, 1]} />
        <Lightformer form="rect" intensity={1.5} color="#ff9fd8" position={[8, 4, -6]} scale={[10, 6, 1]} />
        <Lightformer form="rect" intensity={1} color="#c9ceff" position={[0, 12, 0]} rotation-x={Math.PI / 2} scale={[12, 12, 1]} />
      </Environment>
      <group ref={stars}>
        <Stars radius={60} depth={40} count={QUALITY.stars} factor={3} saturation={0} fade speed={reducedMotion ? 0 : 0.4} />
      </group>
      <DaySky day={day} reducedMotion={reducedMotion} />
    </>
  )
}

// Si l'image rame, la résolution baisse (et remonte si ça va mieux), entre les bornes de QUALITY.dpr.
// Sans ombres recalculées à chaque image (téléphones), elles le sont quelques fois par seconde : le soleil et
// les personnages bougent peu.
const SHADOW_REFRESH = 0.4 // secondes
function AdaptiveQuality() {
  const { gl, setDpr } = useThree()
  const since = useRef(0)
  useEffect(() => {
    gl.shadowMap.autoUpdate = QUALITY.liveShadows
  }, [gl])
  useFrame((_, delta) => {
    if (QUALITY.liveShadows || !QUALITY.shadows) return
    since.current += delta
    if (since.current < SHADOW_REFRESH) return
    since.current = 0
    gl.shadowMap.needsUpdate = true
  })
  const [low, high] = QUALITY.dpr
  return (
    <PerformanceMonitor
      factor={1}
      onChange={({ factor }) => setDpr(Math.min(window.devicePixelRatio, MathUtils.lerp(low, high, factor)))}
      onFallback={() => setDpr(low)}
    />
  )
}

// L'interrupteur jour / nuit garde son état pour lui : si Experience refaisait son rendu,
// le Canvas se reconfigurerait et ScrollControls perdrait le défilement.
// La scène lit le thème dans `dayRef` à chaque image, le CSS dans data-theme.
// Le changement jour / nuit : le ciel se retourne comme un volet, lame après lame, de gauche à droite,
// et le soleil (ou la lune) passe sur la ligne de partage. Derrière la scène 3D, qui reste visible.
const SHUTTER = { slats: 12, stagger: 60, flip: 600 } // millisecondes
function SkyShutter({ toDay, onDone }) {
  useEffect(() => {
    const timer = setTimeout(onDone, SHUTTER.slats * SHUTTER.stagger + SHUTTER.flip + 150)
    return () => clearTimeout(timer)
  }, [onDone])
  const face = (isDay, k) => ({
    backgroundImage: isDay ? "var(--sky-day)" : "var(--sky-night)",
    backgroundPosition: `calc(${-k} * 100vw / ${SHUTTER.slats}) 0`,
  })
  return createPortal(
    <div className="shutter" aria-hidden="true">
      {Array.from({ length: SHUTTER.slats }, (_, k) => (
        <div key={k} className="shutter-slat" style={{ animationDelay: `${k * SHUTTER.stagger}ms`, animationDuration: `${SHUTTER.flip}ms` }}>
          <div className="shutter-face" style={face(!toDay, k)} />
          <div className="shutter-face shutter-back" style={face(toDay, k)} />
        </div>
      ))}
      <div className={`shutter-orb ${toDay ? "shutter-sun" : "shutter-moon"}`} style={{ animationDuration: `${SHUTTER.slats * SHUTTER.stagger + SHUTTER.flip}ms` }} />
    </div>,
    document.body,
  )
}

function ThemeSwitch({ dayRef }) {
  const [day, setDay] = useState(dayRef.current)
  const [shutter, setShutter] = useState(null)
  const choose = (isDay) => {
    if (!window.matchMedia("(prefers-reduced-motion: reduce)").matches) setShutter({ toDay: isDay, at: Date.now() })
    setDay(isDay)
    dayRef.current = isDay
    document.documentElement.dataset.theme = isDay ? "day" : "night"
    saveTheme(isDay ? "day" : "night")
  }
  return (
    <>
      <ThemeToggle day={day} onChange={choose} />
      {shutter && <SkyShutter key={shutter.at} toDay={shutter.toDay} onDone={() => setShutter(null)} />}
    </>
  )
}

export default function Experience() {
  // null tant qu'on n'a pas pu tester le navigateur (rendu serveur)
  const [webgl, setWebgl] = useState(null)
  const [reducedMotion, setReducedMotion] = useState(false)
  const scroll = useRef(null) // l'état du défilement, partagé avec le panneau d'ascenseur
  const dayRef = useRef(false)

  useEffect(() => {
    // Le thème est connu avant que la scène ne démarre : heure de Paris, ou dernier choix du visiteur
    const saved = savedTheme()
    dayRef.current = saved ? saved === "day" : parisIsDay()
    document.documentElement.dataset.theme = dayRef.current ? "day" : "night"
    initLang()
    setWebgl(hasWebGL())
    setReducedMotion(window.matchMedia("(prefers-reduced-motion: reduce)").matches)
  }, [])

  if (webgl === false) return <StaticPortfolio />

  return (
    <div className="h-dvh w-screen">
      <div className="sky-day" aria-hidden="true" />
      <SceneDescription />
      {webgl && (
        <Canvas
          shadows={QUALITY.shadows > 0}
          dpr={QUALITY.dpr}
          camera={{ fov: 40, near: 0.1, far: 200 }}
          gl={{ toneMapping: NeutralToneMapping, antialias: QUALITY.antialias, powerPreference: "high-performance" }}
          onCreated={({ gl }) => (gl.toneMapping = NeutralToneMapping)}
        >
          <AdaptiveQuality />
          <Lights day={dayRef} reducedMotion={reducedMotion} />
          <ScrollControls pages={NB_SECTIONS} damping={reducedMotion ? 0 : 0.2}>
            <Suspense fallback={null}>
              <Apartment reducedMotion={reducedMotion} day={dayRef} />
            </Suspense>
            <Overlay />
            <ScrollBridge target={scroll} />
          </ScrollControls>
        </Canvas>
      )}
      {webgl && <Elevator scroll={scroll} />}
      <div className="fixed right-4 top-4 z-40 flex items-center gap-2">
        {webgl && <Discoveries />}
        <SoundToggle />
        {webgl !== null && <ThemeSwitch dayRef={dayRef} />}
        {webgl !== null && <LanguageToggle />}
      </div>
      <Loader />
    </div>
  )
}
