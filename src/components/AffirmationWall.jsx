import { useState } from 'react'
import { t } from '../mindease/i18n.js'

const STORAGE_KEY = 'mindease_saved_affirmations'

function load() { try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]') } catch { return [] } }
function save(items) { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(items)) } catch {} }

export default function AffirmationWall({ theme, aiAffirmations = [] }) {
  const [saved, setSaved] = useState(load)
  const [custom, setCustom] = useState('')
  const [adding, setAdding] = useState(false)

  const saveAffirmation = (text) => {
    if (saved.find(a => a.text === text)) return
    const updated = [{ id: Date.now(), text, timestamp: new Date().toISOString() }, ...saved]
    setSaved(updated)
    save(updated)
  }

  const remove = (id) => {
    const updated = saved.filter(a => a.id !== id)
    setSaved(updated)
    save(updated)
  }

  const addCustom = () => {
    if (!custom.trim()) return
    saveAffirmation(custom.trim())
    setCustom('')
    setAdding(false)
  }

  // Daily affirmation — rotate by day
  const daily = saved.length > 0 ? saved[new Date().getDay() % saved.length] : null

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>

      {/* Daily highlight */}
      {daily && (
        <div style={{
          padding: '16px 18px', borderRadius: 14,
          background: theme.gradient,
          border: `1px solid ${theme.primary}`,
          textAlign: 'center',
        }}>
          <div style={{ fontSize: 11, color: theme.textMuted, marginBottom: 8, letterSpacing: 1, textTransform: 'uppercase' }}>{t('todays_affirmation')}</div>
          <div style={{ fontSize: 15, color: theme.text, lineHeight: 1.6, fontStyle: 'italic' }}>"{daily.text}"</div>
        </div>
      )}

      {/* AI-generated unsaved affirmations */}
      {aiAffirmations.length > 0 && (
        <div>
          <div style={{ fontSize: 11, color: theme.textMuted, marginBottom: 8, letterSpacing: 0.5 }}>{t('ai_sessions_tip')}</div>
          {aiAffirmations.map((text, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', background: theme.bgCard, borderRadius: 10, marginBottom: 6, border: `1px solid ${theme.border}` }}>
              <span style={{ flex: 1, fontSize: 13, color: theme.text, lineHeight: 1.5 }}>{text}</span>
              <button onClick={() => saveAffirmation(text)} style={{ background: 'none', border: 'none', fontSize: 18, cursor: 'pointer', color: saved.find(a => a.text === text) ? theme.primary : theme.textMuted }}>
                {saved.find(a => a.text === text) ? '♥' : '♡'}
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Saved wall */}
      {saved.length > 0 && (
        <div>
          <div style={{ fontSize: 11, color: theme.textMuted, marginBottom: 8, letterSpacing: 0.5 }}>{t('saved_affirmations')} ({saved.length})</div>
          {saved.map(a => (
            <div key={a.id} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '10px 12px', background: theme.bgCard, borderRadius: 10, marginBottom: 6, border: `1px solid ${theme.border}` }}>
              <span style={{ flex: 1, fontSize: 13, color: theme.text, lineHeight: 1.5 }}>{a.text}</span>
              <button onClick={() => remove(a.id)} style={{ background: 'none', border: 'none', color: theme.textMuted, fontSize: 14, cursor: 'pointer', padding: 0, flexShrink: 0 }}>×</button>
            </div>
          ))}
        </div>
      )}

      {/* Add custom */}
      {adding ? (
        <div style={{ display: 'flex', gap: 8 }}>
          <input
            value={custom}
            onChange={e => setCustom(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && addCustom()}
            placeholder={t('write_own_affirmation')}
            style={{ flex: 1, padding: '10px 12px', background: theme.bgInput, border: `1px solid ${theme.border}`, borderRadius: 10, color: theme.text, fontSize: 13, outline: 'none' }}
          />
          <button onClick={addCustom} style={{ padding: '10px 14px', borderRadius: 10, border: 'none', background: theme.primary, color: 'white', fontSize: 13, cursor: 'pointer' }}>{t('save')}</button>
          <button onClick={() => setAdding(false)} style={{ padding: '10px 12px', borderRadius: 10, border: `1px solid ${theme.border}`, background: 'transparent', color: theme.textMuted, fontSize: 13, cursor: 'pointer' }}>{t('cancel')}</button>
        </div>
      ) : (
        <button onClick={() => setAdding(true)} style={{ width: '100%', padding: '10px 0', borderRadius: 10, border: `1px dashed ${theme.border}`, background: 'transparent', color: theme.textMuted, fontSize: 13, cursor: 'pointer' }}>
          {t('add_own_affirmation')}
        </button>
      )}
    </div>
  )
}
