import { useState } from 'react'

const STORAGE_KEY = 'mindease_thoughts'

function loadThoughts() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]') } catch { return [] }
}

export default function ThoughtDiary({ theme }) {
  const [thoughts, setThoughts] = useState(loadThoughts)
  const [form, setForm] = useState({ happened: '', thought: '', reframe: '' })
  const [adding, setAdding] = useState(false)

  const save = () => {
    if (!form.happened.trim() && !form.thought.trim()) return
    const entry = { id: Date.now(), ...form, timestamp: new Date().toISOString() }
    const updated = [entry, ...thoughts]
    setThoughts(updated)
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(updated)) } catch {}
    setForm({ happened: '', thought: '', reframe: '' })
    setAdding(false)
  }

  const remove = (id) => {
    const updated = thoughts.filter(t => t.id !== id)
    setThoughts(updated)
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(updated)) } catch {}
  }

  const inputStyle = {
    width: '100%', padding: '10px 12px',
    background: theme.bgInput, border: `1px solid ${theme.border}`,
    borderRadius: 10, color: theme.text, fontSize: 13,
    outline: 'none', resize: 'vertical', minHeight: 60,
    fontFamily: 'inherit', lineHeight: 1.5,
  }

  const labelStyle = { fontSize: 11, color: theme.textMuted, fontWeight: 500, letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 6, display: 'block' }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>

      {!adding ? (
        <button onClick={() => setAdding(true)} style={{
          width: '100%', padding: '12px 0', borderRadius: 12,
          border: `1px dashed ${theme.border}`, background: 'transparent',
          color: theme.textMuted, fontSize: 14, cursor: 'pointer',
        }}>
          + Record a thought
        </button>
      ) : (
        <div style={{ background: theme.bgCard, borderRadius: 14, padding: 16, border: `1px solid ${theme.border}`, display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div>
            <label style={labelStyle}>What happened?</label>
            <textarea style={inputStyle} value={form.happened} onChange={e => setForm(f => ({ ...f, happened: e.target.value }))} placeholder="Describe the situation briefly..." />
          </div>
          <div>
            <label style={labelStyle}>What did you think or feel?</label>
            <textarea style={inputStyle} value={form.thought} onChange={e => setForm(f => ({ ...f, thought: e.target.value }))} placeholder="What went through your mind?" />
          </div>
          <div>
            <label style={labelStyle}>A more balanced perspective</label>
            <textarea style={inputStyle} value={form.reframe} onChange={e => setForm(f => ({ ...f, reframe: e.target.value }))} placeholder="What would you tell a friend in this situation?" />
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button onClick={save} style={{ flex: 1, padding: '10px 0', borderRadius: 10, border: 'none', background: theme.primary, color: 'white', fontSize: 14, cursor: 'pointer' }}>
              Save
            </button>
            <button onClick={() => setAdding(false)} style={{ padding: '10px 16px', borderRadius: 10, border: `1px solid ${theme.border}`, background: 'transparent', color: theme.textMuted, fontSize: 14, cursor: 'pointer' }}>
              Cancel
            </button>
          </div>
        </div>
      )}

      {thoughts.map(t => (
        <div key={t.id} style={{ background: theme.bgCard, borderRadius: 14, padding: 14, border: `1px solid ${theme.border}` }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
            <span style={{ fontSize: 11, color: theme.textMuted }}>
              {new Date(t.timestamp).toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
            </span>
            <button onClick={() => remove(t.id)} style={{ background: 'none', border: 'none', color: theme.textMuted, fontSize: 14, cursor: 'pointer', padding: 0 }}>×</button>
          </div>
          {t.happened && <div style={{ fontSize: 12, color: theme.textMuted, marginBottom: 6 }}>📍 {t.happened}</div>}
          {t.thought && <div style={{ fontSize: 13, color: theme.text, borderLeft: `3px solid #EF4444`, paddingLeft: 10, marginBottom: 8, lineHeight: 1.5 }}>"{t.thought}"</div>}
          {t.reframe && <div style={{ fontSize: 13, color: theme.text, borderLeft: `3px solid ${theme.primary}`, paddingLeft: 10, lineHeight: 1.5 }}>"{t.reframe}"</div>}
        </div>
      ))}
    </div>
  )
}
