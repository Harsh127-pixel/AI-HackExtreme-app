import { useState } from 'react'

export default function CrisisFollowUp({ theme, onDone }) {
  const [selected, setSelected] = useState(null)

  const options = [
    { id: 'better', label: "I'm feeling better today", emoji: '🌱' },
    { id: 'same',   label: "About the same",            emoji: '〰️' },
    { id: 'worse',  label: "Still struggling",           emoji: '💙' },
  ]

  const handleSelect = (id) => {
    setSelected(id)
    localStorage.removeItem('mindease_last_crisis')
    setTimeout(onDone, 1500)
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 999,
      background: '#080F1A', display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      padding: 32, gap: 24, maxWidth: 480, margin: '0 auto',
    }}>
      <span style={{ fontSize: 40 }}>💜</span>
      <div style={{ textAlign: 'center' }}>
        <h2 style={{ color: '#F0F9FF', fontSize: 20, fontWeight: 600, marginBottom: 8 }}>Checking in on you</h2>
        <p style={{ color: '#7AB3CC', fontSize: 14, lineHeight: 1.7 }}>
          You went through something hard recently.<br />How are you feeling today?
        </p>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, width: '100%' }}>
        {options.map(opt => (
          <button key={opt.id} onClick={() => handleSelect(opt.id)} style={{
            padding: '14px 18px', borderRadius: 12, border: 'none', cursor: 'pointer',
            background: selected === opt.id ? '#1E1B2E' : '#0F1D2E',
            outline: selected === opt.id ? '2px solid #A78BFA' : '2px solid transparent',
            display: 'flex', alignItems: 'center', gap: 12,
            transition: 'all 0.15s',
          }}>
            <span style={{ fontSize: 24 }}>{opt.emoji}</span>
            <span style={{ color: '#F0F9FF', fontSize: 14 }}>{opt.label}</span>
            {selected === opt.id && <span style={{ marginLeft: 'auto', color: '#A78BFA' }}>✓</span>}
          </button>
        ))}
      </div>
      {selected === 'worse' && (
        <div style={{ padding: '12px 16px', background: '#16112A', borderRadius: 12, border: '1px solid #8B5CF6', width: '100%' }}>
          <p style={{ color: '#C4B5FD', fontSize: 13, lineHeight: 1.6, margin: '0 0 8px' }}>
            Thank you for telling me. Please don't go through this alone.
          </p>
          <a href="https://icallhelpline.org" target="_blank" rel="noopener noreferrer" style={{ color: '#A78BFA', fontSize: 13 }}>
            Talk to someone at iCall →
          </a>
        </div>
      )}
    </div>
  )
}
