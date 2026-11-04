import {
  BoxGeometry,
  CanvasTexture,
  CatmullRomCurve3,
  CircleGeometry,
  ConeGeometry,
  CylinderGeometry,
  DoubleSide,
  Group,
  LatheGeometry,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  PlaneGeometry,
  PointLight,
  SRGBColorSpace,
  SphereGeometry,
  TorusGeometry,
  TubeGeometry,
  Vector2,
  Vector3,
} from "three"

// Objets de décor ajoutés aux pièces. Chacun est fait en mètres et renvoie { root, animate(time, night) }.

// --- La Terre : une texture dessinée au chargement, continents tirés d'un bruit sur la sphère ---

const hash = (x, y, z) => {
  const s = Math.sin(x * 127.1 + y * 311.7 + z * 74.7) * 43758.5453
  return s - Math.floor(s)
}
function noise(x, y, z) {
  const [ix, iy, iz] = [Math.floor(x), Math.floor(y), Math.floor(z)]
  const [fx, fy, fz] = [x - ix, y - iy, z - iz].map((f) => f * f * (3 - 2 * f))
  const lerp = (a, b, t) => a + (b - a) * t
  const c = (dx, dy, dz) => hash(ix + dx, iy + dy, iz + dz)
  return lerp(
    lerp(lerp(c(0, 0, 0), c(1, 0, 0), fx), lerp(c(0, 1, 0), c(1, 1, 0), fx), fy),
    lerp(lerp(c(0, 0, 1), c(1, 0, 1), fx), lerp(c(0, 1, 1), c(1, 1, 1), fx), fy),
    fz,
  )
}
const fbm = (x, y, z) => noise(x, y, z) * 0.55 + noise(x * 2, y * 2, z * 2) * 0.3 + noise(x * 4, y * 4, z * 4) * 0.15

export function earthTexture() {
  const w = 256, h = 128
  const canvas = document.createElement("canvas")
  canvas.width = w
  canvas.height = h
  const g = canvas.getContext("2d")
  const img = g.createImageData(w, h)
  for (let j = 0; j < h; j++) {
    const lat = (0.5 - j / h) * Math.PI
    for (let i = 0; i < w; i++) {
      const lon = (i / w) * Math.PI * 2
      const [x, y, z] = [Math.cos(lat) * Math.cos(lon), Math.sin(lat), Math.cos(lat) * Math.sin(lon)]
      const n = fbm(x * 2.2 + 5, y * 2.2 + 5, z * 2.2 + 5)
      let rgb = [29, 95, 168] // océan
      if (n > 0.52) rgb = n > 0.62 ? [150, 128, 80] : [63, 143, 58] // terres : désert ou forêt
      else if (n > 0.49) rgb = [52, 128, 196] // eaux peu profondes
      if (Math.abs(lat) > 1.2) rgb = [236, 242, 250] // calottes polaires
      img.data.set([...rgb, 255], (j * w + i) * 4)
    }
  }
  g.putImageData(img, 0, 0)
  const texture = new CanvasTexture(canvas)
  texture.colorSpace = SRGBColorSpace
  return texture
}

// Les nuages : un autre bruit, blanc là où il est fort, transparent ailleurs
export function cloudTexture() {
  const w = 256, h = 128
  const canvas = document.createElement("canvas")
  canvas.width = w
  canvas.height = h
  const g = canvas.getContext("2d")
  const img = g.createImageData(w, h)
  for (let j = 0; j < h; j++) {
    const lat = (0.5 - j / h) * Math.PI
    for (let i = 0; i < w; i++) {
      const lon = (i / w) * Math.PI * 2
      const [x, y, z] = [Math.cos(lat) * Math.cos(lon), Math.sin(lat), Math.cos(lat) * Math.sin(lon)]
      const n = fbm(x * 3 + 17, y * 6 + 3, z * 3 + 11)
      img.data.set([255, 255, 255, Math.max(0, Math.min(1, (n - 0.55) * 5)) * 230], (j * w + i) * 4)
    }
  }
  g.putImageData(img, 0, 0)
  const texture = new CanvasTexture(canvas)
  texture.colorSpace = SRGBColorSpace
  return texture
}

// Remplace un globe gris par une Terre de la même taille, inclinée, qui tourne, avec ses nuages et son méridien doré
export function makeEarth(radius, texture, clouds) {
  const tilt = new Group()
  tilt.rotation.z = 0.41 // l'inclinaison de la Terre
  const earth = new Mesh(new SphereGeometry(radius, 32, 20), new MeshStandardMaterial({ map: texture, roughness: 0.7 }))
  earth.castShadow = true
  tilt.add(earth)
  if (clouds) {
    const sky = new Mesh(new SphereGeometry(radius * 1.025, 32, 20), new MeshStandardMaterial({ map: clouds, transparent: true, depthWrite: false, roughness: 1 }))
    sky.rotation.y = 1.3
    earth.add(sky)
  }
  const gold = new MeshStandardMaterial({ color: "#d4a94a", metalness: 0.85, roughness: 0.3 })
  const meridian = new Mesh(new TorusGeometry(radius * 1.1, radius * 0.035, 6, 40, Math.PI), gold)
  meridian.rotation.z = -Math.PI / 2 // un demi-cercle d'un pôle à l'autre
  tilt.add(meridian)
  for (const y of [-1, 1]) {
    const pin = new Mesh(new SphereGeometry(radius * 0.07, 8, 6), gold)
    pin.position.y = y * radius * 1.1
    tilt.add(pin)
  }
  return { root: tilt, spinner: earth }
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

// --- Switch réseau aux diodes qui clignotent, sur le bureau du NOC ---
// Les ports font face au personnage (-z), le dessus porte des aérations et une étiquette

function switchTop() {
  const canvas = document.createElement("canvas")
  canvas.width = 256
  canvas.height = 128
  const g = canvas.getContext("2d")
  g.fillStyle = "#59606e"
  g.fillRect(0, 0, 256, 128)
  g.fillStyle = "#3a404b"
  for (let k = 0; k < 9; k++) g.fillRect(150 + k * 10, 24, 5, 80) // aérations
  g.fillStyle = "#e8ecf2"
  g.fillRect(18, 22, 116, 34)
  g.fillStyle = "#1a1d6a"
  g.font = "bold 22px sans-serif"
  g.fillText("SW-NOC-01", 24, 47)
  g.fillStyle = "#3dff7a"
  g.beginPath()
  g.arc(30, 88, 7, 0, Math.PI * 2)
  g.fill()
  g.fillStyle = "#d9dde5"
  g.font = "18px sans-serif"
  g.fillText("48 × 1G · 4 × 10G", 44, 94)
  const texture = new CanvasTexture(canvas)
  texture.colorSpace = SRGBColorSpace
  // Retournée pour se lire depuis l'avant du switch, côté personnage
  texture.center.set(0.5, 0.5)
  texture.rotation = Math.PI
  return texture
}

export function makeSwitch() {
  const root = new Group()
  const metal = new MeshStandardMaterial({ color: "#59606e", roughness: 0.45, metalness: 0.35 })
  const top = new MeshStandardMaterial({ map: switchTop(), roughness: 0.5, metalness: 0.2 })
  // Faces de la boîte : +x, -x, +y (le dessus), -y, +z, -z
  const box = new Mesh(new BoxGeometry(0.44, 0.06, 0.24), [metal, metal, top, metal, metal, metal])
  box.position.y = 0.03
  box.castShadow = true
  root.add(box)
  const front = new Mesh(new BoxGeometry(0.42, 0.045, 0.004), new MeshStandardMaterial({ color: "#2a2e36", roughness: 0.6 }))
  front.position.set(0, 0.03, -0.121)
  root.add(front)
  const port = new MeshStandardMaterial({ color: "#0c0d12" })
  const leds = []
  for (let row = 0; row < 2; row++) {
    for (let k = 0; k < 12; k++) {
      const x = -0.18 + k * 0.03
      const y = 0.018 + row * 0.022
      const socket = new Mesh(new BoxGeometry(0.022, 0.014, 0.004), port)
      socket.position.set(x, y, -0.124)
      root.add(socket)
      const material = new MeshStandardMaterial({ color: "#0a2a12", emissive: (k + row) % 5 ? "#3dff7a" : "#ffb02e", emissiveIntensity: 1 })
      const led = new Mesh(new BoxGeometry(0.006, 0.004, 0.004), material)
      led.position.set(x + 0.007, y + 0.009, -0.124)
      root.add(led)
      leds.push(material)
    }
  }
  // Câbles branchés sur quelques ports : la prise, puis le câble qui part vers l'intérieur du bureau, derrière les écrans
  const colors = ["#2a6cff", "#ffd23a", "#d9dde5", "#e0453a", "#2fb35a"]
  ;[0, 1, 3, 4, 6, 9, 13, 14, 16, 20].forEach((port, k) => {
    const row = Math.floor(port / 12), col = port % 12
    const x = -0.18 + col * 0.03, y = 0.018 + row * 0.022
    const material = new MeshStandardMaterial({ color: colors[k % colors.length], roughness: 0.6 })
    const plug = new Mesh(new BoxGeometry(0.018, 0.012, 0.022), material)
    plug.position.set(x, y, -0.135)
    root.add(plug)
    const out = 0.3 + k * 0.006
    const path = new CatmullRomCurve3([
      new Vector3(x, y, -0.146),
      new Vector3(x - 0.01, y * 0.4, -0.18 - k * 0.003),
      new Vector3((x - out) / 2, 0.005, -0.19 - k * 0.003),
      new Vector3(-out, 0.005, -0.12),
      new Vector3(-out - 0.02, 0.005, 0.12),
    ])
    root.add(new Mesh(new TubeGeometry(path, 24, 0.0035, 5), material))
  })
  return {
    root,
    animate(time) {
      // Chaque port clignote à son rythme, comme du trafic
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

// --- Le PC gamer de la chambre : vitre latérale, ventilateurs RGB en façade, carte graphique, RAM, watercooling ---
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

  // Carte mère contre la paroi opaque
  const inner = W / 2 - t
  box(0.004, H * 0.68, D * 0.7, [inner - 0.002, H * 0.6, D * 0.08], new MeshStandardMaterial({ color: "#3a4252", roughness: 0.6, metalness: 0.3 }))
  // Watercooling : la pompe et son anneau lumineux, tournés vers la vitre
  const pump = new Mesh(new CylinderGeometry(0.035, 0.035, 0.03, 24), black)
  pump.rotation.z = Math.PI / 2
  pump.position.set(inner - 0.02, H * 0.68, D * 0.08)
  body.add(pump)
  const pumpRing = new Mesh(new TorusGeometry(0.03, 0.005, 8, 32), glow())
  pumpRing.rotation.y = Math.PI / 2
  pumpRing.position.set(inner - 0.036, H * 0.68, D * 0.08)
  body.add(pumpRing)
  // Quatre barrettes de RAM, le haut lumineux
  for (let k = 0; k < 4; k++) {
    const z = D * 0.08 - 0.07 - k * 0.012
    box(0.035, H * 0.13, 0.008, [inner - 0.02, H * 0.62, z], new MeshStandardMaterial({ color: "#5a6070", roughness: 0.4, metalness: 0.6 }))
    box(0.037, 0.014, 0.009, [inner - 0.02, H * 0.62 + H * 0.065, z], glow())
  }
  // Carte graphique couchée, avec sa bande lumineuse côté vitre
  const gpuW = Math.min(W * 0.5, 0.12)
  box(gpuW, H * 0.09, D * 0.66, [inner - gpuW / 2 - 0.004, H * 0.4, D * 0.12], new MeshStandardMaterial({ color: "#3b3f4a", roughness: 0.35, metalness: 0.6 }))
  box(0.004, 0.016, D * 0.6, [inner - gpuW - 0.006, H * 0.4, D * 0.12], glow())
  // Les trois ventilateurs de la carte graphique, sous elle
  for (let k = 0; k < 3; k++) {
    const gpuFan = new Mesh(new TorusGeometry(D * 0.08, 0.003, 6, 20), glow())
    gpuFan.rotation.x = Math.PI / 2
    gpuFan.position.set(inner - gpuW / 2 - 0.004, H * 0.4 - H * 0.046, D * (0.12 - 0.2 + k * 0.2))
    body.add(gpuFan)
  }
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

// --- La PS Vita blanche et bleu clair, posée sur la table de nuit ---

function vitaScreen() {
  const canvas = document.createElement("canvas")
  canvas.width = 256
  canvas.height = 144
  const g = canvas.getContext("2d")
  const sky = g.createLinearGradient(0, 0, 256, 144)
  sky.addColorStop(0, "#bfe6ff")
  sky.addColorStop(1, "#5aa8e6")
  g.fillStyle = sky
  g.fillRect(0, 0, 256, 144)
  // L'écran d'accueil : des bulles d'applications
  const colors = ["#ffffff", "#ffd36a", "#ff7ad0", "#7fe0a0", "#1a1d6a", "#ff9a3a"]
  for (let k = 0; k < 9; k++) {
    g.fillStyle = colors[k % colors.length]
    g.beginPath()
    g.arc(40 + (k % 5) * 44 + (k > 4 ? 22 : 0), k > 4 ? 98 : 50, 15, 0, Math.PI * 2)
    g.fill()
  }
  const texture = new CanvasTexture(canvas)
  texture.colorSpace = SRGBColorSpace
  return texture
}

export function makePSVita() {
  const root = new Group()
  const white = new MeshStandardMaterial({ color: "#f4f6f8", roughness: 0.25, metalness: 0.1 })
  const blue = new MeshStandardMaterial({ color: "#9fd4f5", roughness: 0.35 })
  // Coque arrondie : blanche dessus, bleu clair dessous
  for (const [material, y, h] of [[blue, 0.004, 0.008], [white, 0.0125, 0.009]]) {
    const middle = new Mesh(new BoxGeometry(0.13, h, 0.083), material)
    middle.position.y = y
    root.add(middle)
    for (const x of [-0.065, 0.065]) {
      const end = new Mesh(new CylinderGeometry(0.0415, 0.0415, h, 24), material)
      end.position.set(x, y, 0)
      root.add(end)
    }
  }
  const screen = new Mesh(new PlaneGeometry(0.1, 0.057), new MeshBasicMaterial({ map: vitaScreen(), toneMapped: false }))
  screen.rotation.x = -Math.PI / 2
  screen.position.y = 0.0172
  root.add(screen)
  // Joysticks, croix directionnelle et boutons, en bleu clair
  for (const x of [-0.078, 0.078]) {
    const stick = new Mesh(new CylinderGeometry(0.008, 0.009, 0.006, 16), blue)
    stick.position.set(x, 0.019, 0.022)
    root.add(stick)
  }
  for (const [w, d] of [[0.022, 0.007], [0.007, 0.022]]) {
    const pad = new Mesh(new BoxGeometry(w, 0.003, d), blue)
    pad.position.set(-0.078, 0.0175, -0.012)
    root.add(pad)
  }
  for (const [x, z] of [[0, -0.009], [0, 0.009], [-0.009, 0], [0.009, 0]]) {
    const button = new Mesh(new CylinderGeometry(0.0035, 0.0035, 0.003, 12), blue)
    button.position.set(0.078 + x, 0.0175, -0.012 + z)
    root.add(button)
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

// --- Plante tombante, ses tiges pendent sur le devant de l'étagère (+z) ---

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
    const a = -1.2 + (k / 6) * 2.4 // en éventail vers l'avant
    const out = new Vector3(Math.sin(a), 0, Math.cos(a))
    const length = 0.2 + ((k * 37) % 5) * 0.05
    const pivot = new Group()
    pivot.position.set(out.x * 0.05, 0.1, out.z * 0.05)
    root.add(pivot)
    const curve = new CatmullRomCurve3([
      new Vector3(0, 0, 0),
      out.clone().multiplyScalar(0.05).add(new Vector3(0, 0.01, 0)),
      out.clone().multiplyScalar(0.08).add(new Vector3(0, -0.06, 0)),
      out.clone().multiplyScalar(0.1).add(new Vector3(0, -length, 0)),
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
  { title: "FIGHT CLUB", volume: "", paper: "#1a1416", ink: "#ff6fae", weight: "bold" },
  { title: "ONCE UPON A TIME IN HOLLYWOOD", volume: "", paper: "#e8b04a", ink: "#7a1f1a", weight: "bold" },
  { title: "PAPRIKA", volume: "", paper: "#d9342b", ink: "#fff1cf", weight: "bold" },
  { title: "her", volume: "", paper: "#e2563f", ink: "#ffffff", weight: "" },
  { title: "SNATCH", volume: "", paper: "#f2f0ea", ink: "#d49a10", weight: "bold" },
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
