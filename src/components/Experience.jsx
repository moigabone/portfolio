import { OrbitControls } from "@react-three/drei";
import { Office } from "./Office";
import { useThree, useFrame } from "@react-three/fiber";
import { useEffect, useRef, useState } from "react";
import * as THREE from 'three';

export const Experience = () => {
  const { camera, size } = useThree();
  const targetPosition = useRef([0, 0, 0]); // Position cible que la caméra regarde
  const targetCameraPosition = useRef(new THREE.Vector3(0, 2.5, 5)); // Position cible de la caméra
  const [lastMoveTime, setLastMoveTime] = useState(0); // Temps du dernier mouvement de la caméra

  // Limites verticales pour la caméra
  const minY = -42* (size.height / 500); // Limite inférieure
  const maxY = 5* (size.height / 500); // Limite supérieure

  useEffect(() => {
    // Position initiale de la caméra
    camera.position.copy(targetCameraPosition.current);

    const handleWheel = (event) => {
      const currentTime = Date.now();
      if (currentTime - lastMoveTime < 2000) {
        // Ignorer l'événement si moins de 2 secondes se sont écoulées depuis le dernier mouvement
        return;
      }

      const deltaY = -event.deltaY * 0.21 * (size.height / 500); // Ajustement basé sur la hauteur de la fenêtre
      const newCameraY = targetCameraPosition.current.y + deltaY; // Nouvelle position verticale de la caméra
      const newTargetY = targetPosition.current[1] + deltaY; // Nouvelle position verticale de la cible

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
  }, [camera, size]);

  // Met à jour la position de la caméra avec interpolation douce
  useFrame(() => {
    camera.position.lerp(targetCameraPosition.current, 0.1); // Interpolation douce vers la position cible
    camera.lookAt(...targetPosition.current); // Oriente la caméra vers la cible
  });

  return (
    <>
      <ambientLight intensity={2} /> {/* Lumière ambiante pour éclairer la scène */}
      <OrbitControls
        enableZoom={false}
        enableRotate={true}
        target={targetPosition.current} // Définit la cible des contrôles orbitaux
      />
      <Office /> {/* Composant représentant le bureau */}
    </>
  );
};
