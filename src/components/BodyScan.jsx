import { useState, useEffect, useRef, useMemo } from 'react'
import { t } from '../mindease/i18n.js'

export default function BodyScan({ theme, onClose }) {
  const [step, setStep] = useState(-1)
  const [secondsLeft, setSecondsLeft] = useState(0)
  const intervalRef = useRef(null)

  const STEPS = useMemo(() => {
    const raw = t('body_scan_steps') || []
    // Match the durations from the original
    const durations = [20, 20, 20, 25, 20, 25, 20, 20, 20, 25, 30]
    return raw.map((s, i) => ({
      zone: s.zone,
      instruction: s.instr,
      duration: durations[i] || 20
    }))
  }, [])

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
  }, [step, STEPS])

  const progress = step >= 0 && step < STEPS.length
    ? ((STEPS[step].duration - secondsLeft) / STEPS[step].duration)
    : 0

  if (step === -1) {
    return (
      <div style={{ padding: 24, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20, textAlign: 'center' }}>
        <span style={{ fontSize: 48 }}>🧘</span>
        <div>
          <h3 style={{ color: theme.text, fontSize: 18, fontWeight: 600, marginBottom: 8 }}>{t('body_scan_title')}</h3>
          <p style={{ color: theme.textMuted, fontSize: 13, lineHeight: 1.7 }}>
            {t('body_scan_intro')}
          </p>
        </div>
        <button onClick={() => setStep(0)} style={{ padding: '12px 32px', borderRadius: 10, border: 'none', background: theme.primary, color: 'white', fontSize: 15, fontWeight: 600, cursor: 'pointer' }}>
          {t('begin')}
        </button>
        <button onClick={onClose} style={{ background: 'none', border: 'none', color: theme.textMuted, fontSize: 13, cursor: 'pointer' }}>
          {t('cancel')}
        </button>
      </div>
    )
  }

  if (step >= STEPS.length) {
    return (
      <div style={{ padding: 24, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20, textAlign: 'center' }}>
        <span style={{ fontSize: 48 }}>🌿</span>
        <h3 style={{ color: theme.text, fontSize: 18, fontWeight: 600 }}>{t('body_scan_complete')}</h3>
        <p style={{ color: theme.textMuted, fontSize: 13, lineHeight: 1.7 }}>{t('body_scan_footer')}</p>
        <button onClick={onClose} style={{ padding: '12px 32px', borderRadius: 10, border: 'none', background: theme.primary, color: 'white', fontSize: 15, fontWeight: 600, cursor: 'pointer' }}>
          {t('done')}
        </button>
      </div>
    )
  }

  const current = STEPS[step]
  const circumference = 2 * Math.PI * 40

  return (
    <div style={{ padding: 24, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20 }}>
      <div style={{ fontSize: 12, color: theme.textMuted, letterSpacing: 1 }}>
        {step + 1} {t('of')} {STEPS.length}
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
            ← {t('back_btn')}
          </button>
        )}
        <button onClick={() => { clearInterval(intervalRef.current); setStep(s => s + 1) }} style={{ padding: '10px 24px', borderRadius: 10, border: 'none', background: theme.primary, color: 'white', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
          {t('next_btn')} →
        </button>
      </div>
    </div>
  )
}
