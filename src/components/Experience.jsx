import { ScrollControls, useScroll, OrbitControls } from "@react-three/drei";
import { Office } from "./Office";

export const Experience = () => {
  return (
    <>
      <ambientLight intensity={2}/>
      <OrbitControls enableZoom={false} />
      <ScrollControls pages={3} damping={0.25}>
      <Office />
      </ScrollControls>
    </>
  );
};