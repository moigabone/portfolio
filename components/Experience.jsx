"use client"
import { Canvas } from "@react-three/fiber"
import { OrbitControls, ScrollControls } from "@react-three/drei"
import Apartment from "./Apartment"
import Overlay from "./Overlay"

export default function Experience() {
  return (
    <div className="w-screen h-screen">
      <Canvas shadows>
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
        <OrbitControls enableZoom={false} />
        <ScrollControls pages={3} damping={0.1}>
          <Overlay />
          <Apartment />
        </ScrollControls>
      </Canvas>
    </div>
  )
}
