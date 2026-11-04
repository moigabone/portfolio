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
    return { ids, center, right, up }
  })
  // De gauche à droite, vu depuis l'intérieur de la pièce
  const axis = panels[0].right
  panels.sort((p, q) => p.center.dot(axis) - q.center.dot(axis))

  const uv = new Float32Array(pos.count * 2)
  panels.forEach(({ ids, center, right, up }, k) => {
    const u = ids.map((i) => world[i].clone().sub(center).dot(right))
    const v = ids.map((i) => world[i].clone().sub(center).dot(up))
    const [u0, u1, v0, v1] = [Math.min(...u), Math.max(...u), Math.min(...v), Math.max(...v)]
    ids.forEach((i, j) => {
      uv[i * 2] = (k + (u[j] - u0) / (u1 - u0 || 1)) / panels.length
      uv[i * 2 + 1] = (v[j] - v0) / (v1 - v0 || 1)
    })
  })
  geometry.setAttribute("uv", new BufferAttribute(uv, 2))
  return panels.length
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
function sites(images) {
  return (g, x, t) => {
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
  }
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

const SLIDES = [
  ["Le phishing", "Un faux mail, un vrai piège", "#ff7ad0"],
  ["Les mots de passe", "Longs, uniques, dans un coffre", "#ffd36a"],
  ["Les fake news", "Vérifier la source avant de partager", "#9fb0ff"],
  ["Le cyberharcèlement", "En parler, ne pas rester seul", "#9fe2a0"],
]

function slides(g, x, t) {
  const [title, subtitle, color] = SLIDES[Math.floor(t / 5) % SLIDES.length]
  g.fillStyle = "#f6f3ea"
  g.fillRect(x, 0, W, H)
  g.fillStyle = color
  g.fillRect(x, 0, 14, H)
  g.fillStyle = "#1a1d6a"
  g.font = "600 13px 'Chakra Petch', sans-serif"
  g.fillText("ESCAPE GAME · SENSIBILISATION CYBER", x + 34, 40)
  g.font = "600 30px 'Cormorant Garamond', Georgia, serif"
  g.fillText(title, x + 34, 100)
  g.font = "500 17px 'Chakra Petch', sans-serif"
  g.fillStyle = "#4a4870"
  g.fillText(subtitle, x + 34, 136)
  // Cadenas qui se ferme
  const lock = Math.min(1, (t % 5) / 1.2)
  g.strokeStyle = color
  g.lineWidth = 6
  g.beginPath()
  g.arc(x + W - 70, 168 - lock * 10, 18, Math.PI, 0)
  g.stroke()
  g.fillStyle = color
  g.fillRect(x + W - 94, 168, 48, 40)
}

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
    classe: [[slides, bastion]],
  }
}

// Installe les écrans d'une pièce ; renvoie de quoi les redessiner
export function installScreens(room, roomCenter, contents, material) {
  const meshes = []
  room.traverse((c) => {
    if (c.isMesh && c.material.name === material) meshes.push(c)
  })
  return meshes.map((mesh, i) => {
    const panels = mapScreens(mesh, roomCenter)
    const canvas = document.createElement("canvas")
    canvas.width = W * panels
    canvas.height = H
    const texture = new CanvasTexture(canvas)
    texture.colorSpace = SRGBColorSpace
    texture.anisotropy = 4
    mesh.material = new MeshBasicMaterial({ map: texture, toneMapped: false })
    const painters = contents[i] ?? contents[contents.length - 1]
    return { canvas, texture, material: mesh.material, panels, painters, last: -1 }
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
