import { useState, useEffect } from 'react'
import { getTheme } from '../mindease/theme.js'
import { session, notify, toggleSOS } from '../focuscoach/sessionState.js'

export default function SOSMode({ onClose }) {
  const theme = getTheme('stress') // Fixed stress theme for SOS
  const [step, setStep] = useState(0)

  useEffect(() => {
    toggleSOS(true)
    session.mode = 'sos'
    notify()
    return () => {
      toggleSOS(false)
      session.mode = 'idle'
      notify()
    }
  }, [])

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      background: theme.bg, zIndex: 9999, display: 'flex', flexDirection: 'column', 
      padding: 24, alignItems: 'center', justifyContent: 'center', gap: 32,
    }}>
      <div style={{ textAlign: 'center' }}>
        <h1 style={{ color: theme.primary, fontSize: 28, fontWeight: 700, marginBottom: 8 }}>I'm here with you.</h1>
        <p style={{ color: theme.textMuted, fontSize: 16 }}>You are safe. We'll get through this together.</p>
      </div>

      <div style={{
        width: 200, height: 200, borderRadius: '50%',
        background: theme.gradient, boxShadow: `0 0 100px ${theme.glow}`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        animation: 'pulse 4s infinite ease-in-out'
      }}>
        <div style={{ color: theme.text, fontSize: 20, fontWeight: 600 }}>Breathe 🌬️</div>
      </div>

      <div style={{ width: '100%', maxWidth: 400, display: 'flex', flexDirection: 'column', gap: 12 }}>
        <button 
          onClick={() => { session.mode = 'sos'; notify(); }}
          style={{ width: '100%', padding: '20px', borderRadius: 16, background: theme.primary, border: 'none', color: 'white', fontSize: 18, fontWeight: 700, cursor: 'pointer' }}
        >
          Tap to use Voice Help
        </button>
        
        <a href="tel:9152987821" style={{ 
          width: '100%', padding: '16px', borderRadius: 16, background: theme.bgCard, border: `2px solid ${theme.border}`,
          color: theme.text, textDecoration: 'none', textAlign: 'center', fontSize: 16, fontWeight: 600
        }}>
          Call iCall Helpline (India)
        </a>

        <button onClick={onClose} style={{ background: 'none', border: 'none', color: theme.textMuted, fontSize: 14, cursor: 'pointer', marginTop: 12 }}>
          Close SOS Mode
        </button>
      </div>

      <style>{`
        @keyframes pulse {
          0% { transform: scale(0.9); opacity: 0.8; }
          50% { transform: scale(1.1); opacity: 1; }
          100% { transform: scale(0.9); opacity: 0.8; }
        }
      `}</style>
    </div>
  )
}
