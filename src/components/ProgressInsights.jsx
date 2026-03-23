import { useMemo } from 'react'
import { session } from '../focuscoach/sessionState.js'

const MOOD_LABELS = { okay: 'Good', stress: 'Stressed', anxiety: 'Anxious', depression: 'Low', burnout: 'Drained' }
const MOOD_COLORS = { okay: '#F59E0B', stress: '#FB7185', anxiety: '#38BDF8', depression: '#A78BFA', burnout: '#34D399' }

export default function ProgressInsights({ theme }) {
  const stats = useMemo(() => {
    const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000

    const recentMoods = session.moodHistory.filter(e => new Date(e.timestamp).getTime() > weekAgo)
    const moodCounts = recentMoods.reduce((acc, e) => { acc[e.mood] = (acc[e.mood] || 0) + 1; return acc }, {})
    const topMood = Object.entries(moodCounts).sort((a, b) => b[1] - a[1])[0]

    const recentJournal = session.journalEntries.filter(e => new Date(e.timestamp).getTime() > weekAgo)
    const recentGratitude = session.gratitudeEntries.filter(e => new Date(e.timestamp).getTime() > weekAgo)

    const thoughts = (() => { try { return JSON.parse(localStorage.getItem('mindease_thoughts') || '[]') } catch { return [] } })()
    const recentThoughts = thoughts.filter(t => new Date(t.timestamp).getTime() > weekAgo)

    const focusMinutes = session.pomodoroCount * 25

    return { topMood, moodCounts, journalCount: recentJournal.length, gratitudeCount: recentGratitude.length, thoughtCount: recentThoughts.length, focusMinutes, totalMoods: recentMoods.length }
  }, [])

  const StatCard = ({ emoji, value, label, color }) => (
    <div className="card" style={{ textAlign: 'center', padding: '14px 10px', flex: 1, minWidth: 0 }}>
      <div style={{ fontSize: 22 }}>{emoji}</div>
      <div style={{ fontSize: 22, fontWeight: 700, color: color || theme.text, marginTop: 4 }}>{value}</div>
      <div style={{ fontSize: 10, color: theme.textMuted, marginTop: 2, lineHeight: 1.3 }}>{label}</div>
    </div>
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>

      {/* Top mood */}
      {stats.topMood && (
        <div className="card">
          <div style={{ fontSize: 12, color: theme.textMuted, marginBottom: 6, fontWeight: 500, textTransform: 'uppercase', letterSpacing: 0.5 }}>Most common mood this week</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 12, height: 12, borderRadius: '50%', background: MOOD_COLORS[stats.topMood[0]] }} />
            <span style={{ color: theme.text, fontSize: 16, fontWeight: 500 }}>{MOOD_LABELS[stats.topMood[0]] || stats.topMood[0]}</span>
            <span style={{ color: theme.textMuted, fontSize: 13 }}>{stats.topMood[1]} day{stats.topMood[1] !== 1 ? 's' : ''}</span>
          </div>
        </div>
      )}

      {/* Stats grid */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <StatCard emoji="🍅" value={session.pomodoroCount} label="Pomodoros" />
        <StatCard emoji="⏱️" value={`${stats.focusMinutes}m`} label="Focus time" color={theme.primary} />
        <StatCard emoji="📓" value={stats.journalCount} label="Journal entries" />
        <StatCard emoji="🙏" value={stats.gratitudeCount} label="Gratitude logs" />
        <StatCard emoji="🔄" value={stats.thoughtCount} label="Thought records" />
        <StatCard emoji="😊" value={stats.totalMoods} label="Mood check-ins" />
      </div>

      {/* Encouragement */}
      <div style={{ padding: '12px 14px', background: 'var(--bg-elevated)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-default)' }}>
        <p style={{ fontSize: 13, color: theme.text, lineHeight: 1.6, margin: 0 }}>
          {stats.journalCount >= 3
            ? "You've been consistently showing up for yourself this week. That takes real commitment."
            : stats.focusMinutes >= 50
            ? "Strong focus week. Your brain is doing hard work — make sure to rest too."
            : stats.gratitudeCount >= 2
            ? "Gratitude practice rewires how you notice the world. You're building something real."
            : "Every check-in counts. You're building a habit of self-awareness. Keep going."}
        </p>
      </div>
    </div>
  )
}
