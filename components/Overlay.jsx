"use client"
import { useState } from "react"
import { Scroll, useScroll } from "@react-three/drei"
import { useFrame } from "@react-three/fiber"

const Section = ({ right, opacity, children }) => (
  <section
    className={`h-screen flex flex-col justify-center p-10 ${right ? "items-end" : "items-start"}`}
    style={{ opacity }}
  >
    <div className="w-1/2 flex items-center justify-center">
      <div className="max-w-sm w-full">
        <div className="bg-white rounded-2xl px-8 py-12 shadow-lg">{children}</div>
      </div>
    </div>
  </section>
)

export default function Overlay() {
  const scroll = useScroll()
  const [opacityFirst, setOpacityFirst] = useState(1)
  const [opacitySecond, setOpacitySecond] = useState(1)
  const [opacityLast, setOpacityLast] = useState(1)

  useFrame(() => {
    setOpacityFirst(1 - scroll.range(0, 1 / 3))
    setOpacitySecond(scroll.curve(1 / 3, 1 / 3))
    setOpacityLast(scroll.range(2 / 3, 1 / 3))
  })

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
  )
}
