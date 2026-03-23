import { useState } from 'react'
import { useSession, session, notify, addJournalEntry } from '../../focuscoach/sessionState.js'
import JournalPanel from '../JournalPanel.jsx'
import VoiceMemo from '../VoiceMemo.jsx'
import ThoughtDiary from '../ThoughtDiary.jsx'
import { t } from '../../mindease/i18n.js'

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
    <div style={{ padding: '20px 16px 32px', display: 'flex', flexDirection: 'column', gap: 14 }}>

      {/* Gratitude */}
      <div className="card">
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
          <div style={{ display: 'flex', gap: 12, flex: 1 }}>
            <div style={{ width: 40, height: 40, borderRadius: 10, background: theme.primary + '18', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, flexShrink: 0 }}>🙏</div>
            <div>
              <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>{t('gratitude_journal')}</p>
              <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>
                {t('gratitude_desc')}
              </p>
              <span className="badge" style={{ marginTop: 6, background: theme.primary + '15', color: theme.primary, border: `1px solid ${theme.primary}25`, fontSize: 10 }}>
                {currentSession.gratitudeEntries.length} {t('entries')}
              </span>
            </div>
          </div>
          <button className="btn btn-primary btn-sm" onClick={() => startMode('gratitude')}
            style={{ background: theme.primary, border: 'none', flexShrink: 0 }}>
            {t('start')}
          </button>
        </div>
      </div>

      {/* Cognitive reframing */}
      <div className="card">
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
          <div style={{ display: 'flex', gap: 12, flex: 1 }}>
            <div style={{ width: 40, height: 40, borderRadius: 10, background: theme.primary + '18', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, flexShrink: 0 }}>🔄</div>
            <div>
              <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>{t('reframe_thought')}</p>
              <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>
                {t('reframe_desc')}
              </p>
              <span className="badge" style={{ marginTop: 6, background: theme.primary + '15', color: theme.primary, border: `1px solid ${theme.primary}25`, fontSize: 10 }}>
                {currentSession.reframingHistory.length} {t('reframes')}
              </span>
            </div>
          </div>
          <button className="btn btn-primary btn-sm" onClick={() => startMode('reframing')}
            style={{ background: theme.primary, border: 'none', flexShrink: 0 }}>
            {t('start')}
          </button>
        </div>
      </div>

      {/* Thought diary */}
      <div className="card">
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
          <div style={{ width: 40, height: 40, borderRadius: 10, background: theme.primary + '18', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>📋</div>
          <div>
            <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>{t('thought_diary')}</p>
            <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 1 }}>{t('thought_diary_desc')}</p>
          </div>
        </div>
        <ThoughtDiary theme={theme} />
      </div>

      {/* Weekly reflection */}
      <div className="card">
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: currentSession.weeklyReflection ? 14 : 0 }}>
          <div style={{ display: 'flex', gap: 12 }}>
            <div style={{ width: 40, height: 40, borderRadius: 10, background: theme.primary + '18', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, flexShrink: 0 }}>📊</div>
            <div>
              <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>{t('weekly_reflection')}</p>
              <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 1 }}>{t('weekly_reflection_desc')}</p>
            </div>
          </div>
          <button className="btn btn-sm" onClick={() => startMode('weekly')}
            style={{ background: theme.primary + '18', border: `1px solid ${theme.primary}30`, color: theme.primary, flexShrink: 0 }}>
            {t('generate')}
          </button>
        </div>
        {currentSession.weeklyReflection && (
          <div style={{
            padding: '12px 14px',
            background: 'var(--bg-input)',
            borderRadius: 'var(--radius-md)',
            fontSize: 13, color: 'var(--text-primary)', lineHeight: 1.7,
            borderLeft: `3px solid ${theme.primary}`,
          }}>
            {currentSession.weeklyReflection}
          </div>
        )}
      </div>

      {/* Voice journal */}
      <div className="card">
        <p className="section-label" style={{ marginBottom: 14 }}>{t('voice_journal')}</p>
        <JournalPanel />
      </div>

      {/* Voice memos */}
      <div className="card">
        <div style={{ marginBottom: 14 }}>
          <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>{t('voice_memos')}</p>
          <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>
            {t('voice_memos_desc')}
          </p>
        </div>
        <VoiceMemo theme={theme} />
      </div>

    </div>
  )
}
