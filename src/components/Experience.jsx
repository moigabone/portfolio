import { OrbitControls } from "@react-three/drei";
import { Office } from "./Office";
import { useThree, useFrame } from "@react-three/fiber";
import { useEffect, useRef, useState } from "react";
import * as THREE from 'three';

export const Experience = () => {
  const { camera } = useThree();
  const targetPosition = useRef([0, 0, 0]);
  const targetCameraPosition = useRef(new THREE.Vector3(0, 2.8, 5));
  const [lastMoveTime, setLastMoveTime] = useState(0);

  // Limites verticales pour la caméra
  const minY = -42; // Limite inférieure
  const maxY = 5; // Limite supérieure

  useEffect(() => {
    // Position initiale de la caméra
    camera.position.copy(targetCameraPosition.current);

    const handleWheel = (event) => {
      const currentTime = Date.now();
      if (currentTime - lastMoveTime < 2000) {
        // Ignorer l'événement si moins de 2 secondes se sont écoulées
        return;
      }

      const deltaY = -event.deltaY * 0.21;
      const newCameraY = targetCameraPosition.current.y + deltaY;
      const newTargetY = targetPosition.current[1] + deltaY;

      // Appliquer les limites
      if (newCameraY >= minY && newCameraY <= maxY) {
        targetCameraPosition.current.y = newCameraY;
        targetPosition.current[1] = newTargetY;
        setLastMoveTime(currentTime); // Mettre à jour le temps du dernier mouvement
      }
    };

    window.addEventListener('wheel', handleWheel);

    return () => {
      window.removeEventListener('wheel', handleWheel);
    };
  }, [camera]);

  // Met à jour la position de la caméra avec interpolation douce
  useFrame(() => {
    camera.position.lerp(targetCameraPosition.current, 0.1); // Ajustez le facteur pour plus ou moins de douceur
    camera.lookAt(...targetPosition.current);
  });

  return (
    <>
      <ambientLight intensity={2} />
      <OrbitControls
        enableZoom={false}
        enableRotate={true}
        target={targetPosition.current} // Définit la cible des contrôles orbitaux
      />
      <Office />
    </>
  );
};
