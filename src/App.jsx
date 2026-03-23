import { useState, useEffect, useRef } from 'react'
import { initSDK, getAccelerationMode } from './runanywhere.js'
import { useSession, session, notify } from './focuscoach/sessionState.js'
import { getTheme, applyTheme } from './mindease/theme.js'
import { getLang, setLang, LANGUAGES, t } from './mindease/i18n.js'
import MoodCheckIn from './components/MoodCheckIn.jsx'
import Onboarding from './components/Onboarding.jsx'
import CrisisCard from './components/CrisisCard.jsx'
import CrisisFollowUp from './components/CrisisFollowUp.jsx'
import HomeTab from './components/tabs/HomeTab.jsx'
import BreatheTab from './components/tabs/BreatheTab.jsx'
import ReflectTab from './components/tabs/ReflectTab.jsx'
import FocusTab from './components/tabs/FocusTab.jsx'

const TABS = [
  { id: 'home',    label: 'Home',    icon: HomeIcon },
  { id: 'breathe', label: 'Breathe', icon: BreatheIcon },
  { id: 'reflect', label: 'Reflect', icon: ReflectIcon },
  { id: 'focus',   label: 'Focus',   icon: FocusIcon },
]

function HomeIcon({ active }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2.2 : 1.8} strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/>
      <polyline points="9,22 9,12 15,12 15,22"/>
    </svg>
  )
}
function BreatheIcon({ active }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2.2 : 1.8} strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22a10 10 0 100-20 10 10 0 000 20z"/>
      <path d="M12 8v8M8 12h8"/>
    </svg>
  )
}
function ReflectIcon({ active }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2.2 : 1.8} strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>
      <polyline points="14,2 14,8 20,8"/>
      <line x1="16" y1="13" x2="8" y2="13"/>
      <line x1="16" y1="17" x2="8" y2="17"/>
      <polyline points="10,9 9,9 8,9"/>
    </svg>
  )
}
function FocusIcon({ active }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2.2 : 1.8} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"/>
      <circle cx="12" cy="12" r="6"/>
      <circle cx="12" cy="12" r="2"/>
    </svg>
  )
}

export function App() {
  const [sdkReady, setSdkReady] = useState(false)
  const [sdkError, setSdkError] = useState(null)
  const [accel, setAccel] = useState(null)
  const [moodDone, setMoodDone] = useState(false)
  const [onboarded, setOnboarded] = useState(() => !!localStorage.getItem('mindease_onboarded'))
  const [activeTab, setActiveTab] = useState('home')
  const [showCrisis, setShowCrisis] = useState(false)
  const [showFollowUp, setShowFollowUp] = useState(false)
  const [loadProgress, setLoadProgress] = useState(0)
  const currentSession = useSession()
  const prevTab = useRef('home')

  useEffect(() => {
    const theme = getTheme(currentSession.wellnessMode)
    applyTheme(theme)
  }, [currentSession.wellnessMode])

  useEffect(() => {
    let prog = 0
    const interval = setInterval(() => {
      prog = Math.min(prog + Math.random() * 15, 85)
      setLoadProgress(prog)
    }, 400)

    initSDK()
      .then(() => {
        clearInterval(interval)
        setLoadProgress(100)
        setTimeout(() => {
          setSdkReady(true)
          setAccel(getAccelerationMode())
        }, 300)
        try {
          const lastCrisis = localStorage.getItem('mindease_last_crisis')
          if (lastCrisis) {
            const yesterday = new Date(Date.now() - 86400000).toDateString()
            const crisisDate = new Date(parseInt(lastCrisis)).toDateString()
            const today = new Date().toDateString()
            if (crisisDate === yesterday || crisisDate === today) setShowFollowUp(true)
          }
        } catch (e) {}
      })
      .catch(err => {
        clearInterval(interval)
        setSdkError(err instanceof Error ? err.message : String(err))
      })

    return () => clearInterval(interval)
  }, [])

  const handleTabChange = (id) => {
    prevTab.current = activeTab
    setActiveTab(id)
  }

  if (sdkError) return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      justifyContent: 'center', height: '100dvh', background: 'var(--bg-base)',
      gap: 20, padding: 32, textAlign: 'center',
    }}>
      <div style={{ fontSize: 40 }}>⚠️</div>
      <div>
        <h2 style={{ color: 'var(--text-primary)', fontSize: 20, fontWeight: 600, marginBottom: 8 }}>
          Failed to initialize
        </h2>
        <p style={{ color: 'var(--danger)', fontSize: 14, maxWidth: 320, lineHeight: 1.6 }}>{sdkError}</p>
      </div>
      <button className="btn btn-primary" onClick={() => window.location.reload()}>
        Try again
      </button>
    </div>
  )

  if (!sdkReady) return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      justifyContent: 'center', height: '100dvh', background: 'var(--bg-base)',
      gap: 32,
    }}>
      <div style={{ textAlign: 'center', animation: 'fadeIn 0.6s both' }}>
        <div style={{ fontSize: 52, marginBottom: 16 }}>🧠</div>
        <h1 style={{ fontSize: 26, fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.5px' }}>
          MindEase
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: 14, marginTop: 6 }}>
          Your private AI companion
        </p>
      </div>
      <div style={{ width: 220, animation: 'fadeIn 0.6s 0.2s both', opacity: 0 }}>
        <div className="progress-track">
          <div className="progress-fill" style={{ width: `${loadProgress}%` }} />
        </div>
        <p style={{ color: 'var(--text-muted)', fontSize: 12, textAlign: 'center', marginTop: 10 }}>
          {loadProgress < 40 ? 'Starting AI engine...' : loadProgress < 75 ? 'Loading voice models...' : 'Almost ready...'}
        </p>
      </div>
    </div>
  )

  if (showFollowUp) return (
    <CrisisFollowUp theme={getTheme(session.wellnessMode)} onDone={() => setShowFollowUp(false)} />
  )

  if (!onboarded) return (
    <Onboarding onComplete={() => setOnboarded(true)} />
  )

  if (!moodDone && !session.moodCheckedIn) return (
    <MoodCheckIn onComplete={() => setMoodDone(true)} />
  )

  const theme = getTheme(currentSession.wellnessMode)

  return (
    <div style={{
      display: 'flex', flexDirection: 'column',
      height: '100dvh', maxWidth: 480, margin: '0 auto',
      background: 'var(--bg-base)', overflow: 'hidden',
      position: 'relative',
    }}>

      {/* Header */}
      <header style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '14px 20px',
        background: 'rgba(8,12,20,0.85)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        borderBottom: '1px solid var(--border-subtle)',
        zIndex: 10, flexShrink: 0,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 32, height: 32, borderRadius: 10,
            background: `linear-gradient(135deg, ${theme.primary}, ${theme.accent})`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 16, boxShadow: `0 2px 8px ${theme.glow}`,
          }}>
            🧠
          </div>
          <span style={{ fontSize: 17, fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.3px' }}>
            MindEase
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {accel && (
            <span className="badge badge-accent" style={{ fontSize: 10 }}>
              {accel === 'webgpu' ? '⚡ WebGPU' : '🔲 CPU'}
            </span>
          )}
          {currentSession.wellnessMode && currentSession.wellnessMode !== 'okay' && (
            <span className="badge" style={{
              background: theme.primary + '18',
              color: theme.primary,
              border: `1px solid ${theme.primary}30`,
              fontSize: 10,
            }}>
              {{ anxiety: '😰', depression: '😔', burnout: '🪫', stress: '😤' }[currentSession.wellnessMode]}
              {' '}{currentSession.wellnessMode}
            </span>
          )}
          <button
            onClick={() => setLang(getLang() === 'en' ? 'hi' : 'en')}
            className="btn btn-ghost btn-icon"
            style={{ width: 32, height: 32, padding: 0, fontSize: 16 }}
            title="Switch language"
          >
            {LANGUAGES[getLang() === 'en' ? 'hi' : 'en'].flag}
          </button>
        </div>
      </header>

      {/* Crisis banner */}
      {showCrisis && (
        <div style={{ flexShrink: 0, animation: 'slideUp 0.3s both' }}>
          <CrisisCard onDismiss={() => setShowCrisis(false)} />
        </div>
      )}

      {/* Scrollable tab content */}
      <main style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', WebkitOverflowScrolling: 'touch' }}>
        <div key={activeTab} style={{ animation: 'fadeIn 0.2s both' }}>
          {activeTab === 'home'    && <HomeTab    theme={theme} />}
          {activeTab === 'breathe' && <BreatheTab theme={theme} onVoiceNeeded={() => handleTabChange('focus')} />}
          {activeTab === 'reflect' && <ReflectTab theme={theme} onVoiceNeeded={() => handleTabChange('focus')} />}
          {activeTab === 'focus'   && <FocusTab   theme={theme} onCrisis={() => setShowCrisis(true)} />}
        </div>
      </main>

      {/* Bottom nav */}
      <nav style={{
        display: 'flex',
        background: 'rgba(8,12,20,0.92)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        borderTop: '1px solid var(--border-subtle)',
        paddingBottom: 'env(safe-area-inset-bottom, 0px)',
        flexShrink: 0, zIndex: 10,
      }}>
        {TABS.map(({ id, label, icon: Icon }) => {
          const active = activeTab === id
          return (
            <button key={id} onClick={() => handleTabChange(id)} style={{
              flex: 1, padding: '10px 4px 11px',
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
              background: 'transparent', border: 'none', cursor: 'pointer',
              color: active ? theme.primary : 'var(--text-muted)',
              transition: 'color var(--transition-fast)',
              position: 'relative',
            }}>
              {active && (
                <span style={{
                  position: 'absolute', top: 0, left: '50%',
                  transform: 'translateX(-50%)',
                  width: 24, height: 2, borderRadius: '0 0 4px 4px',
                  background: theme.primary,
                  boxShadow: `0 2px 8px ${theme.glow}`,
                }} />
              )}
              <Icon active={active} />
              <span style={{ fontSize: 10, fontWeight: active ? 600 : 400, letterSpacing: '0.2px' }}>
                {label}
              </span>
            </button>
          )
        })}
      </nav>
    </div>
  )
}
