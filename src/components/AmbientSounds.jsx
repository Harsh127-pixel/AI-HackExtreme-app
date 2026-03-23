import { useState } from 'react'
import { playSound, stopSound, getCurrentSound, SOUNDS } from '../mindease/ambientSounds.js'

export default function AmbientSounds({ theme }) {
  const [active, setActive] = useState(getCurrentSound())

  const toggle = (id) => {
    playSound(id)
    setActive(getCurrentSound())
  }

  return (
    <div style={{ background: theme.bgCard, borderRadius: 16, padding: 16, border: `1px solid ${theme.border}` }}>
      <div style={{ fontSize: 12, color: theme.textMuted, fontWeight: 500, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 12 }}>
        Ambient sounds
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        {Object.entries(SOUNDS).map(([id, sound]) => (
          <button key={id} onClick={() => toggle(id)} style={{
            padding: '12px 10px', borderRadius: 12, border: 'none', cursor: 'pointer',
            background: active === id ? theme.primary + '33' : theme.bgInput,
            outline: active === id ? `2px solid ${theme.primary}` : '2px solid transparent',
            display: 'flex', alignItems: 'center', gap: 8,
            transition: 'all 0.15s',
          }}>
            <span style={{ fontSize: 20 }}>{sound.emoji}</span>
            <span style={{ fontSize: 13, color: active === id ? theme.primary : theme.textMuted, fontWeight: active === id ? 600 : 400 }}>
              {sound.label}
            </span>
            {active === id && <span style={{ marginLeft: 'auto', fontSize: 10, color: theme.primary }}>ON</span>}
          </button>
        ))}
      </div>
      {active === 'binaural' && (
        <p style={{ fontSize: 11, color: theme.textMuted, marginTop: 6, textAlign: 'center' }}>
          🎧 Best with headphones — 40Hz gamma waves for focus
        </p>
      )}
      {active && (
        <button onClick={() => { stopSound(); setActive(null) }} style={{
          marginTop: 10, width: '100%', padding: '8px 0', borderRadius: 10,
          border: `1px solid ${theme.border}`, background: 'transparent',
          color: theme.textMuted, fontSize: 13, cursor: 'pointer',
        }}>
          Stop sound
        </button>
      )}
    </div>
  )
}
