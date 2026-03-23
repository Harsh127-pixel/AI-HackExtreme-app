import { useState, useEffect } from 'react'
import { initSDK, getAccelerationMode } from './runanywhere.js'
import { useSession, session, notify } from './focuscoach/sessionState.js'
import { getTheme, applyTheme } from './mindease/theme.js'
import MoodCheckIn from './components/MoodCheckIn.jsx'
import CrisisCard from './components/CrisisCard.jsx'
import HomeTab from './components/tabs/HomeTab.jsx'
import BreatheTab from './components/tabs/BreatheTab.jsx'
import ReflectTab from './components/tabs/ReflectTab.jsx'
import FocusTab from './components/tabs/FocusTab.jsx'
import CrisisFollowUp from './components/CrisisFollowUp.jsx'
import { getLang, setLang, LANGUAGES, t } from './mindease/i18n.js'

const TABS = [
  { id: 'home',    label: 'home',    emoji: '🏠' },
  { id: 'breathe', label: 'breathe', emoji: '🫁' },
  { id: 'reflect', label: 'reflect', emoji: '📓' },
  { id: 'focus',   label: 'focus',   emoji: '🎯' },
]

export function App() {
  const [sdkReady, setSdkReady]   = useState(false)
  const [sdkError, setSdkError]   = useState(null)
  const [accel, setAccel]         = useState(null)
  const [moodDone, setMoodDone]   = useState(false)
  const [activeTab, setActiveTab] = useState('home')
  const [showCrisis, setShowCrisis] = useState(false)
  const [showFollowUp, setShowFollowUp] = useState(false)
  const currentSession = useSession()

  // Apply theme whenever wellness mode changes
  useEffect(() => {
    const theme = getTheme(currentSession.wellnessMode)
    applyTheme(theme)
  }, [currentSession.wellnessMode])

  useEffect(() => {
    initSDK()
      .then(() => {
        setSdkReady(true)
        setAccel(getAccelerationMode())
        // Check if crisis was shown yesterday
        try {
          const lastCrisis = localStorage.getItem('mindease_last_crisis')
          if (lastCrisis) {
            const yesterday = new Date(Date.now() - 86400000).toDateString()
            const crisisDate = new Date(parseInt(lastCrisis)).toDateString()
            const today = new Date().toDateString()
            const crisisDay = crisisDate
            if (crisisDay === yesterday || crisisDay === today) {
              setShowFollowUp(true)
            }
          }
        } catch (e) {}
      })
      .catch(err => setSdkError(err instanceof Error ? err.message : String(err)))
  }, [])

  if (sdkError) return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100dvh', background: '#080F1A', color: '#F0F9FF', gap: 16, padding: 24, textAlign: 'center' }}>
      <h2>Something went wrong</h2>
      <p style={{ color: '#FB7185', fontSize: 14 }}>{sdkError}</p>
    </div>
  )

  if (!sdkReady) return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100dvh', background: '#080F1A', color: '#F0F9FF', gap: 16 }}>
      <div className="spinner" />
      <h2 style={{ fontSize: 18, fontWeight: 600 }}>{t('appName')}...</h2>
      <p style={{ color: '#94A3B8', fontSize: 14 }}>{t('tagline')}</p>
    </div>
  )

  if (showFollowUp) return (
    <CrisisFollowUp theme={getTheme(session.wellnessMode)} onDone={() => setShowFollowUp(false)} />
  )

  if (!moodDone && !session.moodCheckedIn) return (
    <MoodCheckIn onComplete={() => setMoodDone(true)} />
  )

  const theme = getTheme(currentSession.wellnessMode)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100dvh', maxWidth: 480, margin: '0 auto', background: theme.bg, color: theme.text, overflow: 'hidden', position: 'relative' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', borderBottom: `1px solid ${theme.border}`, background: theme.bgCard }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 18, fontWeight: 700, color: theme.text }}>🧠 MindEase</span>
          {accel && <span style={{ fontSize: 10, padding: '2px 6px', borderRadius: 999, background: theme.primary + '33', color: theme.primary, fontWeight: 600 }}>{accel === 'webgpu' ? 'WebGPU' : 'CPU'}</span>}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {currentSession.wellnessMode && currentSession.wellnessMode !== 'okay' && (
            <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 999, background: theme.bgCard, border: `1px solid ${theme.border}`, color: theme.textMuted }}>
              {{ anxiety: '😰', depression: '😔', burnout: '🪫', stress: '😤' }[currentSession.wellnessMode]}
              {' '}{currentSession.wellnessMode}
            </span>
          )}
          <button onClick={() => setLang(getLang() === 'en' ? 'hi' : 'en')} style={{
            background: 'none', border: `1px solid ${theme.border}`,
            borderRadius: 8, padding: '4px 8px', cursor: 'pointer',
            fontSize: 16, color: theme.textMuted,
          }}>
            {LANGUAGES[getLang() === 'en' ? 'hi' : 'en'].flag}
          </button>
        </div>
      </div>

      {/* Crisis card if active */}
      {showCrisis && (
        <div style={{ padding: '0 0 8px' }}>
          <CrisisCard onDismiss={() => setShowCrisis(false)} />
        </div>
      )}

      {/* Tab content */}
      <div style={{ flex: 1, overflowY: 'auto' }}>
        {activeTab === 'home'    && <HomeTab    theme={theme} />}
        {activeTab === 'breathe' && <BreatheTab theme={theme} onVoiceNeeded={() => setActiveTab('focus')} />}
        {activeTab === 'reflect' && <ReflectTab theme={theme} onVoiceNeeded={() => setActiveTab('focus')} />}
        {activeTab === 'focus'   && <FocusTab   theme={theme} onCrisis={() => setShowCrisis(true)} />}
      </div>

      {/* Bottom tab bar */}
      <div style={{ display: 'flex', borderTop: `1px solid ${theme.border}`, background: theme.bgCard }}>
        {TABS.map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)} style={{
            flex: 1, padding: '10px 4px 12px', border: 'none', cursor: 'pointer',
            background: 'transparent',
            borderTop: activeTab === tab.id ? `2px solid ${theme.primary}` : '2px solid transparent',
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3,
            transition: 'all 0.15s',
          }}>
            <span style={{ fontSize: 18 }}>{tab.emoji}</span>
            <span style={{ fontSize: 10, color: activeTab === tab.id ? theme.primary : theme.textMuted, fontWeight: activeTab === tab.id ? 600 : 400 }}>
              {t(tab.label)}
            </span>
          </button>
        ))}
      </div>

    </div>
  )
}
