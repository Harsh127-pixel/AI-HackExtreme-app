import { useState } from 'react'

const STEPS = [
  {
    emoji: '👋',
    title: 'Welcome to MindEase',
    description: 'Your private, on-device AI focus coach and mental wellness companion.',
    cta: 'Next'
  },
  {
    emoji: '🔒',
    title: '100% Private',
    description: 'Everything stays on your device. We use local AI models so your journal and thoughts never touch the cloud.',
    cta: 'Next'
  },
  {
    emoji: '🧘',
    title: 'Ready to start?',
    description: 'Track your mood, get AI CBT reframing, and manage deep focus sessions gracefully.',
    cta: 'Get Started'
  }
]

export default function Onboarding({ onComplete }) {
  const [step, setStep] = useState(0)

  const handleNext = () => {
    if (step < STEPS.length - 1) {
      setStep(step + 1)
    } else {
      onComplete()
    }
  }

  const current = STEPS[step]

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      height: '100dvh', background: 'var(--bg-base)', color: 'var(--text-primary)',
      padding: 24, textAlign: 'center'
    }}>
      <div style={{ maxWidth: 400, width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <div style={{ fontSize: 64, marginBottom: 24, animation: 'slideUp 0.3s ease-out' }} key={step}>
          {current.emoji}
        </div>
        
        <h1 style={{ fontSize: 28, fontWeight: 700, marginBottom: 12, color: 'var(--text-primary)' }}>
          {current.title}
        </h1>
        
        <p style={{ fontSize: 15, color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: 40, minHeight: 72 }}>
          {current.description}
        </p>

        <div style={{ display: 'flex', gap: 8, marginBottom: 40 }}>
          {STEPS.map((_, i) => (
            <div key={i} style={{
              width: i === step ? 24 : 8,
              height: 8,
              borderRadius: 4,
              background: i === step ? 'var(--accent)' : 'var(--border-default)',
              transition: 'all 0.3s ease'
            }} />
          ))}
        </div>

        <button 
          onClick={handleNext} 
          className="btn btn-primary btn-lg" 
          style={{ width: '100%' }}
        >
          {current.cta}
        </button>

        <button 
          onClick={onComplete} 
          className="btn btn-ghost btn-sm" 
          style={{ marginTop: 8 }}
        >
          Skip
        </button>
      </div>
    </div>
  )
}
