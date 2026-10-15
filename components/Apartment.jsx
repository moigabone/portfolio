"use client"
import { useRef, useLayoutEffect, useMemo } from "react"
import { useGLTF, useScroll } from "@react-three/drei"
import { useFrame, useThree } from "@react-three/fiber"
import { MathUtils } from "three"
import gsap from "gsap"
import { SECTIONS } from "./Sections"

const MODEL_URL = "/models/appart.glb"

// Descente verticale appliquée à chaque changement de section
export const FLOOR_HEIGHTS = [2.3, 2.8, 2.0]

// Position de départ du modèle
const START = { x: 0.5, y: -0.4, z: -1 }

// Le modèle se place du côté opposé à la carte de texte
const sideX = (section) => (section.right ? -2.5 : 0.5)

export default function Apartment({ reducedMotion = false }) {
  const group = useRef()
  const tl = useRef()
  const motion = useRef({ ...START })
  const scroll = useScroll()
  const { viewport, pointer } = useThree()
  const { scene } = useGLTF(MODEL_URL)

  // Sur mobile les cartes sont en bas de l'écran : on centre et réduit le modèle
  const isMobile = viewport.width < 6
  const scale = MathUtils.clamp(viewport.width / 7, 0.55, 1)

  useMemo(() => {
    scene.traverse((child) => {
      if (child.isMesh) {
        child.castShadow = true
        child.receiveShadow = true
      }
    })
  }, [scene])

  // Timeline GSAP : une étape (durée 1) par transition entre deux sections, pilotée par le scroll
  useLayoutEffect(() => {
    const timeline = gsap.timeline({ paused: true })
    let y = START.y
    SECTIONS.slice(1).forEach((section, i) => {
      y -= FLOOR_HEIGHTS[i] ?? FLOOR_HEIGHTS[FLOOR_HEIGHTS.length - 1]
      timeline.to(motion.current, { duration: 1, ease: "power1.inOut", x: sideX(section), y, z: START.z }, i)
    })
    tl.current = timeline
    return () => timeline.kill()
  }, [])

  useFrame((_, delta) => {
    tl.current.seek(scroll.offset * tl.current.duration())

    // La descente suit l'échelle du modèle pour garder chaque étage cadré
    const m = motion.current
    const y = START.y + (m.y - START.y) * scale
    group.current.position.set(isMobile ? -1 : m.x, y + (isMobile ? 1.6 : 0), m.z)

    // Légère rotation qui suit la souris
    const targetRotation = -Math.PI / 3 + (reducedMotion ? 0 : pointer.x * 0.15)
    group.current.rotation.y = MathUtils.damp(group.current.rotation.y, targetRotation, 4, delta)
  })

  return (
    <>
      <mesh position={[0, -3, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[20, 20]} />
        <shadowMaterial transparent opacity={0.3} />
      </mesh>
      <group ref={group} scale={scale} rotation={[0, -Math.PI / 3, 0]}>
        <primitive object={scene} />
      </group>
    </>
  )
}

useGLTF.preload(MODEL_URL)
