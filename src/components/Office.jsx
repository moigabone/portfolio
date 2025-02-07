import React, { useLayoutEffect, useRef } from 'react';
import { useGLTF, useScroll } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import gsap from 'gsap';

export const FLOOR_HEIGHT = 10;
export const NB_FLOORS = 3;

export function Office(props) {
  const { nodes, materials } = useGLTF('./models/appart.glb');
  const ref = useRef();
  const tl = useRef();
  const groupRefs = {
    classroom: useRef(),
    office: useRef(),
    main: useRef(),
  };

  const scroll = useScroll();

  // Synchronize animation with scroll
  useFrame(() => {
    tl.current.seek(scroll.offset * tl.current.duration());
  });

  useLayoutEffect(() => {
    tl.current = gsap.timeline();
    Object.entries(groupRefs).forEach(([key, group], index) => {
      // Définir des positions cibles précises
      const targetPositions = [
        [1, 22, -2], // Position cible pour le premier groupe
        [1, 0, -2], // Position cible pour le deuxième groupe
        [0, -22, -2], // Position cible pour le troisième groupe
      ];
  
      tl.current.to(
        group.current.position,
        { 
          duration: 1, 
          x: targetPositions[index][0], 
          y: targetPositions[index][1], 
          z: targetPositions[index][2] 
        },
        0 // Commencer toutes les animations au même moment
      );
    });
  }, []);
  

  const renderMeshes = (geometryData) =>
    geometryData.map(({ geometry, material }, index) => (
      <mesh key={index} geometry={geometry} material={material} />
    ));

  const groupData = [
    {
      ref: groupRefs.office,
      position: [1, 41, -2],
      rotation: [0, 5.5, 0],
      geometries: Object.entries(nodes)
        .filter(([key]) => key.startsWith('Cube032'))
        .map(([key, node]) => ({ geometry: node.geometry, material: materials[node.material.name || ''] })),
    },
    {
      ref: groupRefs.classroom,
      position: [1, 22, -2],
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