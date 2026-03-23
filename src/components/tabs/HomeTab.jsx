import { useState } from 'react'
import { useSession, setWellnessMode, setSleepQuality } from '../../focuscoach/sessionState.js'
import { getTheme } from '../../mindease/theme.js'
import MoodGraph from '../MoodGraph.jsx'
import useStreak from '../../mindease/useStreak.js'
import ProgressInsights from '../ProgressInsights.jsx'
import ExportData from '../ExportData.jsx'
import { t } from '../../mindease/i18n.js'

const MOODS = [
  { id: 'okay',       emoji: '😊', label: 'Good',     color: '#F59E0B' },
  { id: 'stress',     emoji: '😤', label: 'Stressed',  color: '#FB7185' },
  { id: 'anxiety',    emoji: '😰', label: 'Anxious',   color: '#38BDF8' },
  { id: 'depression', emoji: '😔', label: 'Low',       color: '#A78BFA' },
  { id: 'burnout',    emoji: '🪫',  label: 'Drained',   color: '#34D399' },
]

const SLEEP = [
  { id: 'great',    emoji: '😴', label: 'Great' },
  { id: 'okay',     emoji: '🙂', label: 'Okay'  },
  { id: 'poor',     emoji: '😞', label: 'Poor'  },
  { id: 'terrible', emoji: '😵', label: 'Awful' },
]

export default function HomeTab({ theme }) {
  const session = useSession()
  const [moodSelected, setMoodSelected] = useState(session.wellnessMode)
  const [sleepSelected, setSleepSelected] = useState(session.sleepQuality)
  const { streak, longestStreak } = useStreak()

  const handleMood = (id) => { setMoodSelected(id); setWellnessMode(id) }
  const handleSleep = (id) => { setSleepSelected(id); setSleepQuality(id) }

  const greeting = () => {
    const h = new Date().getHours()
    const key = h < 12 ? 'greeting_morning' : h < 17 ? 'greeting_afternoon' : 'greeting_evening'
    return t(key)
  }

  const moodMessage = () => {
    const messages = {
      anxiety: [
        "Take it one breath at a time today.",
        "You don't have to tackle everything at once.",
        "Slow and steady. You've got this.",
      ],
      depression: [
        "Small steps count. You showed up.",
        "Being here is enough for now.",
        "One tiny thing is still something.",
      ],
      burnout: [
        "Rest is productive too.",
        "You can't pour from an empty cup. Refill first.",
        "Protecting your energy is a form of strength.",
      ],
      stress: [
        "Let's slow things down together.",
        "One thing at a time. Just one.",
        "You don't have to solve everything today.",
      ],
      okay: [
        "Ready when you are.",
        "Let's make today count.",
        "You're showing up. That already matters.",
      ],
    }
    const mood = session.wellnessMode || 'okay'
    const options = messages[mood] || messages.okay
    // Pick based on day of week so it rotates but stays consistent per day
    return options[new Date().getDay() % options.length]
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20, padding: '20px 16px' }}>

      {/* Greeting */}
      <div>
        <h2 style={{ fontSize: 22, fontWeight: 600, color: theme.text }}>{greeting()} 👋</h2>
        <p style={{ color: theme.textMuted, fontSize: 13, marginTop: 4, lineHeight: 1.5 }}>
          {moodMessage()}
        </p>
      </div>

      {/* Streak card */}
      <div style={{
        background: theme.gradient,
        border: `1px solid ${theme.border}`,
        borderRadius: 16, padding: '14px 16px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 28 }}>🔥</span>
          <div>
            <div style={{ fontSize: 20, fontWeight: 700, color: theme.text }}>{streak} day{streak !== 1 ? 's' : ''}</div>
            <div style={{ fontSize: 12, color: theme.textMuted }}>Current streak</div>
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: 16, fontWeight: 600, color: theme.primary }}>{longestStreak}</div>
          <div style={{ fontSize: 11, color: theme.textMuted }}>Best streak</div>
        </div>
      </div>

      {/* Mood selector */}
      <div style={{ background: theme.bgCard, borderRadius: 16, padding: 16, border: `1px solid ${theme.border}` }}>
        <div style={{ fontSize: 12, color: theme.textMuted, fontWeight: 500, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 12 }}>{t('mood_today')}</div>
        <div style={{ display: 'flex', gap: 8, justifyContent: 'space-between' }}>
          {MOODS.map(m => (
            <button key={m.id} onClick={() => handleMood(m.id)} style={{
              flex: 1, padding: '10px 4px', borderRadius: 10, border: 'none', cursor: 'pointer',
              background: moodSelected === m.id ? m.color + '33' : theme.bgInput,
              outline: moodSelected === m.id ? `2px solid ${m.color}` : '2px solid transparent',
              transition: 'all 0.15s', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
            }}>
              <span style={{ fontSize: 22 }}>{m.emoji}</span>
              <span style={{ fontSize: 10, color: theme.textMuted }}>{m.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Sleep check-in */}
      <div style={{ background: theme.bgCard, borderRadius: 16, padding: 16, border: `1px solid ${theme.border}` }}>
        <div style={{ fontSize: 12, color: theme.textMuted, fontWeight: 500, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 12 }}>{t('sleep_quality')}</div>
        <div style={{ display: 'flex', gap: 8 }}>
          {SLEEP.map(s => (
            <button key={s.id} onClick={() => handleSleep(s.id)} style={{
              flex: 1, padding: '10px 4px', borderRadius: 10, border: 'none', cursor: 'pointer',
              background: sleepSelected === s.id ? theme.primary + '33' : theme.bgInput,
              outline: sleepSelected === s.id ? `2px solid ${theme.primary}` : '2px solid transparent',
              transition: 'all 0.15s', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
            }}>
              <span style={{ fontSize: 20 }}>{s.emoji}</span>
              <span style={{ fontSize: 10, color: theme.textMuted }}>{s.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Mood graph */}
      <MoodGraph />

      {/* Quick stats */}
      <div style={{ display: 'flex', gap: 10 }}>
        {[
          { label: 'Pomodoros', value: session.pomodoroCount, emoji: '🍅' },
          { label: 'Journal entries', value: session.journalEntries.length, emoji: '📓' },
          { label: 'Gratitude logs', value: session.gratitudeEntries.length, emoji: '🙏' },
        ].map(stat => (
          <div key={stat.label} style={{ flex: 1, background: theme.bgCard, borderRadius: 12, padding: '12px 10px', border: `1px solid ${theme.border}`, textAlign: 'center' }}>
            <div style={{ fontSize: 20 }}>{stat.emoji}</div>
            <div style={{ fontSize: 20, fontWeight: 700, color: theme.text, marginTop: 4 }}>{stat.value}</div>
            <div style={{ fontSize: 10, color: theme.textMuted, marginTop: 2 }}>{stat.label}</div>
          </div>
        ))}
      </div>

      {/* Weekly insights */}
      <div style={{ background: theme.bgCard, borderRadius: 16, padding: 16, border: `1px solid ${theme.border}` }}>
        <div style={{ fontSize: 12, color: theme.textMuted, fontWeight: 500, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 12 }}>
          📊 {t('this_week')}
        </div>
        <ProgressInsights theme={theme} />
      </div>

      {/* Data Management */}
      <div style={{ background: theme.bgCard, borderRadius: 16, padding: 16, border: `1px solid ${theme.border}` }}>
        <div style={{ fontSize: 12, color: theme.textMuted, fontWeight: 500, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 4 }}>
          Your data
        </div>
        <p style={{ fontSize: 12, color: theme.textMuted, marginBottom: 12, lineHeight: 1.5 }}>
          Everything is stored on this device only. Export or delete anytime.
        </p>
        <ExportData theme={theme} />
      </div>

    </div>
  )
}
