// Ambiance sonore : par défaut, des accords lo-fi doux générés dans le navigateur, et le cliquetis discret d'un clavier.
// La platine change de disque : après le lo-fi, des morceaux de public/audio/ (voir RECORDS).
// Les bruits ponctuels (l'aboiement de Lego, la fontaine à eau) et les extraits joués au clic (voir CLIPS)
// passent par `sound`, qui ne joue que si le son est activé.

const CHORDS = [
  [220, 261.63, 329.63, 392], // la mineur 7
  [174.61, 220, 261.63, 329.63], // fa majeur 7
  [130.81, 196, 246.94, 329.63], // do majeur 7
  [196, 246.94, 293.66, 329.63], // sol 6
]
const CHORD_SECONDS = 8

let playing = null // l'ambiance en cours, s'il y en a une

// Les disques de la platine : le lo-fi généré, puis des extraits de 75 s dans public/audio/ (`src`), joués en boucle avec un fondu
export const RECORDS = [
  { title: "Lo-fi du soir" },
  { title: "Golden Brown", artist: "The Stranglers", src: "/audio/golden-brown.mp3" },
  { title: "Hide CS01", src: "/audio/hide-cs01.mp3" },
  { title: "Hide", artist: "Dorian Concept", src: "/audio/hide-dorian-concept.mp3" },
]
// Les extraits joués au clic (fichiers déjà coupés à peine plus long) : leur fichier et leur durée, en secondes (ils s'arrêtent en fondu)
export const CLIPS = {
  lego: { src: "/audio/lego.mp3", seconds: 9 }, // la danse de Lego (8,5 s, voir DANCE)
  bus: { src: "/audio/bus.mp3", seconds: 14 }, // le bus volant
  paprika: { src: "/audio/paprika.mp3", seconds: 25 }, // la parade (Susumu Hirasawa)
}
const LEVELS = { record: 0.45, clip: 0.8, duck: 0.25, fade: 1.2 } // volumes du disque et des extraits ; le disque baisse (`duck`) pendant un extrait
let record = 0

export const sound = {
  bark() {
    playing?.bark()
  },
  gulp() {
    playing?.gulp()
  },
  // Le disque suivant ; renvoie son titre (« titre · artiste »), et si le son est coupé (il jouera au prochain démarrage)
  nextRecord() {
    record = (record + 1) % RECORDS.length
    playing?.play()
    const { title, artist } = RECORDS[record]
    return { title: artist ? `${title} · ${artist}` : title, muted: !playing }
  },
  // Un extrait de CLIPS ; `seconds` raccourcit sa durée. Renvoie une promesse tenue quand le son démarre vraiment
  // (pour caler une animation dessus), ou null si le son est coupé.
  clip(name, seconds) {
    return playing?.clip(name, seconds) ?? null
  },
  // Arrête un extrait en fondu (le bus et la parade, quand le curseur les quitte)
  stopClip(name) {
    playing?.stopClip(name)
  },
}

export function createAmbient() {
  let ctx = null, master = null, timers = []
  let deck = null // le volume du disque en cours : on le coupe en changeant de disque, notes déjà lancées comprises

  function pad(time, freqs) {
    for (const [i, f] of freqs.entries()) {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.type = i % 2 ? "sine" : "triangle"
      osc.frequency.value = f
      osc.detune.value = (i - 1.5) * 4
      gain.gain.setValueAtTime(0, time)
      gain.gain.linearRampToValueAtTime(0.05, time + 2.5)
      gain.gain.linearRampToValueAtTime(0.0001, time + CHORD_SECONDS + 1.5)
      osc.connect(gain).connect(deck)
      osc.start(time)
      osc.stop(time + CHORD_SECONDS + 2)
    }
  }

  // Un bruit bref, filtré : `decay` règle sa chute
  function burst(time, { length, freq, type = "bandpass", q = 1, volume, decay = 3 }) {
    const buffer = ctx.createBuffer(1, Math.ceil(ctx.sampleRate * length), ctx.sampleRate)
    const data = buffer.getChannelData(0)
    for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / data.length) ** decay
    const src = ctx.createBufferSource()
    src.buffer = buffer
    const filter = ctx.createBiquadFilter()
    filter.type = type
    filter.frequency.value = freq
    filter.Q.value = q
    const gain = ctx.createGain()
    gain.gain.value = volume
    src.connect(filter).connect(gain).connect(master.gain)
    src.start(time)
  }

  // Une touche : le choc sourd de la touche qui descend, puis un petit clic plus doux
  function key(time) {
    burst(time, { length: 0.04, freq: 380 + Math.random() * 120, type: "lowpass", volume: 0.22 + Math.random() * 0.08, decay: 4 })
    burst(time + 0.004, { length: 0.015, freq: 1300 + Math.random() * 300, q: 1.5, volume: 0.025, decay: 3 })
  }

  // Rafales de frappe de quelques secondes, puis une pause
  function typing() {
    const now = ctx.currentTime
    let t = now + 0.2
    const end = t + 2 + Math.random() * 3
    while (t < end) {
      key(t)
      t += 0.09 + Math.random() * 0.15
    }
    timers.push(setTimeout(typing, (end - now + 2 + Math.random() * 4) * 1000))
  }

  let tune = [] // les minuteries du disque en cours
  let file = null // le fichier en cours, si le disque en est un
  function chords(i = 0) {
    pad(ctx.currentTime + 0.05, CHORDS[i % CHORDS.length])
    tune.push(setTimeout(() => chords(i + 1), CHORD_SECONDS * 1000))
  }
  // Un fichier audio branché sur `out` : il suit le volume général (et donc l'interrupteur du son)
  function stream(src, out) {
    const audio = new Audio(src)
    ctx.createMediaElementSource(audio).connect(out)
    audio.play().catch(() => {})
    return audio
  }
  // Baisse vite le disque en cours, puis le débranche
  function fade() {
    if (!deck) return
    const old = deck
    old.gain.setTargetAtTime(0, ctx.currentTime, 0.08)
    setTimeout(() => old.disconnect(), 600)
    deck = null
  }
  // Lance le disque choisi, à la place de celui en cours
  function play() {
    tune.forEach(clearTimeout)
    tune = []
    file?.pause()
    file = null
    fade()
    deck = ctx.createGain()
    const { src } = RECORDS[record]
    // Le lo-fi passe par le filtre feutré ; un morceau, non
    deck.connect(src ? master.gain : master.filter)
    deck.gain.value = deckLevel()
    if (!src) return chords()
    // En boucle, avec un fondu : les morceaux sont des extraits, la reprise ne doit pas claquer
    const audio = (file = stream(src, deck))
    const out = deck
    audio.addEventListener("timeupdate", () => {
      if (audio.duration - audio.currentTime < LEVELS.fade) out.gain.setTargetAtTime(0, ctx.currentTime, LEVELS.fade / 4)
    })
    audio.addEventListener("ended", () => {
      if (file !== audio) return
      audio.currentTime = 0
      audio.play().catch(() => {})
      out.gain.setTargetAtTime(deckLevel() * (Object.keys(clips).length ? LEVELS.duck : 1), ctx.currentTime, LEVELS.fade / 4)
    })
  }
  // Le volume normal du disque en cours : un morceau est plus fort que les accords générés, on le baisse
  const deckLevel = () => (RECORDS[record].src ? LEVELS.record : 1)
  // Un extrait à la fois par nom : le disque baisse le temps qu'il joue, puis l'extrait s'éteint en fondu
  const clips = {}
  function clip(name, seconds = CLIPS[name].seconds) {
    clips[name]?.stop()
    const level = ctx.createGain()
    level.gain.value = LEVELS.clip
    level.connect(master.gain)
    const audio = stream(CLIPS[name].src, level)
    deck?.gain.setTargetAtTime(deckLevel() * LEVELS.duck, ctx.currentTime, 0.2)
    let stopped = false
    const stop = () => {
      if (stopped) return // la fin du fichier et la minuterie peuvent arriver toutes les deux
      stopped = true
      clearTimeout(timer)
      level.gain.setTargetAtTime(0, ctx.currentTime, LEVELS.fade / 4)
      setTimeout(() => (audio.pause(), level.disconnect()), LEVELS.fade * 1000)
      if (clips[name] === handle) delete clips[name]
      if (!Object.keys(clips).length) deck?.gain.setTargetAtTime(deckLevel(), ctx.currentTime, 0.5)
    }
    const timer = setTimeout(stop, Math.max(0, seconds - LEVELS.fade) * 1000)
    audio.addEventListener("ended", stop, { once: true })
    const handle = { stop }
    clips[name] = handle
    return new Promise((started) => audio.addEventListener("playing", started, { once: true }))
  }
  function stopClip(name) {
    clips[name]?.stop()
  }

  const ambient = {
    start() {
      if (!ctx) {
        ctx = new AudioContext()
        const gain = ctx.createGain()
        gain.gain.value = 0
        gain.connect(ctx.destination)
        const filter = ctx.createBiquadFilter()
        filter.type = "lowpass"
        filter.frequency.value = 1100
        filter.connect(gain)
        master = { gain, filter }
      }
      ctx.resume()
      master.gain.gain.cancelScheduledValues(ctx.currentTime)
      master.gain.gain.linearRampToValueAtTime(0.6, ctx.currentTime + 1.5)
      play()
      typing()
      playing = ambient
    },
    stop() {
      if (!ctx) return
      timers.forEach(clearTimeout)
      timers = []
      tune.forEach(clearTimeout)
      tune = []
      file?.pause()
      file = null
      fade()
      Object.values(clips).forEach((c) => c.stop())
      master.gain.gain.cancelScheduledValues(ctx.currentTime)
      master.gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.6)
      playing = null
    },
    bark() {
      bark(ctx, master.gain, ctx.currentTime)
    },
    gulp() {
      gulp(ctx, master.gain, ctx.currentTime)
    },
    play,
    clip,
    stopClip,
  }
  return ambient
}

// « Ouaf ouaf ! » d'un petit chien : pour chaque aboiement, une voix rauque qui monte d'un coup puis retombe,
// mêlée à un souffle, avec la résonance de la gueule. Jouée dans `ctx` vers `out`, à partir de `time`.
export function bark(ctx, out, time) {
  const noise = ctx.createBuffer(1, Math.ceil(ctx.sampleRate * 0.25), ctx.sampleRate)
  const data = noise.getChannelData(0)
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1
  for (const [at, pitch] of [[0, 1], [0.24, 0.9]]) {
    const t = time + at
    // L'enveloppe : attaque sèche, courte tenue, chute rapide
    const env = ctx.createGain()
    env.gain.setValueAtTime(0, t)
    env.gain.linearRampToValueAtTime(1, t + 0.012)
    env.gain.setValueAtTime(1, t + 0.05)
    env.gain.exponentialRampToValueAtTime(0.001, t + 0.17)
    // La voix : deux dents de scie un peu désaccordées, la hauteur grimpe puis s'effondre
    for (const detune of [-12, 12]) {
      const osc = ctx.createOscillator()
      osc.type = "sawtooth"
      osc.detune.value = detune
      osc.frequency.setValueAtTime(420 * pitch, t)
      osc.frequency.linearRampToValueAtTime(760 * pitch, t + 0.03)
      osc.frequency.exponentialRampToValueAtTime(330 * pitch, t + 0.17)
      const level = ctx.createGain()
      level.gain.value = 0.35
      osc.connect(level).connect(env)
      osc.start(t)
      osc.stop(t + 0.2)
    }
    // Le souffle, plus présent au début
    const breath = ctx.createBufferSource()
    breath.buffer = noise
    const hiss = ctx.createBiquadFilter()
    hiss.type = "bandpass"
    hiss.frequency.value = 1800 * pitch
    hiss.Q.value = 0.8
    const air = ctx.createGain()
    air.gain.value = 0.5
    breath.connect(hiss).connect(air).connect(env)
    breath.start(t)
    breath.stop(t + 0.2)
    // La gueule : on renforce le bas-médium, on coupe l'aigu qui sonnerait électronique
    const mouth = ctx.createBiquadFilter()
    mouth.type = "peaking"
    mouth.frequency.value = 1100 * pitch
    mouth.Q.value = 1.2
    mouth.gain.value = 9
    const soft = ctx.createBiquadFilter()
    soft.type = "lowpass"
    soft.frequency.value = 3200
    const volume = ctx.createGain()
    volume.gain.value = 0.55
    env.connect(mouth).connect(soft).connect(volume).connect(out)
  }
}

// « Gloup » : la bulle d'air qui remonte dans la bonbonne, trois notes rondes qui glissent vers l'aigu
export function gulp(ctx, out, time) {
  for (const [at, from, to] of [[0, 180, 520], [0.13, 240, 640], [0.24, 300, 760]]) {
    const t = time + at
    const osc = ctx.createOscillator()
    osc.type = "sine"
    osc.frequency.setValueAtTime(from, t)
    osc.frequency.exponentialRampToValueAtTime(to, t + 0.09)
    const env = ctx.createGain()
    env.gain.setValueAtTime(0, t)
    env.gain.linearRampToValueAtTime(0.35, t + 0.015)
    env.gain.exponentialRampToValueAtTime(0.001, t + 0.12)
    osc.connect(env).connect(out)
    osc.start(t)
    osc.stop(t + 0.14)
  }
}
