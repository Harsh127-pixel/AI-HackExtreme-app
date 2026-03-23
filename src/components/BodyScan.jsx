import { useState, useEffect, useRef } from 'react'

const STEPS = [
  { zone: 'Feet & toes', instruction: "Bring your attention to your feet. Notice any tension, warmth, or tingling. Let them completely relax.", duration: 20 },
  { zone: 'Calves & shins', instruction: "Move your awareness up to your calves and shins. Notice how they feel against whatever surface they're resting on.", duration: 20 },
  { zone: 'Knees & thighs', instruction: "Gently notice your knees and thighs. Let any tightness soften and release.", duration: 20 },
  { zone: 'Hips & lower back', instruction: "Notice your hips and lower back. This is where many of us hold stress. Breathe into this area.", duration: 25 },
  { zone: 'Belly', instruction: "Feel your belly rise and fall with each breath. Let it be soft. You don't need to hold anything in.", duration: 20 },
  { zone: 'Chest & heart', instruction: "Place your awareness on your chest. Notice your heartbeat. Thank your body for carrying you today.", duration: 25 },
  { zone: 'Shoulders', instruction: "Let your shoulders drop. Notice if they've crept up toward your ears. Allow them to fall.", duration: 20 },
  { zone: 'Arms & hands', instruction: "Feel the weight of your arms. Notice your hands — the palms, the fingers. Let them be completely still.", duration: 20 },
  { zone: 'Neck & throat', instruction: "Soften your neck and throat. These areas often hold unexpressed emotions. Just notice, without judgment.", duration: 20 },
  { zone: 'Face & jaw', instruction: "Unclench your jaw. Soften your eyes, your forehead, your scalp. Let your whole face be at rest.", duration: 25 },
  { zone: 'Whole body', instruction: "Now hold your whole body in awareness at once. Notice that you are here. That is enough.", duration: 30 },
]

export default function BodyScan({ theme, onClose }) {
  const [step, setStep] = useState(-1)
  const [secondsLeft, setSecondsLeft] = useState(0)
  const intervalRef = useRef(null)

  useEffect(() => {
    if (step < 0 || step >= STEPS.length) return
    setSecondsLeft(STEPS[step].duration)
    intervalRef.current = setInterval(() => {
      setSecondsLeft(prev => {
        if (prev <= 1) {
          clearInterval(intervalRef.current)
          if (step < STEPS.length - 1) setStep(s => s + 1)
          else setStep(STEPS.length) // Completed
          return 0
        }
        return prev - 1
      })
    }, 1000)
    return () => clearInterval(intervalRef.current)
  }, [step])

  const progress = step >= 0 && step < STEPS.length
    ? ((STEPS[step].duration - secondsLeft) / STEPS[step].duration)
    : 0

  if (step === -1) {
    return (
      <div style={{ padding: 24, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20, textAlign: 'center' }}>
        <span style={{ fontSize: 48 }}>🧘</span>
        <div>
          <h3 style={{ color: theme.text, fontSize: 18, fontWeight: 600, marginBottom: 8 }}>5-minute body scan</h3>
          <p style={{ color: theme.textMuted, fontSize: 13, lineHeight: 1.7 }}>
            A guided journey through your body. Find a comfortable position, close your eyes when ready, and follow along.
          </p>
        </div>
        <button onClick={() => setStep(0)} style={{ padding: '12px 32px', borderRadius: 10, border: 'none', background: theme.primary, color: 'white', fontSize: 15, fontWeight: 600, cursor: 'pointer' }}>
          Begin
        </button>
        <button onClick={onClose} style={{ background: 'none', border: 'none', color: theme.textMuted, fontSize: 13, cursor: 'pointer' }}>
          Cancel
        </button>
      </div>
    )
  }

  if (step >= STEPS.length) {
    return (
      <div style={{ padding: 24, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20, textAlign: 'center' }}>
        <span style={{ fontSize: 48 }}>🌿</span>
        <h3 style={{ color: theme.text, fontSize: 18, fontWeight: 600 }}>Body scan complete</h3>
        <p style={{ color: theme.textMuted, fontSize: 13, lineHeight: 1.7 }}>You just spent 5 minutes with yourself. That's a meaningful act of care.</p>
        <button onClick={onClose} style={{ padding: '12px 32px', borderRadius: 10, border: 'none', background: theme.primary, color: 'white', fontSize: 15, fontWeight: 600, cursor: 'pointer' }}>
          Done
        </button>
      </div>
    )
  }

  const current = STEPS[step]
  const circumference = 2 * Math.PI * 40

  return (
    <div style={{ padding: 24, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20 }}>
      <div style={{ fontSize: 12, color: theme.textMuted, letterSpacing: 1 }}>
        {step + 1} of {STEPS.length}
      </div>
      <svg width={100} height={100} viewBox="0 0 100 100">
        <circle cx={50} cy={50} r={40} fill="none" stroke={theme.border} strokeWidth={6} />
        <circle cx={50} cy={50} r={40} fill="none" stroke={theme.primary} strokeWidth={6}
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - progress)}
          strokeLinecap="round"
          transform="rotate(-90 50 50)"
          style={{ transition: 'stroke-dashoffset 1s linear' }}
        />
        <text x={50} y={55} textAnchor="middle" fill={theme.text} fontSize={20} fontWeight={600}>{secondsLeft}</text>
      </svg>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 16, fontWeight: 600, color: theme.primary, marginBottom: 12 }}>{current.zone}</div>
        <p style={{ fontSize: 14, color: theme.text, lineHeight: 1.8, maxWidth: 300 }}>{current.instruction}</p>
      </div>
      <div style={{ display: 'flex', gap: 10 }}>
        {step > 0 && (
          <button onClick={() => setStep(s => s - 1)} style={{ padding: '10px 20px', borderRadius: 10, border: `1px solid ${theme.border}`, background: theme.bgCard, color: theme.textMuted, fontSize: 14, cursor: 'pointer' }}>
            ← Back
          </button>
        )}
        <button onClick={() => { clearInterval(intervalRef.current); setStep(s => s + 1) }} style={{ padding: '10px 24px', borderRadius: 10, border: 'none', background: theme.primary, color: 'white', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
          Next →
        </button>
      </div>
    </div>
  )
}
