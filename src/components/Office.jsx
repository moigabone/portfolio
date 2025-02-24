import React, { useRef } from 'react';
import { useGLTF } from '@react-three/drei';

export const FLOOR_HEIGHT = 10; // Hauteur d'un étage
export const NB_FLOORS = 3; // Nombre d'étages

export function Office(props) {
  const { nodes, materials } = useGLTF('./models/appart.glb'); // Chargement du modèle GLTF
  const groupRefs = {
    classroom: useRef(),
    office: useRef(),
    main: useRef(),
  };

  const renderMeshes = (geometryData) =>
    geometryData.map(({ geometry, material }, index) => (
      <mesh key={index} geometry={geometry} material={material} />
    ));

  const groupData = [
    { ref: groupRefs.office, position: [1, -42.7, -1.7], rotation: [0, 5.5, 0], keyPrefix: 'Cube032' },
    { ref: groupRefs.classroom, position: [1.5, -20.4, -2], rotation: [Math.PI / 2, 0, 0.8], keyPrefix: 'Cube006' },
    { ref: groupRefs.main, position: [0.3, -0.1, -2.2], rotation: [0, 5.48, 0], keyPrefix: 'Cube047' },
  ];

  return (
    <group {...props} dispose={null}>
      {groupData.map(({ ref, position, rotation, keyPrefix }, index) => (
        <group key={index} ref={ref} position={position} rotation={rotation}>
          {renderMeshes(Object.entries(nodes).filter(([key]) => key.startsWith(keyPrefix)).map(([, node]) => ({ geometry: node.geometry, material: materials[node.material.name || ''] })))}
        </group>
      ))}
    </group>
  );
}

useGLTF.preload('./models/appart.glb'); // Précharge le modèle GLTF pour des performances améliorées
