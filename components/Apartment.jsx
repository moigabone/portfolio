"use client"
import { useRef, useLayoutEffect } from "react"
import { useGLTF, useScroll } from "@react-three/drei"
import { useFrame } from "@react-three/fiber"
import gsap from "gsap"

export const FLOOR_HEIGHT = 2.3
export const NB_FLOORS = 3

export default function Apartment(props) {
  const group = useRef()
  const tl = useRef()
  const scroll = useScroll()
  const { scene } = useGLTF("/models/appart.glb")

  useLayoutEffect(() => {
    scene.traverse((child) => {
      if (child.isMesh) {
        child.castShadow = true
        child.receiveShadow = true
      }
    })
  }, [scene])

  useFrame(() => {
    if (tl.current) {
      tl.current.seek(scroll.offset * tl.current.duration())
    }
  })

  useLayoutEffect(() => {
    tl.current = gsap.timeline()
    tl.current.to(group.current.position, { duration: 3, y: -FLOOR_HEIGHT * (NB_FLOORS - 1) }, 0)
    tl.current.to(group.current.rotation, { duration: 1.5, y: Math.PI / 6 }, 0)
    tl.current.to(group.current.rotation, { duration: 1.5, y: -Math.PI / 6 }, 1.5)
    tl.current.to(group.current.position, { duration: 1.5, x: -1, z: 2 }, 0)
    tl.current.to(group.current.position, { duration: 1.5, x: 1, z: 2 }, 1.5)
  }, [])

  return (
    <>
      <mesh position={[0, -3, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[20, 20]} />
        <shadowMaterial transparent opacity={0.3} />
      </mesh>
      <group ref={group} {...props} position={[0.5, -1, -1]} rotation={[0, -Math.PI / 3, 0]}>
        <primitive object={scene} />
      </group>
    </>
  )
}

useGLTF.preload("/models/appart.glb")
