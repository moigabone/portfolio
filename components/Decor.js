import {
  BoxGeometry,
  CanvasTexture,
  CatmullRomCurve3,
  CylinderGeometry,
  Group,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  SRGBColorSpace,
  SphereGeometry,
  TorusGeometry,
  TubeGeometry,
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

export function makeSwitch() {
  const root = new Group()
  const box = new Mesh(new BoxGeometry(0.44, 0.045, 0.2), new MeshStandardMaterial({ color: "#2b2e38", roughness: 0.5, metalness: 0.4 }))
  box.position.y = 0.0225
  box.castShadow = true
  root.add(box)
  const port = new MeshStandardMaterial({ color: "#0c0d12" })
  const leds = []
  for (let k = 0; k < 8; k++) {
    const x = -0.18 + k * 0.045
    const socket = new Mesh(new BoxGeometry(0.03, 0.02, 0.004), port)
    socket.position.set(x, 0.02, 0.101)
    root.add(socket)
    const material = new MeshStandardMaterial({ color: "#0a2a12", emissive: "#3dff7a", emissiveIntensity: 1 })
    const led = new Mesh(new BoxGeometry(0.008, 0.006, 0.004), material)
    led.position.set(x + 0.01, 0.037, 0.101)
    root.add(led)
    leds.push(material)
  }
  return {
    root,
    animate(time) {
      // Chaque port clignote à son rythme, comme du trafic
      leds.forEach((led, k) => (led.emissiveIntensity = Math.sin(time * (6 + k * 1.7) + k * 2.3) > 0.2 ? 1.4 : 0.15))
    },
  }
}
