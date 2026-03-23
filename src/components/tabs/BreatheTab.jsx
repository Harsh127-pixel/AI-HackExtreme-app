import { useState } from 'react'
import { useSession, session, notify } from '../../focuscoach/sessionState.js'
import BreathingExercise from '../BreathingExercise.jsx'
import SOSMode from '../SOSMode.jsx'
import AmbientSounds from '../AmbientSounds.jsx'
import BodyScan from '../BodyScan.jsx'
import AffirmationWall from '../AffirmationWall.jsx'

export default function BreatheTab({ theme, onVoiceNeeded }) {
  const currentSession = useSession()
  const [showBreathing, setShowBreathing] = useState(false)
  const [showBodyScan, setShowBodyScan] = useState(false)
  const [showSOS, setShowSOS] = useState(false)
  const [affirmations] = useState(currentSession.affirmations)

  if (showSOS) return <SOSMode onClose={() => setShowSOS(false)} />

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, padding: '20px 16px' }}>

      {/* SOS button — always prominent */}
      <button onClick={() => setShowSOS(true)} style={{
        width: '100%', padding: '16px', borderRadius: 16,
        background: 'linear-gradient(135deg, #1E0A0F, #2A1020)',
        border: '1px solid #FB7185',
        color: '#FB7185', fontSize: 16, fontWeight: 600, cursor: 'pointer',
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
      }}>
        <span style={{ fontSize: 24 }}>🆘</span>
        Anxiety SOS — I need help right now
      </button>

      {/* Breathing exercise */}
      <div style={{ background: theme.bgCard, borderRadius: 16, border: `1px solid ${theme.border}`, overflow: 'hidden' }}>
        <div style={{ padding: '14px 16px', borderBottom: showBreathing ? `1px solid ${theme.border}` : 'none' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontSize: 15, fontWeight: 500, color: theme.text }}>🫁 Guided breathing</div>
              <div style={{ fontSize: 12, color: theme.textMuted, marginTop: 2 }}>Box, 4-7-8, or deep breath</div>
            </div>
            <button onClick={() => setShowBreathing(v => !v)} style={{
              padding: '6px 14px', borderRadius: 8, border: `1px solid ${theme.border}`,
              background: theme.bgInput, color: theme.textMuted, fontSize: 13, cursor: 'pointer',
            }}>
              {showBreathing ? 'Close' : 'Start'}
            </button>
          </div>
        </div>
        {showBreathing && <BreathingExercise onClose={() => setShowBreathing(false)} />}
      </div>

      {/* Body scan */}
      <div style={{ background: theme.bgCard, borderRadius: 16, border: `1px solid ${theme.border}`, overflow: 'hidden' }}>
        <div style={{ padding: '14px 16px', borderBottom: showBodyScan ? `1px solid ${theme.border}` : 'none' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontSize: 15, fontWeight: 500, color: theme.text }}>🧘 Body scan</div>
              <div style={{ fontSize: 12, color: theme.textMuted, marginTop: 2 }}>5-minute guided relaxation</div>
            </div>
            <button onClick={() => setShowBodyScan(v => !v)} style={{ padding: '6px 14px', borderRadius: 8, border: `1px solid ${theme.border}`, background: theme.bgInput, color: theme.textMuted, fontSize: 13, cursor: 'pointer' }}>
              {showBodyScan ? 'Close' : 'Start'}
            </button>
          </div>
        </div>
        {showBodyScan && <BodyScan theme={theme} onClose={() => setShowBodyScan(false)} />}
      </div>

      {/* Ambient sounds */}
      <AmbientSounds theme={theme} />

      {/* Affirmations */}
      <div style={{ background: theme.bgCard, borderRadius: 16, padding: 16, border: `1px solid ${theme.border}` }}>
        <div style={{ fontSize: 12, color: theme.textMuted, fontWeight: 500, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 12 }}>
          ✨ Affirmations
        </div>
        <AffirmationWall theme={theme} aiAffirmations={affirmations} />
        <button onClick={() => {
          session.mode = 'affirmations'
          notify()
          onVoiceNeeded()
        }} style={{ width: '100%', marginTop: 12, padding: '10px 0', borderRadius: 10, border: 'none', background: theme.primary, color: 'white', fontSize: 13, cursor: 'pointer' }}>
          ✨ Generate new affirmations
        </button>
      </div>

      {/* Crisis resources */}
      <div style={{ background: theme.bgCard, borderRadius: 16, padding: 16, border: `1px solid ${theme.border}` }}>
        <div style={{ fontSize: 12, color: theme.textMuted, fontWeight: 500, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 12 }}>
          Support resources
        </div>
        {[
          { label: 'iCall (India)', detail: '9152987821', href: 'https://icallhelpline.org' },
          { label: 'Vandrevala Foundation', detail: '1860-2662-345 · 24/7', href: 'https://www.vandrevalafoundation.com' },
          { label: 'iCall chat support', detail: 'icallhelpline.org', href: 'https://icallhelpline.org' },
        ].map(r => (
          <a key={r.label} href={r.href} target="_blank" rel="noopener noreferrer" style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            padding: '10px 0', borderBottom: `1px solid ${theme.border}`,
            textDecoration: 'none',
          }}>
            <span style={{ color: theme.text, fontSize: 14 }}>{r.label}</span>
            <span style={{ color: theme.textMuted, fontSize: 12 }}>{r.detail}</span>
          </a>
        ))}
      </div>

    </div>
  )
}
