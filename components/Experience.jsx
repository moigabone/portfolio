"use client"
import { Suspense, useEffect, useState } from "react"
import { Canvas } from "@react-three/fiber"
import { Environment, Lightformer, ScrollControls, Stars } from "@react-three/drei"
import { NeutralToneMapping } from "three"
import Apartment from "./Apartment"
import Overlay from "./Overlay"
import Loader from "./Loader"
import StaticPortfolio from "./StaticPortfolio"
import { NB_SECTIONS } from "./Sections"

function hasWebGL() {
  try {
    const canvas = document.createElement("canvas")
    return !!(canvas.getContext("webgl2") || canvas.getContext("webgl"))
  } catch {
    return false
  }
}

// Éclairage de nuit : clair de lune bleuté (avec ombres) + ciel sombre + reflets froids.
// Les lampes chaudes de chaque pièce sont posées par Apartment.
function Lights() {
  return (
    <>
      <hemisphereLight args={["#5865c8", "#241a3a", 0.55]} />
      <directionalLight
        position={[-9, 16, 10]}
        color="#b4c2ff"
        intensity={1.3}
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
      <Environment resolution={256} environmentIntensity={0.3}>
        <Lightformer form="rect" intensity={2} color="#8f9cff" position={[-6, 6, 8]} scale={[10, 6, 1]} />
        <Lightformer form="rect" intensity={1.5} color="#ff9fd8" position={[8, 4, -6]} scale={[10, 6, 1]} />
        <Lightformer form="rect" intensity={1} color="#c9ceff" position={[0, 12, 0]} rotation-x={Math.PI / 2} scale={[12, 12, 1]} />
      </Environment>
    </>
  )
}

export default function Experience() {
  // null tant qu'on n'a pas pu tester le navigateur (rendu serveur)
  const [webgl, setWebgl] = useState(null)
  const [reducedMotion, setReducedMotion] = useState(false)

  useEffect(() => {
    setWebgl(hasWebGL())
    setReducedMotion(window.matchMedia("(prefers-reduced-motion: reduce)").matches)
  }, [])

  if (webgl === false) return <StaticPortfolio />

  return (
    <div className="h-dvh w-screen">
      {webgl && (
        <Canvas
          shadows
          dpr={[1, 2]}
          camera={{ fov: 40, near: 0.1, far: 200 }}
          gl={{ toneMapping: NeutralToneMapping }}
          onCreated={({ gl }) => (gl.toneMapping = NeutralToneMapping)}
        >
          <Lights />
          <Stars radius={60} depth={40} count={2500} factor={3} saturation={0} fade speed={reducedMotion ? 0 : 0.4} />
          <ScrollControls pages={NB_SECTIONS} damping={reducedMotion ? 0 : 0.2}>
            <Suspense fallback={null}>
              <Apartment reducedMotion={reducedMotion} />
            </Suspense>
            <Overlay />
          </ScrollControls>
        </Canvas>
      )}
      <Loader />
    </div>
  )
}
