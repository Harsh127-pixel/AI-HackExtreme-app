import { useState, useEffect, useRef } from 'react'
import { initSDK, getAccelerationMode } from './runanywhere.js'
import { useSession, session, notify, setWellnessMode } from './focuscoach/sessionState.js'
import usePomodoro from './focuscoach/usePomodoro.js'
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
import GlobalVoiceOrb from './components/GlobalVoiceOrb.jsx'
import SOSMode from './components/SOSMode.jsx'

const TABS = [
  { id: 'home',    icon: HomeIcon },
  { id: 'breathe', icon: BreatheIcon },
  { id: 'reflect', icon: ReflectIcon },
  { id: 'focus',   icon: FocusIcon },
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
  const [showSOS, setShowSOS] = useState(false)
  const [showFollowUp, setShowFollowUp] = useState(false)
  const [loadProgress, setLoadProgress] = useState(0)
  const currentSession = useSession()
  const pomodoro = usePomodoro()
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

  const handleCrisis = (text) => {
    console.log('[App] Crisis handled:', text)
    localStorage.setItem('mindease_last_crisis', Date.now().toString())
    setWellnessMode('anxiety')
    setShowSOS(true)
    setShowCrisis(true)
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
          {t('appName')}
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: 14, marginTop: 6 }}>
          {t('tagline')}
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
      display: 'flex', 
      flexDirection: 'row', 
      height: '100dvh', 
      background: 'var(--bg-base)',
      overflow: 'hidden',
      position: 'relative',
    }}>
      <style>{`
        .sidebar { display: flex; flex-direction: column; width: 280px; background: rgba(8,12,20,0.95); border-right: 1px solid var(--border-subtle); padding: 32px 24px; z-index: 50; }
        .content-container { flex: 1; display: flex; flex-direction: column; position: relative; overflow: hidden; background: var(--bg-base); }
        .main-content { flex: 1; overflow-y: auto; width: 100%; margin: 0 auto; max-width: 1000px; padding: 40px; }
        .mobile-only { display: none; }

        @media (max-width: 1023px) {
          .sidebar { display: none; }
          .mobile-only { display: flex; }
          .main-content { padding: 0; max-width: 480px; }
        }
      `}</style>
      
      {showSOS && <SOSMode onClose={() => setShowSOS(false)} />}

      {/* Desktop Sidebar Navigation */}
      <aside className="sidebar">
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 48 }}>
          <div style={{
            width: 40, height: 40, borderRadius: 12,
            background: `linear-gradient(135deg, ${theme.primary}, ${theme.accent})`,
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20
          }}>🧠</div>
          <span style={{ fontSize: 22, fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.5px' }}>
            {t('appName')}
          </span>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, flex: 1 }}>
          {TABS.map(({ id, icon: Icon }) => {
            const active = activeTab === id
            return (
              <button 
                key={id} 
                onClick={() => handleTabChange(id)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 14,
                  padding: '12px 18px', borderRadius: 14,
                  background: active ? `${theme.primary}15` : 'transparent',
                  color: active ? theme.primary : 'var(--text-muted)',
                  border: 'none', cursor: 'pointer', transition: 'all 0.2s',
                  fontWeight: active ? 600 : 500, fontSize: 16
                }}
              >
                <Icon active={active} />
                {t(id)}
              </button>
            )
          })}
        </div>

        <div style={{ marginTop: 'auto', padding: '20px', background: 'rgba(255,255,255,0.03)', borderRadius: 20 }}>
           <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
             <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>{t('language')}</span>
             <button onClick={() => setLang(getLang() === 'en' ? 'hi' : 'en')} className="btn btn-ghost" style={{ fontSize: 18 }}>
               {LANGUAGES[getLang() === 'en' ? 'hi' : 'en'].flag}
             </button>
           </div>
        </div>
      </aside>

      <div className="content-container">
        {/* Mobile Header */}
        <header className="mobile-only" style={{
          alignItems: 'center', justifyContent: 'space-between',
          padding: '14px 20px', background: 'rgba(8,12,20,0.85)', backdropFilter: 'blur(16px)',
          borderBottom: '1px solid var(--border-subtle)', zIndex: 10, width: '100%'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 17, fontWeight: 700, color: 'var(--text-primary)' }}>{t('appName')}</span>
          </div>
          <button onClick={() => setLang(getLang() === 'en' ? 'hi' : 'en')} className="btn btn-ghost" style={{ fontSize: 18 }}>
             {LANGUAGES[getLang() === 'en' ? 'hi' : 'en'].flag}
          </button>
        </header>

        {showCrisis && (
          <div style={{ flexShrink: 0, animation: 'slideUp 0.3s both', padding: '10px 0' }}>
            <CrisisCard onDismiss={() => setShowCrisis(false)} />
          </div>
        )}

        <main className="main-content">
          <div key={activeTab} style={{ animation: 'fadeIn 0.4s both' }}>
            {activeTab === 'home'    && <HomeTab    theme={theme} />}
            {activeTab === 'breathe' && <BreatheTab theme={theme} onVoiceNeeded={() => handleTabChange('focus')} />}
            {activeTab === 'reflect' && <ReflectTab theme={theme} onVoiceNeeded={() => handleTabChange('focus')} />}
            {activeTab === 'focus'   && <FocusTab   theme={theme} onCrisis={handleCrisis} />}
          </div>
        </main>

        <GlobalVoiceOrb 
          theme={theme} 
          activeTab={activeTab} 
          onTabChange={handleTabChange}
          onCrisis={handleCrisis}
        />

        {/* Mobile Navigation */}
        <nav className="mobile-only" style={{
          background: 'rgba(8,12,20,0.92)', backdropFilter: 'blur(16px)',
          borderTop: '1px solid var(--border-subtle)', paddingBottom: 'env(safe-area-inset-bottom, 0px)',
          width: '100%',
        }}>
          {TABS.map(({ id, icon: Icon }) => {
            const active = activeTab === id
            return (
              <button key={id} onClick={() => handleTabChange(id)} style={{
                flex: 1, padding: '12px 4px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
                background: 'transparent', border: 'none', color: active ? theme.primary : 'var(--text-muted)',
              }}>
                <Icon active={active} />
                <span style={{ fontSize: 10, fontWeight: active ? 600 : 400 }}>{t(id)}</span>
              </button>
            )
          })}
        </nav>
      </div>
    </div>
  )
}
