import { useState, useEffect } from 'react'
import { useSession } from '../focuscoach/sessionState.js'
import { t } from '../mindease/i18n.js'

export default function SessionSummaryCard({ theme, prevPomodoroCount }) {
  const session = useSession()
  const [visible, setVisible] = useState(false)
  const [summary, setSummary] = useState(null)

  useEffect(() => {
    if (session.pomodoroCount > prevPomodoroCount && session.pomodoroCount > 0) {
      const completedStep = session.steps.find((s, i) => i === session.currentStepIndex - 1)
      setSummary({
        count: session.pomodoroCount,
        task: session.currentTask || 'your task',
        step: completedStep?.text || null,
        totalFocusMinutes: session.pomodoroCount * 25,
      })
      setVisible(true)
      const t = setTimeout(() => setVisible(false), 6000)
      return () => clearTimeout(t)
    }
  }, [session.pomodoroCount])

  if (!visible || !summary) return null

  return (
    <div style={{
      margin: '0 16px',
      padding: '14px 16px',
      background: theme.bgCard,
      border: `1px solid ${theme.primary}`,
      borderRadius: 14,
      position: 'relative',
      overflow: 'hidden',
    }}>
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, height: 3,
        background: theme.primary, borderRadius: '14px 14px 0 0',
      }} />
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <div style={{ fontSize: 13, color: theme.textMuted, marginBottom: 4 }}>
            {t('session_complete')} 🍅 #{summary.count}
          </div>
          <div style={{ fontSize: 15, fontWeight: 500, color: theme.text }}>
            25 minutes on "{summary.task}"
          </div>
          {summary.step && (
            <div style={{ fontSize: 13, color: theme.textMuted, marginTop: 4 }}>
              Step: {summary.step}
            </div>
          )}
          <div style={{ fontSize: 12, color: theme.primary, marginTop: 6, fontWeight: 500 }}>
            {summary.totalFocusMinutes} total focus minutes today
          </div>
        </div>
        <button onClick={() => setVisible(false)} style={{
          background: 'none', border: 'none', color: theme.textMuted,
          fontSize: 16, cursor: 'pointer', padding: 0, lineHeight: 1,
        }}>×</button>
      </div>
    </div>
  )
}
