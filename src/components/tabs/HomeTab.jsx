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
  let greeting = t('greeting_night')
  if (hour >= 5 && hour < 12) greeting = t('greeting_morning')
  else if (hour >= 12 && hour < 17) greeting = t('greeting_afternoon')
  else if (hour >= 17 && hour < 22) greeting = t('greeting_evening')
  const moodMsg = () => {
    const opts = MOOD_MESSAGES[currentSession.wellnessMode] || MOOD_MESSAGES.okay
    return opts[new Date().getDay() % opts.length]
  }

  return (
    <div style={{ padding: '24px 16px 40px', display: 'flex', flexDirection: 'column', gap: 24 }}>
      <style>{`
        .dashboard-grid { 
          display: grid; 
          grid-template-columns: 1fr; 
          gap: 20px; 
        }
        @media (min-width: 1024px) {
          .dashboard-grid { 
            grid-template-columns: repeat(2, 1fr); 
            gap: 24px; 
          }
          .full-width { grid-column: 1 / -1; }
        }
      `}</style>

      {/* Greeting */}
      <div style={{ marginBottom: 8 }} className="full-width">
        <h2 style={{ fontSize: 32, fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-1px' }}>
          {greeting} 👋
        </h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: 16, marginTop: 8, lineHeight: 1.6, maxWidth: 600 }}>
          {moodMsg()}
        </p>
      </div>

      <div className="dashboard-grid">

        {/* Streak + Quick stats row */}
        <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: 16 }}>
          <div style={{
            background: `linear-gradient(135deg, ${theme.primary}18, ${theme.accent}10)`,
            border: `1.5px solid ${theme.primary}30`,
            borderRadius: 24, padding: '20px 24px',
            display: 'flex', alignItems: 'center', gap: 16,
          }}>
            <div style={{
              width: 52, height: 52, borderRadius: 16,
              background: theme.primary + '22',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 26, flexShrink: 0,
            }}>🔥</div>
            <div>
              <div style={{ fontSize: 26, fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1 }}>
                {streak}
              </div>
              <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 4 }}>
                {t('streak_days')}
              </div>
            </div>
          </div>

          <div style={{
            background: 'var(--bg-card)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 24, padding: '20px',
            textAlign: 'center', display: 'flex', flexDirection: 'column', justifyContent: 'center'
          }}>
            <div style={{ fontSize: 24 }}>🍅</div>
            <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--text-primary)', marginTop: 6 }}>
              {currentSession.pomodoroCount}
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>Sessions</div>
          </div>
        </div>

        {/* Mood selector */}
        <div className="card" style={{ borderRadius: 24, padding: 24 }}>
          <p className="section-label" style={{ marginBottom: 16, fontSize: 15 }}>{t('mood_today')}</p>
          <div style={{ display: 'flex', gap: 10 }}>
            {MOODS.map(m => {
              const active = moodSelected === m.id
              return (
                <button key={m.id} onClick={() => handleMood(m.id)} style={{
                  flex: 1, padding: '14px 6px', borderRadius: 18,
                  border: `2px solid ${active ? m.color : 'transparent'}`,
                  background: active ? m.color + '18' : 'var(--bg-input)',
                  cursor: 'pointer', transition: 'all 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
                  transform: active ? 'scale(1.05)' : 'scale(1)',
                }}>
                  <span style={{ fontSize: 24 }}>{m.emoji}</span>
                  <span style={{ fontSize: 11, color: active ? 'var(--text-primary)' : 'var(--text-muted)', fontWeight: active ? 700 : 500 }}>
                    {m.label}
                  </span>
                </button>
              )
            })}
          </div>
        </div>

        {/* Sleep check-in */}
        <div className="card" style={{ borderRadius: 24, padding: 24 }}>
          <p className="section-label" style={{ marginBottom: 16, fontSize: 15 }}>{t('sleep_quality')}</p>
          <div style={{ display: 'flex', gap: 10 }}>
            {SLEEP.map(s => {
              const active = sleepSelected === s.id
              return (
                <button key={s.id} onClick={() => handleSleep(s.id)} style={{
                  flex: 1, padding: '14px 6px', borderRadius: 18,
                  border: `2px solid ${active ? theme.primary : 'transparent'}`,
                  background: active ? theme.primary + '18' : 'var(--bg-input)',
                  cursor: 'pointer', transition: 'all 0.2s',
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
                  transform: active ? 'scale(1.05)' : 'scale(1)',
                }}>
                  <span style={{ fontSize: 24 }}>{s.emoji}</span>
                  <span style={{ fontSize: 11, color: active ? 'var(--text-primary)' : 'var(--text-muted)', fontWeight: 700 }}>
                    {s.label}
                  </span>
                </button>
              )
            })}
          </div>
        </div>

        {/* This week insights - Moves to another column on desktop if possible */}
        <div className="card" style={{ borderRadius: 24, padding: 24 }}>
          <p className="section-label" style={{ marginBottom: 18, fontSize: 15 }}>📊 {t('this_week')}</p>
          <ProgressInsights theme={theme} />
        </div>

        {/* Mood graph - Full width */}
        <div className="full-width">
          <MoodGraph />
        </div>

        {/* Stats row */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }} className="full-width">
          {[
            { emoji: '📓', value: currentSession.journalEntries.length, label: 'Journals' },
            { emoji: '🙏', value: currentSession.gratitudeEntries.length, label: 'Gratitude' },
            { emoji: '🔄', value: currentSession.reframingHistory.length, label: 'Reframes' },
          ].map(s => (
            <div key={s.label} className="card" style={{ textAlign: 'center', padding: '20px 12px', borderRadius: 24 }}>
              <div style={{ fontSize: 28 }}>{s.emoji}</div>
              <div style={{ fontSize: 28, fontWeight: 800, color: 'var(--text-primary)', marginTop: 8 }}>{s.value}</div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2, fontWeight: 500 }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Data management icon */}
        <div className="card full-width" style={{ borderRadius: 24, padding: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: showData ? 20 : 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <div style={{ width: 44, height: 44, borderRadius: 12, background: 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>⚙️</div>
              <div>
                <p style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>Privacy & Data</p>
                <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 4, margin: 0 }}>All data stays locally on your device.</p>
              </div>
            </div>
            <button className="btn btn-ghost" onClick={() => setShowData(v => !v)} style={{ padding: '8px 16px', borderRadius: 10 }}>
              {showData ? 'Hide Settings' : 'Manage Data'}
            </button>
          </div>
          {showData && <ExportData theme={theme} />}
        </div>
      </div>
    </div>
  )
}
