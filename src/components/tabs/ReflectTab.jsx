import { useState } from 'react'
import { useSession, session, notify, addJournalEntry } from '../../focuscoach/sessionState.js'
import JournalPanel from '../JournalPanel.jsx'
import VoiceMemo from '../VoiceMemo.jsx'
import ThoughtDiary from '../ThoughtDiary.jsx'

export default function ReflectTab({ theme, onVoiceNeeded }) {
  const currentSession = useSession()
  const [activeMode, setActiveMode] = useState(null)

  const startMode = (mode) => {
    session.mode = mode
    notify()
    setActiveMode(mode)
    onVoiceNeeded()
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, padding: '20px 16px' }}>

      {/* Gratitude journaling */}
      <div style={{ background: theme.bgCard, borderRadius: 16, padding: 16, border: `1px solid ${theme.border}` }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <div style={{ fontSize: 15, fontWeight: 500, color: theme.text }}>🙏 Gratitude journal</div>
            <div style={{ fontSize: 12, color: theme.textMuted, marginTop: 2 }}>
              Voice-record 3 things you're grateful for
            </div>
            <div style={{ fontSize: 12, color: theme.textMuted, marginTop: 4 }}>
              {currentSession.gratitudeEntries.length} entries total
            </div>
          </div>
          <button onClick={() => startMode('gratitude')} style={{
            padding: '8px 14px', borderRadius: 10, border: 'none',
            background: theme.primary, color: 'white', fontSize: 13, cursor: 'pointer',
          }}>
            Start
          </button>
        </div>
        {currentSession.gratitudeEntries.slice(-1).map(e => (
          <div key={e.id} style={{ marginTop: 12, padding: '10px 12px', background: theme.bgInput, borderRadius: 10 }}>
            <div style={{ fontSize: 11, color: theme.textMuted, marginBottom: 6 }}>Last entry</div>
            {e.items.map((item, i) => (
              <div key={i} style={{ fontSize: 13, color: theme.text, padding: '2px 0' }}>• {item}</div>
            ))}
          </div>
        ))}
      </div>

      {/* Cognitive reframing */}
      <div style={{ background: theme.bgCard, borderRadius: 16, padding: 16, border: `1px solid ${theme.border}` }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <div style={{ fontSize: 15, fontWeight: 500, color: theme.text }}>🔄 Reframe a thought</div>
            <div style={{ fontSize: 12, color: theme.textMuted, marginTop: 2 }}>
              Challenge negative thinking with AI support
            </div>
            <div style={{ fontSize: 12, color: theme.textMuted, marginTop: 4 }}>
              {currentSession.reframingHistory.length} reframes done
            </div>
          </div>
          <button onClick={() => startMode('reframing')} style={{
            padding: '8px 14px', borderRadius: 10, border: 'none',
            background: theme.primary, color: 'white', fontSize: 13, cursor: 'pointer',
          }}>
            Start
          </button>
        </div>
        {currentSession.reframingHistory.slice(-1).map(e => (
          <div key={e.id} style={{ marginTop: 12 }}>
            <div style={{ padding: '8px 12px', background: theme.bgInput, borderRadius: 8, borderLeft: '3px solid #EF4444', fontSize: 12, color: theme.textMuted }}>
              "{e.negative}"
            </div>
            <div style={{ padding: '8px 12px', background: theme.bgInput, borderRadius: 8, borderLeft: `3px solid ${theme.primary}`, fontSize: 12, color: theme.text, marginTop: 6 }}>
              "{e.reframe}"
            </div>
          </div>
        ))}
      </div>

      {/* Thought diary */}
      <div style={{ background: theme.bgCard, borderRadius: 16, padding: 16, border: `1px solid ${theme.border}` }}>
        <div style={{ fontSize: 15, fontWeight: 500, color: theme.text, marginBottom: 4 }}>📋 Thought diary</div>
        <div style={{ fontSize: 12, color: theme.textMuted, marginBottom: 12 }}>Manual CBT-style thought record</div>
        <ThoughtDiary theme={theme} />
      </div>

      {/* Weekly reflection */}
      <div style={{ background: theme.bgCard, borderRadius: 16, padding: 16, border: `1px solid ${theme.border}` }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: currentSession.weeklyReflection ? 12 : 0 }}>
          <div>
            <div style={{ fontSize: 15, fontWeight: 500, color: theme.text }}>📊 Weekly reflection</div>
            <div style={{ fontSize: 12, color: theme.textMuted, marginTop: 2 }}>AI summary of your week</div>
          </div>
          <button onClick={() => startMode('weekly')} style={{
            padding: '8px 14px', borderRadius: 10, border: 'none',
            background: theme.primary, color: 'white', fontSize: 13, cursor: 'pointer',
          }}>
            Generate
          </button>
        </div>
        {currentSession.weeklyReflection && (
          <div style={{ padding: '12px 14px', background: theme.bgInput, borderRadius: 10, fontSize: 13, color: theme.text, lineHeight: 1.7 }}>
            {currentSession.weeklyReflection}
          </div>
        )}
      </div>

      {/* Journal entries */}
      <div style={{ background: theme.bgCard, borderRadius: 16, padding: 16, border: `1px solid ${theme.border}` }}>
        <div style={{ fontSize: 12, color: theme.textMuted, fontWeight: 500, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 12 }}>
          📓 Voice journal
        </div>
        <JournalPanel />
      </div>

      {/* Voice memos */}
      <div style={{ background: theme.bgCard, borderRadius: 16, padding: 16, border: `1px solid ${theme.border}` }}>
        <div style={{ fontSize: 12, color: theme.textMuted, fontWeight: 500, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 4 }}>
          🎙️ Voice memos
        </div>
        <div style={{ fontSize: 12, color: theme.textMuted, marginBottom: 12 }}>
          Record thoughts without AI response
        </div>
        <VoiceMemo theme={theme} />
      </div>

    </div>
  )
}
