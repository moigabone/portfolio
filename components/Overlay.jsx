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
    setOpacityFirst(1 - scroll.range(0, 0.2))
    setOpacitySecond(scroll.curve(0.2, 0.5))
    setOpacityLast(scroll.range(0.5, 0.6))
  })

  return (
    <Scroll html>
      <div className="w-screen">
        <Section opacity={opacityFirst}>
          <h1 className="font-semibold font-serif text-2xl">Hello, je suis Gabin</h1>
          <p className="text-gray-500">--------------</p>
          <p className="mt-3">--------------</p>
          <ul className="leading-9">
            <li>--------------</li>
            <li>--------------</li>
            <li>--------------</li>
          </ul>
          <p className="animate-bounce mt-6">↓</p>
        </Section>

        <Section opacity={opacitySecond}>
          <h1 className="font-semibold font-serif text-2xl">-------------- 🔥</h1>
          <p className="text-gray-500">--------------</p>
          <p className="mt-3 font-semibold">--------------</p>
          <ul className="leading-9">
            <li>--------------</li>
            <li>--------------</li>
            <li>--------------</li>
            <li>--------------</li>
          </ul>
          <p className="animate-bounce mt-6">↓</p>
        </Section>

        <Section opacity={opacityLast}>
          <h1 className="font-semibold font-serif text-2xl">--------------</h1>
          <p className="text-gray-500">--------------</p>
          <p className="mt-6 p-3 bg-slate-200 rounded-lg">
            📞 <a href="tel:(+42) 4242-4242-424242">--------------</a>
          </p>
        </Section>
      </div>
    </Scroll>
  )
}
