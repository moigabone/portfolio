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
  //const [floorNumber, setFloorNumber] = useState(0);

  useEffect(() => {
    // Position initiale de la caméra
    camera.position.copy(targetCameraPosition.current);

    let floorNumber = 0;

    const handleWheel = (event) => {
      const currentTime = Date.now();
      if (currentTime - lastMoveTime < 2000) {
        // Ignorer l'événement si moins de 2 secondes se sont écoulées depuis le dernier mouvement
        return;
      }

      console.log('deltaY : ', event.deltaY)

      const floorDelta = (event.deltaY>0?-1:1);

      let deltaY = floorDelta * 132 * 0.159 * (size.height / 500); // Ajustement basé sur la hauteur de la fenêtre
      const newCameraY = targetCameraPosition.current.y + deltaY; // Nouvelle position verticale de la caméra
      const newTargetY = targetPosition.current[1] + deltaY; // Nouvelle position verticale de la cible

      // Check des limites
      if (floorNumber+floorDelta > 0 || floorNumber+floorDelta < -2) {
        return;
      }

      targetCameraPosition.current.y = newCameraY;
      targetPosition.current[1] = newTargetY;
      setLastMoveTime(currentTime);
      floorNumber = (floorNumber+(event.deltaY>0?-1:1)) // Si le deltaY est positif on décend d'un étage
      console.log(floorNumber)
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
