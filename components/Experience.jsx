"use client"
import { Suspense, useEffect, useState } from "react"
import { Canvas } from "@react-three/fiber"
import { ScrollControls } from "@react-three/drei"
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
        <Canvas shadows dpr={[1, 2]}>
          <ambientLight intensity={0.5} />
          <directionalLight
            position={[10, 10, 5]}
            intensity={1}
            castShadow
            shadow-mapSize-width={2048}
            shadow-mapSize-height={2048}
            shadow-camera-far={50}
            shadow-camera-left={-10}
            shadow-camera-right={10}
            shadow-camera-top={10}
            shadow-camera-bottom={-10}
          />
          <ScrollControls pages={NB_SECTIONS} damping={reducedMotion ? 0 : 0.1}>
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
