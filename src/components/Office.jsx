import React, { useRef } from 'react';
import { useGLTF } from '@react-three/drei';

export const FLOOR_HEIGHT = 10;
export const NB_FLOORS = 3;

export function Office(props) {
  const { nodes, materials } = useGLTF('./models/appart.glb');
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
    {
      ref: groupRefs.office,
      position: [1, -43, -2],
      rotation: [0, 5.5, 0],
      geometries: Object.entries(nodes)
        .filter(([key]) => key.startsWith('Cube032'))
        .map(([key, node]) => ({ geometry: node.geometry, material: materials[node.material.name || ''] })),
    },
    {
      ref: groupRefs.classroom,
      position: [1.5, -20.5, -2],
      rotation: [Math.PI / 2, 0, 0.8],
      geometries: Object.entries(nodes)
        .filter(([key]) => key.startsWith('Cube006'))
        .map(([key, node]) => ({ geometry: node.geometry, material: materials[node.material.name || ''] })),
    },
    {
      ref: groupRefs.main,
      position: [0, 0, -2],
      rotation: [0, 5.5, 0],
      geometries: Object.entries(nodes)
        .filter(([key]) => key.startsWith('Cube047'))
        .map(([key, node]) => ({ geometry: node.geometry, material: materials[node.material.name || ''] })),
    },
  ];

  return (
    <group {...props} dispose={null}>
      {groupData.map(({ ref, position, rotation, geometries }, index) => (
        <group key={index} ref={ref} position={position} rotation={rotation}>
          {renderMeshes(geometries)}
        </group>
      ))}
    </group>
  );
}

useGLTF.preload('./models/appart.glb');
