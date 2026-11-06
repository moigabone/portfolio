"use client"

import { useFrame } from "@react-three/fiber"
import { useMemo, useRef } from "react"
import { AdditiveBlending, Box3, BoxGeometry, BufferGeometry, CanvasTexture, CapsuleGeometry, CatmullRomCurve3, CircleGeometry, Color, ConeGeometry, CylinderGeometry, DoubleSide, Float32BufferAttribute, Group, MathUtils, Mesh, MeshBasicMaterial, MeshStandardMaterial, Object3D, PlaneGeometry, Points, PointsMaterial, Raycaster, SRGBColorSpace, SphereGeometry, TubeGeometry, Vector3 } from "three"
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js"
import { sound } from "./ambient"
import { QUALITY } from "./quality"

// Le ciel du jour : de gros nuages ronds qui dérivent derrière l'immeuble, et quelques oiseaux qui passent.
// La nuit, la lune se lève à leur place, en haut à gauche. Parfois, un bus volant ou une parade passent (voir FLYERS).
// La caméra regarde vers -z : tout est placé derrière, pour ne jamais passer devant les pièces.
const CLOUDS = { count: 14, spanX: 70, minZ: -18, maxZ: -45, minY: -6, maxY: 14, speed: 0.35 }
const BIRDS = { count: 5, spanX: 60, speed: 2.2 }
const MOON = { position: [-5, 5, -48], radius: 3.2 }

// Le jour, un bus bleu suspendu sous une montgolfière traverse le ciel de temps en temps ;
// la nuit, c'est une parade de jouets et d'objets qui défile (clin d'œil à Paprika). En unités du ciel.
// Chacun entre par le bord gauche de l'écran et ressort entièrement par le bord droit, en `crossing` secondes,
// une fois toutes les `period` secondes ; `pad` : sa demi-largeur, pour qu'il reste caché au départ et à l'arrivée.
// Survolé, il joue sa musique (voir CLIPS), qui s'éteint quand le curseur le quitte ; sur écran tactile, touché.
const FLYERS = {
  bus: { y: 2.6, z: -20, period: 80, crossing: 40, scale: 0.75, pad: 2.5, clip: "bus" },
  parade: { y: 5.5, z: -24, period: 90, crossing: 45, gap: 2.6, scale: 1, pad: 1.5, clip: "paprika" },
}
// Le survol : un rayon depuis le curseur toutes les `every` secondes, contre la boîte qui englobe l'engin,
// élargie de `margin` (en unités du ciel) : pas besoin de viser juste. La musique s'arrête `grace` secondes
// après qu'on a quitté l'engin, et ne repart pas de zéro si on y revient avant.
const HOVER = { every: 0.12, margin: 1.2, grace: 1.2 }

// Le bus et sa montgolfière : un ballon blanc coiffé de bleu ciel et cerclé d'une bande bleue, des câbles,
// un portique métallique sur le toit (avec son antenne parabolique) et le bus scolaire tout bleu, capot devant
function makeBalloonBus() {
  const root = new Group()
  const lit = (color, extra = {}) => new MeshStandardMaterial({ color, roughness: 0.55, ...extra })
  const add = (geometry, material, [x, y, z], parent = root) => {
    const mesh = new Mesh(geometry, material)
    mesh.position.set(x, y, z)
    parent.add(mesh)
    return mesh
  }
  // Le ballon : bandes horizontales, de haut en bas
  const balloon = document.createElement("canvas")
  balloon.width = 16
  balloon.height = 256
  const g = balloon.getContext("2d")
  for (const [from, to, color] of [[0, 70, "#5cc8ec"], [70, 150, "#f6fbff"], [150, 190, "#5cc8ec"], [190, 256, "#f6fbff"]]) {
    g.fillStyle = color
    g.fillRect(0, from, 16, to - from)
  }
  const map = new CanvasTexture(balloon)
  map.colorSpace = SRGBColorSpace
  const envelope = add(new SphereGeometry(1.7, 28, 20), lit("#ffffff", { map }), [0, 4.6, 0])
  envelope.scale.y = 1.12
  add(new CylinderGeometry(0.75, 0.5, 0.6, 20), lit("#f6fbff"), [0, 2.75, 0]) // la jupe, sous le ballon
  add(new CylinderGeometry(0.12, 0.16, 0.18, 10), lit("#c9a35a", { metalness: 0.8, roughness: 0.3 }), [0, 6.55, 0]) // la soupape
  // Les câbles, des coins du bus jusqu'à la jupe
  const steel = lit("#8a9099", { metalness: 0.7, roughness: 0.35 })
  for (const [x, z] of [[-1.05, -0.4], [1.05, -0.4], [-1.05, 0.4], [1.05, 0.4]]) {
    const from = new Vector3(x, 1.05, z), to = new Vector3(x * 0.4, 2.5, z * 0.8)
    const rope = add(new CylinderGeometry(0.018, 0.018, from.distanceTo(to), 4), steel, [0, 0, 0])
    rope.position.copy(from).lerp(to, 0.5)
    rope.quaternion.setFromUnitVectors(new Vector3(0, 1, 0), to.clone().sub(from).normalize())
  }
  // Le portique sur le toit, l'antenne parabolique et un tuyau jaune qui pend
  add(new BoxGeometry(1.0, 0.06, 0.06), steel, [0.1, 1.45, 0])
  for (const x of [-0.35, 0.55]) add(new CylinderGeometry(0.03, 0.03, 0.42, 6), steel, [x, 1.24, 0])
  add(new BoxGeometry(0.3, 0.25, 0.3), lit("#3a3f47"), [0.1, 1.15, 0])
  const dish = add(new SphereGeometry(0.22, 14, 8, 0, Math.PI * 2, 0, Math.PI / 3), lit("#d8dde3", { side: DoubleSide }), [-0.7, 1.35, 0.15])
  dish.rotation.z = 1.1
  const hose = new CatmullRomCurve3([new Vector3(-0.5, 1.1, 0.42), new Vector3(-1.0, 0.95, 0.5), new Vector3(-1.25, 0.6, 0.45)])
  root.add(new Mesh(new TubeGeometry(hose, 12, 0.035, 6), lit("#e8c21a")))
  // Le bus : la caisse, le capot à l'avant (+x), une bande de vitres sombres, les phares, les pare-chocs et les roues aux jantes jaunes
  const blue = lit("#2f56c8")
  add(new BoxGeometry(2.2, 0.9, 0.95), blue, [-0.15, 0.55, 0])
  add(new BoxGeometry(0.5, 0.55, 0.85), blue, [1.2, 0.38, 0])
  const glass = lit("#1a2340", { roughness: 0.2 })
  add(new BoxGeometry(1.9, 0.32, 0.97), glass, [-0.2, 0.75, 0])
  add(new BoxGeometry(0.06, 0.36, 0.8), glass, [0.94, 0.74, 0])
  for (const z of [-0.3, 0.3]) add(new SphereGeometry(0.06, 10, 8), new MeshBasicMaterial({ color: "#fff2a0" }), [1.46, 0.45, z])
  for (const x of [1.47, -1.27]) add(new BoxGeometry(0.06, 0.1, 0.98), lit("#1a1c22"), [x, 0.16, 0])
  const tyre = lit("#141418"), hub = lit("#f0c419", { metalness: 0.4, roughness: 0.4 })
  for (const x of [-0.85, 1.05]) for (const z of [-0.48, 0.48]) {
    const wheel = add(new CylinderGeometry(0.22, 0.22, 0.16, 16), tyre, [x, 0.12, z])
    wheel.rotation.x = Math.PI / 2
    const cap = add(new CylinderGeometry(0.1, 0.1, 0.17, 12), hub, [x, 0.12, z])
    cap.rotation.x = Math.PI / 2
  }
  return root
}

// La parade de Paprika : des portiques rouges, des grenouilles en fanfare sur une voiture jaune, un daruma,
// un feu tricolore, un frigo, un dinosaure vert, un robot et des bannières, sous une pluie de confettis
function makeParade() {
  const lit = (color) => new MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 0.3, roughness: 0.6 })
  const mesh = (geometry, material, [x, y, z] = [0, 0, 0], parent) => {
    const m = new Mesh(geometry, material)
    m.position.set(x, y, z)
    parent?.add(m)
    return m
  }
  const red = lit("#d8322a"), green = lit("#4fb33a"), white = lit("#f4f2ea"), yellow = lit("#f0c419"), dark = lit("#2a2c33")
  const frog = (parent, x, y) => {
    mesh(new SphereGeometry(0.22, 12, 10), green, [x, y + 0.2, 0], parent)
    for (const z of [-0.1, 0.1]) mesh(new SphereGeometry(0.07, 8, 6), white, [x + 0.12, y + 0.4, z], parent)
  }
  const guests = [
    // Un portique rouge
    (g) => {
      for (const z of [-0.6, 0.6]) mesh(new CylinderGeometry(0.08, 0.08, 1.8, 10), red, [0, 0.9, z], g)
      mesh(new BoxGeometry(0.22, 0.14, 1.7), red, [0, 1.85, 0], g)
      mesh(new BoxGeometry(0.16, 0.1, 1.4), red, [0, 1.55, 0], g)
    },
    // La voiture jaune et ses grenouilles musiciennes
    (g) => {
      mesh(new BoxGeometry(1.4, 0.5, 0.8), yellow, [0, 0.35, 0], g)
      mesh(new BoxGeometry(0.8, 0.35, 0.75), yellow, [-0.1, 0.78, 0], g)
      for (const x of [-0.5, 0.5]) mesh(new CylinderGeometry(0.16, 0.16, 0.85, 12), dark, [x, 0.12, 0], g).rotation.x = Math.PI / 2
      frog(g, -0.35, 0.95)
      frog(g, 0.15, 0.95)
      frog(g, 0.55, 0.55)
    },
    // Un daruma rouge
    (g) => {
      mesh(new SphereGeometry(0.5, 16, 12), red, [0, 0.5, 0], g).scale.y = 1.15
      mesh(new CircleGeometry(0.24, 16), white, [0.47, 0.62, 0], g).rotation.y = Math.PI / 2
    },
    // Un feu tricolore sur son poteau
    (g) => {
      mesh(new CylinderGeometry(0.05, 0.05, 1.6, 8), dark, [0, 0.8, 0], g)
      mesh(new BoxGeometry(0.2, 0.6, 0.22), dark, [0, 1.75, 0], g)
      ;["#e0453a", "#f0c419", "#3ccf6a"].forEach((c, k) => mesh(new SphereGeometry(0.07, 8, 6), new MeshBasicMaterial({ color: c }), [0.11, 1.93 - k * 0.18, 0], g))
    },
    // Un frigo qui marche
    (g) => {
      mesh(new BoxGeometry(0.75, 1.5, 0.65), white, [0, 0.75, 0], g)
      mesh(new BoxGeometry(0.06, 0.45, 0.06), dark, [0.38, 1.05, 0.2], g)
    },
    // Un dinosaure vert, le plus grand de la parade
    (g) => {
      mesh(new CapsuleGeometry(0.45, 0.8, 6, 12), green, [0, 1.0, 0], g)
      mesh(new SphereGeometry(0.35, 14, 10), green, [0.35, 2.0, 0], g)
      mesh(new BoxGeometry(0.35, 0.12, 0.35), white, [0.62, 1.88, 0], g)
      mesh(new ConeGeometry(0.25, 0.9, 8), green, [-0.6, 0.6, 0], g).rotation.z = 1.9
    },
    // Un robot jouet
    (g) => {
      mesh(new BoxGeometry(0.7, 0.8, 0.5), lit("#9aa3b5"), [0, 0.6, 0], g)
      mesh(new BoxGeometry(0.5, 0.42, 0.42), lit("#9aa3b5"), [0, 1.25, 0], g)
      for (const z of [-0.12, 0.12]) mesh(new SphereGeometry(0.06, 8, 6), red, [0.22, 1.28, z], g)
    },
    // Deux grandes bannières blanches bordées de vert
    (g) => {
      for (const x of [-0.3, 0.3]) {
        mesh(new CylinderGeometry(0.03, 0.03, 2.4, 6), dark, [x, 1.2, -0.1], g)
        mesh(new BoxGeometry(0.04, 1.3, 0.3), white, [x, 1.6, 0.06], g)
        mesh(new BoxGeometry(0.045, 1.3, 0.05), green, [x, 1.6, 0.22], g)
      }
    },
  ]
  const root = new Group()
  const members = guests.map((build, k) => {
    const g = new Group()
    build(g)
    g.position.x = -k * FLYERS.parade.gap
    root.add(g)
    return g
  })
  // Des confettis qui flottent au-dessus du cortège
  const count = 140
  const positions = new Float32Array(count * 3), colors = new Float32Array(count * 3)
  const palette = ["#ffd36a", "#ff7ad0", "#5aa0ff", "#9fe2a0", "#ff8a2a"].map((c) => new Color(c))
  const rand = random(19)
  for (let k = 0; k < count; k++) {
    positions.set([-rand() * guests.length * FLYERS.parade.gap, rand() * 3, (rand() - 0.5) * 2], k * 3)
    palette[k % palette.length].toArray(colors, k * 3)
  }
  const geometry = new BufferGeometry()
  geometry.setAttribute("position", new Float32BufferAttribute(positions, 3))
  geometry.setAttribute("color", new Float32BufferAttribute(colors, 3))
  const confetti = new Points(geometry, new PointsMaterial({ size: 0.09, vertexColors: true }))
  root.add(confetti)
  return { root, members, confetti }
}

// Petite suite pseudo-aléatoire : les nuages ont la même forme à chaque visite
function random(seed) {
  let s = seed
  return () => ((s = (s * 16807) % 2147483647) - 1) / 2147483646
}

// Les boules d'un nuage sont fusionnées en un seul objet : un seul dessin par nuage
function makeCloud(rand, material, ball) {
  const parts = []
  const puff = new Object3D()
  const add = () => {
    puff.updateMatrix()
    parts.push(ball.clone().applyMatrix4(puff.matrix))
  }
  const puffs = 5 + Math.floor(rand() * 4)
  for (let k = 0; k < puffs; k++) {
    const t = puffs === 1 ? 0 : k / (puffs - 1) - 0.5 // de -0.5 à 0.5 le long du nuage
    const r = 1.1 + (1 - Math.abs(t) * 1.6) * (0.8 + rand() * 0.7) // plus gros au milieu
    puff.position.set(t * 6 + (rand() - 0.5) * 0.8, r * 0.35 + rand() * 0.4, (rand() - 0.5) * 1.5)
    puff.scale.set(r, r * 0.85, r)
    add()
  }
  // Un dessous plat, comme un vrai cumulus
  puff.scale.set(3.4, 0.6, 1.3)
  puff.position.set(0, 0.3, 0)
  add()
  return new Mesh(mergeGeometries(parts), material)
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

// Où est le curseur : dans la fenêtre, et pas sur une carte de texte ou un bouton (le ciel est derrière eux)
// Sur écran tactile, pas de survol : un toucher sur l'engin lance sa musique (`tap`, en coordonnées de -1 à 1)
const cursor = { inside: false, overText: false, tap: null }
if (typeof window !== "undefined") {
  window.addEventListener(
    "pointerup",
    (e) => {
      if (e.pointerType === "mouse" || e.target?.closest?.("[data-card], nav, button, a")) return
      cursor.tap = { x: (e.clientX / window.innerWidth) * 2 - 1, y: 1 - (e.clientY / window.innerHeight) * 2 }
    },
    { passive: true },
  )
  window.addEventListener(
    "pointermove",
    (e) => {
      cursor.inside = true
      cursor.overText = !!e.target?.closest?.("[data-card], nav, button, a")
    },
    { passive: true },
  )
  document.documentElement.addEventListener("mouseleave", () => (cursor.inside = false))
}
// Le survol ne passe pas par les événements de la scène : l'immeuble les intercepte, et ils se déclenchent pièce par pièce
const ray = new Raycaster()
const hitbox = new Box3()

// Le bord de l'écran, à la hauteur `y` et la profondeur `z` : le x qui se projette sur `edge` (-1 à gauche, 1 à droite)
const at = new Vector3()
function screenEdge(camera, y, z, edge) {
  let lo = -200, hi = 200
  for (let k = 0; k < 24; k++) {
    const mid = (lo + hi) / 2
    if (at.set(mid, y, z).project(camera).x < edge) lo = mid
    else hi = mid
  }
  return (lo + hi) / 2
}

export default function DaySky({ day, reducedMotion }) {
  const group = useRef()
  const daylight = useRef(day.current ? 1 : 0)
  const listen = useRef({ wait: 0, seen: {}, playing: {} }).current // le survol des engins volants

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
    const bus = makeBalloonBus()
    bus.scale.setScalar(FLYERS.bus.scale)
    bus.position.set(0, FLYERS.bus.y, FLYERS.bus.z)
    bus.visible = false
    const parade = makeParade()
    parade.root.scale.setScalar(FLYERS.parade.scale)
    parade.root.position.set(0, FLYERS.parade.y, FLYERS.parade.z)
    parade.root.visible = false
    return { material, ink, clouds, birds, moon, disc, aura, bus, parade }
  }, [])

  useFrame((state, delta) => {
    const goal = day.current ? 1 : 0
    const d = (daylight.current = reducedMotion ? goal : MathUtils.damp(daylight.current, goal, 1.5, delta))
    sky.moon.visible = d < 0.99
    sky.disc.material.opacity = sky.aura.material.opacity = 1 - d
    // Le bus le jour, la parade la nuit : chacun traverse le ciel de gauche à droite, une fois par période
    const time = state.clock.elapsedTime
    // De juste hors de l'écran à gauche jusqu'à juste hors de l'écran à droite ; `trail` : la longueur de ce qui suit la tête
    const across = ({ period, crossing, y, z, pad }, offset, trail = 0) => {
      const t = (time + offset) % period
      if (t >= crossing) return null
      const left = screenEdge(state.camera, y, z, -1) - pad
      const right = screenEdge(state.camera, y, z, 1) + pad + trail
      return MathUtils.lerp(left, right, t / crossing)
    }
    const busX = reducedMotion ? null : across(FLYERS.bus, 20)
    sky.bus.visible = d > 0.5 && busX !== null
    if (sky.bus.visible) {
      sky.bus.position.x = busX
      sky.bus.position.y = FLYERS.bus.y + Math.sin(time * 0.5) * 0.3
      sky.bus.rotation.z = Math.sin(time * 0.7) * 0.03
    }
    const paradeX = reducedMotion ? null : across(FLYERS.parade, 8, (sky.parade.members.length - 1) * FLYERS.parade.gap * FLYERS.parade.scale)
    sky.parade.root.visible = d < 0.5 && paradeX !== null
    if (sky.parade.root.visible) {
      sky.parade.root.position.x = paradeX
      sky.parade.members.forEach((m, k) => {
        m.position.y = Math.abs(Math.sin(time * 3 + k)) * 0.4
        m.rotation.z = Math.sin(time * 3 + k) * 0.15
      })
      // Les confettis retombent doucement et remontent en haut du cortège
      const pos = sky.parade.confetti.geometry.attributes.position
      for (let k = 0; k < pos.count; k++) pos.setY(k, (pos.getY(k) - delta * 0.6 + 3) % 3)
      pos.needsUpdate = true
    }
    // Survolé (et visible), un engin joue sa musique ; quitté, elle s'arrête un peu après
    listen.wait -= delta
    if (QUALITY.hover && listen.wait <= 0) {
      listen.wait = HOVER.every
      ray.setFromCamera(state.pointer, state.camera)
      for (const [object, { clip }] of [[sky.bus, FLYERS.bus], [sky.parade.root, FLYERS.parade]]) {
        const over = object.visible && cursor.inside && !cursor.overText && ray.ray.intersectsBox(hitbox.setFromObject(object).expandByScalar(HOVER.margin))
        if (over) {
          listen.seen[clip] = time
          if (!listen.playing[clip]) sound.clip(clip)
          listen.playing[clip] = true
        } else if (listen.playing[clip] && time - listen.seen[clip] > HOVER.grace) {
          sound.stopClip(clip)
          listen.playing[clip] = false
        }
      }
    }
    if (cursor.tap) {
      ray.setFromCamera(cursor.tap, state.camera)
      cursor.tap = null
      for (const [object, { clip }] of [[sky.bus, FLYERS.bus], [sky.parade.root, FLYERS.parade]])
        if (object.visible && ray.ray.intersectsBox(hitbox.setFromObject(object).expandByScalar(HOVER.margin))) sound.clip(clip)
    }
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
      <primitive object={sky.parade.root} />
      <group ref={group}>
        {sky.clouds.map(({ cloud }, k) => (
          <primitive key={`c${k}`} object={cloud} />
        ))}
        {sky.birds.map(({ bird }, k) => (
          <primitive key={`b${k}`} object={bird} />
        ))}
        <primitive object={sky.bus} />
      </group>
    </>
  )
}
