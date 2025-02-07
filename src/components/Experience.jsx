import { ScrollControls, OrbitControls } from "@react-three/drei";
import { Office } from "./Office";
import { useRef } from "react";
import { useThree } from "@react-three/fiber";
import { useEffect } from "react";
import gsap from "gsap";

export const Experience = () => {
  const { camera } = useThree(); // Récupère la caméra de Three.js
  const cameraTarget = useRef([0, 3, 5]); // Position cible de la caméra

  useEffect(() => {
    // Anime la caméra vers la position cible initiale
    gsap.to(camera.position, {
      x: cameraTarget.current[0],
      y: cameraTarget.current[1],
      z: cameraTarget.current[2],
      duration: 1.5,
      ease: "power2.out",
    });
    
  }, [camera]);

  return (
    <>
      <ambientLight intensity={2} />
      {/* OrbitControls mis à jour */}
      <OrbitControls enableZoom={false} enableRotate={false} />
      {/* ScrollControls */}
      <ScrollControls pages={3} damping={0.25}>
        <Office />
      </ScrollControls>
    </>
  );
};