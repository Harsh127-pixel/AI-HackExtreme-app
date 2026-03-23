import { useState } from 'react'
import { playSound, stopSound, getCurrentSound, SOUNDS } from '../mindease/ambientSounds.js'

export default function AmbientSounds({ theme }) {
  const [active, setActive] = useState(getCurrentSound())

  const toggle = (id) => {
    playSound(id)
    setActive(getCurrentSound())
  }

  return (
    <div className="card">
      <div style={{ fontSize: 12, color: theme.textMuted, fontWeight: 500, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 12 }}>
        Ambient sounds
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        {Object.entries(SOUNDS).map(([id, sound]) => (
          <button key={id} onClick={() => toggle(id)} style={{
            padding: '12px 10px',
            background: active === id ? theme.primary + '18' : 'var(--bg-input)',
            border: active === id ? `1.5px solid ${theme.primary}` : '1.5px solid var(--border-subtle)',
            borderRadius: 'var(--radius-md)',
            cursor: 'pointer',
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
        <button className="btn btn-ghost btn-sm" style={{ width: '100%', marginTop: 8 }} onClick={() => { stopSound(); setActive(null) }}>
          Stop sound
        </button>
      )}
    </div>
  )
}
