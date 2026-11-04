"use client"

import { useFrame } from "@react-three/fiber"
import { useMemo, useRef } from "react"
import { AdditiveBlending, BufferGeometry, CanvasTexture, DoubleSide, Float32BufferAttribute, Group, MathUtils, Mesh, MeshBasicMaterial, MeshStandardMaterial, PlaneGeometry, SRGBColorSpace, SphereGeometry } from "three"

// Le ciel du jour : de gros nuages ronds qui dérivent derrière l'immeuble, et quelques oiseaux qui passent.
// La nuit, la lune se lève à leur place, en haut à gauche.
// La caméra regarde vers -z : tout est placé derrière, pour ne jamais passer devant les pièces.
const CLOUDS = { count: 14, spanX: 70, minZ: -18, maxZ: -45, minY: -6, maxY: 14, speed: 0.35 }
const BIRDS = { count: 5, spanX: 60, speed: 2.2 }
const MOON = { position: [-5, 5, -48], radius: 3.2 }

// Petite suite pseudo-aléatoire : les nuages ont la même forme à chaque visite
function random(seed) {
  let s = seed
  return () => ((s = (s * 16807) % 2147483647) - 1) / 2147483646
}

function makeCloud(rand, material, ball) {
  const cloud = new Group()
  const puffs = 5 + Math.floor(rand() * 4)
  for (let k = 0; k < puffs; k++) {
    const t = puffs === 1 ? 0 : k / (puffs - 1) - 0.5 // de -0.5 à 0.5 le long du nuage
    const r = 1.1 + (1 - Math.abs(t) * 1.6) * (0.8 + rand() * 0.7) // plus gros au milieu
    const puff = new Mesh(ball, material)
    puff.position.set(t * 6 + (rand() - 0.5) * 0.8, r * 0.35 + rand() * 0.4, (rand() - 0.5) * 1.5)
    puff.scale.set(r, r * 0.85, r)
    cloud.add(puff)
  }
  // Un dessous plat, comme un vrai cumulus
  const base = new Mesh(ball, material)
  base.scale.set(3.4, 0.6, 1.3)
  base.position.y = 0.3
  cloud.add(base)
  return cloud
}

// La lune : un disque pâle et ses cratères, dessinés une fois
function moonTexture() {
  const n = 512
  const canvas = document.createElement("canvas")
  canvas.width = canvas.height = n
  const g = canvas.getContext("2d")
  g.fillStyle = "#f4f1e4"
  g.fillRect(0, 0, n, n)
  const rand = random(23)
  for (let k = 0; k < 26; k++) {
    const x = rand() * n, y = n * 0.15 + rand() * n * 0.7, r = 8 + rand() * 40
    g.fillStyle = `rgba(170, 165, 150, ${0.25 + rand() * 0.35})`
    g.beginPath()
    g.arc(x, y, r, 0, Math.PI * 2)
    g.fill()
  }
  const texture = new CanvasTexture(canvas)
  texture.colorSpace = SRGBColorSpace
  return texture
}

// Un oiseau qui vole vers +x : deux ailes en V, de part et d'autre, qui battent
function makeBird(material) {
  const bird = new Group()
  const wings = [-1, 1].map((side) => {
    const geometry = new BufferGeometry()
    geometry.setAttribute("position", new Float32BufferAttribute([-0.12, 0, 0, 0.12, 0, 0, 0, 0, side * 0.7], 3))
    geometry.computeVertexNormals()
    const wing = new Mesh(geometry, material)
    bird.add(wing)
    return wing
  })
  return { bird, wings }
}

export default function DaySky({ day, reducedMotion }) {
  const group = useRef()
  const daylight = useRef(day.current ? 1 : 0)

  const sky = useMemo(() => {
    const rand = random(7)
    const material = new MeshStandardMaterial({ color: "#ffffff", emissive: "#dbe9ff", emissiveIntensity: 0.35, roughness: 1, transparent: true, opacity: 0 })
    const ball = new SphereGeometry(1, 18, 12)
    const clouds = Array.from({ length: CLOUDS.count }, () => {
      const cloud = makeCloud(rand, material, ball)
      cloud.position.set((rand() - 0.5) * CLOUDS.spanX, MathUtils.lerp(CLOUDS.minY, CLOUDS.maxY, rand()), MathUtils.lerp(CLOUDS.minZ, CLOUDS.maxZ, rand()))
      cloud.scale.setScalar(0.7 + rand() * 0.8)
      return { cloud, speed: CLOUDS.speed * (0.6 + rand() * 0.8) }
    })
    const ink = new MeshStandardMaterial({ color: "#3a4150", side: DoubleSide, transparent: true, opacity: 0 })
    const birds = Array.from({ length: BIRDS.count }, (_, k) => {
      const b = makeBird(ink)
      b.bird.position.set((rand() - 0.5) * BIRDS.spanX, 6 + k * 0.6 + rand(), -14 - k * 1.5)
      b.bird.scale.setScalar(0.6 + rand() * 0.3)
      b.phase = rand() * Math.PI * 2
      return b
    })
    const moon = new Group()
    moon.position.set(...MOON.position)
    const disc = new Mesh(new SphereGeometry(MOON.radius, 32, 24), new MeshBasicMaterial({ map: moonTexture(), color: "#fffbe8", transparent: true }))
    disc.rotation.y = -0.6
    moon.add(disc)
    // Halo doux autour
    const halo = document.createElement("canvas")
    halo.width = halo.height = 256
    const h = halo.getContext("2d")
    const glow = h.createRadialGradient(128, 128, 30, 128, 128, 128)
    glow.addColorStop(0, "rgba(220, 225, 255, 0.55)")
    glow.addColorStop(1, "rgba(220, 225, 255, 0)")
    h.fillStyle = glow
    h.fillRect(0, 0, 256, 256)
    const aura = new Mesh(
      new PlaneGeometry(MOON.radius * 7, MOON.radius * 7),
      new MeshBasicMaterial({ map: new CanvasTexture(halo), transparent: true, depthWrite: false, blending: AdditiveBlending }),
    )
    aura.position.z = -MOON.radius
    moon.add(aura)
    return { material, ink, clouds, birds, moon, disc, aura }
  }, [])

  useFrame((state, delta) => {
    const goal = day.current ? 1 : 0
    const d = (daylight.current = reducedMotion ? goal : MathUtils.damp(daylight.current, goal, 1.5, delta))
    sky.moon.visible = d < 0.99
    sky.disc.material.opacity = sky.aura.material.opacity = 1 - d
    group.current.visible = d > 0.01
    if (!group.current.visible) return
    // Opaques une fois le jour levé : des boules transparentes qui se chevauchent se trient mal
    const opaque = d > 0.98
    if (sky.material.transparent === opaque) {
      sky.material.transparent = !opaque
      sky.material.needsUpdate = true
    }
    sky.material.opacity = d
    sky.ink.opacity = d
    if (reducedMotion) return
    const time = state.clock.elapsedTime
    const wrap = (object, span) => {
      if (object.position.x > span / 2) object.position.x -= span
    }
    for (const { cloud, speed } of sky.clouds) {
      cloud.position.x += speed * delta
      wrap(cloud, CLOUDS.spanX)
    }
    sky.birds.forEach((b, k) => {
      b.bird.position.x += BIRDS.speed * delta
      b.bird.position.y += Math.sin(time * 0.8 + b.phase) * 0.004
      wrap(b.bird, BIRDS.spanX)
      const flap = Math.sin(time * 9 + b.phase + k) * 0.5
      b.wings[0].rotation.x = flap
      b.wings[1].rotation.x = -flap
    })
  })

  return (
    <>
      <primitive object={sky.moon} />
      <group ref={group}>
        {sky.clouds.map(({ cloud }, k) => (
          <primitive key={`c${k}`} object={cloud} />
        ))}
        {sky.birds.map(({ bird }, k) => (
          <primitive key={`b${k}`} object={bird} />
        ))}
      </group>
    </>
  )
}
