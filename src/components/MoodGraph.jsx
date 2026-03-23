import { session } from '../focuscoach/sessionState.js'
import { getTheme } from '../mindease/theme.js'

const MOOD_SCORES = { okay: 5, stress: 3, anxiety: 2, depression: 1, burnout: 2 }
const MOOD_COLORS = { okay: '#F59E0B', stress: '#FB7185', anxiety: '#38BDF8', depression: '#A78BFA', burnout: '#34D399' }
const MOOD_EMOJIS = { okay: '😊', stress: '😤', anxiety: '😰', depression: '😔', burnout: '🪫' }

export default function MoodGraph() {
  const theme = getTheme(session.wellnessMode)

  // Build last 7 days slots
  const days = []
  for (let i = 6; i >= 0; i--) {
    const d = new Date()
    d.setDate(d.getDate() - i)
    const dateStr = d.toDateString()
    const entry = session.moodHistory.filter(e => new Date(e.timestamp).toDateString() === dateStr).pop()
    days.push({
      label: d.toLocaleDateString([], { weekday: 'short' }),
      mood: entry?.mood || null,
      score: entry ? (MOOD_SCORES[entry.mood] || 3) : 0,
    })
  }

  const maxScore = 5
  const barWidth = 32
  const gap = 12
  const chartH = 80
  const totalW = days.length * (barWidth + gap) - gap

  return (
    <div style={{ padding: '16px', background: theme.bgCard, borderRadius: 16, border: `1px solid ${theme.border}` }}>
      <div style={{ fontSize: 12, color: theme.textMuted, marginBottom: 12, fontWeight: 500, letterSpacing: 1, textTransform: 'uppercase' }}>
        Mood this week
      </div>
      <svg width="100%" viewBox={`0 0 ${totalW + 16} ${chartH + 32}`} style={{ overflow: 'visible' }}>
        {days.map((day, i) => {
          const x = i * (barWidth + gap) + 8
          const barH = day.score ? (day.score / maxScore) * chartH : 4
          const y = chartH - barH
          const color = day.mood ? MOOD_COLORS[day.mood] : theme.border
          return (
            <g key={i}>
              <rect x={x} y={y} width={barWidth} height={barH} rx={6} fill={color} opacity={day.mood ? 0.85 : 0.3} />
              <text x={x + barWidth / 2} y={chartH + 16} textAnchor="middle" fill={theme.textMuted} fontSize={10}>
                {day.label}
              </text>
              {day.mood && (
                <text x={x + barWidth / 2} y={y - 6} textAnchor="middle" fontSize={14}>
                  {MOOD_EMOJIS[day.mood]}
                </text>
              )}
            </g>
          )
        })}
      </svg>
    </div>
  )
}
