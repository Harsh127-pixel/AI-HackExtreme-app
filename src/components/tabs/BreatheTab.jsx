import { useState } from 'react'
import { useSession, session, notify } from '../../focuscoach/sessionState.js'
import BreathingExercise from '../BreathingExercise.jsx'
import SOSMode from '../SOSMode.jsx'
import AmbientSounds from '../AmbientSounds.jsx'
import BodyScan from '../BodyScan.jsx'
import AffirmationWall from '../AffirmationWall.jsx'
import SleepStoryPlayer from '../SleepStoryPlayer.jsx'
import { t } from '../../mindease/i18n.js'

export default function BreatheTab({ theme, onVoiceNeeded }) {
  const currentSession = useSession()
  const [showBreathing, setShowBreathing] = useState(false)
  const [showBodyScan, setShowBodyScan] = useState(false)
  const [showSleep, setShowSleep] = useState(false)
  const [showSOS, setShowSOS] = useState(false)
  const [affirmations] = useState(currentSession.affirmations)

  if (showSOS) return <SOSMode onClose={() => setShowSOS(false)} />

  return (
    <div style={{ padding: '20px 16px 32px', display: 'flex', flexDirection: 'column', gap: 14 }}>

      {/* SOS */}
      <button onClick={() => setShowSOS(true)} style={{
        width: '100%', padding: '18px 20px',
        borderRadius: 'var(--radius-lg)',
        background: 'linear-gradient(135deg, rgba(248,113,113,0.12), rgba(244,63,94,0.08))',
        border: '1.5px solid rgba(248,113,113,0.3)',
        color: 'var(--danger)', cursor: 'pointer',
        display: 'flex', alignItems: 'center', gap: 14,
        transition: 'all var(--transition-fast)',
      }}
        onMouseEnter={e => e.currentTarget.style.background = 'rgba(248,113,113,0.18)'}
        onMouseLeave={e => e.currentTarget.style.background = 'linear-gradient(135deg, rgba(248,113,113,0.12), rgba(244,63,94,0.08))'}
      >
        <div style={{
          width: 44, height: 44, borderRadius: 12,
          background: 'rgba(248,113,113,0.15)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, flexShrink: 0,
        }}>🆘</div>
        <div style={{ textAlign: 'left' }}>
          <div style={{ fontSize: 15, fontWeight: 700 }}>{t('anxiety_sos')}</div>
          <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>
            {t('sos_desc')}
          </div>
        </div>
        <svg style={{ marginLeft: 'auto' }} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M9 18l6-6-6-6"/>
        </svg>
      </button>

      {/* Breathing */}
      <div className="card" style={{ overflow: 'hidden' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{
              width: 40, height: 40, borderRadius: 10,
              background: theme.primary + '18',
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20,
            }}>🫁</div>
            <div>
              <p style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-primary)' }}>{t('guided_breathing')}</p>
              <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 1 }}>{t('breathing_desc')}</p>
            </div>
          </div>
          <button className={`btn btn-sm ${showBreathing ? 'btn-ghost' : ''}`}
            style={{ background: showBreathing ? 'transparent' : theme.primary, border: 'none', color: showBreathing ? 'var(--text-secondary)' : '#fff' }}
            onClick={() => setShowBreathing(v => !v)}>
            {showBreathing ? t('close_btn') : t('start')}
          </button>
        </div>
        {showBreathing && (
          <div style={{ marginTop: 16, borderTop: '1px solid var(--border-subtle)', paddingTop: 4 }}>
            <BreathingExercise onClose={() => setShowBreathing(false)} />
          </div>
        )}
      </div>

      {/* Body scan */}
      <div className="card" style={{ overflow: 'hidden' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{
              width: 40, height: 40, borderRadius: 10,
              background: theme.primary + '18',
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20,
            }}>🧘</div>
            <div>
              <p style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-primary)' }}>{t('body_scan')}</p>
              <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 1 }}>{t('body_scan_desc')}</p>
            </div>
          </div>
          <button className="btn btn-sm"
            style={{ background: showBodyScan ? 'transparent' : theme.primary + '18', border: `1px solid ${theme.primary}30`, color: showBodyScan ? 'var(--text-secondary)' : theme.primary }}
            onClick={() => setShowBodyScan(v => !v)}>
            {showBodyScan ? t('close_btn') : t('start')}
          </button>
        </div>
        {showBodyScan && (
          <div style={{ marginTop: 16, borderTop: '1px solid var(--border-subtle)', paddingTop: 4 }}>
            <BodyScan theme={theme} onClose={() => setShowBodyScan(false)} />
          </div>
        )}
      </div>

      {/* Sleep Story */}
      <div className="card" style={{ overflow: 'hidden' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{
              width: 40, height: 40, borderRadius: 10,
              background: 'rgba(129, 140, 248, 0.18)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20,
            }}>🌙</div>
            <div>
              <p style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-primary)' }}>Sleep Story</p>
              <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 1 }}>AI tells you a calming nature story</p>
            </div>
          </div>
          <button className="btn btn-sm"
            style={{ background: theme.primary + '18', border: `1px solid ${theme.primary}30`, color: theme.primary }}
            onClick={() => {
              session.mode = 'sleep'
              notify()
              setShowSleep(true)
            }}>
            {t('start')}
          </button>
        </div>
        {showSleep && (
           <SleepStoryPlayer theme={theme} onClose={() => setShowSleep(false)} />
        )}
      </div>

      {/* Ambient sounds */}
      <AmbientSounds theme={theme} />

      {/* Affirmations */}
      <div className="card">
        <p className="section-label" style={{ marginBottom: 14 }}>{t('affirmations')}</p>
        <AffirmationWall theme={theme} aiAffirmations={affirmations} />
        <button className="btn btn-primary" onClick={() => {
          session.mode = 'affirmations'; notify(); onVoiceNeeded()
        }} style={{
          width: '100%', marginTop: 12, background: theme.primary, border: 'none',
          boxShadow: `0 2px 8px ${theme.glow}`,
        }}>
          {t('gen_affirmations')}
        </button>
      </div>

      {/* Crisis resources */}
      <div className="card">
        <p className="section-label" style={{ marginBottom: 14 }}>{t('support_resources')}</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
          {[
            { label: 'iCall India', detail: '9152987821', href: 'https://icallhelpline.org', emoji: '📞' },
            { label: 'Vandrevala Foundation', detail: '1860-2662-345 · 24/7', href: 'https://www.vandrevalafoundation.com', emoji: '📞' },
            { label: 'Online chat support', detail: 'icallhelpline.org', href: 'https://icallhelpline.org', emoji: '💬' },
          ].map((r, i, arr) => (
            <a key={r.label} href={r.href} target="_blank" rel="noopener noreferrer" style={{
              display: 'flex', alignItems: 'center', gap: 12, padding: '12px 0',
              borderBottom: i < arr.length - 1 ? '1px solid var(--border-subtle)' : 'none',
              textDecoration: 'none', transition: 'opacity var(--transition-fast)',
            }}
              onMouseEnter={e => e.currentTarget.style.opacity = '0.7'}
              onMouseLeave={e => e.currentTarget.style.opacity = '1'}
            >
              <span style={{ fontSize: 18 }}>{r.emoji}</span>
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: 14, color: 'var(--text-primary)', fontWeight: 500 }}>{r.label}</p>
                <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 1 }}>{r.detail}</p>
              </div>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6M15 3h6v6M10 14L21 3"/>
              </svg>
            </a>
          ))}
        </div>
      </div>

    </div>
  )
}
