import {
  BackSide,
  BoxGeometry,
  CapsuleGeometry,
  CanvasTexture,
  CatmullRomCurve3,
  CircleGeometry,
  Color,
  ConeGeometry,
  CylinderGeometry,
  DoubleSide,
  ExtrudeGeometry,
  FrontSide,
  Group,
  LatheGeometry,
  MathUtils,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  NearestFilter,
  PlaneGeometry,
  PointLight,
  RepeatWrapping,
  Shape,
  SRGBColorSpace,
  SphereGeometry,
  TorusGeometry,
  TubeGeometry,
  Vector2,
  Vector3,
} from "three"

// Objets de décor ajoutés aux pièces. Chacun est fait en mètres et renvoie { root, animate(time, night) }.

// --- À la place des globes : le cube violet de la chambre et la boule de cristal à quatre étoiles du bureau ---
// Chacun tourne dans son `spinner`, un clic le fait tourner plus vite (voir Apartment)

// Petite suite pseudo-aléatoire : les motifs sont les mêmes à chaque visite
function seeded(seed) {
  let s = seed
  return () => ((s = (s * 16807) % 2147483647) - 1) / 2147483646
}

// Une face du cube : violet profond, gravée de lignes qui brillent
function cubeFaceTexture() {
  const n = 512
  const canvas = document.createElement("canvas")
  canvas.width = canvas.height = n
  const g = canvas.getContext("2d")
  const glow = g.createRadialGradient(n / 2, n / 2, n * 0.1, n / 2, n / 2, n * 0.75)
  glow.addColorStop(0, "#6a2bb8")
  glow.addColorStop(1, "#2a0b52")
  g.fillStyle = glow
  g.fillRect(0, 0, n, n)
  const rand = seeded(11)
  g.strokeStyle = "#e3b8ff"
  g.fillStyle = "#e3b8ff"
  g.lineCap = "round"
  g.shadowColor = "#c77dff"
  g.shadowBlur = 18
  // Le cadre de la face, puis des tracés en équerre qui partent du bord vers le centre
  g.lineWidth = 10
  g.strokeRect(26, 26, n - 52, n - 52)
  g.lineWidth = 7
  for (let k = 0; k < 14; k++) {
    let x = 60 + Math.floor(rand() * 8) * 56, y = 60 + Math.floor(rand() * 8) * 56
    g.beginPath()
    g.moveTo(x, y)
    for (let step = 0; step < 3; step++) {
      if (rand() < 0.5) x += (rand() < 0.5 ? -1 : 1) * 56 * (1 + Math.floor(rand() * 2))
      else y += (rand() < 0.5 ? -1 : 1) * 56 * (1 + Math.floor(rand() * 2))
      x = Math.min(n - 60, Math.max(60, x))
      y = Math.min(n - 60, Math.max(60, y))
      g.lineTo(x, y)
    }
    g.stroke()
    g.beginPath()
    g.arc(x, y, 10, 0, Math.PI * 2)
    g.fill()
  }
  const texture = new CanvasTexture(canvas)
  texture.colorSpace = SRGBColorSpace
  return texture
}

// `size` : l'arête du cube, en unités du monde, l'origine au centre. Kevin est posé à plat et ne bouge pas :
// violet sombre qui luit un peu au repos, il s'allume quand `lit` monte vers 1 (au survol).
export function makeGlowCube(size) {
  const root = new Group()
  const spinner = new Group()
  root.add(spinner)
  const face = cubeFaceTexture()
  const material = new MeshStandardMaterial({ map: face, color: "#9a7ab8", emissiveMap: face, emissive: "#ffffff", emissiveIntensity: 0.1, roughness: 0.35, metalness: 0.2 })
  const cube = new Mesh(new BoxGeometry(size, size, size), material)
  cube.castShadow = true
  spinner.add(cube)
  // Un halo autour, plus fort la nuit
  const halo = new Mesh(new SphereGeometry(size * 1.05, 24, 16), new MeshBasicMaterial({ color: "#b46bff", transparent: true, opacity: 0.12, depthWrite: false }))
  root.add(halo)
  const light = new PointLight("#b46bff", 1, size * 8, 2)
  root.add(light)
  return {
    root,
    spinner,
    lit: 0,
    animate(time, night) {
      const pulse = 0.85 + Math.sin(time * 2) * 0.15
      const on = (0.25 + 0.75 * this.lit) * pulse // une petite lueur au repos, pleine au survol
      material.emissiveIntensity = 0.08 + 0.05 * night + on * (0.9 + 0.6 * night)
      halo.material.opacity = on * (0.08 + 0.12 * night)
      light.intensity = on * (0.6 + 1.5 * night)
    },
  }
}

// La boule : du verre orange transparent, quatre étoiles rouges opaques qui flottent en son centre
function starShape(r) {
  const shape = new Shape()
  for (let k = 0; k < 10; k++) {
    const a = Math.PI / 2 + (k * Math.PI) / 5
    const d = k % 2 ? r * 0.42 : r
    if (k === 0) shape.moveTo(Math.cos(a) * d, Math.sin(a) * d)
    else shape.lineTo(Math.cos(a) * d, Math.sin(a) * d)
  }
  shape.closePath()
  return shape
}

// `radius` : celui de la boule, en unités du monde ; elle repose sur un petit coussin
export function makeStarBall(radius) {
  const root = new Group()
  const spinner = new Group()
  root.add(spinner)
  const r = radius * 0.8
  // Les étoiles : en relief, groupées au milieu, chacune un peu inclinée
  const star = new ExtrudeGeometry(starShape(r * 0.2), { depth: r * 0.08, bevelEnabled: false })
  star.center()
  const red = new MeshStandardMaterial({ color: "#d8261c", emissive: "#a01008", emissiveIntensity: 0.3, roughness: 0.4 })
  for (const [x, y, z] of [[-0.24, 0.22, 0.06], [0.24, 0.22, -0.06], [-0.22, -0.22, -0.05], [0.22, -0.22, 0.05]]) {
    const mesh = new Mesh(star, red)
    mesh.position.set(x * r, y * r, z * r)
    mesh.rotation.y = x * 0.6
    spinner.add(mesh)
  }
  // Le verre, vu de l'intérieur puis de l'extérieur, pour qu'on voie les étoiles à travers
  const glass = new MeshStandardMaterial({ color: "#ffa21f", emissive: "#ff7a10", emissiveIntensity: 0.15, roughness: 0.05, metalness: 0.1, transparent: true, opacity: 0.4, depthWrite: false })
  for (const side of [BackSide, FrontSide]) {
    const ball = new Mesh(new SphereGeometry(r, 40, 28), glass.clone())
    ball.material.side = side
    spinner.add(ball)
  }
  const cushion = new Mesh(new TorusGeometry(radius * 0.42, radius * 0.16, 10, 24), new MeshStandardMaterial({ color: "#8a1f2a", roughness: 0.9 }))
  cushion.rotation.x = Math.PI / 2
  cushion.position.y = -radius * 0.78
  root.add(cushion)
  return {
    root,
    spinner,
    animate(time, night) {
      red.emissiveIntensity = 0.25 + 0.5 * night
      spinner.children.forEach((child) => child.material !== red && (child.material.emissiveIntensity = 0.12 + 0.35 * night))
    },
  }
}


// --- Guirlande lumineuse au-dessus de la fenêtre de la chambre ---

// `scale` : unités du monde par mètre, pour que fil et ampoules soient à la taille de la pièce
export function makeGarland(from, to, sag, scale, count = 14) {
  const root = new Group()
  const mid = from.clone().lerp(to, 0.5).add(new Vector3(0, -sag, 0))
  const curve = new CatmullRomCurve3([from, from.clone().lerp(mid, 0.5).add(new Vector3(0, -sag * 0.35, 0)), mid, to.clone().lerp(mid, 0.5).add(new Vector3(0, -sag * 0.35, 0)), to])
  root.add(new Mesh(new TubeGeometry(curve, 40, 0.006 * scale, 4), new MeshStandardMaterial({ color: "#2a2a2a" })))
  const bulbs = []
  for (let i = 0; i < count; i++) {
    const material = new MeshStandardMaterial({ color: "#fff1cf", emissive: i % 3 === 1 ? "#ffd36a" : "#ffb46b", emissiveIntensity: 1.5 })
    const bulb = new Mesh(new SphereGeometry(0.035 * scale, 8, 6), material)
    bulb.position.copy(curve.getPoint((i + 0.5) / count)).add(new Vector3(0, -0.03 * scale, 0))
    root.add(bulb)
    bulbs.push(material)
  }
  return {
    root,
    animate(time, night) {
      bulbs.forEach((b, i) => (b.emissiveIntensity = (0.25 + 0.75 * night) * (1.3 + Math.sin(time * 1.7 + i * 1.9) * 0.5)))
    },
  }
}

// --- Horloge murale de la salle de classe, à l'heure de Paris ---

// Cadran : les douze chiffres et le nom de la ville
function clockFace() {
  const canvas = document.createElement("canvas")
  canvas.width = canvas.height = 256
  const g = canvas.getContext("2d")
  g.fillStyle = "#f6f3ea"
  g.fillRect(0, 0, 256, 256)
  g.fillStyle = "#1a1d6a"
  g.textAlign = "center"
  g.textBaseline = "middle"
  g.font = "bold 26px Georgia, serif"
  for (let k = 1; k <= 12; k++) {
    const a = (k / 12) * Math.PI * 2
    g.fillText(String(k), 128 + Math.sin(a) * 86, 128 - Math.cos(a) * 86)
  }
  g.font = "13px Georgia, serif"
  g.fillText("PARIS", 128, 170)
  const texture = new CanvasTexture(canvas)
  texture.colorSpace = SRGBColorSpace
  return texture
}

export function makeClock() {
  const root = new Group()
  const face = new Mesh(new CylinderGeometry(0.15, 0.15, 0.02, 32), new MeshStandardMaterial({ color: "#f6f3ea", roughness: 0.6 }))
  face.rotation.x = Math.PI / 2
  root.add(face)
  const dial = new Mesh(new CircleGeometry(0.14, 48), new MeshStandardMaterial({ map: clockFace(), roughness: 0.6 }))
  dial.position.z = 0.0105
  root.add(dial)
  const rim = new Mesh(new TorusGeometry(0.15, 0.012, 8, 32), new MeshStandardMaterial({ color: "#1a1d6a", roughness: 0.4 }))
  root.add(rim)
  const ink = new MeshStandardMaterial({ color: "#1a1d6a" })
  for (let k = 0; k < 12; k++) {
    const tick = new Mesh(new BoxGeometry(0.008, k % 3 ? 0.014 : 0.026, 0.004), ink)
    const a = (k / 12) * Math.PI * 2
    tick.position.set(Math.sin(a) * 0.125, Math.cos(a) * 0.125, 0.012)
    tick.rotation.z = -a
    root.add(tick)
  }
  const hand = (length, width, material) => {
    const pivot = new Group()
    pivot.position.z = 0.014
    const bar = new Mesh(new BoxGeometry(width, length, 0.004), material)
    bar.position.y = length / 2 - 0.01
    pivot.add(bar)
    root.add(pivot)
    return pivot
  }
  const hours = hand(0.07, 0.012, ink), minutes = hand(0.105, 0.008, ink), seconds = hand(0.115, 0.003, new MeshStandardMaterial({ color: "#c0392b" }))
  const axle = new Mesh(new CylinderGeometry(0.01, 0.01, 0.01, 12), new MeshStandardMaterial({ color: "#c0392b" }))
  axle.rotation.x = Math.PI / 2
  axle.position.z = 0.018
  root.add(axle)
  const parisTime = new Intl.DateTimeFormat("fr-FR", { timeZone: "Europe/Paris", hour: "numeric", minute: "numeric", second: "numeric", hourCycle: "h23" })
  let last = -1
  return {
    root,
    animate() {
      const now = Date.now()
      if (now - last < 500) return
      last = now
      const [h, m, s] = parisTime.format(now).split(":").map(Number)
      seconds.rotation.z = -(s / 60) * Math.PI * 2
      minutes.rotation.z = -((m + s / 60) / 60) * Math.PI * 2
      hours.rotation.z = -(((h % 12) + m / 60) / 12) * Math.PI * 2
    },
  }
}

// --- Sac à dos posé au pied de la chaise ---
// La poche avant est tournée vers le visiteur (-z), les bretelles contre la chaise (+z)

function patchTexture() {
  const canvas = document.createElement("canvas")
  canvas.width = canvas.height = 128
  const g = canvas.getContext("2d")
  g.fillStyle = "#ffd36a"
  g.beginPath()
  g.arc(64, 64, 62, 0, Math.PI * 2)
  g.fill()
  g.fillStyle = "#1a1d6a"
  g.beginPath()
  g.arc(64, 64, 52, 0, Math.PI * 2)
  g.fill()
  // Un cadenas : la cybersécurité
  g.strokeStyle = "#ffd36a"
  g.lineWidth = 9
  g.beginPath()
  g.arc(64, 54, 17, Math.PI, 0)
  g.stroke()
  g.fillStyle = "#ffd36a"
  g.fillRect(40, 54, 48, 36)
  g.fillStyle = "#1a1d6a"
  g.fillRect(61, 64, 6, 14)
  const texture = new CanvasTexture(canvas)
  texture.colorSpace = SRGBColorSpace
  return texture
}

export function makeBackpack() {
  const root = new Group()
  const fabric = new MeshStandardMaterial({ color: "#2d3a6b", roughness: 0.9 })
  const darker = new MeshStandardMaterial({ color: "#222c52", roughness: 0.9 })
  const accent = new MeshStandardMaterial({ color: "#ffd36a", roughness: 0.6 })
  const metal = new MeshStandardMaterial({ color: "#d9dde5", metalness: 0.9, roughness: 0.3 })
  const add = (mesh, [x, y, z]) => {
    mesh.position.set(x, y, z)
    root.add(mesh)
    return mesh
  }
  add(new Mesh(new BoxGeometry(0.3, 0.38, 0.16), fabric), [0, 0.19, 0])
  const top = add(new Mesh(new CylinderGeometry(0.08, 0.08, 0.3, 16, 1, false, 0, Math.PI), fabric), [0, 0.38, 0])
  top.rotation.z = Math.PI / 2
  // Poche avant et ses fermetures éclair
  add(new Mesh(new BoxGeometry(0.24, 0.17, 0.05), darker), [0, 0.12, -0.1])
  add(new Mesh(new BoxGeometry(0.22, 0.01, 0.01), accent), [0, 0.2, -0.126])
  add(new Mesh(new BoxGeometry(0.26, 0.01, 0.01), accent), [0, 0.33, -0.082])
  for (const [x, y, z] of [[0.09, 0.19, -0.128], [-0.11, 0.32, -0.084]]) add(new Mesh(new BoxGeometry(0.012, 0.03, 0.006), metal), [x, y, z])
  // Écusson sur la poche
  const patch = add(new Mesh(new CircleGeometry(0.045, 24), new MeshStandardMaterial({ map: patchTexture(), roughness: 0.8 })), [0.04, 0.12, -0.1255])
  patch.rotation.y = Math.PI
  // Poignée sur le dessus, bretelles au dos
  const handle = add(new Mesh(new TorusGeometry(0.035, 0.008, 6, 14, Math.PI), darker), [0, 0.45, 0])
  handle.rotation.y = Math.PI / 2
  for (const x of [-0.08, 0.08]) {
    const strap = add(new Mesh(new BoxGeometry(0.05, 0.34, 0.02), darker), [x, 0.2, 0.09])
    strap.rotation.x = 0.08
  }
  // Gourde dans la poche de côté
  add(new Mesh(new BoxGeometry(0.03, 0.12, 0.12), darker), [0.165, 0.08, 0])
  add(new Mesh(new CylinderGeometry(0.03, 0.03, 0.2, 14), new MeshStandardMaterial({ color: "#2fb39a", roughness: 0.3, metalness: 0.4 })), [0.17, 0.15, 0])
  add(new Mesh(new CylinderGeometry(0.02, 0.022, 0.03, 12), new MeshStandardMaterial({ color: "#16171c" })), [0.17, 0.265, 0])
  // Porte-clés : un anneau et une petite clé dorée
  add(new Mesh(new TorusGeometry(0.012, 0.002, 6, 12), metal), [-0.11, 0.29, -0.09])
  add(new Mesh(new BoxGeometry(0.008, 0.035, 0.003), accent), [-0.11, 0.26, -0.09])
  root.rotation.x = 0.18 // appuyé contre le pied de la chaise
  root.traverse((c) => c.isMesh && (c.castShadow = true))
  return { root, animate() {} }
}

// --- Au bureau : une bouteille d'eau et une banane ---

export function makeWaterBottle() {
  const root = new Group()
  const profile = (points) => points.map(([r, y]) => new Vector2(r, y))
  // Bouteille en plastique transparent, l'eau aux deux tiers
  const plastic = new MeshStandardMaterial({ color: "#e8f6ff", roughness: 0.05, metalness: 0.1, transparent: true, opacity: 0.3, depthWrite: false, side: DoubleSide })
  root.add(new Mesh(new LatheGeometry(profile([[0, 0], [0.034, 0], [0.036, 0.01], [0.036, 0.16], [0.03, 0.19], [0.014, 0.215], [0.013, 0.225]]), 24), plastic))
  const water = new MeshStandardMaterial({ color: "#7cc8f2", roughness: 0.1, transparent: true, opacity: 0.55, depthWrite: false })
  root.add(new Mesh(new LatheGeometry(profile([[0, 0.004], [0.032, 0.004], [0.033, 0.012], [0.033, 0.13], [0, 0.13]]), 24), water))
  // Bouchon bleu et étiquette avec une goutte
  const cap = new Mesh(new CylinderGeometry(0.015, 0.015, 0.018, 16), new MeshStandardMaterial({ color: "#2a6cff", roughness: 0.4 }))
  cap.position.y = 0.234
  root.add(cap)
  const canvas = document.createElement("canvas")
  canvas.width = 512
  canvas.height = 96
  const g = canvas.getContext("2d")
  g.fillStyle = "#ffffff"
  g.fillRect(0, 0, 512, 96)
  for (const x of [128, 384]) {
    g.fillStyle = "#2a6cff"
    g.beginPath()
    g.moveTo(x - 50, 18)
    g.quadraticCurveTo(x - 30, 48, x - 50, 78)
    g.quadraticCurveTo(x - 70, 48, x - 50, 18)
    g.fill()
    g.font = "bold 34px sans-serif"
    g.textBaseline = "middle"
    g.fillText("EAU", x - 22, 50)
  }
  const texture = new CanvasTexture(canvas)
  texture.colorSpace = SRGBColorSpace
  const label = new Mesh(new CylinderGeometry(0.0365, 0.0365, 0.045, 24, 1, true), new MeshStandardMaterial({ map: texture, roughness: 0.6 }))
  label.position.y = 0.09
  label.rotation.y = Math.PI / 2 // une goutte face au personnage (-z)
  root.add(label)
  return { root, animate() {} }
}

// Banane couchée sur le bureau : un fuseau à cinq pans, plus fin aux deux bouts, courbé à plat dans le plan du bureau
export function makeBanana() {
  const radius = 0.021, length = 0.17, bend = 0.13 // en mètres ; bend : rayon de la courbure
  const half = length / 2 + radius
  const rings = Array.from({ length: 25 }, (_, i) => {
    const t = (i / 24) * 2 - 1
    return new Vector2(radius * Math.sqrt(1 - t * t) * (1 - 0.15 * t * t) + (Math.abs(t) === 1 ? 0 : 0.001), t * half)
  })
  const geometry = new LatheGeometry(rings, 5)
  const pos = geometry.attributes.position
  const v = new Vector3()
  // Un point le long de l'arc : `along` de -half à +half, `out` vers l'extérieur de la courbe
  const arc = (along, out, up) => {
    const a = along / bend
    return new Vector3((bend + out) * Math.sin(a), up, (bend + out) * Math.cos(a) - bend)
  }
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i)
    pos.setXYZ(i, ...arc(v.y, v.x, v.z * 0.9 + radius * 0.85).toArray())
  }
  geometry.computeVertexNormals()
  const root = new Group()
  const banana = new Mesh(geometry, new MeshStandardMaterial({ color: "#ffd84a", roughness: 0.55, flatShading: true }))
  banana.castShadow = true
  root.add(banana)
  // Le bout brun et la queue verte
  const tip = new Mesh(new SphereGeometry(0.008, 8, 6), new MeshStandardMaterial({ color: "#5a3a1a", roughness: 0.8 }))
  tip.position.copy(arc(-half + 0.004, 0, radius * 0.85))
  root.add(tip)
  const stem = new Mesh(new CylinderGeometry(0.004, 0.006, 0.022, 6), new MeshStandardMaterial({ color: "#7a8a3a" }))
  const end = half + 0.005
  stem.position.copy(arc(end, 0, radius * 0.85))
  stem.quaternion.setFromUnitVectors(new Vector3(0, 1, 0), new Vector3(Math.cos(end / bend), 0, -Math.sin(end / bend)))
  root.add(stem)
  return { root, animate() {} }
}

// --- Mini baie réseau sur le bureau du NOC : panneau de brassage, switch et NAS, reliés par des jarretières ---

// En mètres, l'origine au centre du dessous, la façade vers -z (côté personnage)
const RACK = { width: 0.3, depth: 0.22, height: 0.22, wall: 0.008, ports: 8, pitch: 0.024 }
const PATCH_COLORS = ["#2a6cff", "#ffd23a", "#e0453a", "#2fb35a", "#d9dde5", "#ff8a2a", "#9a5aff", "#2a6cff"]

// Abscisse du port `k` (0 = le plus à gauche vu de face, donc côté +x)
const portX = (k) => ((RACK.ports - 1) / 2 - k) * RACK.pitch

// Façade imprimée d'un appareil : `draw(g, w, h, xToPx)` dessine sur un canevas aux proportions de la façade
function faceTexture(width, height, draw) {
  const w = 1024, h = Math.round((w * height) / width)
  const canvas = document.createElement("canvas")
  canvas.width = w
  canvas.height = h
  const g = canvas.getContext("2d")
  draw(g, w, h, (x) => (0.5 - x / width) * w)
  const texture = new CanvasTexture(canvas)
  texture.colorSpace = SRGBColorSpace
  texture.anisotropy = 8
  return texture
}

// Un appareil de 1U : une boîte dont seule la façade (-z) porte la texture
function rackUnit(height, color, draw) {
  const W = RACK.width - 2 * RACK.wall
  const body = new MeshStandardMaterial({ color, roughness: 0.5, metalness: 0.4 })
  const face = new MeshStandardMaterial({ map: faceTexture(W, height, draw), roughness: 0.55, metalness: 0.2 })
  // Faces de la boîte : +x, -x, +y, -y, +z, -z
  const mesh = new Mesh(new BoxGeometry(W, height, RACK.depth - 0.03), [body, body, body, body, body, face])
  mesh.castShadow = true
  return mesh
}

const label = (g, text, x, y, size, color, align = "left") => {
  g.fillStyle = color
  g.font = `bold ${size}px sans-serif`
  g.textAlign = align
  g.textBaseline = "middle"
  g.fillText(text, x, y)
}

export function makeSwitch() {
  const root = new Group()
  const { width: W, depth: D, height: H, wall } = RACK
  const front = -D / 2
  const steel = new MeshStandardMaterial({ color: "#23262d", roughness: 0.5, metalness: 0.6 })

  // Le caisson : flancs, dessus, fond et dos fermés, façade ouverte
  for (const [w, h, d, x, y, z] of [
    [wall, H, D, W / 2 - wall / 2, H / 2, 0],
    [wall, H, D, -W / 2 + wall / 2, H / 2, 0],
    [W, wall, D, 0, H - wall / 2, 0],
    [W, wall, D, 0, wall / 2, 0],
    [W, H, wall, 0, H / 2, D / 2 - wall / 2],
  ]) {
    const panel = new Mesh(new BoxGeometry(w, h, d), steel)
    panel.position.set(x, y, z)
    panel.castShadow = true
    root.add(panel)
  }
  // Grille d'aération sur les flancs, et quatre petits pieds
  const slot = new MeshStandardMaterial({ color: "#0c0d10" })
  for (const side of [-1, 1]) {
    for (let k = 0; k < 6; k++) {
      const vent = new Mesh(new BoxGeometry(0.002, 0.008, 0.12), slot)
      vent.position.set(side * (W / 2 + 0.0005), H - 0.05 - k * 0.016, 0.01)
      root.add(vent)
    }
  }
  const rubber = new MeshStandardMaterial({ color: "#111111", roughness: 0.9 })
  for (const [x, z] of [[-1, -1], [-1, 1], [1, -1], [1, 1]]) {
    const foot = new Mesh(new CylinderGeometry(0.01, 0.01, 0.006, 10), rubber)
    foot.position.set(x * (W / 2 - 0.025), -0.003, z * (D / 2 - 0.025))
    root.add(foot)
  }

  const U = 0.044
  const leds = []
  const sockets = new MeshStandardMaterial({ color: "#07080b" })
  const unitZ = front + 0.015 + (D - 0.03) / 2 // les appareils affleurent la façade
  // Une prise RJ45 creusée dans la façade, avec ses diodes si elle en a
  const addPort = (x, y, withLeds) => {
    const socket = new Mesh(new BoxGeometry(0.016, 0.013, 0.004), sockets)
    socket.position.set(x, y, front + 0.0135)
    root.add(socket)
    if (!withLeds) return
    for (const dx of [-0.0055, 0.0055]) {
      const material = new MeshStandardMaterial({ color: "#0a2a12", emissive: dx < 0 ? "#3dff7a" : "#ffb02e", emissiveIntensity: 1 })
      const led = new Mesh(new BoxGeometry(0.003, 0.002, 0.002), material)
      led.position.set(x + dx, y + 0.0085, front + 0.0145)
      root.add(led)
      leds.push(material)
    }
  }

  // En haut, le panneau de brassage : chaque prise est numérotée et nommée (la pièce où arrive le câble)
  const ROOMS = ["NOC", "NOC", "SALLE", "SALLE", "BUR-1", "BUR-2", "IMPR", "WIFI"]
  const patchY = H - wall - 0.012 - U / 2
  const patch = rackUnit(U, "#2b2f38", (g, w, h, px) => {
    g.fillStyle = "#2b2f38"
    g.fillRect(0, 0, w, h)
    label(g, "PATCH", 22, h * 0.5, 30, "#d9dde5")
    for (let k = 0; k < RACK.ports; k++) {
      const x = px(portX(k))
      // Étiquette blanche au-dessus de la prise, et son numéro en dessous
      g.fillStyle = "#f2f2ec"
      g.fillRect(x - 40, 6, 80, 30)
      label(g, ROOMS[k], x, 22, 20, "#1a1d24", "center")
      label(g, String(k + 1).padStart(2, "0"), x, h - 20, 22, "#ffd23a", "center")
    }
  })
  patch.position.set(0, patchY, unitZ)
  root.add(patch)

  // Au milieu, le switch : sa marque, ses ports numérotés, sa diode d'alimentation
  const switchY = patchY - U - 0.022
  const sw = rackUnit(U, "#3a4150", (g, w, h, px) => {
    g.fillStyle = "#3a4150"
    g.fillRect(0, 0, w, h)
    g.fillStyle = "#2a6cff"
    g.fillRect(0, 0, w, 8)
    label(g, "GC-NET", 22, h * 0.42, 34, "#ffffff")
    label(g, "SW-8 · 1G", 22, h * 0.75, 20, "#9aa3b5")
    for (let k = 0; k < RACK.ports; k++) label(g, String(k + 1), px(portX(k)), h - 18, 20, "#d9dde5", "center")
  })
  sw.position.set(0, switchY, unitZ)
  root.add(sw)
  const power = new Mesh(new SphereGeometry(0.003, 8, 6), new MeshStandardMaterial({ color: "#0a2a12", emissive: "#3dff7a", emissiveIntensity: 2 }))
  power.position.set(-W / 2 + 0.03, switchY, front + 0.014)
  root.add(power)

  // En bas, le NAS : deux tiroirs de disques avec leurs voyants
  const nasY = wall + 0.006 + 0.03
  const nas = rackUnit(0.06, "#1c1f26", (g, w, h) => {
    g.fillStyle = "#1c1f26"
    g.fillRect(0, 0, w, h)
    for (const x of [w * 0.22, w * 0.5]) {
      g.fillStyle = "#2c313c"
      g.fillRect(x - 120, 18, 240, h - 36)
      g.fillStyle = "#14161b"
      for (let k = 0; k < 6; k++) g.fillRect(x - 100, 32 + k * 18, 200, 6)
    }
    label(g, "NAS", w * 0.72, h * 0.4, 40, "#d9dde5", "center")
    label(g, "2 × 4 To", w * 0.72, h * 0.7, 22, "#9aa3b5", "center")
  })
  nas.position.set(0, nasY, unitZ)
  root.add(nas)
  for (const x of [W * 0.28, W * 0]) {
    const material = new MeshStandardMaterial({ color: "#0a1a2a", emissive: "#3da5ff", emissiveIntensity: 1 })
    const led = new Mesh(new BoxGeometry(0.004, 0.004, 0.002), material)
    led.position.set(x - 0.03, nasY + 0.022, front + 0.0145)
    root.add(led)
    leds.push(material)
  }

  // Les prises, puis les jarretières : de chaque prise du panneau à la même prise du switch, en une boucle courte
  for (let k = 0; k < RACK.ports; k++) {
    addPort(portX(k), patchY - 0.003, false)
    addPort(portX(k), switchY - 0.003, true)
  }
  const nasPort = { x: -W / 2 + 0.06, y: nasY - 0.012 }
  addPort(nasPort.x, nasPort.y, false)
  const cable = (a, b, color, reach) => {
    const material = new MeshStandardMaterial({ color, roughness: 0.6 })
    // Prise transparente à chaque bout, avec son manchon de la couleur du câble
    for (const end of [a, b]) {
      const plug = new Mesh(new BoxGeometry(0.014, 0.011, 0.018), material)
      plug.position.set(end.x, end.y, front + 0.005)
      root.add(plug)
    }
    const out = front - 0.004
    const path = new CatmullRomCurve3([
      new Vector3(a.x, a.y, out),
      new Vector3(a.x, a.y - 0.004, out - reach * 0.6),
      new Vector3((a.x + b.x) / 2, (a.y + b.y) / 2, out - reach),
      new Vector3(b.x, b.y + 0.004, out - reach * 0.6),
      new Vector3(b.x, b.y, out),
    ])
    root.add(new Mesh(new TubeGeometry(path, 20, 0.0028, 6), material))
  }
  for (let k = 0; k < RACK.ports - 1; k++) {
    cable({ x: portX(k), y: patchY - 0.003 }, { x: portX(k), y: switchY - 0.003 }, PATCH_COLORS[k], 0.022 + (k % 3) * 0.006)
  }
  // Le dernier port du switch descend vers le NAS
  cable({ x: portX(RACK.ports - 1), y: switchY - 0.003 }, nasPort, PATCH_COLORS[RACK.ports - 1], 0.035)

  // Sur le dessus, la box wifi et ses deux antennes
  const white = new MeshStandardMaterial({ color: "#eef0f3", roughness: 0.5 })
  const router = new Mesh(new BoxGeometry(0.16, 0.03, 0.11), white)
  router.position.set(0.03, H + 0.015, 0.01)
  router.castShadow = true
  root.add(router)
  for (const side of [-1, 1]) {
    const antenna = new Mesh(new CylinderGeometry(0.004, 0.005, 0.11, 8), white)
    antenna.position.set(0.03 + side * 0.065, H + 0.075, 0.06)
    antenna.rotation.z = side * -0.25
    root.add(antenna)
  }
  for (let k = 0; k < 4; k++) {
    const material = new MeshStandardMaterial({ color: "#0a1a2a", emissive: "#3da5ff", emissiveIntensity: 1 })
    const led = new Mesh(new BoxGeometry(0.006, 0.003, 0.002), material)
    led.position.set(0.09 - k * 0.014, H + 0.018, 0.01 - 0.056)
    root.add(led)
    leds.push(material)
  }

  return {
    root,
    animate(time) {
      // Chaque diode clignote à son rythme, comme du trafic
      leds.forEach((led, k) => (led.emissiveIntensity = Math.sin(time * (6 + (k % 7) * 1.7) + k * 2.3) > 0.2 ? 2 : 0.2))
    },
  }
}

// --- Lampe à lave orange sur le bureau de la chambre ---

// `scale` : unités du monde par mètre, pour la portée de sa lumière
export function makeLavaLamp(scale) {
  const root = new Group()
  const metal = new MeshStandardMaterial({ color: "#b0703a", roughness: 0.3, metalness: 0.8 })
  const profile = (points) => points.map(([r, y]) => new Vector2(r, y))
  root.add(new Mesh(new LatheGeometry(profile([[0, 0], [0.07, 0], [0.06, 0.05], [0.042, 0.11], [0, 0.11]]), 24), metal))
  // Verre : large en bas, fin en haut
  const glass = new MeshStandardMaterial({ color: "#ff8a2a", emissive: "#ff5a00", emissiveIntensity: 0.4, transparent: true, opacity: 0.55, roughness: 0.1, depthWrite: false })
  root.add(new Mesh(new LatheGeometry(profile([[0.042, 0.11], [0.06, 0.2], [0.03, 0.36]]), 24), glass))
  root.add(new Mesh(new LatheGeometry(profile([[0.03, 0.36], [0.026, 0.41], [0, 0.415]]), 24), metal))
  // Bulles de cire qui montent et redescendent lentement
  const wax = new MeshStandardMaterial({ color: "#ffb347", emissive: "#ff7a10", emissiveIntensity: 1 })
  const blobs = [0, 1, 2, 3, 4].map((i) => {
    const blob = new Mesh(new SphereGeometry(0.018 + (i % 3) * 0.006, 14, 10), wax)
    root.add(blob)
    return { blob, phase: i * 1.3, speed: 0.12 + (i % 3) * 0.05 }
  })
  const light = new PointLight("#ff8a2a", 1, 1.4 * scale, 2)
  light.position.y = 0.25
  root.add(light)
  return {
    root,
    animate(time, night) {
      for (const { blob, phase, speed } of blobs) {
        const p = 0.5 - 0.5 * Math.cos(time * speed + phase) // 0 en bas, 1 en haut
        const wide = 0.055 - p * 0.03 // le verre se resserre en montant
        blob.position.set(Math.sin(time * 0.3 + phase * 2) * wide * 0.3, 0.13 + p * 0.19, Math.cos(time * 0.25 + phase) * wide * 0.3)
        blob.scale.set(1 + Math.sin(time * 0.7 + phase) * 0.15, 1.1 + Math.cos(time * 0.5 + phase) * 0.25, 1)
      }
      const glow = 0.4 + 0.8 * night
      wax.emissiveIntensity = glow
      glass.emissiveIntensity = glow * 0.5
      light.intensity = (0.3 + 1.2 * night) * (1 + Math.sin(time * 1.3) * 0.08)
    },
  }
}

// --- Le tableau de la classe : la série et la transformée de Fourier ---

// `aspect` : largeur / hauteur du tableau
export function fourierTexture(aspect) {
  const h = 640, w = Math.round(h * aspect)
  const canvas = document.createElement("canvas")
  canvas.width = w
  canvas.height = h
  const g = canvas.getContext("2d")
  g.fillStyle = "#f6f6f1"
  g.fillRect(0, 0, w, h)
  const text = (str, x, y, size, color = "#1d2a6b", style = "italic") => {
    g.fillStyle = color
    g.font = `${style} ${size}px Georgia, serif`
    g.fillText(str, x, y)
  }
  const left = 40
  text("Séries de Fourier", left, 70, 40, "#b02a2a", "bold")
  g.fillRect(left, 82, 310, 3)
  text("f(x) = a₀/2 + Σ [ aₙ cos(nωx) + bₙ sin(nωx) ]", left, 150, 34)
  text("aₙ = (2/T) ∫ f(x) cos(nωx) dx", left, 230, 32)
  text("bₙ = (2/T) ∫ f(x) sin(nωx) dx", left, 290, 32)
  text("Transformée de Fourier", left, 380, 30, "#b02a2a", "bold")
  text("F(ω) = ∫ f(t) e^(−iωt) dt", left, 445, 36)
  text("ω = 2π / T", left, 530, 30, "#2a7a3a")
  // Signal carré et ses premières harmoniques, à droite (s'il y a la place)
  const gw = Math.min(360, w - 760)
  if (gw > 160) {
    const gx = w - gw - 40, gy = 300, gh = 110
    g.lineWidth = 3
    g.strokeStyle = "#1d2a6b"
    g.beginPath()
    g.moveTo(gx, gy)
    g.lineTo(gx + gw, gy)
    g.moveTo(gx, gy - gh - 20)
    g.lineTo(gx, gy + gh + 20)
    g.stroke()
    const curve = (terms, color) => {
      g.strokeStyle = color
      g.beginPath()
      for (let i = 0; i <= 240; i++) {
        const x = (i / 240) * 4 * Math.PI
        let y = 0
        for (let n = 1; n <= terms * 2; n += 2) y += Math.sin(n * x) / n
        g.lineTo(gx + (i / 240) * gw, gy - (y * 4) / Math.PI * gh * 0.8)
      }
      g.stroke()
    }
    curve(1, "#2a7a3a")
    curve(3, "#d07a1a")
    curve(25, "#b02a2a")
    text("1, 3 et 25 harmoniques", gx, gy + gh + 60, 24)
  }
  const texture = new CanvasTexture(canvas)
  texture.colorSpace = SRGBColorSpace
  texture.anisotropy = 8
  return texture
}

// --- Les livres de l'étagère de la chambre ---

// Les romans de l'étagère du haut (les mangas sont sur celle du bas, voir MANGAS)
export const BOOKS = [
  { title: "LE PETIT PRINCE", volume: "", paper: "#f6f1e6", ink: "#1d3f8a", weight: "bold" },
  { title: "L'ALCHIMISTE", volume: "", paper: "#e9d8a6", ink: "#8a3a1a", weight: "bold" },
  { title: "LE HOBBIT", volume: "", paper: "#6b4a2a", ink: "#e8c66a", weight: "bold" },
  { title: "LE SEIGNEUR DES ANNEAUX", volume: "", paper: "#1f3a2a", ink: "#e8c66a", weight: "" },
  { title: "HARRY POTTER", volume: "1", paper: "#7a1a1a", ink: "#ffd36a", weight: "bold" },
  { title: "HARRY POTTER", volume: "2", paper: "#1f3a6b", ink: "#ffd36a", weight: "bold" },
]

// Tranche d'un livre, à la proportion `aspect` (largeur / hauteur) : titre vertical, numéro en bas
export function bookTexture({ title, volume, paper, ink, weight }, aspect) {
  const h = 512, w = Math.max(64, Math.round(h * aspect))
  const canvas = document.createElement("canvas")
  canvas.width = w
  canvas.height = h
  const g = canvas.getContext("2d")
  g.fillStyle = paper
  g.fillRect(0, 0, w, h)
  g.fillStyle = ink
  g.fillRect(0, 22, w, 6)
  g.fillRect(0, h - 28, w, 6)
  g.textAlign = "center"
  g.textBaseline = "middle"
  g.save()
  g.translate(w / 2, h / 2 - (volume ? 24 : 0))
  g.rotate(Math.PI / 2)
  const room = h - (volume ? 150 : 90)
  let size = w * 0.6
  g.font = `${weight} ${size}px Georgia, serif`
  const width = g.measureText(title).width
  if (width > room) size *= room / width
  g.font = `${weight} ${size}px Georgia, serif`
  g.fillText(title, 0, 0)
  g.restore()
  if (volume) {
    g.font = `bold ${w * 0.45}px Georgia, serif`
    g.fillText(volume, w / 2, h - 75)
  }
  const texture = new CanvasTexture(canvas)
  texture.colorSpace = SRGBColorSpace
  texture.anisotropy = 4
  return texture
}

// --- Éclairage RGB : la couleur fait le tour de l'arc-en-ciel, chaque pièce avec son décalage ---

function rainbow(material, time, offset, power) {
  material.emissive.setHSL((((time * 0.06 + offset) % 1) + 1) % 1, 1, 0.5)
  material.emissiveIntensity = power
}
const rgbMaterial = () => new MeshStandardMaterial({ color: "#111111", emissive: "#ff00ff", emissiveIntensity: 1.5, roughness: 0.4 })

// Une texture retournée de gauche à droite : le PC gamer est construit à l'envers puis retourné (voir makeGamingPC)
function mirrored(texture) {
  texture.repeat.x = -1
  texture.offset.x = 1
  return texture
}

// La carte mère vue de face, l'arrière du boîtier à gauche : la plaque des ports, les dissipateurs autour du processeur,
// les slots de RAM, deux slots PCIe, le dissipateur du chipset et des pistes partout
function motherboardTexture() {
  const s = 512
  const canvas = document.createElement("canvas")
  canvas.width = canvas.height = s
  const g = canvas.getContext("2d")
  g.fillStyle = "#222833"
  g.fillRect(0, 0, s, s)
  const rand = seeded(31)
  g.strokeStyle = "#3c4860"
  g.lineWidth = 2
  for (let k = 0; k < 70; k++) {
    let x = rand() * s, y = rand() * s
    g.beginPath()
    g.moveTo(x, y)
    for (let step = 0; step < 3; step++) {
      if (step % 2) y += (rand() - 0.5) * 120
      else x += (rand() - 0.5) * 120
      g.lineTo(x, y)
    }
    g.stroke()
  }
  // Un bloc en relief : un fond, un bord clair en haut, des ailettes
  const block = (x, y, w, h, color, fins = 0) => {
    g.fillStyle = color
    g.fillRect(x, y, w, h)
    g.fillStyle = "rgba(255, 255, 255, 0.12)"
    g.fillRect(x, y, w, 4)
    g.fillStyle = "rgba(0, 0, 0, 0.35)"
    for (let k = 1; k <= fins; k++) g.fillRect(x + (w * k) / (fins + 1), y + 6, 3, h - 12)
  }
  block(0, 20, 90, 190, "#3a3f4a") // la plaque des ports
  g.fillStyle = "#e0453a"
  g.fillRect(8, 30, 4, 170)
  block(110, 24, 230, 56, "#6a7180", 12) // les dissipateurs des étages d'alimentation, en L
  block(100, 80, 54, 170, "#6a7180", 3)
  block(180, 110, 130, 130, "#2b2f38") // le socle du processeur
  g.strokeStyle = "#8a909c"
  g.strokeRect(195, 125, 100, 100)
  for (let k = 0; k < 4; k++) block(360 + k * 26, 40, 14, 250, "#0d0e12") // les slots de RAM
  block(470, 130, 30, 120, "#e8e8ec") // la prise 24 broches
  for (const y of [320, 430]) {
    block(40, y, 360, 18, "#0d0e12")
    g.fillStyle = "#a9aeb8"
    g.fillRect(40, y - 3, 360, 3)
  }
  block(60, 365, 260, 40, "#6a7180", 8) // le dissipateur du SSD M.2
  block(380, 370, 110, 110, "#6a7180") // le chipset
  g.fillStyle = "#e0453a"
  g.font = "bold 22px sans-serif"
  g.textAlign = "center"
  g.fillText("GC-01", 435, 432)
  const texture = new CanvasTexture(canvas)
  texture.colorSpace = SRGBColorSpace
  texture.anisotropy = 8
  return texture
}

// L'écran rond du bloc de watercooling : la température du processeur sur fond dégradé
function pumpTexture() {
  const s = 256
  const canvas = document.createElement("canvas")
  canvas.width = canvas.height = s
  const g = canvas.getContext("2d")
  const bg = g.createRadialGradient(s / 2, s / 2, 10, s / 2, s / 2, s / 2)
  bg.addColorStop(0, "#3a1a6a")
  bg.addColorStop(1, "#0a0a18")
  g.fillStyle = bg
  g.fillRect(0, 0, s, s)
  g.strokeStyle = "#ff4fd8"
  g.lineWidth = 12
  g.beginPath()
  g.arc(s / 2, s / 2, s * 0.38, Math.PI * 0.75, Math.PI * 1.9)
  g.stroke()
  g.fillStyle = "#ffffff"
  g.textAlign = "center"
  g.font = "bold 70px sans-serif"
  g.fillText("42°", s / 2, s / 2 + 22)
  g.font = "24px sans-serif"
  g.fillStyle = "#c8b8ff"
  g.fillText("CPU", s / 2, s / 2 + 62)
  const texture = new CanvasTexture(canvas)
  texture.colorSpace = SRGBColorSpace
  return texture
}

// Ventilateur vu de face (vers -z) : anneau lumineux, pales qui tournent, moyeu
function makeFan(radius, ring) {
  const fan = new Group()
  const frame = new Mesh(new TorusGeometry(radius, radius * 0.12, 8, 32), ring)
  fan.add(frame)
  const blades = new Group()
  const plastic = new MeshStandardMaterial({ color: "#1b1d24", roughness: 0.6 })
  for (let k = 0; k < 7; k++) {
    const blade = new Mesh(new BoxGeometry(radius * 0.32, radius * 0.85, radius * 0.04), plastic)
    blade.position.y = radius * 0.5
    const arm = new Group()
    arm.rotation.z = (k / 7) * Math.PI * 2
    blade.rotation.y = 0.5
    arm.add(blade)
    blades.add(arm)
  }
  fan.add(blades)
  const hub = new Mesh(new CylinderGeometry(radius * 0.28, radius * 0.28, radius * 0.1, 16), plastic)
  hub.rotation.x = Math.PI / 2
  fan.add(hub)
  return { fan, blades }
}

// --- Le PC gamer de la chambre : vitre latérale, ventilateurs RGB, carte mère détaillée, watercooling et son radiateur, carte graphique, RAM ---
// W : largeur (x), D : profondeur (z, la façade est en -z), H : hauteur, en mètres. La vitre est côté -x.
export function makeGamingPC(W, D, H, scale) {
  const root = new Group()
  const body = new Group()
  body.scale.x = -1 // construit vitre en -x, puis retourné : la vitre passe en +x, du côté de la caméra
  root.add(body)
  const black = new MeshStandardMaterial({ color: "#121318", roughness: 0.35, metalness: 0.6 })
  const dark = new MeshStandardMaterial({ color: "#1c1f27", roughness: 0.6, metalness: 0.3 })
  const glass = new MeshStandardMaterial({ color: "#8fa6d8", roughness: 0.05, metalness: 0.2, transparent: true, opacity: 0.1, depthWrite: false })
  const t = 0.012
  const box = (w, h, d, [x, y, z], material) => {
    const mesh = new Mesh(new BoxGeometry(w, h, d), material)
    mesh.position.set(x, y, z)
    body.add(mesh)
    return mesh
  }
  // Boîtier
  box(W, t, D, [0, t / 2, 0], black)
  box(W, t, D, [0, H - t / 2, 0], black)
  box(t, H, D, [W / 2 - t / 2, H / 2, 0], black)
  box(W, H, t, [0, H / 2, D / 2 - t / 2], black)
  box(W, H, t, [0, H / 2, -D / 2 + t / 2], dark)
  box(t * 0.4, H - 2 * t, D - 2 * t, [-W / 2 + t / 2, H / 2, 0], glass)
  for (const y of [t, H - t]) box(t, t, D, [-W / 2 + t / 2, y, 0], black) // montants de la vitre
  // Pieds
  for (const x of [-W / 3, W / 3]) for (const z of [-D / 3, D / 3]) box(0.03, 0.012, 0.05, [x, -0.006, z], black)

  const lights = [] // [matériau, décalage de couleur]
  const glow = () => {
    const material = rgbMaterial()
    lights.push([material, lights.length * 0.07])
    return material
  }
  // Trois ventilateurs en façade
  const fans = []
  const r = Math.min(W * 0.4, H / 7)
  for (let k = 0; k < 3; k++) {
    const { fan, blades } = makeFan(r, glow())
    fan.position.set(0, H * (0.24 + k * 0.26), -D / 2 - 0.003)
    body.add(fan)
    fans.push(blades)
  }
  // Ventilateur arrière, vu à travers la vitre
  const rear = makeFan(r * 0.8, glow())
  rear.fan.position.set(-W * 0.05, H * 0.76, D / 2 - t - 0.012)
  rear.fan.rotation.y = Math.PI
  body.add(rear.fan)
  fans.push(rear.blades)

  // Carte mère contre la paroi opaque : circuits, dissipateurs, slots (voir motherboardTexture)
  const inner = W / 2 - t
  const mb = { d: D * 0.7, h: H * 0.68, y: H * 0.6, z: D * 0.08 }
  const board = new Mesh(new PlaneGeometry(mb.d, mb.h), new MeshStandardMaterial({ map: mirrored(motherboardTexture()), roughness: 0.55, metalness: 0.3 }))
  board.rotation.y = -Math.PI / 2
  board.position.set(inner - 0.003, mb.y, mb.z)
  body.add(board)
  // Le bloc de watercooling sur le processeur : un écran rond qui affiche la température, cerclé de lumière
  const cpu = { y: mb.y + mb.h * 0.12, z: mb.z + mb.d * 0.02 }
  const pump = new Mesh(new CylinderGeometry(0.04, 0.042, 0.035, 32), black)
  pump.rotation.z = Math.PI / 2
  pump.position.set(inner - 0.022, cpu.y, cpu.z)
  body.add(pump)
  const pumpScreen = new Mesh(new CircleGeometry(0.032, 32), new MeshBasicMaterial({ map: mirrored(pumpTexture()), toneMapped: false }))
  pumpScreen.rotation.y = -Math.PI / 2
  pumpScreen.position.set(inner - 0.041, cpu.y, cpu.z)
  body.add(pumpScreen)
  const pumpRing = new Mesh(new TorusGeometry(0.036, 0.004, 8, 32), glow())
  pumpRing.rotation.y = Math.PI / 2
  pumpRing.position.set(inner - 0.04, cpu.y, cpu.z)
  body.add(pumpRing)
  // Le radiateur en haut, avec ses deux ventilateurs qui soufflent vers le bas
  const radiator = { y: H - t - 0.02, d: D * 0.62 }
  box(W * 0.62, 0.028, radiator.d, [-W * 0.08, radiator.y, -D * 0.05], new MeshStandardMaterial({ color: "#23262e", roughness: 0.5, metalness: 0.5 }))
  for (const k of [-1, 1]) {
    const top = makeFan(radiator.d * 0.22, glow())
    top.fan.rotation.x = Math.PI / 2
    top.fan.position.set(-W * 0.08, radiator.y - 0.022, -D * 0.05 + k * radiator.d * 0.25)
    body.add(top.fan)
    fans.push(top.blades)
  }
  // Les deux tuyaux gainés, de la pompe au radiateur
  const sleeve = new MeshStandardMaterial({ color: "#16171d", roughness: 0.7 })
  for (const k of [-1, 1]) {
    const curve = new CatmullRomCurve3([
      new Vector3(inner - 0.03, cpu.y + 0.02 * k, cpu.z + 0.03 * k),
      new Vector3(inner - 0.06, cpu.y + 0.06, cpu.z + 0.06 * k),
      new Vector3(-W * 0.08 + W * 0.2, radiator.y - 0.03, -D * 0.05 + k * radiator.d * 0.45),
    ])
    body.add(new Mesh(new TubeGeometry(curve, 16, 0.007, 8), sleeve))
  }
  // Quatre barrettes de RAM à dissipateur, le haut lumineux
  for (let k = 0; k < 4; k++) {
    const z = cpu.z - 0.065 - k * 0.012
    box(0.036, H * 0.14, 0.008, [inner - 0.02, cpu.y - 0.005, z], new MeshStandardMaterial({ color: "#5a6070", roughness: 0.35, metalness: 0.75 }))
    box(0.038, 0.012, 0.009, [inner - 0.02, cpu.y - 0.005 + H * 0.07, z], glow())
  }
  // Carte graphique couchée : coque, plaque arrière, bande lumineuse côté vitre et ses trois ventilateurs dessous
  const gpu = { w: Math.min(W * 0.5, 0.12), h: H * 0.085, d: D * 0.66, y: H * 0.38, z: D * 0.12 }
  const gx = inner - gpu.w / 2 - 0.004
  box(gpu.w, gpu.h, gpu.d, [gx, gpu.y, gpu.z], new MeshStandardMaterial({ color: "#2c3039", roughness: 0.35, metalness: 0.6 }))
  box(gpu.w, 0.004, gpu.d, [gx, gpu.y + gpu.h / 2 + 0.002, gpu.z], new MeshStandardMaterial({ color: "#9aa0ab", roughness: 0.3, metalness: 0.9 }))
  box(0.004, 0.016, gpu.d * 0.9, [inner - gpu.w - 0.006, gpu.y, gpu.z], glow())
  for (const k of [-1, 0, 1]) {
    const gpuFan = makeFan(gpu.d * 0.13, dark)
    gpuFan.fan.rotation.x = Math.PI / 2
    gpuFan.fan.position.set(gx, gpu.y - gpu.h / 2 - 0.004, gpu.z + k * gpu.d * 0.3)
    body.add(gpuFan.fan)
    fans.push(gpuFan.blades)
  }
  // Son support doré, posé sur le cache-alimentation, et ses câbles d'alimentation gainés
  const shroudTop = t + H * 0.17
  box(0.006, gpu.y - gpu.h / 2 - shroudTop, 0.006, [gx, (shroudTop + gpu.y - gpu.h / 2) / 2, gpu.z - gpu.d * 0.42], new MeshStandardMaterial({ color: "#c9a35a", roughness: 0.3, metalness: 0.85 }))
  const braid = ["#e8e8ec", "#e0453a", "#e8e8ec"].map((color) => new MeshStandardMaterial({ color, roughness: 0.6 }))
  braid.forEach((material, k) => {
    const x = gx - 0.01 + k * 0.008
    const curve = new CatmullRomCurve3([
      new Vector3(x, gpu.y + gpu.h / 2, gpu.z - gpu.d * 0.1),
      new Vector3(x, gpu.y + gpu.h / 2 + 0.03, gpu.z - gpu.d * 0.2),
      new Vector3(x, gpu.y + gpu.h / 2 + 0.02, gpu.z - gpu.d * 0.5),
      new Vector3(x, shroudTop, gpu.z - gpu.d * 0.56),
    ])
    body.add(new Mesh(new TubeGeometry(curve, 16, 0.0035, 6), material))
  })
  // Le gros câble de la carte mère, qui descend le long de son bord avant
  braid.forEach((material, k) => {
    const z = mb.z - mb.d / 2 - 0.012 - k * 0.007
    box(0.007, mb.y + mb.h * 0.15 - shroudTop, 0.007, [inner - 0.02, (shroudTop + mb.y + mb.h * 0.15) / 2, z], material)
  })
  // Un SSD posé sur le cache-alimentation
  box(0.07, 0.008, 0.1, [-W * 0.1, shroudTop + 0.004, D * 0.28], new MeshStandardMaterial({ color: "#2b2e36", roughness: 0.4, metalness: 0.5 }))
  // Ruban lumineux le long de la façade, à l'intérieur
  box(0.006, H * 0.7, 0.006, [-W / 2 + t + 0.01, H * 0.55, -D / 2 + t + 0.01], glow())
  // Cache-alimentation en bas, et un ruban lumineux le long de la vitre, en haut
  box(W - 2 * t, H * 0.17, D - 2 * t, [0, t + H * 0.085, 0], dark)
  box(0.006, 0.006, D - 2 * t, [-W / 2 + t + 0.01, H - t - 0.01, 0], glow())
  // Bouton d'allumage
  const power = new MeshStandardMaterial({ color: "#ffffff", emissive: "#9fd8ff", emissiveIntensity: 1.5 })
  const button = new Mesh(new CylinderGeometry(0.008, 0.008, 0.004, 16), power)
  button.position.set(0, H + 0.002, -D * 0.38)
  body.add(button)

  // Une lumière dans le boîtier, qui suit la couleur des LED, et une autre plus douce qui déborde sur le bureau
  const light = new PointLight("#ff00ff", 1, 0.5 * scale, 2)
  light.position.set(-W * 0.2, H * 0.55, 0)
  body.add(light)
  const spill = new PointLight("#ff00ff", 0.5, 1.2 * scale, 2)
  spill.position.set(-W, H * 0.5, 0)
  body.add(spill)
  return {
    root,
    animate(time, night) {
      const power = 1.2 + 1.3 * night
      for (const [material, offset] of lights) rainbow(material, time, offset, power)
      light.color.copy(lights[0][0].emissive)
      spill.color.copy(lights[0][0].emissive)
      light.intensity = 1.5 + 2 * night
      spill.intensity = 0.2 + 0.6 * night
      for (const blades of fans) blades.rotation.z = -time * 7
    },
  }
}

// --- Casque gamer sur son support, à côté du PC ---

export function makeHeadset() {
  const root = new Group()
  const black = new MeshStandardMaterial({ color: "#16171c", roughness: 0.5, metalness: 0.4 })
  const foam = new MeshStandardMaterial({ color: "#2a2b33", roughness: 0.95 })
  // Le support : socle, tige et crochet
  const base = new Mesh(new CylinderGeometry(0.06, 0.07, 0.012, 24), black)
  base.position.y = 0.006
  root.add(base)
  const pole = new Mesh(new CylinderGeometry(0.008, 0.01, 0.22, 10), black)
  pole.position.y = 0.12
  root.add(pole)
  const hook = new Mesh(new BoxGeometry(0.03, 0.012, 0.06), black)
  hook.position.y = 0.232
  root.add(hook)
  // Arceau et coussinets
  const band = new Mesh(new TorusGeometry(0.085, 0.012, 8, 24, Math.PI), black)
  band.position.y = 0.17
  root.add(band)
  const rings = []
  for (const side of [-1, 1]) {
    const cup = new Mesh(new CylinderGeometry(0.045, 0.045, 0.035, 24), black)
    cup.rotation.z = Math.PI / 2
    cup.position.set(side * 0.09, 0.15, 0)
    root.add(cup)
    const cushion = new Mesh(new TorusGeometry(0.034, 0.012, 8, 20), foam)
    cushion.rotation.y = Math.PI / 2
    cushion.position.set(side * 0.073, 0.15, 0)
    root.add(cushion)
    const ring = new Mesh(new TorusGeometry(0.033, 0.004, 6, 24), rgbMaterial())
    ring.rotation.y = Math.PI / 2
    ring.position.set(side * 0.109, 0.15, 0)
    root.add(ring)
    rings.push(ring.material)
  }
  // Micro replié le long de l'écouteur gauche
  const mic = new Mesh(new CylinderGeometry(0.004, 0.004, 0.1, 6), black)
  mic.position.set(-0.11, 0.13, -0.04)
  mic.rotation.x = 1.1
  root.add(mic)
  return {
    root,
    animate(time, night) {
      rings.forEach((m, k) => rainbow(m, time, 0.3 + k * 0.1, 1 + night))
    },
  }
}

// --- Les tours de la salle de classe : PC de l'école, façade avec ports et voyant ---

export function makeSchoolPC(W, D, H) {
  const root = new Group()
  const grey = new MeshStandardMaterial({ color: "#2b2e36", roughness: 0.5, metalness: 0.4 })
  const face = new MeshStandardMaterial({ color: "#1a1c22", roughness: 0.6 })
  const box = (w, h, d, [x, y, z], material) => {
    const mesh = new Mesh(new BoxGeometry(w, h, d), material)
    mesh.position.set(x, y, z)
    root.add(mesh)
    return mesh
  }
  box(W, H, D, [0, H / 2, 0], grey)
  box(W * 0.92, H * 0.94, 0.006, [0, H / 2, -D / 2 - 0.003], face)
  // Grille d'aération, lecteur, ports USB et bouton avec son voyant bleu
  const slot = new MeshStandardMaterial({ color: "#0c0d10" })
  for (let k = 0; k < 8; k++) box(W * 0.6, 0.006, 0.004, [0, H * (0.2 + k * 0.045), -D / 2 - 0.007], slot)
  box(W * 0.7, H * 0.05, 0.004, [0, H * 0.82, -D / 2 - 0.007], slot)
  for (const x of [-0.012, 0.012]) box(0.012, 0.005, 0.004, [x, H * 0.72, -D / 2 - 0.007], new MeshStandardMaterial({ color: "#2a6cff" }))
  const led = new MeshStandardMaterial({ color: "#ffffff", emissive: "#4aa8ff", emissiveIntensity: 1.5 })
  const button = new Mesh(new CylinderGeometry(0.01, 0.01, 0.006, 16), led)
  button.rotation.x = Math.PI / 2
  button.position.set(0, H * 0.9, -D / 2 - 0.008)
  root.add(button)
  return {
    root,
    animate(time) {
      // Le voyant d'activité du disque clignote de temps en temps
      led.emissiveIntensity = Math.sin(time * 3.1) > 0.6 || Math.sin(time * 7.3) > 0.9 ? 2.2 : 1.1
    },
  }
}

// --- Cahier ouvert sur la table de la classe, avec son stylo ---

function notebookPages() {
  const canvas = document.createElement("canvas")
  canvas.width = 1024
  canvas.height = 720
  const g = canvas.getContext("2d")
  g.fillStyle = "#fbfaf4"
  g.fillRect(0, 0, 1024, 720)
  g.strokeStyle = "#b9cbe6"
  g.lineWidth = 2
  for (let y = 80; y < 720; y += 36) {
    g.beginPath()
    g.moveTo(20, y)
    g.lineTo(1004, y)
    g.stroke()
  }
  g.strokeStyle = "#e3a0a0"
  for (const x of [70, 582]) {
    g.beginPath()
    g.moveTo(x, 0)
    g.lineTo(x, 720)
    g.stroke()
  }
  g.fillStyle = "#c9c6bc"
  g.fillRect(508, 0, 8, 720) // le creux entre les pages
  const ink = (str, x, y, size = 30, color = "#1d2a6b") => {
    g.fillStyle = color
    g.font = `italic ${size}px Georgia, serif`
    g.fillText(str, x, y)
  }
  // Page de gauche : le cours de traitement du signal
  ink("TD — Traitement du signal", 84, 70, 32, "#b02a2a")
  ink("x(t) = Σ cₙ e^(inωt)", 84, 144)
  ink("cₙ = (1/T) ∫ x(t) e^(−inωt) dt", 84, 216)
  ink("Parseval :", 84, 288, 28, "#2a7a3a")
  ink("(1/T) ∫ |x(t)|² dt = Σ |cₙ|²", 84, 324)
  ink("→ spectre de raies", 84, 396)
  // Page de droite : un schéma réseau
  ink("Projet : bastion", 596, 70, 32, "#b02a2a")
  const node = (label, x, y) => {
    g.strokeStyle = "#1d2a6b"
    g.lineWidth = 3
    g.strokeRect(x, y, 120, 56)
    ink(label, x + 14, y + 38, 26)
  }
  node("Admin", 600, 150)
  node("Bastion", 750, 260)
  node("Serveurs", 870, 380)
  g.beginPath()
  g.moveTo(720, 178)
  g.lineTo(750, 288)
  g.moveTo(870, 288)
  g.lineTo(900, 380)
  g.stroke()
  ink("SSH + MFA", 600, 520, 28, "#2a7a3a")
  ink("sessions enregistrées ✓", 600, 580, 26)
  const texture = new CanvasTexture(canvas)
  texture.colorSpace = SRGBColorSpace
  texture.anisotropy = 8
  return texture
}

export function makeNotebook() {
  const root = new Group()
  const cover = new Mesh(new BoxGeometry(0.43, 0.006, 0.3), new MeshStandardMaterial({ color: "#1a1d6a", roughness: 0.8 }))
  cover.position.y = 0.003
  root.add(cover)
  const pages = new Mesh(new PlaneGeometry(0.42, 0.29), new MeshStandardMaterial({ map: notebookPages(), roughness: 0.9 }))
  pages.rotation.x = -Math.PI / 2
  pages.rotation.z = Math.PI // se lit depuis la chaise
  pages.position.y = 0.0075
  root.add(pages)
  // Spirale au milieu
  const metal = new MeshStandardMaterial({ color: "#c8ccd4", metalness: 0.9, roughness: 0.3 })
  for (let k = 0; k < 11; k++) {
    const ring = new Mesh(new TorusGeometry(0.008, 0.0015, 5, 12), metal)
    ring.rotation.x = Math.PI / 2
    ring.rotation.y = Math.PI / 2
    ring.position.set(0, 0.008, -0.13 + k * 0.026)
    root.add(ring)
  }
  // Stylo posé à côté
  const pen = new Group()
  const body = new Mesh(new CylinderGeometry(0.005, 0.005, 0.13, 10), new MeshStandardMaterial({ color: "#2a6cff", roughness: 0.4 }))
  pen.add(body)
  const tip = new Mesh(new ConeGeometry(0.005, 0.014, 10), new MeshStandardMaterial({ color: "#d9dde5", metalness: 0.8 }))
  tip.position.y = 0.072
  pen.add(tip)
  pen.rotation.set(0, 0.4, Math.PI / 2)
  pen.position.set(0.25, 0.006, 0.02)
  root.add(pen)
  root.traverse((c) => c.isMesh && (c.castShadow = true))
  return { root, animate() {} }
}

// --- La PS Vita blanche et bleu clair, posée sur l'étagère de chevet ---

// L'écran : une forêt au soleil, comme en pleine partie
function vitaScreen() {
  const w = 512, h = 292
  const canvas = document.createElement("canvas")
  canvas.width = w
  canvas.height = h
  const g = canvas.getContext("2d")
  const sky = g.createLinearGradient(0, 0, 0, h)
  sky.addColorStop(0, "#cfe8a8")
  sky.addColorStop(1, "#6fa040")
  g.fillStyle = sky
  g.fillRect(0, 0, w, h)
  // Rayons de soleil entre les arbres
  g.fillStyle = "rgba(255, 248, 200, 0.35)"
  for (const x of [120, 260, 380]) {
    g.beginPath()
    g.moveTo(x, 0)
    g.lineTo(x + 40, 0)
    g.lineTo(x + 120, h)
    g.lineTo(x + 40, h)
    g.fill()
  }
  const rand = seeded(9)
  // Trois rangées d'arbres, du fond (clair) vers l'avant (sombre)
  for (const [rows, color, top, size] of [[9, "#7fae4a", 60, 50], [7, "#4f8a32", 90, 70], [5, "#2f5e22", 120, 100]]) {
    for (let k = 0; k < rows; k++) {
      const x = (k + rand() * 0.6) * (w / rows), y = top + rand() * 30
      g.fillStyle = "#4a3420"
      g.fillRect(x - size * 0.06, y, size * 0.12, h - y)
      g.fillStyle = color
      for (const [dx, dy, r] of [[0, 0, 0.5], [-0.3, 0.25, 0.4], [0.3, 0.25, 0.4]]) {
        g.beginPath()
        g.arc(x + dx * size, y + dy * size, r * size, 0, Math.PI * 2)
        g.fill()
      }
    }
  }
  // L'herbe au premier plan, et un petit personnage qui court sur le chemin
  g.fillStyle = "#8fc04a"
  g.fillRect(0, h * 0.82, w, h * 0.18)
  g.fillStyle = "#c9b27a"
  g.fillRect(w * 0.3, h * 0.86, w * 0.4, h * 0.06)
  g.fillStyle = "#2a3a8a"
  g.fillRect(w * 0.48, h * 0.72, 14, 26)
  g.fillStyle = "#f2c9a0"
  g.beginPath()
  g.arc(w * 0.48 + 7, h * 0.7, 8, 0, Math.PI * 2)
  g.fill()
  // L'interface du jeu : une barre de vie, un compteur
  g.fillStyle = "rgba(0, 0, 0, 0.45)"
  g.fillRect(12, 12, 150, 18)
  g.fillStyle = "#e0453a"
  g.fillRect(15, 15, 110, 12)
  g.fillStyle = "#ffffff"
  g.font = "bold 18px sans-serif"
  g.fillText("× 42", w - 70, 28)
  const texture = new CanvasTexture(canvas)
  texture.colorSpace = SRGBColorSpace
  return texture
}

// Le dessus d'un bouton de façade : son symbole en couleur sur fond blanc
function buttonTop(draw) {
  const canvas = document.createElement("canvas")
  canvas.width = canvas.height = 64
  const g = canvas.getContext("2d")
  g.fillStyle = "#f4f6f8"
  g.fillRect(0, 0, 64, 64)
  g.lineWidth = 7
  g.lineJoin = "round"
  draw(g)
  const texture = new CanvasTexture(canvas)
  texture.colorSpace = SRGBColorSpace
  return texture
}
const SYMBOLS = [
  (g) => { // triangle vert
    g.strokeStyle = "#2fb35a"
    g.beginPath()
    g.moveTo(32, 14)
    g.lineTo(50, 46)
    g.lineTo(14, 46)
    g.closePath()
    g.stroke()
  },
  (g) => { // rond rouge
    g.strokeStyle = "#e0453a"
    g.beginPath()
    g.arc(32, 32, 16, 0, Math.PI * 2)
    g.stroke()
  },
  (g) => { // croix bleue
    g.strokeStyle = "#2a6cff"
    g.beginPath()
    g.moveTo(17, 17)
    g.lineTo(47, 47)
    g.moveTo(47, 17)
    g.lineTo(17, 47)
    g.stroke()
  },
  (g) => { // carré rose
    g.strokeStyle = "#e86fb0"
    g.strokeRect(17, 17, 30, 30)
  },
]

// En mètres, posée à plat : l'écran vers le haut, le haut de la console vers -z
export function makePSVita() {
  const root = new Group()
  const white = new MeshStandardMaterial({ color: "#f4f6f8", roughness: 0.22, metalness: 0.1 })
  const blue = new MeshStandardMaterial({ color: "#9fd4f5", roughness: 0.35 })
  const grey = new MeshStandardMaterial({ color: "#c8ccd2", roughness: 0.5 })
  const dark = new MeshStandardMaterial({ color: "#1a1c22", roughness: 0.4 })
  const top = 0.017
  // Coque arrondie : blanche dessus, bleu clair dessous
  for (const [material, y, h] of [[blue, 0.004, 0.008], [white, 0.0125, 0.009]]) {
    const middle = new Mesh(new BoxGeometry(0.13, h, 0.083), material)
    middle.position.y = y
    root.add(middle)
    for (const x of [-0.065, 0.065]) {
      const end = new Mesh(new CylinderGeometry(0.0415, 0.0415, h, 32), material)
      end.position.set(x, y, 0)
      root.add(end)
    }
  }
  // L'écran dans son cadre noir brillant
  const bezel = new Mesh(new BoxGeometry(0.108, 0.001, 0.066), new MeshStandardMaterial({ color: "#0c0d10", roughness: 0.08, metalness: 0.3 }))
  bezel.position.y = top + 0.0003
  root.add(bezel)
  const screen = new Mesh(new PlaneGeometry(0.1, 0.057), new MeshBasicMaterial({ map: vitaScreen(), toneMapped: false }))
  screen.rotation.x = -Math.PI / 2
  screen.position.y = top + 0.0009
  root.add(screen)
  // Croix directionnelle en haut à gauche : quatre flèches dans un creux
  const well = (x, z, r) => {
    const hole = new Mesh(new CircleGeometry(r, 24), grey)
    hole.rotation.x = -Math.PI / 2
    hole.position.set(x, top + 0.0002, z)
    root.add(hole)
  }
  well(-0.077, -0.012, 0.016)
  for (const [dx, dz, w, d] of [[0, -0.0075, 0.006, 0.007], [0, 0.0075, 0.006, 0.007], [-0.0075, 0, 0.007, 0.006], [0.0075, 0, 0.007, 0.006]]) {
    const arrow = new Mesh(new BoxGeometry(w, 0.003, d), white)
    arrow.position.set(-0.077 + dx, top + 0.0015, -0.012 + dz)
    root.add(arrow)
  }
  // Les quatre boutons en haut à droite, avec leurs symboles
  well(0.077, -0.012, 0.017)
  ;[[0, -0.009], [0.009, 0], [0, 0.009], [-0.009, 0]].forEach(([dx, dz], k) => {
    const face = new MeshStandardMaterial({ map: buttonTop(SYMBOLS[k]), roughness: 0.3 })
    const button = new Mesh(new CylinderGeometry(0.0043, 0.0043, 0.003, 16), [white, face, white])
    button.position.set(0.077 + dx, top + 0.0015, -0.012 + dz)
    button.rotation.y = Math.PI / 2 // le symbole à l'endroit, vu de face
    root.add(button)
  })
  // Les deux sticks, sous la croix et sous les boutons, plus près de l'écran
  for (const x of [-0.063, 0.063]) {
    well(x, 0.024, 0.0085)
    const stick = new Mesh(new CylinderGeometry(0.0065, 0.0075, 0.005, 20), grey)
    stick.position.set(x, top + 0.0025, 0.024)
    root.add(stick)
    const cap = new Mesh(new TorusGeometry(0.005, 0.0012, 6, 20), dark)
    cap.rotation.x = Math.PI / 2
    cap.position.set(x, top + 0.005, 0.024)
    root.add(cap)
  }
  // Le bouton central à gauche, Start et Select à droite
  const ps = new Mesh(new CylinderGeometry(0.0035, 0.0035, 0.002, 16), blue)
  ps.position.set(-0.08, top + 0.001, 0.03)
  root.add(ps)
  for (const x of [0.074, 0.086]) {
    const small = new Mesh(new CapsuleGeometry(0.0014, 0.004, 2, 6), grey)
    small.rotation.z = Math.PI / 2
    small.position.set(x, top + 0.0008, 0.032)
    root.add(small)
  }
  // Les grilles des haut-parleurs, de chaque côté de l'écran
  for (const x of [-0.06, 0.06]) {
    for (let k = 0; k < 6; k++) {
      const hole = new Mesh(new CircleGeometry(0.0008, 6), dark)
      hole.rotation.x = -Math.PI / 2
      hole.position.set(x + (k % 3) * 0.002 - 0.002, top + 0.0003, -0.034 + Math.floor(k / 3) * 0.002)
      root.add(hole)
    }
  }
  // Les gâchettes sur la tranche du haut
  for (const x of [-0.07, 0.07]) {
    const trigger = new Mesh(new BoxGeometry(0.03, 0.005, 0.004), grey)
    trigger.position.set(x, 0.012, -0.0425)
    root.add(trigger)
  }
  root.traverse((c) => c.isMesh && (c.castShadow = true))
  return { root, animate() {} }
}

// --- La lampe champignon orange, en verre, sur la table de nuit ---

export function makeMushroomLamp() {
  const root = new Group()
  const glass = new MeshStandardMaterial({ color: "#ff7a1a", emissive: "#ff6a10", emissiveIntensity: 0.8, roughness: 0.15, transparent: true, opacity: 0.9, side: DoubleSide })
  const profile = [[0, 0], [0.065, 0], [0.066, 0.008], [0.04, 0.03], [0.028, 0.08], [0.026, 0.17], [0.03, 0.19], [0.125, 0.2], [0.124, 0.212]]
  // Le chapeau : un dôme
  for (let k = 1; k <= 12; k++) {
    const a = (k / 12) * (Math.PI / 2)
    profile.push([Math.cos(a) * 0.122, 0.212 + Math.sin(a) * 0.1])
  }
  root.add(new Mesh(new LatheGeometry(profile.map(([r, y]) => new Vector2(r, y)), 32), glass))
  return { root, glass, bulb: new Vector3(0, 0.24, 0) }
}

// --- Plante tombante : ses tiges passent par-dessus le bord avant de l'étagère (+z) avant de pendre ---

export function makeTrailingPlant() {
  const root = new Group()
  const pot = new Mesh(new CylinderGeometry(0.06, 0.045, 0.1, 20), new MeshStandardMaterial({ color: "#f2ede4", roughness: 0.7 }))
  pot.position.y = 0.05
  root.add(pot)
  const soil = new Mesh(new CylinderGeometry(0.056, 0.056, 0.01, 20), new MeshStandardMaterial({ color: "#3b2416" }))
  soil.position.y = 0.096
  root.add(soil)
  const leafColors = ["#3f8f3a", "#58a84a", "#2f7a35"].map((color) => new MeshStandardMaterial({ color, roughness: 0.7 }))
  const stem = new MeshStandardMaterial({ color: "#3a6b2a" })
  const vines = []
  for (let k = 0; k < 7; k++) {
    const a = -0.7 + (k / 6) * 1.4 // en éventail vers l'avant
    const out = new Vector3(Math.sin(a), 0, Math.cos(a))
    const length = 0.2 + ((k * 37) % 5) * 0.05
    const pivot = new Group()
    pivot.position.set(out.x * 0.05, 0.1, out.z * 0.05)
    root.add(pivot)
    const curve = new CatmullRomCurve3([
      new Vector3(0, 0, 0),
      out.clone().multiplyScalar(0.06).add(new Vector3(0, 0.015, 0)),
      out.clone().multiplyScalar(0.15).add(new Vector3(0, -0.01, 0)),
      out.clone().multiplyScalar(0.19).add(new Vector3(0, -0.07, 0)),
      out.clone().multiplyScalar(0.2).add(new Vector3(0, -length, 0)),
    ])
    pivot.add(new Mesh(new TubeGeometry(curve, 16, 0.0025, 4), stem))
    for (let i = 1; i <= 8; i++) {
      const leaf = new Mesh(new SphereGeometry(0.016, 8, 6), leafColors[(i + k) % 3])
      leaf.position.copy(curve.getPoint(i / 8.5))
      leaf.scale.set(1, 0.35, 0.8)
      leaf.rotation.set(i * 0.7, i * 1.3, 0)
      pivot.add(leaf)
    }
    vines.push(pivot)
  }
  // Quelques feuilles dressées au-dessus du pot
  for (let i = 0; i < 6; i++) {
    const leaf = new Mesh(new SphereGeometry(0.02, 8, 6), leafColors[i % 3])
    leaf.position.set(Math.cos(i) * 0.03, 0.115 + (i % 2) * 0.012, Math.sin(i) * 0.03)
    leaf.scale.set(1, 0.4, 0.7)
    leaf.rotation.set(0.4, i, 0.3)
    root.add(leaf)
  }
  return {
    root,
    animate(time) {
      vines.forEach((v, k) => (v.rotation.x = Math.sin(time * 0.6 + k * 1.7) * 0.06))
    },
  }
}

// --- Les DVD de la deuxième étagère : la tranche vers la pièce (+z) ---

// Couleurs reprises des affiches
export const DVDS = [
  { title: "LES ÉVADÉS", volume: "", paper: "#1b2a4a", ink: "#e8eef8", weight: "bold" },
  { title: "LE PARRAIN", volume: "", paper: "#0d0d0d", ink: "#f0f0f0", weight: "" },
  { title: "MEMORIES OF MURDER", volume: "", paper: "#2b2f2a", ink: "#e6e2d6", weight: "" },
  { title: "SEVEN", volume: "", paper: "#b8401a", ink: "#f6e7c8", weight: "bold" },
  { title: "SNATCH", volume: "", paper: "#f2f0ea", ink: "#d49a10", weight: "bold" },
  { title: "ONCE UPON A TIME IN HOLLYWOOD", volume: "", paper: "#e8b04a", ink: "#7a1f1a", weight: "bold" },
  { title: "PAPRIKA", volume: "", paper: "#d9342b", ink: "#fff1cf", weight: "bold" },
  { title: "her", volume: "", paper: "#e2563f", ink: "#ffffff", weight: "" },
  { title: "FIGHT CLUB", volume: "", paper: "#1a1416", ink: "#ff6fae", weight: "bold" },
]

export const MANGAS = [
  { title: "BERSERK", volume: "1", paper: "#141214", ink: "#c0392b", weight: "bold" },
  { title: "BERSERK", volume: "2", paper: "#141214", ink: "#c0392b", weight: "bold" },
  { title: "NARUTO", volume: "1", paper: "#f07a1a", ink: "#1a1412", weight: "bold" },
  { title: "NARUTO", volume: "2", paper: "#f07a1a", ink: "#1a1412", weight: "bold" },
  { title: "ONE PIECE", volume: "1", paper: "#f4f4f4", ink: "#d62828", weight: "bold" },
  { title: "ONE PIECE", volume: "2", paper: "#f4f4f4", ink: "#d62828", weight: "bold" },
  { title: "DRAGON BALL Z", volume: "1", paper: "#ffd23a", ink: "#d62828", weight: "bold" },
  { title: "HUNTER × HUNTER", volume: "1", paper: "#2c7a3f", ink: "#ffffff", weight: "bold" },
  { title: "CHAINSAW MAN", volume: "1", paper: "#e94b2a", ink: "#141414", weight: "bold" },
]

// Une rangée de boîtiers ou de volumes debout, la tranche vers la pièce (+z) ; tailles en mètres
function makeSpines(items, { height, depth, thick, cover }) {
  const root = new Group()
  const back = new MeshStandardMaterial({ color: cover, roughness: 0.5 })
  items.forEach((item, k) => {
    const spine = new MeshStandardMaterial({ map: bookTexture(item, thick / height), roughness: 0.5 })
    // Faces : +x, -x, +y, -y, +z (la tranche), -z
    const box = new Mesh(new BoxGeometry(thick, height, depth), [back, back, back, back, spine, back])
    box.position.set(k * (thick + 0.002), height / 2, 0)
    box.castShadow = true
    root.add(box)
  })
  return { root, animate() {} }
}

export const makeDVDs = () => makeSpines(DVDS, { height: 0.19, depth: 0.135, thick: 0.015, cover: "#101114" })
export const makeMangas = () => makeSpines(MANGAS, { height: 0.18, depth: 0.115, thick: 0.017, cover: "#f2efe8" })

// --- Le tapis persan de la chambre, dans les marrons foncés ---

// `aspect` : longueur / largeur du tapis ; le tapis est dessiné dans la longueur (vertical sur le canevas)
export function persianRugTexture(aspect) {
  const w = 512, h = Math.round(512 * Math.max(1, aspect))
  const canvas = document.createElement("canvas")
  canvas.width = w
  canvas.height = h
  const g = canvas.getContext("2d")
  const C = { ground: "#2b140d", field: "#4a2318", rust: "#8a2e1c", red: "#a8432a", cream: "#d9c09a", navy: "#2a3550", dark: "#3a1a12" }
  const diamond = (x, y, rx, ry, color) => {
    g.fillStyle = color
    g.beginPath()
    g.moveTo(x, y - ry)
    g.lineTo(x + rx, y)
    g.lineTo(x, y + ry)
    g.lineTo(x - rx, y)
    g.closePath()
    g.fill()
  }
  const rosette = (x, y, r, color, heart) => {
    g.fillStyle = color
    for (let k = 0; k < 8; k++) {
      const a = (k / 8) * Math.PI * 2
      g.beginPath()
      g.arc(x + Math.cos(a) * r * 0.6, y + Math.sin(a) * r * 0.6, r * 0.35, 0, Math.PI * 2)
      g.fill()
    }
    g.fillStyle = heart
    g.beginPath()
    g.arc(x, y, r * 0.4, 0, Math.PI * 2)
    g.fill()
  }
  g.fillStyle = C.ground
  g.fillRect(0, 0, w, h)
  const fringe = 0
  // Bordure : une bande rouille entre deux filets crème, avec une frise de losanges
  const inset = (k) => [w * k, fringe + w * k] // des bandes de même épaisseur sur les quatre côtés
  const frame = (k, color) => {
    const [x, y] = inset(k)
    g.fillStyle = color
    g.fillRect(x, y, w - 2 * x, h - 2 * y)
  }
  frame(0.03, C.cream)
  frame(0.04, C.rust)
  frame(0.12, C.cream)
  frame(0.13, C.field)
  const [bx, by] = inset(0.04), [ix, iy] = inset(0.12)
  const band = (ix - bx) / 2
  for (let x = bx + band; x < w - bx; x += band * 2) {
    for (const y of [by + band, h - by - band]) {
      diamond(x, y, band * 0.7, band * 0.7, C.cream)
      diamond(x, y, band * 0.35, band * 0.35, C.dark)
    }
  }
  for (let y = by + band * 3; y < h - by - band * 2; y += band * 2) {
    for (const x of [bx + band, w - bx - band]) {
      diamond(x, y, band * 0.7, band * 0.7, C.cream)
      diamond(x, y, band * 0.35, band * 0.35, C.dark)
    }
  }
  // Champ : petits motifs semés
  const [fx, fy] = inset(0.13)
  const cx = w / 2, cy = h / 2
  for (let y = fy + 30; y < h - fy - 20; y += 44) {
    for (let x = fx + 26 + ((y / 44) % 2) * 22; x < w - fx - 20; x += 44) {
      if (Math.abs(x - cx) / (w * 0.3) + Math.abs(y - cy) / (h * 0.26) < 1.05) continue
      if ((x + y) % 3 < 1) rosette(x, y, 9, C.red, C.cream)
      else diamond(x, y, 6, 9, (x * y) % 2 ? C.cream : C.rust)
    }
  }
  // Écoinçons : un quart de médaillon dans chaque coin du champ
  for (const [x, y, sx, sy] of [[fx, fy, 1, 1], [w - fx, fy, -1, 1], [fx, h - fy, 1, -1], [w - fx, h - fy, -1, -1]]) {
    g.fillStyle = C.rust
    g.beginPath()
    g.moveTo(x, y)
    g.lineTo(x + sx * w * 0.22, y)
    g.lineTo(x, y + sy * w * 0.22)
    g.closePath()
    g.fill()
    g.strokeStyle = C.cream
    g.lineWidth = 3
    g.stroke()
    rosette(x + sx * w * 0.06, y + sy * w * 0.06, 10, C.cream, C.navy)
  }
  // Médaillon central en losanges emboîtés, avec ses pendentifs
  const rx = w * 0.3, ry = h * 0.26
  for (const [k, color] of [[1, C.cream], [0.94, C.rust], [0.7, C.dark], [0.64, C.red], [0.4, C.cream], [0.34, C.navy]]) diamond(cx, cy, rx * k, ry * k, color)
  rosette(cx, cy, 20, C.cream, C.red)
  for (const s of [-1, 1]) {
    diamond(cx, cy + s * ry * 1.12, 22, 30, C.cream)
    diamond(cx, cy + s * ry * 1.12, 14, 20, C.rust)
    for (const t of [-1, 1]) rosette(cx + t * rx * 0.5, cy + s * ry * 0.5, 9, C.cream, C.dark)
  }
  const texture = new CanvasTexture(canvas)
  texture.colorSpace = SRGBColorSpace
  texture.anisotropy = 8
  return texture
}

// --- La salle serveurs du bureau : deux baies 42U derrière des portes vitrées sécurisées ---

// Façade d'une baie 42U, de haut en bas : brassage et switchs, pare-feu, serveurs, onduleur.
// Rend aussi l'emplacement des diodes (en fraction de la façade) pour les faire clignoter en 3D.
function rackFront(name, seed) {
  const w = 480, u = 38, h = u * 42 + 40
  const canvas = document.createElement("canvas")
  canvas.width = w
  canvas.height = h
  const g = canvas.getContext("2d")
  const rand = seeded(seed)
  const leds = []
  g.fillStyle = "#0b0c10"
  g.fillRect(0, 0, w, h)
  // Les montants percés de chaque côté
  g.fillStyle = "#1c1f27"
  g.fillRect(0, 0, 26, h)
  g.fillRect(w - 26, 0, 26, h)
  g.fillStyle = "#07080b"
  for (let y = 24; y < h; y += u / 3) {
    g.fillRect(9, y, 8, 5)
    g.fillRect(w - 17, y, 8, 5)
  }
  g.fillStyle = "#ffd23a"
  g.font = "bold 22px sans-serif"
  g.textBaseline = "middle"
  g.fillText(name, 34, 20)
  const x0 = 30, x1 = w - 30, span = x1 - x0
  let row = 0
  const unit = (size, color) => {
    const y = 40 + row * u
    row += size
    g.fillStyle = color
    g.fillRect(x0, y + 1, span, size * u - 2)
    return y
  }
  const text = (str, x, y, size, color) => {
    g.fillStyle = color
    g.font = `bold ${size}px sans-serif`
    g.fillText(str, x, y)
  }
  const ports = (y, n, withLeds) => {
    for (let k = 0; k < n; k++) {
      const x = x0 + 70 + (k % 12) * 26 + Math.floor(k / 12) * 8
      const py = y + 8 + Math.floor((k % 24) / 12) * 14
      g.fillStyle = "#050507"
      g.fillRect(x, py, 18, 11)
      if (withLeds && rand() < 0.7) leds.push([(x + 9) / w, (py - 2) / h, rand() < 0.85 ? "#3dff7a" : "#ffb02e"])
    }
  }
  const colors = ["#2a6cff", "#ffd23a", "#e0453a", "#2fb35a", "#d9dde5", "#ff8a2a", "#9a5aff"]
  // Deux paires panneau de brassage + switch, et leurs jarretières qui retombent en boucle
  for (let pair = 0; pair < 2; pair++) {
    const py = unit(1, "#2b2f38")
    text("PP-" + (pair + 1), x0 + 8, py + u / 2, 13, "#d9dde5")
    ports(py, 24, false)
    unit(1, "#15171d") // passe-câbles
    const sy = unit(1, "#3a4150")
    text("SW-" + (pair + 1), x0 + 8, sy + u / 2, 13, "#ffffff")
    ports(sy, 24, true)
    g.lineWidth = 4
    for (let k = 0; k < 24; k++) {
      if (rand() < 0.25) continue
      const x = x0 + 79 + (k % 12) * 26 + Math.floor(k / 12) * 8
      const a = py + 14 + Math.floor(k / 12) * 14, b = sy + 14 + Math.floor(k / 12) * 14
      g.strokeStyle = colors[Math.floor(rand() * colors.length)]
      g.beginPath()
      g.moveTo(x, a)
      g.bezierCurveTo(x + 6, a + u * 0.6, x + 6, b - u * 0.6, x, b)
      g.stroke()
    }
    unit(1, "#0e1014")
  }
  // Le pare-feu, liseré rouge
  const fw = unit(2, "#2a2d35")
  g.fillStyle = "#e0453a"
  g.fillRect(x0, fw + 1, 8, 2 * u - 2)
  text("FIREWALL · HA", x0 + 18, fw + u * 0.7, 16, "#ffffff")
  ports(fw + u * 0.9, 8, true)
  unit(1, "#0e1014")
  // Les serveurs : tiroirs de disques et voyants
  for (let k = 0; k < 7; k++) {
    const y = unit(2, k % 2 ? "#2c3039" : "#30343e")
    text("SRV-" + String(k + 1).padStart(2, "0"), x0 + 10, y + u * 0.5, 13, "#9aa3b5")
    for (let d = 0; d < 8; d++) {
      const x = x0 + 90 + d * 36
      g.fillStyle = "#1a1c22"
      g.fillRect(x, y + 8, 30, 2 * u - 18)
      g.fillStyle = "#101116"
      for (let l = 0; l < 4; l++) g.fillRect(x + 4, y + 16 + l * 10, 22, 4)
      if (rand() < 0.8) leds.push([(x + 26) / w, (y + 2 * u - 14) / h, rand() < 0.9 ? "#3da5ff" : "#3dff7a"])
    }
  }
  // Panneaux d'obturation, puis l'onduleur en bas avec son petit écran
  while (row < 38) unit(1, "#121419")
  const ups = unit(4, "#22252d")
  text("UPS 3000", x0 + 14, ups + u * 0.8, 20, "#ffffff")
  g.fillStyle = "#3dff7a"
  g.fillRect(x0 + 230, ups + 20, 140, 48)
  g.fillStyle = "#0b2a14"
  g.font = "bold 22px monospace"
  g.fillText("100%", x0 + 262, ups + 45)
  const texture = new CanvasTexture(canvas)
  texture.colorSpace = SRGBColorSpace
  texture.anisotropy = 8
  return { texture, leds }
}

// Une baie, en mètres : l'origine au sol au centre, la façade vers +z, les équipements un peu en retrait
function makeServerRack(name, seed) {
  const root = new Group()
  const W = 0.6, H = 2, D = 0.5 // vues de face seulement : peu profondes, pour que la salle reste fine
  const steel = new MeshStandardMaterial({ color: "#16181e", roughness: 0.5, metalness: 0.6 })
  for (const [w, h, d, x, y, z] of [
    [0.03, H, D, -W / 2 + 0.015, H / 2, 0],
    [0.03, H, D, W / 2 - 0.015, H / 2, 0],
    [W, 0.04, D, 0, H - 0.02, 0],
    [W, 0.06, D, 0, 0.03, 0],
  ]) {
    const panel = new Mesh(new BoxGeometry(w, h, d), steel)
    panel.position.set(x, y, z)
    panel.castShadow = true
    root.add(panel)
  }
  const { texture, leds } = rackFront(name, seed)
  const fw = W - 0.06, fh = H - 0.1
  const face = new Mesh(new PlaneGeometry(fw, fh), new MeshStandardMaterial({ map: texture, emissiveMap: texture, emissive: "#ffffff", emissiveIntensity: 0.25, roughness: 0.6 }))
  face.position.set(0, 0.06 + fh / 2, D / 2 - 0.04)
  root.add(face)
  const materials = new Map()
  const blinking = leds.map(([u, v, color], k) => {
    if (!materials.has(color)) materials.set(color, [0, 1, 2].map(() => new MeshBasicMaterial({ color })))
    const led = new Mesh(new BoxGeometry(0.006, 0.004, 0.004), materials.get(color)[0])
    led.position.set((u - 0.5) * fw, 0.06 + (1 - v) * fh, D / 2 - 0.036)
    root.add(led)
    return { led, states: materials.get(color), phase: k * 7.3 }
  })
  const off = new MeshBasicMaterial({ color: "#0c0e12" })
  return {
    root,
    animate(time) {
      blinking.forEach(({ led, states, phase }, k) => {
        const on = Math.sin(time * (5 + (k % 9) * 1.3) + phase) > -0.3
        led.material = on ? states[0] : off
      })
    },
  }
}

// La vitre des portes : une sérigraphie discrète (bandes dépolies), la vitre devient claire au survol
function doorGlassTexture() {
  const w = 512, h = 512
  const canvas = document.createElement("canvas")
  canvas.width = w
  canvas.height = h
  const g = canvas.getContext("2d")
  g.fillStyle = "#ffffff"
  g.fillRect(0, 0, w, h)
  g.fillStyle = "#d6e2ec"
  for (let y = 0; y < h; y += 12) g.fillRect(0, y, w, 5)
  const texture = new CanvasTexture(canvas)
  texture.colorSpace = SRGBColorSpace
  return texture
}

// Le panneau collé sur les portes
function doorSignTexture() {
  const w = 512, h = 160
  const canvas = document.createElement("canvas")
  canvas.width = w
  canvas.height = h
  const g = canvas.getContext("2d")
  g.fillStyle = "#ffd23a"
  g.fillRect(0, 0, w, h)
  g.fillStyle = "#14161b"
  for (let x = -h; x < w; x += 40) {
    g.beginPath()
    g.moveTo(x, 0)
    g.lineTo(x + 20, 0)
    g.lineTo(x + 20 + h, h)
    g.lineTo(x + h, h)
    g.fill()
  }
  g.fillStyle = "#ffd23a"
  g.fillRect(14, 14, w - 28, h - 28)
  g.fillStyle = "#14161b"
  g.textAlign = "center"
  g.textBaseline = "middle"
  g.font = "bold 50px sans-serif"
  g.fillText("SALLE SERVEURS", w / 2, 62)
  g.font = "bold 28px sans-serif"
  g.fillText("ACCÈS RESTREINT · BADGE", w / 2, 112)
  const texture = new CanvasTexture(canvas)
  texture.colorSpace = SRGBColorSpace
  return texture
}

// La salle derrière la fenêtre, en unités du monde : l'origine au bas de l'ouverture, en son milieu,
// la pièce du bureau vers +z et la salle vers -z. `scale` : unités du monde par mètre ;
// `walls` : le matériau des murs de l'immeuble, pour que la salle ait l'air d'en faire partie vue de dehors.
export function makeServerRoom(width, height, scale, walls) {
  const root = new Group()
  // Les deux baies, une derrière chaque vantail, presque aussi hautes que les portes
  const rackScale = (height * 0.85) / 2
  const depth = 0.7 * rackScale
  // Le faux plancher : des dalles grises
  const tiles = document.createElement("canvas")
  tiles.width = tiles.height = 128
  const t = tiles.getContext("2d")
  t.fillStyle = "#5a606c"
  t.fillRect(0, 0, 128, 128)
  t.strokeStyle = "#2a2e36"
  t.lineWidth = 4
  t.strokeRect(0, 0, 128, 128)
  const floorMap = new CanvasTexture(tiles)
  floorMap.colorSpace = SRGBColorSpace
  floorMap.wrapS = floorMap.wrapT = RepeatWrapping
  floorMap.repeat.set(width / (0.6 * scale), depth / (0.6 * scale))
  const W = width * 1.04, wall = 0.05 * scale // à peine plus large que l'ouverture : la salle reste cachée derrière le mur
  for (const [w, h, d, x, y, z, material] of [
    [W, wall, depth, 0, -wall / 2, -depth / 2, new MeshStandardMaterial({ map: floorMap, roughness: 0.7 })],
    [W, wall, depth, 0, height + wall / 2, -depth / 2, walls],
    [W, height + 2 * wall, wall, 0, height / 2, -depth - wall / 2, walls],
    [wall, height + 2 * wall, depth, -W / 2, height / 2, -depth / 2, walls],
    [wall, height + 2 * wall, depth, W / 2, height / 2, -depth / 2, walls],
  ]) {
    const panel = new Mesh(new BoxGeometry(w, h, d), material)
    panel.position.set(x, y, z)
    panel.receiveShadow = true
    root.add(panel)
  }
  // Néon froid au plafond, et sa lumière
  const strip = new Mesh(new BoxGeometry(width * 0.7, 0.02 * scale, 0.06 * scale), new MeshBasicMaterial({ color: "#cfe6ff" }))
  strip.position.set(0, height - 0.02 * scale, -depth * 0.25)
  root.add(strip)
  const light = new PointLight("#9fc8ff", 2, depth * 3, 2)
  light.position.set(0, height * 0.8, -depth * 0.3)
  root.add(light)

  const racks = [["BAIE A01", 3], ["BAIE A02", 8]].map(([name, seed], k) => {
    const rack = makeServerRack(name, seed)
    rack.root.scale.setScalar(rackScale)
    rack.root.position.set((k ? 1 : -1) * width * 0.25, 0, -depth + 0.3 * rackScale)
    root.add(rack.root)
    return rack
  })

  // Les portes : la vitre, le panneau, les poignées et le lecteur de badge
  const glass = new Mesh(
    new PlaneGeometry(width * 0.96, height * 0.96),
    new MeshStandardMaterial({ map: doorGlassTexture(), color: "#b9cfe0", roughness: 0.2, metalness: 0.3, transparent: true, opacity: 0.9, depthWrite: false, side: DoubleSide }),
  )
  glass.position.set(0, height / 2, 0)
  root.add(glass)
  const sign = new Mesh(new PlaneGeometry(0.5 * scale, 0.156 * scale), new MeshStandardMaterial({ map: doorSignTexture(), roughness: 0.6 }))
  sign.position.set(-width * 0.25, height * 0.72, 0.006 * scale) // sur le vantail de gauche, pas à cheval sur les deux
  root.add(sign)
  const chrome = new MeshStandardMaterial({ color: "#c9ced8", roughness: 0.2, metalness: 0.9 })
  for (const side of [-1, 1]) {
    const handle = new Mesh(new CylinderGeometry(0.012 * scale, 0.012 * scale, 0.4 * scale, 10), chrome)
    handle.position.set(side * 0.08 * scale, height * 0.45, 0.04 * scale)
    root.add(handle)
  }
  const reader = new Mesh(new BoxGeometry(0.08 * scale, 0.12 * scale, 0.025 * scale), new MeshStandardMaterial({ color: "#1a1c22", roughness: 0.5 }))
  reader.position.set(0.22 * scale, height * 0.5, 0.015 * scale)
  root.add(reader)
  const badgeLed = new MeshStandardMaterial({ color: "#2a0a0a", emissive: "#ff3a2a", emissiveIntensity: 2 })
  const led = new Mesh(new SphereGeometry(0.01 * scale, 8, 6), badgeLed)
  led.position.set(0.22 * scale, height * 0.5 + 0.035 * scale, 0.03 * scale)
  root.add(led)

  const red = new Color("#ff3a2a"), green = new Color("#3dff7a")
  return {
    root,
    glass,
    animate(time) {
      for (const rack of racks) rack.animate(time)
    },
    // `open` (0 à 1) : la vitre s'éclaircit et le lecteur passe au vert
    open(amount) {
      glass.material.opacity = MathUtils.lerp(0.9, 0.06, amount)
      badgeLed.emissive.lerpColors(red, green, amount)
    },
  }
}

// --- Un pain de savon rose, bien rectangulaire, posé à côté des films ---

export function makeSoap() {
  const root = new Group()
  const pink = new MeshStandardMaterial({ color: "#f2a0bc", roughness: 0.3 })
  // Un pavé aux arêtes à peine adoucies : le corps, et un dessus un peu plus petit qui fait le chanfrein
  const body = new Mesh(new BoxGeometry(0.095, 0.03, 0.062), pink)
  body.position.y = 0.015
  root.add(body)
  const top = new Mesh(new BoxGeometry(0.087, 0.006, 0.054), pink)
  top.position.y = 0.033
  root.add(top)
  // Un cadre en creux sur le dessus
  const groove = new MeshStandardMaterial({ color: "#d97f9e", roughness: 0.4 })
  for (const [w, d, x, z] of [[0.07, 0.003, 0, 0.019], [0.07, 0.003, 0, -0.019], [0.003, 0.038, 0.035, 0], [0.003, 0.038, -0.035, 0]]) {
    const line = new Mesh(new BoxGeometry(w, 0.001, d), groove)
    line.position.set(x, 0.0365, z)
    root.add(line)
  }
  root.traverse((child) => child.isMesh && (child.castShadow = true))
  return { root, animate() {} }
}

// --- La table de chevet devient une étagère en fil chromé : la lampe, la PS Vita et la platine dessus, mes chaussures dessous ---

// Une grille de fils, en texture à trous : un plan suffit pour chaque plateau
function wireTexture(width, depth) {
  const px = 512 // pixels par mètre
  const w = Math.round(width * px), h = Math.round(depth * px)
  const canvas = document.createElement("canvas")
  canvas.width = w
  canvas.height = h
  const g = canvas.getContext("2d")
  g.fillStyle = "#ffffff"
  const gap = Math.round(0.025 * px) // un fil tous les 2,5 cm
  for (let x = 0; x < w; x += gap) g.fillRect(x, 0, 3, h)
  for (const y of [0, h / 2 - 2, h - 5]) g.fillRect(0, y, w, 5)
  return new CanvasTexture(canvas)
}

// `W`, `D`, `H` : largeur, profondeur et hauteur en mètres ; origine au sol au centre, le devant vers +z.
// `levels` : la hauteur de chaque plateau, du bas vers le haut (le dernier est le dessus).
export function makeWireShelf(W, D, H) {
  const root = new Group()
  const chrome = new MeshStandardMaterial({ color: "#d8dce2", roughness: 0.18, metalness: 0.95 })
  const rubber = new MeshStandardMaterial({ color: "#111214", roughness: 0.8 })
  const levels = [0.14, 0.52, 1].map((k) => k * H)
  // Les quatre montants, leurs embouts noirs et les bagues sous chaque plateau
  for (const [sx, sz] of [[-1, -1], [-1, 1], [1, -1], [1, 1]]) {
    const x = sx * (W / 2 - 0.015), z = sz * (D / 2 - 0.015)
    const post = new Mesh(new CylinderGeometry(0.012, 0.012, H, 12), chrome)
    post.position.set(x, H / 2, z)
    root.add(post)
    const foot = new Mesh(new CylinderGeometry(0.014, 0.014, 0.05, 12), rubber)
    foot.position.set(x, 0.025, z)
    root.add(foot)
    for (const y of levels) {
      const ring = new Mesh(new CylinderGeometry(0.016, 0.014, 0.03, 12), chrome)
      ring.position.set(x, y - 0.018, z)
      root.add(ring)
    }
  }
  // Les plateaux : un cadre en tube et la grille de fils
  const wires = wireTexture(W, D)
  const grid = new MeshStandardMaterial({ color: "#d8dce2", alphaMap: wires, alphaTest: 0.5, roughness: 0.25, metalness: 0.9, side: DoubleSide })
  for (const y of levels) {
    const plate = new Mesh(new PlaneGeometry(W - 0.03, D - 0.03), grid)
    plate.rotation.x = -Math.PI / 2
    plate.position.y = y - 0.004
    root.add(plate)
    for (const [w, d, x, z] of [[W, 0.01, 0, D / 2 - 0.015], [W, 0.01, 0, -D / 2 + 0.015], [0.01, D, W / 2 - 0.015, 0], [0.01, D, -W / 2 + 0.015, 0]]) {
      const rim = new Mesh(new BoxGeometry(w, 0.01, d), chrome)
      rim.position.set(x, y - 0.004, z)
      root.add(rim)
    }
  }
  root.traverse((child) => child.isMesh && (child.castShadow = true))
  return { root, levels, animate() {} }
}

// Le dessus d'une chaussure à taches de léopard
function leopardTexture() {
  const canvas = document.createElement("canvas")
  canvas.width = canvas.height = 256
  const g = canvas.getContext("2d")
  g.fillStyle = "#c9944e"
  g.fillRect(0, 0, 256, 256)
  const rand = seeded(5)
  for (let k = 0; k < 70; k++) {
    const x = rand() * 256, y = rand() * 256, r = 6 + rand() * 7
    g.fillStyle = "#3a2414"
    g.beginPath()
    g.ellipse(x, y, r, r * 0.75, rand() * Math.PI, 0, Math.PI * 2)
    g.fill()
    g.fillStyle = "#8a5a2c"
    g.beginPath()
    g.ellipse(x, y, r * 0.5, r * 0.35, rand() * Math.PI, 0, Math.PI * 2)
    g.fill()
  }
  const texture = new CanvasTexture(canvas)
  texture.colorSpace = SRGBColorSpace
  return texture
}

// Une chaussure, en mètres : origine sous la semelle, la pointe vers +z. `style` : ses couleurs et sa forme
// (`kind` : basket, bottine, chaussure bateau, tong ou chaussure de trail).
function makeShoe({ upper, sole, accent = null, laces = null, tongue = null, kind = "sneaker", pattern = null }) {
  const root = new Group()
  const m = (color, roughness = 0.7) => new MeshStandardMaterial({ color, roughness })
  const leather = kind === "boot" || kind === "boat"
  const skin = pattern === "leopard" ? new MeshStandardMaterial({ map: leopardTexture(), roughness: 0.8 }) : m(upper, leather ? 0.35 : 0.75)
  const L = 0.28, Wd = 0.1
  const thick = { boot: 0.03, boat: 0.022, flipflop: 0.018, trail: 0.035 }[kind] ?? 0.025
  // La semelle : une capsule aplatie
  const base = new Mesh(new CapsuleGeometry(Wd / 2, L - Wd, 4, 12), m(sole, 0.85))
  base.rotation.x = Math.PI / 2
  base.scale.set(1, 1, thick / Wd)
  base.position.y = thick / 2
  root.add(base)
  if (kind === "flipflop") {
    // La lanière en V, du doigt de pied vers les côtés
    const strap = m(upper, 0.6)
    const toe = new Vector3(0, thick, L * 0.25)
    for (const sideX of [-1, 1]) {
      const end = new Vector3(sideX * Wd * 0.45, thick, -L * 0.02)
      const curve = new CatmullRomCurve3([toe, toe.clone().lerp(end, 0.5).add(new Vector3(0, 0.025, 0)), end])
      root.add(new Mesh(new TubeGeometry(curve, 10, 0.005, 6), strap))
    }
    root.traverse((child) => child.isMesh && (child.castShadow = true))
    return root
  }
  // Le dessus : une demi-sphère allongée, et le talon qui remonte
  const top = new Mesh(new SphereGeometry(1, 20, 12, 0, Math.PI * 2, 0, Math.PI / 2), skin)
  top.scale.set(Wd * 0.48, kind === "boat" ? 0.055 : 0.065, L * 0.48)
  top.position.y = thick
  root.add(top)
  const shaft = kind === "boot" ? 0.13 : 0.05 // la bottine monte jusqu'à la cheville
  const heel = new Mesh(new CylinderGeometry(Wd * 0.44, Wd * 0.47, shaft, 16, 1, false, kind === "boot" ? 0 : Math.PI / 2, kind === "boot" ? Math.PI * 2 : Math.PI), skin)
  heel.position.set(0, thick + shaft / 2, -L * 0.28)
  root.add(heel)
  // L'ouverture du pied, en haut de la tige
  const opening = new Mesh(new CircleGeometry(1, 16), m("#1a1514", 0.9))
  opening.rotation.x = -Math.PI / 2
  opening.scale.set(Wd * (kind === "boot" ? 0.4 : 0.3), L * (kind === "boot" ? 0.15 : 0.2), 1)
  opening.position.set(0, thick + (kind === "boot" ? shaft + 0.001 : 0.06), kind === "boot" ? -L * 0.28 : -L * 0.18)
  root.add(opening)
  if (tongue) {
    // Une languette bien visible, qui dépasse vers l'avant
    const flap = new Mesh(new BoxGeometry(Wd * 0.5, 0.006, 0.07), m(tongue, 0.6))
    flap.position.set(0, thick + 0.068, -L * 0.04)
    flap.rotation.x = 0.35
    root.add(flap)
  }
  if (accent) {
    // Une bande de couleur sur chaque côté
    for (const sideX of [-1, 1]) {
      const band = new Mesh(new BoxGeometry(0.003, kind === "trail" ? 0.012 : 0.016, L * 0.45), m(accent, 0.5))
      band.position.set(sideX * Wd * 0.47, thick + 0.022, 0)
      band.rotation.x = kind === "trail" ? 0.15 : 0
      root.add(band)
    }
  }
  if (laces) {
    for (let k = 0; k < 4; k++) {
      const lace = new Mesh(new BoxGeometry(Wd * 0.45, 0.004, 0.008), m(laces, 0.6))
      lace.position.set(0, thick + (kind === "boat" ? 0.05 : 0.058) - k * 0.006, L * (0.02 + k * 0.06))
      root.add(lace)
    }
  }
  root.traverse((child) => child.isMesh && (child.castShadow = true))
  return root
}

// Mes chaussures
const SHOES = [
  { kind: "boot", upper: "#151515", sole: "#0d0d0d" }, // bottines en cuir noir
  { kind: "boat", upper: "#7a4424", sole: "#c98b4e", laces: "#c9a070" }, // chaussures bateau en cuir marron
  { kind: "sneaker", pattern: "leopard", sole: "#e8e2cf", tongue: "#efe9cf", laces: "#2a1a10" }, // baskets léopard, languette crème
  { kind: "flipflop", upper: "#4a3a36", sole: "#4a3a36" }, // tongs marron
  { kind: "trail", upper: "#141518", sole: "#202125", accent: "#ffd23a", laces: "#141518" }, // chaussures de trail noires, touches jaunes
  { kind: "sneaker", upper: "#f2c21a", sole: "#e8dcc0", accent: "#141414", laces: "#f2c21a" }, // baskets jaunes, bandes noires
]

// Une paire posée côte à côte, un peu de travers. `k` : laquelle (dans SHOES)
export function makeShoePair(k) {
  const root = new Group()
  for (const side of [-1, 1]) {
    const shoe = makeShoe(SHOES[k % SHOES.length])
    shoe.position.x = side * 0.055
    shoe.rotation.y = side * 0.06
    root.add(shoe)
  }
  return root
}

// --- La platine vinyle, posée sur l'étagère de chevet : le disque tourne, le bras est posé dessus ---

export function makeTurntable() {
  const root = new Group()
  const wood = new MeshStandardMaterial({ color: "#6e4426", roughness: 0.55 })
  const black = new MeshStandardMaterial({ color: "#111113", roughness: 0.4, metalness: 0.3 })
  const silver = new MeshStandardMaterial({ color: "#c9ced8", roughness: 0.25, metalness: 0.9 })
  const W = 0.42, D = 0.33, h = 0.075
  const base = new Mesh(new BoxGeometry(W, h, D), wood)
  base.position.y = h / 2
  root.add(base)
  const plate = new Mesh(new BoxGeometry(W - 0.01, 0.004, D - 0.01), black)
  plate.position.y = h + 0.002
  root.add(plate)
  // Le plateau et le disque, avec son étiquette rouge
  const spinner = new Group()
  spinner.position.set(-0.05, h + 0.004, 0)
  root.add(spinner)
  const platter = new Mesh(new CylinderGeometry(0.145, 0.145, 0.012, 40), silver)
  platter.position.y = 0.006
  spinner.add(platter)
  const canvas = document.createElement("canvas")
  canvas.width = canvas.height = 256
  const g = canvas.getContext("2d")
  g.fillStyle = "#0c0c0e"
  g.fillRect(0, 0, 256, 256)
  g.strokeStyle = "#1e1e22"
  for (let r = 40; r < 128; r += 4) {
    g.beginPath()
    g.arc(128, 128, r, 0, Math.PI * 2)
    g.stroke()
  }
  g.fillStyle = "#c8352a"
  g.beginPath()
  g.arc(128, 128, 34, 0, Math.PI * 2)
  g.fill()
  g.fillStyle = "#ffd36a"
  g.fillRect(100, 120, 56, 6) // un trait sur l'étiquette, pour voir le disque tourner
  const label = new CanvasTexture(canvas)
  label.colorSpace = SRGBColorSpace
  const record = new Mesh(new CylinderGeometry(0.14, 0.14, 0.003, 48), [black, new MeshStandardMaterial({ map: label, roughness: 0.35 }), black])
  record.position.y = 0.0135
  spinner.add(record)
  // Le bras : son pied, le tube et la tête de lecture, posée sur le disque
  const pivot = new Mesh(new CylinderGeometry(0.018, 0.022, 0.03, 16), silver)
  pivot.position.set(0.15, h + 0.015, -0.1)
  root.add(pivot)
  const from = new Vector3(0.15, h + 0.034, -0.1), to = new Vector3(0.02, h + 0.022, 0.07)
  const arm = new Mesh(new CylinderGeometry(0.004, 0.004, from.distanceTo(to), 8), silver)
  arm.position.copy(from).lerp(to, 0.5)
  arm.quaternion.setFromUnitVectors(new Vector3(0, 1, 0), to.clone().sub(from).normalize())
  root.add(arm)
  const head = new Mesh(new BoxGeometry(0.02, 0.008, 0.03), black)
  head.position.copy(to)
  root.add(head)
  // Deux boutons sur le devant
  for (const x of [0.12, 0.17]) {
    const knob = new Mesh(new CylinderGeometry(0.01, 0.01, 0.01, 12), silver)
    knob.rotation.x = Math.PI / 2
    knob.position.set(x, h * 0.5, D / 2 + 0.004)
    root.add(knob)
  }
  root.traverse((child) => child.isMesh && (child.castShadow = true))
  return {
    root,
    animate(time) {
      spinner.rotation.y = -time * 3.5 // 33 tours, à peu près
    },
  }
}

// --- Les vitres de la chambre : du verre façon jeu de blocs, en gros pixels ---

// Une vitre fait 16 pixels de large : verre presque transparent, quelques reflets blancs en diagonale
// et un cadre clair irrégulier, blanc et bleu glacier. "x" : un pixel de reflet.
const GLASS_STREAKS = [
  "................",
  "................",
  "...x..x.........",
  "..x...........x.",
  ".........x...x..",
  "........x...x...",
  ".......x........",
  "..x...x.........",
  "................",
  "........x.......",
  ".......x.....x..",
  "......x.....x...",
  ".x.........x....",
  "................",
  "................",
  "....x...........",
]

// `aspect` : largeur / hauteur de la fenêtre, `panes` : le nombre de vitres côte à côte
export function pixelWindowTexture(aspect, panes = 2) {
  const p = 16, cols = 16
  const rows = Math.max(8, Math.round((cols * panes) / aspect))
  const canvas = document.createElement("canvas")
  canvas.width = cols * panes * p
  canvas.height = rows * p
  const g = canvas.getContext("2d")
  const rand = seeded(5)
  for (let k = 0; k < panes; k++) {
    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        const edge = Math.min(x, y, cols - 1 - x, rows - 1 - y)
        let color = "rgba(200, 232, 244, 0.1)"
        if (edge === 0) color = rand() < 0.35 ? "rgba(160, 214, 232, 0.95)" : "rgba(245, 250, 252, 0.95)"
        else if (edge === 1 && rand() < 0.25) color = "rgba(245, 250, 252, 0.9)"
        else if (GLASS_STREAKS[y % 16][x] === "x") color = "rgba(255, 255, 255, 0.85)"
        g.fillStyle = color
        g.fillRect((k * cols + x) * p, y * p, p, p)
      }
    }
  }
  const texture = new CanvasTexture(canvas)
  texture.colorSpace = SRGBColorSpace
  texture.magFilter = NearestFilter
  return texture
}

// --- La commode à côté du bureau de la chambre : bois foncé, trois tiroirs à poignées dorées ---

// Le veinage du bois, dessiné une fois
function woodTexture(base, grain) {
  const canvas = document.createElement("canvas")
  canvas.width = 256
  canvas.height = 256
  const g = canvas.getContext("2d")
  g.fillStyle = base
  g.fillRect(0, 0, 256, 256)
  const rand = seeded(17)
  g.strokeStyle = grain
  for (let k = 0; k < 40; k++) {
    const y = rand() * 256
    g.globalAlpha = 0.25 + rand() * 0.35
    g.lineWidth = 1 + rand() * 2
    g.beginPath()
    g.moveTo(0, y)
    for (let x = 0; x <= 256; x += 32) g.lineTo(x, y + Math.sin(x * 0.03 + k) * 4)
    g.stroke()
  }
  g.globalAlpha = 1
  const texture = new CanvasTexture(canvas)
  texture.colorSpace = SRGBColorSpace
  return texture
}

// `W`, `D`, `H` : largeur, profondeur et hauteur en mètres ; origine au sol au centre, le devant vers +z
export function makeDrawerChest(W, D, H) {
  const root = new Group()
  const body = new MeshStandardMaterial({ map: woodTexture("#3a2a20", "#22160f"), roughness: 0.6 })
  const front = new MeshStandardMaterial({ map: woodTexture("#4a3627", "#2a1c12"), roughness: 0.5 })
  const brass = new MeshStandardMaterial({ color: "#c9a35a", roughness: 0.3, metalness: 0.85 })
  const legs = 0.06
  // Le caisson sur quatre petits pieds, et un plateau qui dépasse un peu
  const box = new Mesh(new BoxGeometry(W - 0.02, H - legs - 0.025, D - 0.02), body)
  box.position.y = legs + (H - legs - 0.025) / 2
  root.add(box)
  const top = new Mesh(new BoxGeometry(W, 0.025, D), front)
  top.position.y = H - 0.0125
  root.add(top)
  for (const [x, z] of [[-1, -1], [-1, 1], [1, -1], [1, 1]]) {
    const leg = new Mesh(new CylinderGeometry(0.015, 0.012, legs, 10), body)
    leg.position.set(x * (W / 2 - 0.04), legs / 2, z * (D / 2 - 0.04))
    root.add(leg)
  }
  // Trois façades de tiroir, séparées par une fente, chacune avec sa poignée
  const inner = H - legs - 0.025, gap = 0.012, drawer = (inner - gap * 4) / 3
  for (let k = 0; k < 3; k++) {
    const y = legs + gap + drawer / 2 + k * (drawer + gap)
    const face = new Mesh(new BoxGeometry(W - 0.05, drawer, 0.015), front)
    face.position.set(0, y, D / 2 - 0.005)
    root.add(face)
    const bar = new Mesh(new CylinderGeometry(0.006, 0.006, Math.min(0.14, W * 0.3), 10), brass)
    bar.rotation.z = Math.PI / 2
    bar.position.set(0, y, D / 2 + 0.018)
    root.add(bar)
    for (const side of [-1, 1]) {
      const post = new Mesh(new CylinderGeometry(0.004, 0.004, 0.02, 8), brass)
      post.rotation.x = Math.PI / 2
      post.position.set(side * Math.min(0.06, W * 0.13), y, D / 2 + 0.008)
      root.add(post)
    }
  }
  root.traverse((child) => {
    if (child.isMesh) child.castShadow = child.receiveShadow = true
  })
  return { root, animate() {} }
}

// --- Le schéma du modèle OSI, affiché dans la classe à la place d'une partie de la fenêtre ---

const OSI = [
  ["7", "Application", "HTTP · DNS · SSH", "#c8352a"],
  ["6", "Présentation", "TLS · JPEG", "#e0702a"],
  ["5", "Session", "RPC · NetBIOS", "#e8b02a"],
  ["4", "Transport", "TCP · UDP", "#4fa83c"],
  ["3", "Réseau", "IP · ICMP · BGP", "#2a8ac8"],
  ["2", "Liaison", "Ethernet · VLAN", "#3a52c8"],
  ["1", "Physique", "Câble · Fibre · Wi-Fi", "#7a3ac8"],
]

// `aspect` : largeur / hauteur de l'affiche
export function osiTexture(aspect) {
  const h = 1024, w = Math.round(h * aspect)
  const canvas = document.createElement("canvas")
  canvas.width = w
  canvas.height = h
  const g = canvas.getContext("2d")
  g.fillStyle = "#f6f3ea"
  g.fillRect(0, 0, w, h)
  g.fillStyle = "#1d2a6b"
  g.textAlign = "center"
  g.textBaseline = "middle"
  const title = Math.min(70, w * 0.11)
  g.font = `bold ${title}px sans-serif`
  g.fillText("Le modèle OSI", w / 2, 80)
  const top = 150, row = (h - top - 50) / OSI.length, pad = w * 0.06
  OSI.forEach(([n, name, examples, color], k) => {
    const y = top + k * row
    g.fillStyle = color
    g.fillRect(pad, y + 6, w - 2 * pad, row - 12)
    // Le numéro dans un rond blanc, le nom, puis des exemples de protocoles
    g.fillStyle = "#ffffff"
    g.beginPath()
    g.arc(pad + row * 0.45, y + row / 2, row * 0.3, 0, Math.PI * 2)
    g.fill()
    g.fillStyle = color
    g.font = `bold ${row * 0.38}px sans-serif`
    g.fillText(n, pad + row * 0.45, y + row / 2 + 2)
    g.fillStyle = "#ffffff"
    g.textAlign = "left"
    g.font = `bold ${Math.min(row * 0.34, w * 0.07)}px sans-serif`
    g.fillText(name, pad + row * 0.95, y + row * 0.38)
    g.font = `${Math.min(row * 0.24, w * 0.05)}px sans-serif`
    g.fillText(examples, pad + row * 0.95, y + row * 0.7)
    g.textAlign = "center"
  })
  const texture = new CanvasTexture(canvas)
  texture.colorSpace = SRGBColorSpace
  texture.anisotropy = 8
  return texture
}

// --- La fontaine à eau du bureau : la bonbonne bleue sur son meuble blanc ---

export function makeWaterCooler() {
  const root = new Group()
  const white = new MeshStandardMaterial({ color: "#eef0f3", roughness: 0.4 })
  const grey = new MeshStandardMaterial({ color: "#8a9099", roughness: 0.5 })
  const dark = new MeshStandardMaterial({ color: "#3a3f47", roughness: 0.6 })
  const chrome = new MeshStandardMaterial({ color: "#d8dde3", roughness: 0.2, metalness: 0.9 })
  const W = 0.32, H = 0.95
  const add = (mesh, [x, y, z]) => {
    mesh.position.set(x, y, z)
    root.add(mesh)
    return mesh
  }
  // Le meuble sur quatre petits pieds, un couvercle arrondi sous la bonbonne
  add(new Mesh(new BoxGeometry(W, H - 0.03, W), white), [0, (H + 0.03) / 2, 0])
  for (const [x, z] of [[-1, -1], [-1, 1], [1, -1], [1, 1]]) add(new Mesh(new CylinderGeometry(0.012, 0.012, 0.03, 8), dark), [x * (W / 2 - 0.03), 0.015, z * (W / 2 - 0.03)])
  add(new Mesh(new CylinderGeometry(W * 0.48, W * 0.5, 0.03, 32), white), [0, H + 0.015, 0])
  add(new Mesh(new CylinderGeometry(0.06, 0.07, 0.02, 24), grey), [0, H + 0.04, 0])
  // Le renfoncement en façade, ses deux robinets (froid, chaud) avec leur levier et leur voyant, et la grille d'égouttage
  add(new Mesh(new BoxGeometry(W * 0.72, 0.24, 0.012), dark), [0, H * 0.7, W / 2 - 0.004])
  for (const [x, color] of [[-0.055, "#2a6cff"], [0.055, "#e0453a"]]) {
    const tint = new MeshStandardMaterial({ color, roughness: 0.35 })
    add(new Mesh(new BoxGeometry(0.04, 0.04, 0.05), tint), [x, H * 0.76, W / 2 + 0.02])
    add(new Mesh(new CylinderGeometry(0.007, 0.007, 0.03, 10), chrome), [x, H * 0.76 - 0.03, W / 2 + 0.035])
    add(new Mesh(new BoxGeometry(0.03, 0.012, 0.05), tint), [x, H * 0.76 + 0.03, W / 2 + 0.035])
    add(new Mesh(new SphereGeometry(0.006, 10, 8), new MeshBasicMaterial({ color })), [x, H * 0.84, W / 2 + 0.002])
  }
  add(new Mesh(new BoxGeometry(W * 0.6, 0.012, 0.08), grey), [0, H * 0.6, W / 2 + 0.03])
  for (let k = -3; k <= 3; k++) add(new Mesh(new BoxGeometry(0.006, 0.004, 0.07), dark), [k * 0.024, H * 0.6 + 0.008, W / 2 + 0.03])
  // La porte du bas avec sa poignée, des fentes d'aération sur le côté
  add(new Mesh(new BoxGeometry(W * 0.8, H * 0.42, 0.006), new MeshStandardMaterial({ color: "#e2e5ea", roughness: 0.45 })), [0, H * 0.27, W / 2 + 0.002])
  add(new Mesh(new BoxGeometry(0.012, 0.09, 0.015), chrome), [W * 0.3, H * 0.35, W / 2 + 0.01])
  for (let k = 0; k < 6; k++) add(new Mesh(new BoxGeometry(0.004, 0.012, W * 0.6), dark), [W / 2 + 0.001, H * 0.15 + k * 0.03, 0])
  // Le distributeur de gobelets sur le côté, avec sa pile
  add(new Mesh(new CylinderGeometry(0.04, 0.04, 0.22, 20, 1, true), new MeshStandardMaterial({ color: "#c9e6f5", roughness: 0.1, transparent: true, opacity: 0.4, side: DoubleSide, depthWrite: false })), [-W / 2 - 0.045, H * 0.72, 0.06])
  add(new Mesh(new CylinderGeometry(0.036, 0.03, 0.2, 16), new MeshStandardMaterial({ color: "#f8f8f6", roughness: 0.6 })), [-W / 2 - 0.045, H * 0.71, 0.06])
  add(new Mesh(new BoxGeometry(0.02, 0.03, 0.02), grey), [-W / 2 - 0.01, H * 0.72, 0.06])
  // La bonbonne retournée : bleue, transparente, cerclée, avec l'eau à l'intérieur et son étiquette
  const glass = new MeshStandardMaterial({ color: "#7cc8f2", roughness: 0.05, transparent: true, opacity: 0.45, depthWrite: false })
  const profile = [[0.02, 0], [0.05, 0.02], [0.05, 0.05], [0.14, 0.1], [0.15, 0.14], [0.15, 0.4], [0.13, 0.44], [0, 0.45]].map(([r, y]) => new Vector2(r, y))
  add(new Mesh(new LatheGeometry(profile, 28), glass), [0, H + 0.03, 0])
  for (const y of [0.2, 0.3]) {
    const rib = add(new Mesh(new TorusGeometry(0.151, 0.004, 6, 32), glass), [0, H + 0.03 + y, 0])
    rib.rotation.x = Math.PI / 2
  }
  const water = add(new Mesh(new CylinderGeometry(0.135, 0.135, 0.28, 28), new MeshStandardMaterial({ color: "#3a9ad8", roughness: 0.1, transparent: true, opacity: 0.55, depthWrite: false })), [0, H + 0.23, 0])
  add(new Mesh(new CylinderGeometry(0.152, 0.152, 0.06, 28, 1, true, -0.8, 1.6), new MeshStandardMaterial({ color: "#1d4fa8", roughness: 0.5, side: DoubleSide })), [0, H + 0.38, 0])
  root.traverse((child) => child.isMesh && (child.castShadow = true))
  return {
    root,
    animate(time) {
      // L'eau de la bonbonne ondule à peine
      water.scale.y = 1 + Math.sin(time * 0.3) * 0.01
    },
  }
}

// --- Une grande sansevière en pot, à côté de la fontaine : des feuilles en lame, droites, rayées et bordées de jaune ---

// Le motif d'une feuille : vert sombre, des bandes claires ondulées, un liseré jaune de chaque côté
function snakeLeafTexture() {
  const canvas = document.createElement("canvas")
  canvas.width = 64
  canvas.height = 256
  const g = canvas.getContext("2d")
  g.fillStyle = "#2d5a2c"
  g.fillRect(0, 0, 64, 256)
  g.strokeStyle = "#6e9a52"
  g.lineWidth = 3
  for (let y = 6; y < 256; y += 14) {
    g.beginPath()
    for (let x = 0; x <= 64; x += 4) g.lineTo(x, y + Math.sin(x * 0.2 + y) * 3)
    g.stroke()
  }
  g.fillStyle = "#d8c84a"
  g.fillRect(0, 0, 6, 256)
  g.fillRect(58, 0, 6, 256)
  const texture = new CanvasTexture(canvas)
  texture.colorSpace = SRGBColorSpace
  return texture
}

const SNAKE_LEAF = { width: 0.08, length: 0.9 } // la plus grande feuille, en mètres : la texture la couvre exactement

// Une lame large à la base, effilée en pointe
function snakeLeaf(length, width) {
  const s = new Shape()
  s.moveTo(-width / 2, 0)
  s.quadraticCurveTo(-width / 2, length * 0.75, 0, length)
  s.quadraticCurveTo(width / 2, length * 0.75, width / 2, 0)
  s.lineTo(-width / 2, 0)
  return s
}

export function makeBigPlant() {
  const root = new Group()
  // Un pot cylindrique gris anthracite, son rebord et la terre
  const pot = new MeshStandardMaterial({ color: "#3a3d44", roughness: 0.55 })
  const body = new Mesh(new CylinderGeometry(0.13, 0.11, 0.3, 32), pot)
  body.position.y = 0.15
  root.add(body)
  const rim = new Mesh(new CylinderGeometry(0.135, 0.135, 0.03, 32), pot)
  rim.position.y = 0.3
  root.add(rim)
  const earth = new Mesh(new CircleGeometry(0.125, 24), new MeshStandardMaterial({ color: "#3b2a1e", roughness: 1 }))
  earth.rotation.x = -Math.PI / 2
  earth.position.y = 0.305
  root.add(earth)
  // Les feuilles, presque droites, qui s'écartent un peu du centre
  const map = snakeLeafTexture()
  map.wrapS = map.wrapT = RepeatWrapping
  map.repeat.set(1 / SNAKE_LEAF.width, 1 / SNAKE_LEAF.length)
  map.offset.set(0.5, 0)
  const leafMaterial = new MeshStandardMaterial({ map, roughness: 0.45, side: DoubleSide })
  const crown = new Group()
  crown.position.y = 0.3
  root.add(crown)
  const rand = seeded(23)
  for (let k = 0; k < 9; k++) {
    const length = SNAKE_LEAF.length * (0.55 + rand() * 0.45)
    const leaf = new Mesh(new ExtrudeGeometry(snakeLeaf(length, SNAKE_LEAF.width * (0.75 + rand() * 0.25)), { depth: 0.006, bevelEnabled: false }), leafMaterial)
    const turn = (k / 9) * Math.PI * 2 + rand() * 0.5
    const spread = k < 3 ? 0.02 : 0.07
    leaf.position.set(Math.cos(turn) * spread, 0, Math.sin(turn) * spread)
    leaf.rotation.set(0, -turn + Math.PI / 2 + (rand() - 0.5) * 0.8, 0, "YXZ")
    leaf.rotateX((0.05 + rand() * 0.18) * (k < 3 ? 0.5 : 1))
    crown.add(leaf)
  }
  root.traverse((child) => child.isMesh && (child.castShadow = true))
  return {
    root,
    animate(time) {
      crown.rotation.z = Math.sin(time * 0.6) * 0.01
    },
  }
}

// --- Le casque audio posé à plat sur le bureau du travail, avec son micro ---

export function makeDeskHeadset() {
  const root = new Group()
  const black = new MeshStandardMaterial({ color: "#1b1d22", roughness: 0.45, metalness: 0.3 })
  const foam = new MeshStandardMaterial({ color: "#33353d", roughness: 0.95 })
  // L'arceau couché sur le plateau, les deux écouteurs à ses extrémités
  const band = new Mesh(new TorusGeometry(0.085, 0.01, 8, 28, Math.PI), black)
  band.rotation.x = -Math.PI / 2
  band.position.y = 0.012
  root.add(band)
  for (const side of [-1, 1]) {
    const cup = new Mesh(new CylinderGeometry(0.042, 0.042, 0.03, 24), black)
    cup.position.set(side * 0.085, 0.015, 0)
    root.add(cup)
    const cushion = new Mesh(new TorusGeometry(0.032, 0.011, 8, 20), foam)
    cushion.rotation.x = Math.PI / 2
    cushion.position.set(side * 0.085, 0.033, 0)
    root.add(cushion)
  }
  // Le micro à perche, qui part de l'écouteur gauche
  const curve = new CatmullRomCurve3([new Vector3(-0.085, 0.02, 0.04), new Vector3(-0.06, 0.02, 0.1), new Vector3(-0.02, 0.02, 0.13)])
  root.add(new Mesh(new TubeGeometry(curve, 10, 0.003, 6), black))
  const mic = new Mesh(new SphereGeometry(0.009, 12, 10), foam)
  mic.position.set(-0.02, 0.02, 0.13)
  root.add(mic)
  root.traverse((child) => child.isMesh && (child.castShadow = true))
  return { root, animate() {} }
}

// --- Mon badge Ecritel, posé sur le bureau avec son tour de cou ---

function badgeTexture(logo) {
  const w = 270, h = 428
  const canvas = document.createElement("canvas")
  canvas.width = w
  canvas.height = h
  const g = canvas.getContext("2d")
  g.fillStyle = "#ffffff"
  g.fillRect(0, 0, w, h)
  // Le logo en haut, puis la photo, le nom et le poste
  const lw = logo?.naturalWidth ?? logo?.width, lh = logo?.naturalHeight ?? logo?.height
  g.textAlign = "center"
  if (lw && lh) {
    const fit = Math.min((w * 0.8) / lw, 80 / lh)
    g.drawImage(logo, (w - lw * fit) / 2, 24, lw * fit, lh * fit)
  } else {
    g.fillStyle = "#3a8a3a"
    g.font = "bold 44px sans-serif"
    g.fillText("ecritel", w / 2, 80)
  }
  g.fillStyle = "#dfe3ea"
  g.fillRect(w / 2 - 60, 120, 120, 140)
  g.fillStyle = "#9aa3b5"
  g.beginPath()
  g.arc(w / 2, 175, 30, 0, Math.PI * 2)
  g.fill()
  g.beginPath()
  g.ellipse(w / 2, 262, 52, 45, 0, Math.PI, 0)
  g.fill()
  g.fillStyle = "#14161b"
  g.font = "bold 30px sans-serif"
  g.fillText("Gabin Clavier", w / 2, 310)
  g.fillStyle = "#5a6070"
  g.font = "22px sans-serif"
  g.fillText("Alternant réseau · NOC", w / 2, 345)
  g.fillStyle = "#3a8a3a"
  g.fillRect(0, h - 40, w, 40)
  const texture = new CanvasTexture(canvas)
  texture.colorSpace = SRGBColorSpace
  texture.anisotropy = 8
  return texture
}

// `logo` : l'image du logo d'Ecritel. En mètres, le badge à plat, le haut vers -z.
export function makeBadge(logo) {
  const root = new Group()
  const W = 0.054, D = 0.086
  const edge = new MeshStandardMaterial({ color: "#f4f4f4", roughness: 0.4 })
  const card = new Mesh(new BoxGeometry(W, 0.002, D), [edge, edge, new MeshStandardMaterial({ map: badgeTexture(logo), roughness: 0.35 }), edge, edge, edge])
  card.position.y = 0.001
  root.add(card)
  // La pince en métal, puis le tour de cou qui fait une boucle sur le bureau
  const clip = new Mesh(new BoxGeometry(0.014, 0.004, 0.016), new MeshStandardMaterial({ color: "#c0c5cc", roughness: 0.25, metalness: 0.9 }))
  clip.position.set(0, 0.003, -D / 2 - 0.004)
  root.add(clip)
  const points = []
  for (let k = 0; k < 24; k++) {
    const a = (k / 24) * Math.PI * 2
    points.push(new Vector3(Math.sin(a) * 0.04, 0.003, -D / 2 - 0.008 - (1 - Math.cos(a)) * 0.045))
  }
  const strap = new Mesh(new TubeGeometry(new CatmullRomCurve3(points, true), 48, 0.003, 4, true), new MeshStandardMaterial({ color: "#3a8a3a", roughness: 0.8 }))
  root.add(strap)
  return { root, animate() {} }
}
