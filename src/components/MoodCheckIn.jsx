import { useState } from 'react'
import { setWellnessMode } from '../focuscoach/sessionState.js'

const MOODS = [
  { id: 'okay',       emoji: '😊', label: 'Feeling okay',      color: '#22C55E', desc: "Ready to focus" },
  { id: 'stress',     emoji: '😤', label: 'Stressed',           color: '#F59E0B', desc: "A lot on my mind" },
  { id: 'anxiety',    emoji: '😰', label: 'Anxious',            color: '#3B82F6', desc: "Feeling nervous or on edge" },
  { id: 'depression', emoji: '😔', label: 'Low mood',           color: '#8B5CF6', desc: "Feeling down or flat" },
  { id: 'burnout',    emoji: '🪫',  label: 'Burned out',         color: '#EF4444', desc: "Exhausted, running on empty" },
]

export default function MoodCheckIn({ onComplete }) {
  const [selected, setSelected] = useState(null)
  const [hovered, setHovered] = useState(null)

  const handleConfirm = () => {
    if (!selected) return
    setWellnessMode(selected)
    onComplete()
  }

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      height: '100dvh', background: '#0F172A', color: '#F1F5F9',
      padding: 24, gap: 32, maxWidth: 480, margin: '0 auto',
    }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 40, marginBottom: 12 }}>🧠</div>
        <h1 style={{ fontSize: 22, fontWeight: 600, marginBottom: 8 }}>How are you feeling today?</h1>
        <p style={{ color: '#94A3B8', fontSize: 13, lineHeight: 1.6, maxWidth: 320, margin: '0 auto' }}>
          MindEase adapts to support you. Your answers never leave this device — no cloud, no servers, just you.
        </p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, width: '100%' }}>
        {MOODS.map(mood => (
          <button
            key={mood.id}
            onClick={() => setSelected(mood.id)}
            onMouseEnter={() => setHovered(mood.id)}
            onMouseLeave={() => setHovered(null)}
            style={{
              display: 'flex', alignItems: 'center', gap: 14,
              padding: '14px 18px', borderRadius: 12, border: 'none', cursor: 'pointer',
              background: selected === mood.id
                ? mood.color + '22'
                : hovered === mood.id ? '#1E293B' : '#1E293B',
              outline: selected === mood.id ? `2px solid ${mood.color}` : '2px solid transparent',
              transition: 'all 0.15s', textAlign: 'left', width: '100%',
            }}
          >
            <span style={{ fontSize: 28 }}>{mood.emoji}</span>
            <div>
              <div style={{ color: '#F1F5F9', fontSize: 15, fontWeight: 500 }}>{mood.label}</div>
              <div style={{ color: '#94A3B8', fontSize: 12, marginTop: 2 }}>{mood.desc}</div>
            </div>
            {selected === mood.id && (
              <div style={{ marginLeft: 'auto', width: 20, height: 20, borderRadius: '50%', background: mood.color, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span style={{ color: 'white', fontSize: 12 }}>✓</span>
              </div>
            )}
          </button>
        ))}
      </div>

      <button
        onClick={handleConfirm}
        disabled={!selected}
        style={{
          width: '100%', padding: '14px 0', borderRadius: 10, border: 'none', cursor: selected ? 'pointer' : 'not-allowed',
          background: selected ? '#FF5500' : '#334155',
          color: selected ? 'white' : '#94A3B8',
          fontSize: 15, fontWeight: 600, transition: 'all 0.2s',
        }}
      >
        Start my session →
      </button>

      <button
        onClick={() => { setWellnessMode('okay'); onComplete() }}
        style={{ background: 'none', border: 'none', color: '#475569', fontSize: 13, cursor: 'pointer' }}
      >
        Skip for now
      </button>
    </div>
  )
}
