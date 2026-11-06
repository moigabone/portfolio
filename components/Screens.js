import { BufferAttribute, CanvasTexture, MeshBasicMaterial, SRGBColorSpace, Vector3 } from "three"

// Écrans vivants : chaque dalle d'écran du modèle reçoit une texture dessinée en continu.
// Les dalles n'ont pas de coordonnées de texture : on les calcule en projetant chaque dalle sur son plan.

const W = 384, H = 240 // une dalle, en pixels
const REFRESH = 0.1 // secondes entre deux dessins
const UP = new Vector3(0, 1, 0)

// Regroupe les sommets reliés par des triangles : une composante = une dalle
function quads(geometry) {
  const count = geometry.attributes.position.count
  const parent = [...Array(count).keys()]
  const find = (i) => (parent[i] === i ? i : (parent[i] = find(parent[i])))
  const index = geometry.index?.array ?? [...Array(count).keys()]
  for (let i = 0; i < index.length; i += 3) {
    parent[find(index[i + 1])] = find(index[i])
    parent[find(index[i + 2])] = find(index[i])
  }
  const groups = new Map()
  for (let i = 0; i < count; i++) groups.set(find(i), [...(groups.get(find(i)) ?? []), i])
  return [...groups.values()]
}

// Donne des coordonnées de texture à un maillage d'écrans : la dalle k occupe la k-ième colonne de la texture,
// de gauche à droite vue de face. Renvoie le nombre de dalles.
function mapScreens(mesh, roomCenter) {
  const geometry = mesh.geometry
  const pos = geometry.attributes.position
  const world = [...Array(pos.count).keys()].map((i) => new Vector3().fromBufferAttribute(pos, i).applyMatrix4(mesh.matrixWorld))
  const panels = quads(geometry).map((ids) => {
    const center = ids.reduce((s, i) => s.add(world[i]), new Vector3()).divideScalar(ids.length)
    const [a, b, c] = ids.slice(0, 3).map((i) => world[i])
    const normal = new Vector3().crossVectors(b.clone().sub(a), c.clone().sub(a)).normalize()
    // L'écran regarde l'intérieur de la pièce
    if (normal.dot(roomCenter.clone().sub(center)) < 0) normal.negate()
    const right = new Vector3().crossVectors(UP, normal).normalize()
    const up = new Vector3().crossVectors(normal, right)
    return { ids, center, right, up, normal }
  })
  // De gauche à droite, vu depuis l'intérieur de la pièce
  const axis = panels[0].right
  panels.sort((p, q) => p.center.dot(axis) - q.center.dot(axis))

  const uv = new Float32Array(pos.count * 2)
  panels.forEach((panel, k) => {
    const { ids, center, right, up } = panel
    const u = ids.map((i) => world[i].clone().sub(center).dot(right))
    const v = ids.map((i) => world[i].clone().sub(center).dot(up))
    const [u0, u1, v0, v1] = [Math.min(...u), Math.max(...u), Math.min(...v), Math.max(...v)]
    panel.width = u1 - u0
    panel.height = v1 - v0
    ids.forEach((i, j) => {
      uv[i * 2] = (k + (u[j] - u0) / (u1 - u0 || 1)) / panels.length
      uv[i * 2 + 1] = (v[j] - v0) / (v1 - v0 || 1)
    })
  })
  geometry.setAttribute("uv", new BufferAttribute(uv, 2))
  return panels
}

// --- Contenus ---

const MONO = "600 15px ui-monospace, Consolas, monospace"
const SANS = "600 20px 'Chakra Petch', system-ui, sans-serif"

const TERMINAL = [
  ["$", "ssh fw-cluster-01"],
  [">", "show ha status"],
  [" ", "node1  ACTIVE   sync OK"],
  [" ", "node2  PASSIVE  sync OK"],
  [">", "set routing-instances CLIENT-42 instance-type vrf"],
  [">", "set interfaces irb unit 210 family inet address 10.42.0.1/24"],
  [">", "set protocols bgp group TRANSIT neighbor 192.0.2.1 peer-as 64512"],
  [">", "commit check"],
  [" ", "configuration check succeeds"],
  [">", "commit and-quit"],
  [" ", "commit complete"],
  ["$", "ping 10.42.0.254 -c 3"],
  [" ", "64 bytes from 10.42.0.254: icmp_seq=1 ttl=64 time=0.41 ms"],
  [" ", "64 bytes from 10.42.0.254: icmp_seq=2 ttl=64 time=0.38 ms"],
  ["$", "show bgp summary"],
  [" ", "192.0.2.1   64512  Established  412/398"],
]

function terminal(g, x, t) {
  g.fillStyle = "#070a16"
  g.fillRect(x, 0, W, H)
  g.font = MONO
  const shown = t ? Math.floor(t * 1.6) % (TERMINAL.length + 4) : 12 // immobile : un terminal déjà rempli
  const lines = TERMINAL.slice(Math.max(0, shown - 12), shown)
  lines.forEach(([p, text], i) => {
    const y = 26 + i * 18
    g.fillStyle = p === " " ? "#8fa3c9" : "#ffd36a"
    g.fillText(p, x + 12, y)
    g.fillStyle = p === " " ? "#8fa3c9" : "#9fe2a0"
    g.fillText(text, x + 28, y)
  })
  // Curseur qui clignote
  if (Math.floor(t * 2) % 2) {
    g.fillStyle = "#9fe2a0"
    g.fillRect(x + 28, 14 + lines.length * 18, 9, 15)
  }
}

function monitoring(g, x, t) {
  g.fillStyle = "#0b1020"
  g.fillRect(x, 0, W, H)
  g.font = SANS
  g.fillStyle = "#ecebff"
  g.fillText("Trafic · CLIENT-42", x + 16, 30)
  for (const [i, label] of ["BGP  ESTABLISHED", "HA  OK"].entries()) {
    g.fillStyle = "#16391f"
    g.fillRect(x + 16 + i * 180, 44, 164, 26)
    g.fillStyle = "#9fe2a0"
    g.font = MONO
    g.fillText(label, x + 26 + i * 180, 62)
  }
  // Courbe de trafic qui défile
  for (const [color, phase, amp] of [["#9fb0ff", 0, 40], ["#ff7ad0", 2, 22]]) {
    g.strokeStyle = color
    g.lineWidth = 2.5
    g.beginPath()
    for (let px = 0; px <= W - 32; px += 6) {
      const s = px / 40 + t * 1.2 + phase
      const y = 175 - amp - Math.sin(s) * amp * 0.6 - Math.sin(s * 2.7) * amp * 0.3
      px ? g.lineTo(x + 16 + px, y) : g.moveTo(x + 16 + px, y)
    }
    g.stroke()
  }
  g.fillStyle = "#34338a"
  g.fillRect(x + 16, 214, W - 32, 1)
}

const RULES = [
  ["PASS", "LAN-CLIENT", "DMZ-WEB", "https"],
  ["PASS", "ADMIN", "BASTION", "ssh"],
  ["PASS", "DMZ-WEB", "DB", "tcp/5432"],
  ["BLOCK", "INTERNET", "LAN-CLIENT", "any"],
  ["PASS", "MONITORING", "any", "snmp"],
  ["BLOCK", "any", "any", "any"],
]

function firewall(g, x, t) {
  g.fillStyle = "#0b1020"
  g.fillRect(x, 0, W, H)
  g.font = SANS
  g.fillStyle = "#ecebff"
  g.fillText("Règles de filtrage", x + 16, 30)
  g.font = MONO
  const active = Math.floor(t * 0.8) % RULES.length
  RULES.forEach(([action, from, to, port], i) => {
    const y = 64 + i * 28
    if (i === active) {
      g.fillStyle = "rgb(255 211 106 / 0.18)"
      g.fillRect(x + 10, y - 18, W - 20, 26)
    }
    g.fillStyle = action === "PASS" ? "#9fe2a0" : "#ff7a8a"
    g.fillText(action, x + 16, y)
    g.fillStyle = "#c9c6ec"
    g.fillText(`${from} → ${to}`, x + 82, y)
    g.fillStyle = "#8f8cc4"
    g.fillText(port, x + W - 90, y)
  })
}

// Mes sites, en diaporama qui défile doucement
// Mes sites, en captures (public/screens/) : l'écran de la chambre les fait défiler, un clic ouvre celui qui est affiché
export const SITES = [
  { image: "codex", url: "https://codex.gabin-clavier.fr" },
  { image: "veille", url: "https://veille.gabin-clavier.fr" },
  { image: "carte", url: "https://links.gabin-clavier.fr" },
]

function sites(images) {
  const paint = (g, x, t) => {
    const loaded = images.filter((img) => img.complete && img.naturalWidth)
    g.fillStyle = "#06051a"
    g.fillRect(x, 0, W, H)
    if (!loaded.length) return
    const slide = t / 6
    const k = Math.floor(slide) % loaded.length
    const fade = Math.min(1, (slide % 1) * 6)
    const draw = (img, alpha) => {
      g.globalAlpha = alpha
      g.drawImage(img, x, 0, W, H)
    }
    draw(loaded[(k + loaded.length - 1) % loaded.length], 1)
    draw(loaded[k], fade)
    g.globalAlpha = 1
    paint.showing = SITES[images.indexOf(loaded[k])]
  }
  paint.showing = null // le site affiché, une fois les captures chargées
  return paint
}

const CODE = [
  "export function makePerson() {",
  "  const root = new Group()",
  "  // Moi, assis au bureau",
  "  root.add(hair(), face())",
  "  return { root }",
  "}",
  "",
  "> claude",
  "  Ajoute Lego, mon Jack Russell",
  "  ✓ components/Dog.js créé",
]

function editor(g, x, t) {
  g.fillStyle = "#0d0b24"
  g.fillRect(x, 0, W, H)
  g.fillStyle = "#16143a"
  g.fillRect(x, 0, W, 26)
  g.font = MONO
  g.fillStyle = "#b9b6e6"
  g.fillText("Person.js — portfolio", x + 12, 18)
  const chars = t ? Math.floor(t * 18) % 420 : 999
  let left = chars
  CODE.forEach((line, i) => {
    if (left <= 0) return
    const text = line.slice(0, left)
    left -= line.length + 1
    g.fillStyle = line.startsWith(">") ? "#ffd36a" : line.trim().startsWith("//") ? "#8f8cc4" : line.includes("✓") ? "#9fe2a0" : "#ecebff"
    g.fillText(text, x + 12, 48 + i * 18)
  })
}

// Un TP sur Packet Tracer : la topologie du réseau, un paquet qui circule en mode simulation
const PT_NODES = {
  R1: [192, 70, "router"],
  SW1: [100, 130, "switch"],
  SW2: [284, 130, "switch"],
  PC0: [50, 195, "pc"],
  PC1: [150, 195, "pc"],
  PC2: [234, 195, "pc"],
  SRV: [334, 195, "server"],
}
const PT_LINKS = [["R1", "SW1"], ["R1", "SW2"], ["SW1", "PC0"], ["SW1", "PC1"], ["SW2", "PC2"], ["SW2", "SRV"]]
const PT_ROUTE = ["PC0", "SW1", "R1", "SW2", "SRV"] // le ping de PC0 vers le serveur

function ptDevice(g, x, y, kind) {
  if (kind === "router") {
    g.fillStyle = "#2f7fc1"
    g.beginPath()
    g.ellipse(x, y, 22, 12, 0, 0, Math.PI * 2)
    g.fill()
    g.strokeStyle = "#ffffff"
    g.lineWidth = 2
    for (const [dx, dy] of [[-9, 0], [9, 0], [0, -5], [0, 5]]) {
      g.beginPath()
      g.moveTo(x, y)
      g.lineTo(x + dx, y + dy)
      g.stroke()
    }
  } else if (kind === "switch") {
    g.fillStyle = "#2f7fc1"
    g.fillRect(x - 22, y - 9, 44, 18)
    g.fillStyle = "#ffffff"
    for (let k = 0; k < 4; k++) g.fillRect(x - 16 + k * 9, y - 2, 5, 4)
  } else if (kind === "server") {
    g.fillStyle = "#5a6372"
    g.fillRect(x - 10, y - 16, 20, 32)
    g.fillStyle = "#9fe2a0"
    for (let k = 0; k < 3; k++) g.fillRect(x - 6, y - 11 + k * 9, 12, 3)
  } else {
    g.fillStyle = "#3a4250"
    g.fillRect(x - 13, y - 13, 26, 18)
    g.fillStyle = "#8fd0ff"
    g.fillRect(x - 10, y - 10, 20, 12)
    g.fillStyle = "#3a4250"
    g.fillRect(x - 4, y + 5, 8, 4)
    g.fillRect(x - 9, y + 9, 18, 2)
  }
}

// Le petit jeu du TP : quelques liens tombent en panne ; on clique dessus pour les réparer, puis le ping passe.
// Une fois le réseau réparé, un clic relance une nouvelle panne.
const lab = { down: new Set([1, 4]), fixes: 0, clicks: 0, solvedAt: null }
function breakLinks() {
  lab.down = new Set()
  while (lab.down.size < 2 + Math.floor(Math.random() * 2)) lab.down.add(Math.floor(Math.random() * PT_LINKS.length))
  lab.clicks = 0
  lab.solvedAt = null
}
// La distance d'un point au segment [a, b]
function toSegment([px, py], [ax, ay], [bx, by]) {
  const dx = bx - ax, dy = by - ay
  const k = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy)))
  return Math.hypot(px - ax - k * dx, py - ay - k * dy)
}
// `u`, `v` : le point cliqué sur la dalle, de 0 à 1 depuis le coin en haut à gauche
export function packetTracerClick(u, v) {
  if (!lab.down.size) return breakLinks()
  const at = [u * W, v * H]
  lab.clicks++
  const near = PT_LINKS.map(([a, b], k) => [k, toSegment(at, PT_NODES[a], PT_NODES[b])]).filter(([k, d]) => lab.down.has(k) && d < 22)
  if (!near.length) return
  lab.down.delete(near.sort((p, q) => p[1] - q[1])[0][0])
  if (!lab.down.size) lab.solvedAt = performance.now() / 1000
}

function packetTracer(g, x, t) {
  g.fillStyle = "#eef2f6"
  g.fillRect(x, 0, W, H)
  // La barre de titre et la barre d'outils
  g.fillStyle = "#1f3b57"
  g.fillRect(x, 0, W, 22)
  g.font = "600 12px ui-monospace, Consolas, monospace"
  g.fillStyle = "#ecf2f8"
  g.fillText("Packet Tracer — TP_routage.pkt", x + 8, 15)
  g.fillStyle = "#d5dde6"
  g.fillRect(x, 22, W, 14)
  // Les câbles, avec leurs voyants verts aux deux bouts
  PT_LINKS.forEach(([a, b], k) => {
    const [ax, ay] = PT_NODES[a], [bx, by] = PT_NODES[b]
    const down = lab.down.has(k)
    g.strokeStyle = down ? "#d8322a" : "#1a1a1a"
    g.lineWidth = down ? 2.5 : 1.5
    g.setLineDash(down ? [6, 5] : [])
    g.beginPath()
    g.moveTo(x + ax, ay)
    g.lineTo(x + bx, by)
    g.stroke()
    g.setLineDash([])
    if (down) {
      // Une croix rouge au milieu du lien coupé
      const mx = x + (ax + bx) / 2, my = (ay + by) / 2
      g.strokeStyle = "#d8322a"
      g.lineWidth = 3
      g.beginPath()
      g.moveTo(mx - 6, my - 6)
      g.lineTo(mx + 6, my + 6)
      g.moveTo(mx + 6, my - 6)
      g.lineTo(mx - 6, my + 6)
      g.stroke()
    }
    g.fillStyle = down ? "#d8322a" : "#29b34a"
    for (const f of [0.18, 0.82]) {
      g.beginPath()
      g.arc(x + ax + (bx - ax) * f, ay + (by - ay) * f, 2.6, 0, Math.PI * 2)
      g.fill()
    }
  })
  g.font = "600 11px ui-monospace, Consolas, monospace"
  for (const [name, [nx, ny, kind]] of Object.entries(PT_NODES)) {
    ptDevice(g, x + nx, ny, kind)
    g.fillStyle = "#1f2a36"
    g.fillText(name, x + nx - 10, ny + (kind === "router" ? -17 : 28))
  }
  // Le paquet du ping, une enveloppe qui saute d'équipement en équipement : seulement quand le réseau marche
  const hops = PT_ROUTE.length - 1
  const p = (t * 0.6) % (hops + 1)
  if (p < hops && !lab.down.size) {
    const k = Math.floor(p), u = p - k, f = u * u * (3 - 2 * u)
    const [ax, ay] = PT_NODES[PT_ROUTE[k]], [bx, by] = PT_NODES[PT_ROUTE[k + 1]]
    const ex = x + ax + (bx - ax) * f, ey = ay + (by - ay) * f
    g.fillStyle = "#f6d34a"
    g.fillRect(ex - 8, ey - 6, 16, 12)
    g.strokeStyle = "#8a6d00"
    g.lineWidth = 1
    g.strokeRect(ex - 8, ey - 6, 16, 12)
    g.beginPath()
    g.moveTo(ex - 8, ey - 6)
    g.lineTo(ex, ey + 1)
    g.lineTo(ex + 8, ey - 6)
    g.stroke()
  }
  g.fillStyle = "#4a5866"
  // L'état du TP, en bas
  if (lab.down.size) {
    g.fillStyle = "#d8322a"
    g.fillText(`Panne : ${lab.down.size} lien${lab.down.size > 1 ? "s" : ""} coupé${lab.down.size > 1 ? "s" : ""} · clique dessus`, x + 8, H - 8)
  } else {
    g.fillStyle = "#1f7a3a"
    g.fillText(lab.solvedAt ? `Ping OK · réparé en ${lab.clicks} clic${lab.clicks > 1 ? "s" : ""} · clic : nouvelle panne` : "Simulation · ICMP PC0 → SRV", x + 8, H - 8)
  }
}
packetTracerClick.painter = packetTracer // pour retrouver la dalle du TP (voir Apartment)

function bastion(g, x, t) {
  g.fillStyle = "#0b1020"
  g.fillRect(x, 0, W, H)
  g.font = SANS
  g.fillStyle = "#ecebff"
  g.fillText("Bastion d'administration", x + 16, 30)
  const boxes = [["Admin", 40], ["Bastion", 170], ["Serveurs", 300]]
  g.font = MONO
  boxes.forEach(([label, bx], i) => {
    g.strokeStyle = i === 1 ? "#ffd36a" : "#34338a"
    g.lineWidth = 2
    g.strokeRect(x + bx - 34, 100, 88, 50)
    g.fillStyle = "#ecebff"
    g.fillText(label, x + bx - 26, 130)
  })
  g.strokeStyle = "#34338a"
  g.beginPath()
  g.moveTo(x + 94, 125)
  g.lineTo(x + 136, 125)
  g.moveTo(x + 224, 125)
  g.lineTo(x + 266, 125)
  g.stroke()
  // Une connexion qui passe par le bastion
  const p = (t * 0.5) % 1
  const px = p < 0.5 ? 94 + (p / 0.5) * 42 : 224 + ((p - 0.5) / 0.5) * 42
  g.fillStyle = "#ff7ad0"
  g.beginPath()
  g.arc(x + px, 125, 6, 0, Math.PI * 2)
  g.fill()
  g.fillStyle = "#9fe2a0"
  g.fillText("session enregistrée ●", x + 16, 200)
}

// Contenus par pièce, dans l'ordre des maillages puis des dalles (de gauche à droite)
export function screenContents(images) {
  return {
    bureau: [[monitoring, terminal, firewall]],
    chambre: [[sites(images)], [editor]],
    classe: [[packetTracer, bastion]],
  }
}

// Installe les écrans d'une pièce ; renvoie de quoi les redessiner
export function installScreens(room, roomCenter, contents, material) {
  const meshes = []
  room.traverse((c) => {
    if (c.isMesh && c.material.name === material) meshes.push(c)
  })
  return meshes.map((mesh, i) => {
    const frames = mapScreens(mesh, roomCenter)
    const panels = frames.length
    const canvas = document.createElement("canvas")
    canvas.width = W * panels
    canvas.height = H
    const texture = new CanvasTexture(canvas)
    texture.colorSpace = SRGBColorSpace
    texture.anisotropy = 4
    mesh.material = new MeshBasicMaterial({ map: texture, toneMapped: false })
    const painters = contents[i] ?? contents[contents.length - 1]
    return { mesh, canvas, texture, material: mesh.material, panels, frames, painters, last: -1 }
  })
}

// `time` anime le contenu ; `now` (toujours qui avance) rythme les redessins, ne serait-ce que pour afficher les images une fois chargées
export function drawScreens(screens, time, now) {
  for (const s of screens) {
    if (now - s.last < REFRESH && s.last >= 0) continue
    s.last = now
    const g = s.canvas.getContext("2d")
    for (let k = 0; k < s.panels; k++) (s.painters[k] ?? s.painters[0])(g, k * W, time)
    s.texture.needsUpdate = true
  }
}

// --- L'écran mural du bureau : en veille avec le logo d'Ecritel, puis la supervision du NOC ---

const WALL = { w: 960, h: 540 }

// La supervision : l'état des équipements, le trafic, les dernières alertes
function supervision(g, t) {
  const { w, h } = WALL
  g.fillStyle = "#0b1020"
  g.fillRect(0, 0, w, h)
  g.fillStyle = "#ecebff"
  g.font = "bold 30px ui-monospace, Consolas, monospace"
  g.fillText("NOC · Supervision", 30, 50)
  const clock = new Date().toLocaleTimeString("fr-FR", { timeZone: "Europe/Paris", hour: "2-digit", minute: "2-digit" })
  g.textAlign = "right"
  g.fillText(clock, w - 30, 50)
  g.textAlign = "left"
  // Quatre tuiles d'état
  const tiles = [["Firewalls", "24 / 24", "#2fb35a"], ["Sessions BGP", "12 / 12", "#2fb35a"], ["Liens", "47 / 48", "#e8a020"], ["VPN", "31 actifs", "#2fb35a"]]
  tiles.forEach(([name, value, color], k) => {
    const x = 30 + k * 228
    g.fillStyle = "#151c34"
    g.fillRect(x, 80, 210, 110)
    g.fillStyle = color
    g.fillRect(x, 80, 8, 110)
    g.fillStyle = "#9aa3b5"
    g.font = "20px ui-monospace, Consolas, monospace"
    g.fillText(name, x + 24, 115)
    g.fillStyle = "#ffffff"
    g.font = "bold 34px ui-monospace, Consolas, monospace"
    g.fillText(value, x + 24, 165)
  })
  // Le trafic, en deux courbes qui défilent
  g.fillStyle = "#151c34"
  g.fillRect(30, 210, 560, 300)
  g.fillStyle = "#9aa3b5"
  g.font = "20px ui-monospace, Consolas, monospace"
  g.fillText("Trafic (Gb/s)", 50, 245)
  for (const [color, speed, base] of [["#5aa0ff", 1, 380], ["#ff7ad0", 1.6, 430]]) {
    g.strokeStyle = color
    g.lineWidth = 3
    g.beginPath()
    for (let x = 0; x <= 520; x += 8) {
      const y = base - 50 * Math.sin((x + t * 60 * speed) * 0.02) - 25 * Math.sin((x + t * 90) * 0.051)
      x ? g.lineTo(50 + x, y) : g.moveTo(50 + x, y)
    }
    g.stroke()
  }
  // Les dernières alertes, une ligne surlignée qui descend
  g.fillStyle = "#151c34"
  g.fillRect(610, 210, 320, 300)
  g.fillStyle = "#9aa3b5"
  g.fillText("Alertes", 630, 245)
  const alerts = [["OK", "fw-cluster-01 · HA", "#2fb35a"], ["!", "lien NTE-02 · 87 %", "#e8a020"], ["OK", "bgp TRANSIT · up", "#2fb35a"], ["OK", "vpn client-42", "#2fb35a"], ["OK", "backup · 02:00", "#2fb35a"]]
  const lit = Math.floor(t * 0.7) % alerts.length
  alerts.forEach(([state, text, color], k) => {
    const y = 285 + k * 46
    if (k === lit) {
      g.fillStyle = "#222b4a"
      g.fillRect(620, y - 30, 300, 42)
    }
    g.fillStyle = color
    g.font = "bold 20px ui-monospace, Consolas, monospace"
    g.fillText(state, 635, y)
    g.fillStyle = "#ecebff"
    g.font = "19px ui-monospace, Consolas, monospace"
    g.fillText(text, 680, y)
  })
}

// La veille : le logo d'Ecritel sur fond sombre, qui respire doucement
function standby(g, t, logo) {
  const { w, h } = WALL
  g.fillStyle = "#06070c"
  g.fillRect(0, 0, w, h)
  // Une image ou une ImageBitmap (celle du modèle 3D) : on prend la taille qu'elle donne
  const iw = logo?.naturalWidth ?? logo?.width, ih = logo?.naturalHeight ?? logo?.height
  if (!iw || !ih) return
  const fit = Math.min((w * 0.6) / iw, (h * 0.6) / ih)
  const lw = iw * fit, lh = ih * fit
  g.globalAlpha = 0.75 + Math.sin(t * 1.2) * 0.2
  g.drawImage(logo, (w - lw) / 2, (h - lh) / 2, lw, lh)
  g.globalAlpha = 1
}

// `logo` : l'image de l'affiche d'Ecritel. `draw(time, awake)` : `awake` de 0 (veille) à 1 (supervision), en fondu.
export function makeWallScreen(logo) {
  const canvas = document.createElement("canvas")
  canvas.width = WALL.w
  canvas.height = WALL.h
  const texture = new CanvasTexture(canvas)
  texture.colorSpace = SRGBColorSpace
  texture.anisotropy = 8
  const material = new MeshBasicMaterial({ map: texture, toneMapped: false })
  const g = canvas.getContext("2d")
  let last = -1
  return {
    material,
    aspect: WALL.w / WALL.h,
    draw(time, now, awake) {
      if (last >= 0 && now - last < REFRESH) return
      last = now
      standby(g, time, logo)
      if (awake > 0.01) {
        g.globalAlpha = awake
        g.save()
        supervision(g, time)
        g.restore()
        g.globalAlpha = 1
      }
      texture.needsUpdate = true
    },
  }
}
