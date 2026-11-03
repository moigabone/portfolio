"use client"
import { Suspense, useEffect, useRef, useState } from "react"
import { Canvas, useFrame, useThree } from "@react-three/fiber"
import { Environment, Lightformer, ScrollControls, Stars } from "@react-three/drei"
import { Color, MathUtils, NeutralToneMapping, Vector3 } from "three"
import Apartment from "./Apartment"
import Overlay from "./Overlay"
import Loader from "./Loader"
import Elevator, { ScrollBridge } from "./Elevator"
import StaticPortfolio from "./StaticPortfolio"
import { SoundToggle, ThemeToggle } from "./Controls"
import { NB_SECTIONS } from "./Sections"
import { DAYLIGHT_SPEED, parisIsDay, saveTheme, savedTheme } from "./theme"

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
// Les lampes de chaque pièce sont gérées par Apartment.
function Lights({ day, reducedMotion }) {
  const hemi = useRef(), sun = useRef(), stars = useRef(), daylight = useRef(day ? 1 : 0)
  const { scene } = useThree()
  const colors = useRef({ c: new Color(), night: { sky: new Color(NIGHT.sky), ground: new Color(NIGHT.ground), sun: new Color(NIGHT.sun) }, day: { sky: new Color(DAY.sky), ground: new Color(DAY.ground), sun: new Color(DAY.sun) } })
  const sunAt = useRef({ night: new Vector3(...NIGHT.sunAt), day: new Vector3(...DAY.sunAt) })

  useFrame((_, delta) => {
    const d = (daylight.current = reducedMotion ? (day ? 1 : 0) : MathUtils.damp(daylight.current, day ? 1 : 0, DAYLIGHT_SPEED, delta))
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
        castShadow
        shadow-mapSize={[2048, 2048]}
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
        <Stars radius={60} depth={40} count={2500} factor={3} saturation={0} fade speed={reducedMotion ? 0 : 0.4} />
      </group>
    </>
  )
}

export default function Experience() {
  // null tant qu'on n'a pas pu tester le navigateur (rendu serveur)
  const [webgl, setWebgl] = useState(null)
  const [reducedMotion, setReducedMotion] = useState(false)
  const [day, setDay] = useState(false)
  const scroll = useRef(null) // l'état du défilement, partagé avec le panneau d'ascenseur

  useEffect(() => {
    setWebgl(hasWebGL())
    setReducedMotion(window.matchMedia("(prefers-reduced-motion: reduce)").matches)
    const saved = savedTheme()
    setDay(saved ? saved === "day" : parisIsDay())
  }, [])

  // Le CSS (ciel, étoiles filantes) suit le thème
  useEffect(() => {
    document.documentElement.dataset.theme = day ? "day" : "night"
  }, [day])

  const chooseTheme = (isDay) => {
    setDay(isDay)
    saveTheme(isDay ? "day" : "night")
  }

  if (webgl === false) return <StaticPortfolio />

  return (
    <div className="h-dvh w-screen">
      <div className="sky-day" aria-hidden="true" />
      {webgl && (
        <Canvas
          shadows
          dpr={[1, 2]}
          camera={{ fov: 40, near: 0.1, far: 200 }}
          gl={{ toneMapping: NeutralToneMapping }}
          onCreated={({ gl }) => (gl.toneMapping = NeutralToneMapping)}
        >
          <Lights day={day} reducedMotion={reducedMotion} />
          <ScrollControls pages={NB_SECTIONS} damping={reducedMotion ? 0 : 0.2}>
            <Suspense fallback={null}>
              <Apartment reducedMotion={reducedMotion} day={day} />
            </Suspense>
            <Overlay />
            <ScrollBridge target={scroll} />
          </ScrollControls>
        </Canvas>
      )}
      {webgl && <Elevator scroll={scroll} />}
      <div className="fixed right-4 top-4 z-40 flex items-center gap-2">
        <SoundToggle />
        <ThemeToggle day={day} onChange={chooseTheme} />
      </div>
      <Loader />
    </div>
  )
}
