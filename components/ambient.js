// Ambiance sonore générée dans le navigateur (aucun fichier audio) :
// des accords doux et feutrés, et le cliquetis discret d'un clavier.
// Les bruits ponctuels de la scène (l'aboiement de Lego) passent par `sound`, qui ne joue que si le son est activé.

const CHORDS = [
  [220, 261.63, 329.63, 392], // la mineur 7
  [174.61, 220, 261.63, 329.63], // fa majeur 7
  [130.81, 196, 246.94, 329.63], // do majeur 7
  [196, 246.94, 293.66, 329.63], // sol 6
]
const CHORD_SECONDS = 8

let playing = null // l'ambiance en cours, s'il y en a une

export const sound = {
  bark() {
    playing?.bark()
  },
}

export function createAmbient() {
  let ctx = null, master = null, timers = []

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
      osc.connect(gain).connect(master.filter)
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

  function chords(i = 0) {
    pad(ctx.currentTime + 0.05, CHORDS[i % CHORDS.length])
    timers.push(setTimeout(() => chords(i + 1), CHORD_SECONDS * 1000))
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
      chords()
      typing()
      playing = ambient
    },
    stop() {
      if (!ctx) return
      timers.forEach(clearTimeout)
      timers = []
      master.gain.gain.cancelScheduledValues(ctx.currentTime)
      master.gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.6)
      playing = null
    },
    bark() {
      bark(ctx, master.gain, ctx.currentTime)
    },
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
