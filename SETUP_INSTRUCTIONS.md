Create a React project with Vite, using:

three, @react-three/fiber, @react-three/drei

gsap

tailwindcss, postcss, autoprefixer

⚡ The site must:

be fullscreen with a gradient background

display my 3D model appart.glb (placed in public/models/appart.glb) using React Three Fiber

animate the model vertically + rotation + translation based on scroll (3 pages) with ScrollControls and gsap

include an HTML overlay built with TailwindCSS, with 3 sections (intro, skills, contact) whose opacity changes with scroll

File structure
/public
  /models/appart.glb
/src
  /components
    Experience.jsx
    Overlay.jsx
    Apartment.jsx
  App.jsx
  App.css
  index.css
  main.jsx
tailwind.config.cjs
postcss.config.cjs

File contents

src/main.jsx

import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.jsx";
import "./index.css";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);


src/App.css

#root {
  width: 100vw;
  height: 100vh;
  background-color: #d9afd9;
  background-image: linear-gradient(0deg, #d9afd9 0%, #97d9e1 100%);
}


src/index.css

@import url("https://fonts.googleapis.com/css2?family=Playfair+Display:wght@600&family=Poppins&display=swap");

@tailwind base;
@tailwind components;
@tailwind utilities;


tailwind.config.cjs

/** @type {import('tailwindcss').Config} */
const defaultTheme = require("tailwindcss/defaultTheme");

module.exports = {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        serif: ["Playfair Display", ...defaultTheme.fontFamily.serif],
        sans: ["Poppins", ...defaultTheme.fontFamily.sans],
      },
    },
  },
  plugins: [],
};


postcss.config.cjs

module.exports = {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
};


src/components/Apartment.jsx

import React, { useRef, useLayoutEffect } from "react";
import { useGLTF, useScroll } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import gsap from "gsap";

export const FLOOR_HEIGHT = 2.3;
export const NB_FLOORS = 3;

export default function Apartment(props) {
  const group = useRef();
  const tl = useRef();
  const scroll = useScroll();
  const { scene } = useGLTF("/models/appart.glb");

  useFrame(() => {
    if (tl.current) {
      tl.current.seek(scroll.offset * tl.current.duration());
    }
  });

  useLayoutEffect(() => {
    tl.current = gsap.timeline();
    tl.current.to(group.current.position, { duration: 2, y: -FLOOR_HEIGHT * (NB_FLOORS - 1) }, 0);
    tl.current.to(group.current.rotation, { duration: 1, y: Math.PI / 6 }, 0);
    tl.current.to(group.current.rotation, { duration: 1, y: -Math.PI / 6 }, 1);
    tl.current.to(group.current.position, { duration: 1, x: -1, z: 2 }, 0);
    tl.current.to(group.current.position, { duration: 1, x: 1, z: 2 }, 1);
  }, []);

  return (
    <group ref={group} {...props} position={[0.5, -1, -1]} rotation={[0, -Math.PI / 3, 0]}>
      <primitive object={scene} />
    </group>
  );
}
useGLTF.preload("/models/appart.glb");


src/components/Overlay.jsx

import React, { useState } from "react";
import { Scroll, useScroll } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";

const Section = ({ right, opacity, children }) => (
  <section
    className={`h-screen flex flex-col justify-center p-10 ${
      right ? "items-end" : "items-start"
    }`}
    style={{ opacity }}
  >
    <div className="w-1/2 flex items-center justify-center">
      <div className="max-w-sm w-full">
        <div className="bg-white rounded-2xl px-8 py-12 shadow-lg">{children}</div>
      </div>
    </div>
  </section>
);

export default function Overlay() {
  const scroll = useScroll();
  const [opacityFirst, setOpacityFirst] = useState(1);
  const [opacitySecond, setOpacitySecond] = useState(1);
  const [opacityLast, setOpacityLast] = useState(1);

  useFrame(() => {
    setOpacityFirst(1 - scroll.range(0, 1 / 3));
    setOpacitySecond(scroll.curve(1 / 3, 1 / 3));
    setOpacityLast(scroll.range(2 / 3, 1 / 3));
  });

  return (
    <Scroll html>
      <div className="w-screen">
        <Section opacity={opacityFirst}>
          <h1 className="font-semibold font-serif text-2xl">Hello, I'm Wawa Sensei</h1>
          <p className="text-gray-500">Welcome to my beautiful portfolio</p>
          <p className="mt-3">I know:</p>
          <ul className="leading-9">
            <li>🧑‍💻 How to code</li>
            <li>🧑‍🏫 How to learn</li>
            <li>📦 How to deliver</li>
          </ul>
          <p className="animate-bounce mt-6">↓</p>
        </Section>

        <Section right opacity={opacitySecond}>
          <h1 className="font-semibold font-serif text-2xl">Here are my skillsets 🔥</h1>
          <p className="text-gray-500">PS: I never test</p>
          <p className="mt-3 font-semibold">Frontend 🚀</p>
          <ul className="leading-9">
            <li>ReactJS</li>
            <li>React Native</li>
            <li>VueJS</li>
            <li>Tailwind</li>
          </ul>
          <p className="mt-3 font-semibold">Backend 🔬</p>
          <ul className="leading-9">
            <li>NodeJS</li>
            <li>tRPC</li>
            <li>NestJS</li>
            <li>PostgreSQL</li>
          </ul>
          <p className="animate-bounce mt-6">↓</p>
        </Section>

        <Section opacity={opacityLast}>
          <h1 className="font-semibold font-serif text-2xl">🤙 Call me maybe?</h1>
          <p className="text-gray-500">I'm very expensive but you won't regret it</p>
          <p className="mt-6 p-3 bg-slate-200 rounded-lg">
            📞 <a href="tel:(+42) 4242-4242-424242">(+42) 4242-4242-424242</a>
          </p>
        </Section>
      </div>
    </Scroll>
  );
}


src/components/Experience.jsx

import React from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, ScrollControls } from "@react-three/drei";
import Apartment from "./Apartment";
import Overlay from "./Overlay";

export default function Experience() {
  return (
    <Canvas>
      <ambientLight intensity={1} />
      <OrbitControls enableZoom={false} />
      <ScrollControls pages={3} damping={0.25}>
        <Overlay />
        <Apartment />
      </ScrollControls>
    </Canvas>
  );
}


src/App.jsx

import "./App.css";
import Experience from "./components/Experience";

export default function App() {
  return <Experience />;
}

Instructions for V0

Add dependencies:
three @react-three/fiber @react-three/drei gsap tailwindcss postcss autoprefixer

Run npx tailwindcss init -p then replace the generated files with the provided content.

Place my file appart.glb into public/models/.

Start the project with yarn dev — the model should load and animate on scroll, with the Tailwind UI overlay synced to scroll.
