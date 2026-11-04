import {
  BoxGeometry,
  CanvasTexture,
  CatmullRomCurve3,
  CylinderGeometry,
  Group,
  LatheGeometry,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
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

// Remplace un globe gris par une Terre de la même taille, inclinée, qui tourne
export function makeEarth(radius, texture) {
  const tilt = new Group()
  tilt.rotation.z = 0.41 // l'inclinaison de la Terre
  const earth = new Mesh(new SphereGeometry(radius, 32, 20), new MeshStandardMaterial({ map: texture, roughness: 0.7 }))
  earth.castShadow = true
  tilt.add(earth)
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

export function makeClock() {
  const root = new Group()
  const face = new Mesh(new CylinderGeometry(0.15, 0.15, 0.02, 32), new MeshStandardMaterial({ color: "#f6f3ea", roughness: 0.6 }))
  face.rotation.x = Math.PI / 2
  root.add(face)
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

export function makeBackpack() {
  const root = new Group()
  const fabric = new MeshStandardMaterial({ color: "#2d3a6b", roughness: 0.9 })
  const accent = new MeshStandardMaterial({ color: "#ffd36a", roughness: 0.6 })
  const body = new Mesh(new BoxGeometry(0.3, 0.38, 0.16), fabric)
  body.position.y = 0.19
  root.add(body)
  const top = new Mesh(new CylinderGeometry(0.08, 0.08, 0.3, 16, 1, false, 0, Math.PI), fabric)
  top.rotation.z = Math.PI / 2
  top.position.y = 0.38
  root.add(top)
  const pocket = new Mesh(new BoxGeometry(0.22, 0.16, 0.05), fabric)
  pocket.position.set(0, 0.12, 0.1)
  root.add(pocket)
  const zip = new Mesh(new BoxGeometry(0.2, 0.012, 0.01), accent)
  zip.position.set(0, 0.2, 0.126)
  root.add(zip)
  root.rotation.x = -0.18 // appuyé contre le pied de la chaise
  root.traverse((c) => c.isMesh && (c.castShadow = true))
  return { root, animate() {} }
}

// --- Mug fumant sur le bureau ---

export function makeMug() {
  const root = new Group()
  const ceramic = new MeshStandardMaterial({ color: "#1a1d6a", roughness: 0.4 })
  const cup = new Mesh(new CylinderGeometry(0.042, 0.038, 0.1, 18), ceramic)
  cup.position.y = 0.05
  root.add(cup)
  const coffee = new Mesh(new CylinderGeometry(0.036, 0.036, 0.004, 18), new MeshStandardMaterial({ color: "#3b2416" }))
  coffee.position.y = 0.092
  root.add(coffee)
  const rim = new Mesh(new TorusGeometry(0.04, 0.004, 6, 18), new MeshStandardMaterial({ color: "#ffd36a", metalness: 0.6, roughness: 0.3 }))
  rim.rotation.x = Math.PI / 2
  rim.position.y = 0.1
  root.add(rim)
  const handle = new Mesh(new TorusGeometry(0.025, 0.007, 6, 12), ceramic)
  handle.position.set(0.05, 0.055, 0)
  root.add(handle)
  cup.castShadow = true
  // Volutes de vapeur qui montent et s'effacent
  const puffs = [0, 1, 2, 3].map((i) => {
    const puff = new Mesh(new SphereGeometry(0.018, 8, 6), new MeshBasicMaterial({ color: "#ffffff", transparent: true, opacity: 0, depthWrite: false }))
    root.add(puff)
    return { puff, phase: i / 4 }
  })
  return {
    root,
    animate(time) {
      for (const { puff, phase } of puffs) {
        const p = (time * 0.35 + phase) % 1
        puff.position.set(Math.sin(p * 6 + phase * 9) * 0.015, 0.11 + p * 0.16, Math.cos(p * 5) * 0.01)
        puff.scale.setScalar(0.6 + p * 1.6)
        puff.material.opacity = Math.sin(p * Math.PI) * 0.35
      }
    },
  }
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

export const BOOKS = [
  { title: "BERSERK", volume: "1", paper: "#141214", ink: "#c0392b", weight: "bold" },
  { title: "BERSERK", volume: "2", paper: "#141214", ink: "#c0392b", weight: "bold" },
  { title: "NARUTO", volume: "1", paper: "#f07a1a", ink: "#1a1412", weight: "bold" },
  { title: "NARUTO", volume: "2", paper: "#f07a1a", ink: "#1a1412", weight: "bold" },
  { title: "LE SEIGNEUR DES ANNEAUX", volume: "", paper: "#1f3a2a", ink: "#e8c66a", weight: "" },
  { title: "HARRY POTTER", volume: "", paper: "#7a1a1a", ink: "#ffd36a", weight: "bold" },
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
