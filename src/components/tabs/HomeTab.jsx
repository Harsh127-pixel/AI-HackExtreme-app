import { useState } from 'react'
import { useSession, setWellnessMode, setSleepQuality, session } from '../../focuscoach/sessionState.js'
import { getTheme } from '../../mindease/theme.js'
import MoodGraph from '../MoodGraph.jsx'
import useStreak from '../../mindease/useStreak.js'
import ProgressInsights from '../ProgressInsights.jsx'
import ExportData from '../ExportData.jsx'
import { t } from '../../mindease/i18n.js'

const MOODS = [
  { id: 'okay',       emoji: '😊', label: 'Good',     color: '#34D399' },
  { id: 'stress',     emoji: '😤', label: 'Stressed',  color: '#FBBF24' },
  { id: 'anxiety',    emoji: '😰', label: 'Anxious',   color: '#60A5FA' },
  { id: 'depression', emoji: '😔', label: 'Low',       color: '#A78BFA' },
  { id: 'burnout',    emoji: '🪫',  label: 'Drained',   color: '#F87171' },
]

const SLEEP = [
  { id: 'great',    emoji: '😴', label: 'Great',  score: 4 },
  { id: 'okay',     emoji: '🙂', label: 'Okay',   score: 3 },
  { id: 'poor',     emoji: '😞', label: 'Poor',   score: 2 },
  { id: 'terrible', emoji: '😵', label: 'Awful',  score: 1 },
]

const MOOD_MESSAGES = {
  anxiety:    ["Take it one breath at a time.", "You don't have to face everything at once.", "Slow and steady. You're safe."],
  depression: ["Small steps count. You showed up.", "Being here is enough for now.", "One tiny thing is still something."],
  burnout:    ["Rest is not laziness — it's recovery.", "You can't pour from an empty cup.", "Protecting your energy is strength."],
  stress:     ["Let's slow things down together.", "One thing at a time. Just one.", "You don't have to solve it all today."],
  okay:       ["Ready when you are.", "Let's make today count.", "You're showing up. That matters."],
}

export default function HomeTab({ theme }) {
  const currentSession = useSession()
  const [moodSelected, setMoodSelected] = useState(currentSession.wellnessMode)
  const [sleepSelected, setSleepSelected] = useState(currentSession.sleepQuality)
  const [showData, setShowData] = useState(false)
  const { streak, longestStreak } = useStreak()

  const handleMood = (id) => { setMoodSelected(id); setWellnessMode(id) }
  const handleSleep = (id) => { setSleepSelected(id); setSleepQuality(id) }

  const hour = new Date().getHours()
  const greeting = hour < 12 ? t('greeting_morning') : hour < 17 ? t('greeting_afternoon') : t('greeting_evening')
  const moodMsg = () => {
    const opts = MOOD_MESSAGES[currentSession.wellnessMode] || MOOD_MESSAGES.okay
    return opts[new Date().getDay() % opts.length]
  }

  return (
    <div style={{ padding: '20px 16px 32px', display: 'flex', flexDirection: 'column', gap: 16 }}>

      {/* Greeting */}
      <div style={{ marginBottom: 4 }}>
        <h2 style={{ fontSize: 24, fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.5px' }}>
          {greeting} 👋
        </h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: 14, marginTop: 6, lineHeight: 1.6 }}>
          {moodMsg()}
        </p>
      </div>

      {/* Streak + Quick stats row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
        <div style={{
          gridColumn: '1 / 3',
          background: `linear-gradient(135deg, ${theme.primary}18, ${theme.accent}10)`,
          border: `1px solid ${theme.primary}25`,
          borderRadius: 'var(--radius-lg)', padding: '14px 16px',
          display: 'flex', alignItems: 'center', gap: 12,
        }}>
          <div style={{
            width: 44, height: 44, borderRadius: 14,
            background: theme.primary + '22',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 22, flexShrink: 0,
          }}>🔥</div>
          <div>
            <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1 }}>
              {streak}
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>
              day{streak !== 1 ? 's' : ''} streak
            </div>
          </div>
          <div style={{ marginLeft: 'auto', textAlign: 'right' }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: theme.primary }}>{longestStreak}</div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>best</div>
          </div>
        </div>

        <div style={{
          background: 'var(--bg-card)',
          border: '1px solid var(--border-subtle)',
          borderRadius: 'var(--radius-lg)', padding: '14px 12px',
          textAlign: 'center',
        }}>
          <div style={{ fontSize: 20 }}>🍅</div>
          <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-primary)', marginTop: 4 }}>
            {currentSession.pomodoroCount}
          </div>
          <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 1 }}>sessions</div>
        </div>
      </div>

      {/* Mood selector */}
      <div className="card">
        <p className="section-label" style={{ marginBottom: 12 }}>{t('mood_today')}</p>
        <div style={{ display: 'flex', gap: 8 }}>
          {MOODS.map(m => {
            const active = moodSelected === m.id
            return (
              <button key={m.id} onClick={() => handleMood(m.id)} style={{
                flex: 1, padding: '10px 4px', borderRadius: 'var(--radius-md)',
                border: `1.5px solid ${active ? m.color : 'var(--border-subtle)'}`,
                background: active ? m.color + '18' : 'var(--bg-input)',
                cursor: 'pointer', transition: 'all var(--transition-fast)',
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5,
                transform: active ? 'scale(1.04)' : 'scale(1)',
              }}>
                <span style={{ fontSize: 22 }}>{m.emoji}</span>
                <span style={{ fontSize: 10, color: active ? m.color : 'var(--text-muted)', fontWeight: active ? 600 : 400 }}>
                  {m.label}
                </span>
              </button>
            )
          })}
        </div>
      </div>

      {/* Sleep check-in */}
      <div className="card">
        <p className="section-label" style={{ marginBottom: 12 }}>{t('sleep_quality')}</p>
        <div style={{ display: 'flex', gap: 8 }}>
          {SLEEP.map(s => {
            const active = sleepSelected === s.id
            return (
              <button key={s.id} onClick={() => handleSleep(s.id)} style={{
                flex: 1, padding: '10px 4px', borderRadius: 'var(--radius-md)',
                border: `1.5px solid ${active ? theme.primary : 'var(--border-subtle)'}`,
                background: active ? theme.primary + '18' : 'var(--bg-input)',
                cursor: 'pointer', transition: 'all var(--transition-fast)',
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5,
                transform: active ? 'scale(1.04)' : 'scale(1)',
              }}>
                <span style={{ fontSize: 20 }}>{s.emoji}</span>
                <span style={{ fontSize: 10, color: active ? theme.primary : 'var(--text-muted)', fontWeight: active ? 600 : 400 }}>
                  {s.label}
                </span>
              </button>
            )
          })}
        </div>
      </div>

      {/* Mood graph */}
      <MoodGraph />

      {/* This week insights */}
      <div className="card">
        <p className="section-label" style={{ marginBottom: 14 }}>📊 {t('this_week')}</p>
        <ProgressInsights theme={theme} />
      </div>

      {/* Stats row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
        {[
          { emoji: '📓', value: currentSession.journalEntries.length, label: 'journals' },
          { emoji: '🙏', value: currentSession.gratitudeEntries.length, label: 'gratitude' },
          { emoji: '🔄', value: currentSession.reframingHistory.length, label: 'reframes' },
        ].map(s => (
          <div key={s.label} className="card" style={{ textAlign: 'center', padding: '14px 8px' }}>
            <div style={{ fontSize: 20 }}>{s.emoji}</div>
            <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-primary)', marginTop: 4 }}>{s.value}</div>
            <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 1 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Data management */}
      <div className="card">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: showData ? 14 : 0 }}>
          <div>
            <p style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-primary)' }}>Your data</p>
            <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>
              Stored on this device only
            </p>
          </div>
          <button className="btn btn-ghost btn-sm" onClick={() => setShowData(v => !v)}>
            {showData ? 'Hide ▲' : 'Manage ▼'}
          </button>
        </div>
        {showData && <ExportData theme={theme} />}
      </div>

    </div>
  )
}
