import { useState, useEffect, useRef } from 'react'
import { getTheme } from '../mindease/theme.js'
import { session } from '../focuscoach/sessionState.js'

const PATTERNS = {
  box:   { name: 'Box breathing',  steps: ['Breathe in', 'Hold', 'Breathe out', 'Hold'],      durations: [4,4,4,4] },
  relax: { name: '4-7-8 Relaxing', steps: ['Breathe in', 'Hold',       'Breathe out'],         durations: [4,7,8]   },
  deep:  { name: 'Deep breath',    steps: ['Breathe in slowly', 'Hold', 'Breathe out slowly'], durations: [5,2,7]   },
}

export default function BreathingExercise({ onClose }) {
  const theme = getTheme(session.wellnessMode)
  const [selected, setSelected] = useState(null)
  const [running, setRunning] = useState(false)
  const [stepIdx, setStepIdx] = useState(0)
  const [secondsLeft, setSecondsLeft] = useState(0)
  const [cycles, setCycles] = useState(0)
  const intervalRef = useRef(null)

  const pattern = selected ? PATTERNS[selected] : null

  const start = (key) => {
    setSelected(key)
    setStepIdx(0)
    setSecondsLeft(PATTERNS[key].durations[0])
    setRunning(true)
    setCycles(0)
  }

  useEffect(() => {
    if (!running || !pattern) return
    intervalRef.current = setInterval(() => {
      setSecondsLeft(prev => {
        if (prev <= 1) {
          setStepIdx(si => {
            const next = (si + 1) % pattern.steps.length
            if (next === 0) setCycles(c => c + 1)
            setSecondsLeft(pattern.durations[next])
            return next
          })
          return pattern.durations[0]
        }
        return prev - 1
      })
    }, 1000)
    return () => clearInterval(intervalRef.current)
  }, [running, pattern])

  const stop = () => { setRunning(false); clearInterval(intervalRef.current) }

  // Circle size based on step (inhale = big, exhale = small, hold = medium)
  const step = pattern?.steps[stepIdx] || ''
  const circleSize = step.toLowerCase().includes('in') ? 110
    : step.toLowerCase().includes('out') ? 60 : 85

  const transitionTime = pattern ? `${pattern.durations[stepIdx] * 0.9}s` : '0.5s'

  if (!selected) {
    return (
      <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 12, alignItems: 'center' }}>
        <div style={{ fontSize: 14, color: theme.textMuted, marginBottom: 4 }}>Choose a breathing pattern</div>
        {Object.entries(PATTERNS).map(([key, p]) => (
          <button key={key} onClick={() => start(key)} className="card" style={{ cursor: 'pointer', textAlign: 'left', width: '100%' }}>
            <div style={{ fontWeight: 500 }}>{p.name}</div>
            <div style={{ fontSize: 12, color: theme.textMuted, marginTop: 2 }}>
              {p.steps.map((s, i) => `${s} (${p.durations[i]}s)`).join(' → ')}
            </div>
          </button>
        ))}
        <button onClick={onClose} style={{ background: 'none', border: 'none', color: theme.textMuted, fontSize: 13, cursor: 'pointer', marginTop: 8 }}>
          Cancel
        </button>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 24, padding: 24 }}>
      <div style={{ fontSize: 13, color: theme.textMuted }}>{pattern.name} · {cycles} cycles</div>
      <div style={{
        width: 160, height: 160, borderRadius: '50%',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: theme.gradient,
        boxShadow: `0 0 60px ${theme.glow}`,
        position: 'relative',
      }}>
        <div style={{
          width: circleSize, height: circleSize, borderRadius: '50%',
          background: theme.primary, opacity: 0.7,
          transition: `all ${transitionTime} ease-in-out`,
        }} />
      </div>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 22, color: theme.text, fontWeight: 500 }}>{step}</div>
        <div style={{ fontSize: 36, color: theme.primary, fontWeight: 700, marginTop: 4 }}>{secondsLeft}</div>
      </div>
      <div style={{ display: 'flex', gap: 10 }}>
        <button onClick={stop} className="btn">
          Pause
        </button>
        <button onClick={() => { stop(); setSelected(null) }} className="btn btn-primary">
          Done
        </button>
      </div>
    </div>
  )
}
