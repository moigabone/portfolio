// Ambiance sonore générée dans le navigateur (aucun fichier audio) :
// des accords doux et feutrés, et le cliquetis discret d'un clavier.

const CHORDS = [
  [220, 261.63, 329.63, 392], // la mineur 7
  [174.61, 220, 261.63, 329.63], // fa majeur 7
  [130.81, 196, 246.94, 329.63], // do majeur 7
  [196, 246.94, 293.66, 329.63], // sol 6
]
const CHORD_SECONDS = 8

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

  function click(time) {
    const length = 0.025
    const buffer = ctx.createBuffer(1, ctx.sampleRate * length, ctx.sampleRate)
    const data = buffer.getChannelData(0)
    for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / data.length) ** 3
    const src = ctx.createBufferSource()
    src.buffer = buffer
    const band = ctx.createBiquadFilter()
    band.type = "bandpass"
    band.frequency.value = 2500 + Math.random() * 1500
    const gain = ctx.createGain()
    gain.gain.value = 0.05 + Math.random() * 0.04
    src.connect(band).connect(gain).connect(master.gain)
    src.start(time)
  }

  // Rafales de frappe de quelques secondes, puis une pause
  function typing() {
    const now = ctx.currentTime
    let t = now + 0.2
    const end = t + 2 + Math.random() * 3
    while (t < end) {
      click(t)
      t += 0.08 + Math.random() * 0.14
    }
    timers.push(setTimeout(typing, (end - now + 2 + Math.random() * 4) * 1000))
  }

  function chords(i = 0) {
    pad(ctx.currentTime + 0.05, CHORDS[i % CHORDS.length])
    timers.push(setTimeout(() => chords(i + 1), CHORD_SECONDS * 1000))
  }

  return {
    start() {
      if (!ctx) {
        ctx = new AudioContext()
        const gain = ctx.createGain()
        gain.gain.value = 0
        const filter = ctx.createBiquadFilter()
        filter.type = "lowpass"
        filter.frequency.value = 1100
        filter.connect(gain).connect(ctx.destination)
        master = { gain, filter }
      }
      ctx.resume()
      master.gain.gain.cancelScheduledValues(ctx.currentTime)
      master.gain.gain.linearRampToValueAtTime(0.6, ctx.currentTime + 1.5)
      chords()
      typing()
    },
    stop() {
      if (!ctx) return
      timers.forEach(clearTimeout)
      timers = []
      master.gain.gain.cancelScheduledValues(ctx.currentTime)
      master.gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.6)
    },
  }
}
