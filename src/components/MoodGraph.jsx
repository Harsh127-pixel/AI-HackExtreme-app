import { useSession } from '../focuscoach/sessionState.js'
import { getTheme } from '../mindease/theme.js'

const MOOD_SCORES = { okay: 5, stress: 3, anxiety: 2, depression: 1, burnout: 2 }
const MOOD_COLORS = { okay: '#F59E0B', stress: '#FB7185', anxiety: '#38BDF8', depression: '#A78BFA', burnout: '#34D399' }
const MOOD_EMOJIS = { okay: '😊', stress: '😤', anxiety: '😰', depression: '😔', burnout: '🪫' }

export default function MoodGraph() {
  const session = useSession() // Hook for reactive updates
  const theme = getTheme(session.wellnessMode)

  // Build last 7 days slots
  const days = []
  const now = new Date()
  
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i)
    const dateKey = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`
    
    // Find the latest mood entry for this exact day
    const entry = session.moodHistory.filter(e => {
      const ed = new Date(e.timestamp)
      const eKey = `${ed.getFullYear()}-${ed.getMonth()}-${ed.getDate()}`
      return eKey === dateKey
    }).pop()

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
    <div className="card shadow-sm">
      <div style={{ fontSize: 12, color: theme.textMuted, marginBottom: 12, fontWeight: 600, letterSpacing: 1, textTransform: 'uppercase' }}>
        Mood this week
      </div>
      <svg width="100%" viewBox={`0 -10 ${totalW + 16} ${chartH + 45}`} style={{ overflow: 'visible' }}>
        {days.map((day, i) => {
          const x = i * (barWidth + gap) + 8
          const barH = day.score ? (day.score / maxScore) * chartH : 4
          const y = chartH - barH
          const color = day.mood ? MOOD_COLORS[day.mood] : 'var(--bg-input)'
          
          return (
            <g key={i} style={{ transition: 'all 0.5s ease' }}>
              <rect 
                x={x} y={y} width={barWidth} height={barH} rx={8} 
                fill={color} opacity={day.mood ? 0.9 : 0.2} 
                style={{ transition: 'all 0.4s' }}
              />
              <text x={x + barWidth / 2} y={chartH + 20} textAnchor="middle" fill={theme.textMuted} fontSize={11} fontWeight={500}>
                {day.label}
              </text>
              {day.mood && (
                <text x={x + barWidth / 2} y={y - 8} textAnchor="middle" fontSize={16} filter="drop-shadow(0 2px 4px rgba(0,0,0,0.2))">
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
