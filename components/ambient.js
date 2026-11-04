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

  // « Ouaf ! » : une voix qui monte vite puis retombe, passée dans deux résonances de gueule, avec un souffle
  function bark() {
    const now = ctx.currentTime
    for (const [at, pitch] of [[0, 1], [0.28, 0.92]]) {
      const t = now + at
      const voice = ctx.createGain()
      voice.gain.setValueAtTime(0, t)
      voice.gain.linearRampToValueAtTime(0.5, t + 0.02)
      voice.gain.setValueAtTime(0.5, t + 0.06)
      voice.gain.exponentialRampToValueAtTime(0.001, t + 0.2)
      const osc = ctx.createOscillator()
      osc.type = "sawtooth"
      osc.frequency.setValueAtTime(240 * pitch, t)
      osc.frequency.linearRampToValueAtTime(420 * pitch, t + 0.035)
      osc.frequency.exponentialRampToValueAtTime(190 * pitch, t + 0.2)
      osc.connect(voice)
      osc.start(t)
      osc.stop(t + 0.22)
      for (const [freq, q, level] of [[700, 3, 1], [1600, 4, 0.5]]) {
        const formant = ctx.createBiquadFilter()
        formant.type = "bandpass"
        formant.frequency.value = freq * pitch
        formant.Q.value = q
        const out = ctx.createGain()
        out.gain.value = level
        voice.connect(formant).connect(out).connect(master.gain)
      }
      burst(t, { length: 0.12, freq: 1100, q: 0.9, volume: 0.08, decay: 2 })
    }
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
    bark,
  }
  return ambient
}
