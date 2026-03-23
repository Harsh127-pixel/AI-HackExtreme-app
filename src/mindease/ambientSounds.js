let audioCtx = null
let activeNodes = []
let currentSoundId = null

function getCtx() {
  if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)()
  return audioCtx
}

function stopAll() {
  activeNodes.forEach(n => { try { n.stop?.(); n.disconnect?.() } catch {} })
  activeNodes = []
}

export const SOUNDS = {
  rain: {
    label: 'Rain',
    emoji: '🌧️',
    create: (ctx) => {
      const bufferSize = ctx.sampleRate * 2
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate)
      const data = buffer.getChannelData(0)
      for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1
      const source = ctx.createBufferSource()
      source.buffer = buffer
      source.loop = true
      const filter = ctx.createBiquadFilter()
      filter.type = 'bandpass'
      filter.frequency.value = 400
      filter.Q.value = 0.5
      const gain = ctx.createGain()
      gain.gain.value = 0.3
      source.connect(filter)
      filter.connect(gain)
      gain.connect(ctx.destination)
      source.start()
      return [source, filter, gain]
    }
  },
  whiteNoise: {
    label: 'White noise',
    emoji: '🤍',
    create: (ctx) => {
      const bufferSize = ctx.sampleRate * 2
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate)
      const data = buffer.getChannelData(0)
      for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1
      const source = ctx.createBufferSource()
      source.buffer = buffer
      source.loop = true
      const gain = ctx.createGain()
      gain.gain.value = 0.15
      source.connect(gain)
      gain.connect(ctx.destination)
      source.start()
      return [source, gain]
    }
  },
  forest: {
    label: 'Forest',
    emoji: '🌲',
    create: (ctx) => {
      const nodes = []
      // Low wind rumble
      const osc = ctx.createOscillator()
      osc.type = 'sawtooth'
      osc.frequency.value = 80
      const filter = ctx.createBiquadFilter()
      filter.type = 'lowpass'
      filter.frequency.value = 200
      const gain = ctx.createGain()
      gain.gain.value = 0.04
      osc.connect(filter); filter.connect(gain); gain.connect(ctx.destination)
      osc.start()
      nodes.push(osc, filter, gain)
      // High frequency rustle
      const bufferSize = ctx.sampleRate * 2
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate)
      const data = buffer.getChannelData(0)
      for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1
      const src = ctx.createBufferSource()
      src.buffer = buffer; src.loop = true
      const hpf = ctx.createBiquadFilter()
      hpf.type = 'highpass'; hpf.frequency.value = 2000
      const g2 = ctx.createGain(); g2.gain.value = 0.08
      src.connect(hpf); hpf.connect(g2); g2.connect(ctx.destination)
      src.start()
      nodes.push(src, hpf, g2)
      return nodes
    }
  },
  focus: {
    label: 'Focus hum',
    emoji: '🎵',
    create: (ctx) => {
      // Binaural-like beat at 40Hz (gamma waves, associated with focus)
      const nodes = []
      ;[200, 240].forEach(freq => {
        const osc = ctx.createOscillator()
        osc.type = 'sine'
        osc.frequency.value = freq
        const gain = ctx.createGain()
        gain.gain.value = 0.06
        osc.connect(gain); gain.connect(ctx.destination)
        osc.start()
        nodes.push(osc, gain)
      })
      return nodes
    }
  },
  binaural: {
    label: 'Focus beats',
    emoji: '🧠',
    create: (ctx) => {
      const nodes = []
      const merger = ctx.createChannelMerger(2)
      merger.connect(ctx.destination)

      const leftOsc = ctx.createOscillator()
      leftOsc.type = 'sine'
      leftOsc.frequency.value = 200
      const leftGain = ctx.createGain()
      leftGain.gain.value = 0.1
      leftOsc.connect(leftGain)
      leftGain.connect(merger, 0, 0)
      leftOsc.start()

      const rightOsc = ctx.createOscillator()
      rightOsc.type = 'sine'
      rightOsc.frequency.value = 240
      const rightGain = ctx.createGain()
      rightGain.gain.value = 0.1
      rightOsc.connect(rightGain)
      rightGain.connect(merger, 0, 1)
      rightOsc.start()

      nodes.push(leftOsc, leftGain, rightOsc, rightGain, merger)
      return nodes
    }
  },
  cafe: {
    label: 'Café noise',
    emoji: '☕',
    create: (ctx) => {
      const bufferSize = ctx.sampleRate * 4
      const buffer = ctx.createBuffer(2, bufferSize, ctx.sampleRate)
      for (let ch = 0; ch < 2; ch++) {
        const data = buffer.getChannelData(ch)
        for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1
      }
      const source = ctx.createBufferSource()
      source.buffer = buffer; source.loop = true
      const filter1 = ctx.createBiquadFilter()
      filter1.type = 'bandpass'; filter1.frequency.value = 600; filter1.Q.value = 0.3
      const filter2 = ctx.createBiquadFilter()
      filter2.type = 'peaking'; filter2.frequency.value = 1200; filter2.gain.value = -10
      const gain = ctx.createGain(); gain.gain.value = 0.25
      source.connect(filter1); filter1.connect(filter2); filter2.connect(gain); gain.connect(ctx.destination)
      source.start()
      return [source, filter1, filter2, gain]
    }
  }
}

export function playSound(id) {
  stopAll()
  if (currentSoundId === id) { currentSoundId = null; return }
  const ctx = getCtx()
  if (ctx.state === 'suspended') ctx.resume()
  const sound = SOUNDS[id]
  if (!sound) return
  activeNodes = sound.create(ctx)
  currentSoundId = id
}

export function stopSound() {
  stopAll()
  currentSoundId = null
}

export function getCurrentSound() {
  return currentSoundId
}
