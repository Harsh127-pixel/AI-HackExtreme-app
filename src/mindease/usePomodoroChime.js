export function playChime(type = 'focus') {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)()
    
    // Define chords for focus (major/bright) vs break (gentle/low)
    const frequencies = type === 'focus' 
      ? [523.25, 659.25, 783.99] // C5, E5, G5
      : [392.00, 493.88, 587.33] // G4, B4, D5

    frequencies.forEach((freq, i) => {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.type = 'sine'
      osc.frequency.value = freq
      
      // Cascading effect
      const startTime = ctx.currentTime + i * 0.12
      gain.gain.setValueAtTime(0, startTime)
      gain.gain.linearRampToValueAtTime(0.15, startTime + 0.05)
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.8)
      
      osc.start(startTime)
      osc.stop(startTime + 0.8)
    })
  } catch (e) {}
}
