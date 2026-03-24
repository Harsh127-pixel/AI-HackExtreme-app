import { useState, useRef, useEffect } from 'react'
import { useSession, setWellnessMode, setSleepQuality, setVoiceOrbEnabled, session, notify } from '../../focuscoach/sessionState.js'
import { getTheme } from '../../mindease/theme.js'
import MoodGraph from '../MoodGraph.jsx'
import useStreak from '../../mindease/useStreak.js'
import ProgressInsights from '../ProgressInsights.jsx'
import ExportData from '../ExportData.jsx'
import { t } from '../../mindease/i18n.js'
import { AudioCapture, AudioPlayback, ModelManager, ModelCategory } from '@runanywhere/web'
import { VAD } from '@runanywhere/web-onnx'
import DebriefMode from '../DebriefMode.jsx'

const MOODS = [
  { id: 'okay',       emoji: '😊', label: 'Good',     color: '#34D399' },
  { id: 'stress',     emoji: '😤', label: 'Stressed',  color: '#FBBF24' },
  { id: 'anxiety',    emoji: '😰', label: 'Anxious',   color: '#60A5FA' },
  { id: 'depression', emoji: '😔', label: 'Low',       color: '#A78BFA' },
  { id: 'burnout',    emoji: '🪫',  label: 'Drained',   color: '#F87171' },
]

const SLEEP = [
  { id: 'great',    emoji: '😴', label: 'Great',  score: 4 },
  { id: 'okay',     emoji: '🙂', label: 'Okay',   score: 3 },
  { id: 'poor',     emoji: '😞', label: 'Poor',   score: 2 },
  { id: 'terrible', emoji: '😵', label: 'Awful',  score: 1 },
]

const MOOD_MESSAGES = {
  anxiety:    ["Take it one breath at a time.", "You don't have to face everything at once.", "Slow and steady. You're safe."],
  depression: ["Small steps count. You showed up.", "Being here is enough for now.", "One tiny thing is still something."],
  burnout:    ["Rest is not laziness — it's recovery.", "You can't pour from an empty cup.", "Protecting your energy is strength."],
  stress:     ["Let's slow things down together.", "One thing at a time. Just one.", "You don't have to solve it all today."],
  okay:       ["Ready when you are.", "Let's make today count.", "You're showing up. That matters."],
}

export default function HomeTab({ theme }) {
  const currentSession = useSession()
  const [moodSelected, setMoodSelected] = useState(currentSession.wellnessMode)
  const [sleepSelected, setSleepSelected] = useState(currentSession.sleepQuality)
  const [showData, setShowData] = useState(false)
  const { streak, longestStreak } = useStreak()
  
  // Voice Check-In State
  const [voiceDone, setVoiceDone] = useState(() => localStorage.getItem('mindease_voice_checkin') === new Date().toDateString())
  const [vStreak, setVStreak] = useState(() => parseInt(localStorage.getItem('mindease_voice_streak') || '0'))
  const [showDebriefOverlay, setShowDebriefOverlay] = useState(false)
  const [debriefDone, setDebriefDone] = useState(() => localStorage.getItem('mindease_debrief_date') === new Date().toDateString())
  const [isRecording, setIsRecording] = useState(false)
  const [timeLeft, setTimeLeft] = useState(60)
  const [processing, setProcessing] = useState(false)
  const micRef = useRef(null)
  const timerRef = useRef(null)
  const audioChunksRef = useRef([])

  const startVoiceCheckin = async () => {
    try {
      setProcessing(true)
      const mic = new AudioCapture({ sampleRate: 16000 })
      micRef.current = mic
      audioChunksRef.current = []
      setIsRecording(true)
      setTimeLeft(60)
      setProcessing(false)

      await mic.start((chunk) => {
         audioChunksRef.current.push(...chunk)
      })

      timerRef.current = setInterval(() => {
        setTimeLeft(v => {
          if (v <= 1) { stopVoiceCheckin(); return 0 }
          return v - 1
        })
      }, 1000)
    } catch (e) { console.error(e); setProcessing(false) }
  }

  const stopVoiceCheckin = async () => {
    if (!micRef.current) return
    clearInterval(timerRef.current)
    setIsRecording(false)
    setProcessing(true)
    
    try {
      const mic = micRef.current
      mic.stop()
      
      const { STT } = await import('@runanywhere/web-onnx')
      const result = await STT.transcribe(new Float32Array(audioChunksRef.current), { language: 'en' })
      const text = result.text?.trim()
      
      if (text) {
        const llm = ModelManager.getLoadedModel(ModelCategory.Language)
        const genFunc = llm && (llm.generateText || llm.generate || llm.predict || llm.chat)?.bind(llm)
        if (!genFunc) { setProcessing(false); return }
        const res = await genFunc(`User just did their daily voice check-in and said: "${text}". Respond with one warm sentence reflecting back what you heard, then one short affirmation. Keep it under 2 sentences total.`, { maxTokens: 80 })
        
        const tts = ModelManager.getLoadedModel(ModelCategory.SpeechSynthesis)
        if (tts) {
           const synthFunc = (tts.synthesize || tts.generate || tts.speak)?.bind(tts)
           if (synthFunc) {
              const { audio, sampleRate } = await synthFunc(res)
              const p = new AudioPlayback({ sampleRate })
              await p.play(audio, sampleRate)
              p.dispose()
           }
        }

        // Update Streak
        const today = new Date().toDateString()
        const lastDate = localStorage.getItem('mindease_voice_checkin')
        let newStreak = vStreak
        if (lastDate !== today) {
           const yesterday = new Date(Date.now() - 86400000).toDateString()
           newStreak = lastDate === yesterday ? vStreak + 1 : 1
           localStorage.setItem('mindease_voice_streak', newStreak.toString())
           localStorage.setItem('mindease_voice_checkin', today)
           setVStreak(newStreak)
           setVoiceDone(true)
        }
      }
    } catch (e) { console.error(e) }
    finally { setProcessing(false) }
  }

  const handleMood = (id) => { setMoodSelected(id); setWellnessMode(id) }
  const handleSleep = (id) => { setSleepSelected(id); setSleepQuality(id) }

  const hour = new Date().getHours()
  let greeting = t('greeting_night')
  if (hour >= 5 && hour < 12) greeting = t('greeting_morning')
  else if (hour >= 12 && hour < 17) greeting = t('greeting_afternoon')
  else if (hour >= 17 && hour < 22) greeting = t('greeting_evening')
  const moodMsg = () => {
    const opts = MOOD_MESSAGES[currentSession.wellnessMode] || MOOD_MESSAGES.okay
    return opts[new Date().getDay() % opts.length]
  }

  const isDebriefTime = hour >= 20 && hour <= 23 && !debriefDone

  return (
    <div style={{ padding: '24px 16px 40px', display: 'flex', flexDirection: 'column', gap: 24 }}>
      {showDebriefOverlay && <DebriefMode theme={theme} onClose={() => { setShowDebriefOverlay(false); setDebriefDone(true) }} />}
      
      <style>{`
        .dashboard-grid { 
          display: grid; 
          grid-template-columns: 1fr; 
          gap: 20px; 
        }
        @media (min-width: 1024px) {
          .dashboard-grid { 
            grid-template-columns: repeat(2, 1fr); 
            gap: 24px; 
          }
          .full-width { grid-column: 1 / -1; }
        }
      `}</style>

      {/* Greeting */}
      <div style={{ marginBottom: 4 }} className="full-width">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <h2 style={{ fontSize: 32, fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-1px' }}>
              {greeting} 👋
            </h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: 16, marginTop: 8, lineHeight: 1.6, maxWidth: 600 }}>
              {moodMsg()}
            </p>
          </div>
          
          <div 
            className="glass-card"
            style={{
              width: 280, padding: '20px 24px',
              border: `1.5px solid ${voiceDone ? 'var(--success)40' : theme.primary + '50'}`,
              boxShadow: voiceDone ? '0 8px 32px var(--success)10' : `0 8px 32px ${theme.glow}30`,
              animation: !voiceDone ? 'softGlow 4s infinite ease-in-out' : 'none'
            }}
          >
            <style>{`
              @keyframes softGlow { 0% { box-shadow: 0 0 10px ${theme.primary}20; } 50% { box-shadow: 0 0 25px ${theme.primary}40; } 100% { box-shadow: 0 0 10px ${theme.primary}20; } }
              .ring { transition: stroke-dashoffset 0.3s; transform: rotate(-90deg); transform-origin: 50% 50%; }
            `}</style>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
              <div style={{ fontSize: 20 }}>🎙️</div>
              <div>
                <p style={{ fontSize: 14, fontWeight: 700, margin: 0 }}>Daily Ritual</p>
                <p style={{ fontSize: 11, color: 'var(--text-muted)', margin: 0 }}>{vStreak} day streak</p>
              </div>
            </div>

            {!voiceDone ? (
              isRecording ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ position: 'relative', width: 40, height: 40 }}>
                    <svg width="40" height="40">
                      <circle cx="20" cy="20" r="18" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="3" />
                      <circle className="ring" cx="20" cy="20" r="18" fill="none" stroke={theme.primary} strokeWidth="3"
                        strokeDasharray={2 * Math.PI * 18}
                        strokeDashoffset={(2 * Math.PI * 18) * (1 - timeLeft/60)}
                      />
                    </svg>
                    <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700 }}>
                      {timeLeft}
                    </div>
                  </div>
                  <button onClick={stopVoiceCheckin} className="btn" style={{ padding: '6px 12px', fontSize: 12, background: 'var(--danger)', color: 'white', border: 'none', borderRadius: 10 }}>Stop</button>
                </div>
              ) : (
                <button 
                  onClick={startVoiceCheckin} 
                  disabled={processing}
                  className="btn" 
                  style={{ width: '100%', padding: '10px', fontSize: 13, background: theme.primary, color: 'white', border: 'none', borderRadius: 12, fontWeight: 600 }}
                >
                  {processing ? 'Loading...' : 'Start 60s Check-in'}
                </button>
              )
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--success)' }}>
                <span style={{ fontSize: 16 }}>✓</span>
                <span style={{ fontSize: 13, fontWeight: 600 }}>Completed today</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {isDebriefTime && (
        <div style={{
          background: 'linear-gradient(135deg, #1E1B4B 0%, #312E81 100%)',
          borderRadius: 24, padding: '24px', position: 'relative', overflow: 'hidden',
          border: '1px solid rgba(139, 92, 246, 0.3)', 
          animation: 'debriefGlow 4s infinite ease-in-out',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center'
        }}>
          <style>{`
            @keyframes debriefGlow { 0% { box-shadow: 0 0 10px rgba(139, 92, 246, 0.1); } 50% { box-shadow: 0 0 30px rgba(139, 92, 246, 0.3); } 100% { box-shadow: 0 0 10px rgba(139, 92, 246, 0.1); } }
          `}</style>
          <div>
             <h3 style={{ fontSize: 18, fontWeight: 800, color: 'white', marginBottom: 6 }}>🌙 End of Day Debrief</h3>
             <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.6)', margin: 0 }}>How was your day? 30 seconds, just for you.</p>
          </div>
          <button onClick={() => setShowDebriefOverlay(true)} className="btn" style={{
            background: 'white', color: '#1E1B4B', padding: '10px 24px', borderRadius: 14, fontWeight: 700, border: 'none'
          }}>Start</button>
        </div>
      )}

      <div className="dashboard-grid">

        {/* Streak + Quick stats row */}
        <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: 16 }}>
          <div 
            className="glass-card"
            style={{
              background: `linear-gradient(135deg, ${theme.primary}22, ${theme.accent}15)`,
              border: `1.5px solid ${theme.primary}40`,
              padding: '24px', display: 'flex', alignItems: 'center', gap: 20,
            }}
          >
            <div style={{
              width: 52, height: 52, borderRadius: 16,
              background: theme.primary + '22',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 26, flexShrink: 0,
            }}>🔥</div>
            <div>
              <div style={{ fontSize: 26, fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1 }}>
                {streak}
              </div>
              <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 4 }}>
                {t('streak_days')}
              </div>
            </div>
          </div>

          <div className="glass-card" style={{ padding: '24px', textAlign: 'center', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
            <div style={{ fontSize: 24 }}>🍅</div>
            <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--text-primary)', marginTop: 6 }}>
              {currentSession.pomodoroCount}
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>Sessions</div>
          </div>
        </div>

        {/* Mood selector */}
        <div className="glass-card" style={{ padding: 28 }}>
          <p className="section-label" style={{ marginBottom: 16, fontSize: 15 }}>{t('mood_today')}</p>
          <div style={{ display: 'flex', gap: 10 }}>
            {MOODS.map(m => {
              const active = moodSelected === m.id
              return (
                <button key={m.id} onClick={() => handleMood(m.id)} style={{
                  flex: 1, padding: '14px 6px', borderRadius: 18,
                  border: `2px solid ${active ? m.color : 'transparent'}`,
                  background: active ? m.color + '18' : 'var(--bg-input)',
                  cursor: 'pointer', transition: 'all 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
                  transform: active ? 'scale(1.05)' : 'scale(1)',
                }}>
                  <span style={{ fontSize: 24 }}>{m.emoji}</span>
                  <span style={{ fontSize: 11, color: active ? 'var(--text-primary)' : 'var(--text-muted)', fontWeight: active ? 700 : 500 }}>
                    {m.label}
                  </span>
                </button>
              )
            })}
          </div>
        </div>

        {/* Sleep check-in */}
        <div className="glass-card" style={{ padding: 28 }}>
          <p className="section-label" style={{ marginBottom: 16, fontSize: 15 }}>{t('sleep_quality')}</p>
          <div style={{ display: 'flex', gap: 10 }}>
            {SLEEP.map(s => {
              const active = sleepSelected === s.id
              return (
                <button key={s.id} onClick={() => handleSleep(s.id)} style={{
                  flex: 1, padding: '14px 6px', borderRadius: 18,
                  border: `2px solid ${active ? theme.primary : 'transparent'}`,
                  background: active ? theme.primary + '18' : 'var(--bg-input)',
                  cursor: 'pointer', transition: 'all 0.2s',
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
                  transform: active ? 'scale(1.05)' : 'scale(1)',
                }}>
                  <span style={{ fontSize: 24 }}>{s.emoji}</span>
                  <span style={{ fontSize: 11, color: active ? 'var(--text-primary)' : 'var(--text-muted)', fontWeight: 700 }}>
                    {s.label}
                  </span>
                </button>
              )
            })}
          </div>
        </div>

        {/* This week insights - Moves to another column on desktop if possible */}
        <div className="card" style={{ borderRadius: 24, padding: 24 }}>
          <p className="section-label" style={{ marginBottom: 18, fontSize: 15 }}>📊 {t('this_week')}</p>
          <ProgressInsights theme={theme} />
        </div>

        {/* Mood graph - Full width */}
        <div className="full-width">
          <MoodGraph />
        </div>

        {/* Stats row */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }} className="full-width">
          {[
            { emoji: '📓', value: currentSession.journalEntries.length, label: 'Journals' },
            { emoji: '🙏', value: currentSession.gratitudeEntries.length, label: 'Gratitude' },
            { emoji: '🔄', value: currentSession.reframingHistory.length, label: 'Reframes' },
          ].map(s => (
            <div key={s.label} className="card" style={{ textAlign: 'center', padding: '20px 12px', borderRadius: 24 }}>
              <div style={{ fontSize: 28 }}>{s.emoji}</div>
              <div style={{ fontSize: 28, fontWeight: 800, color: 'var(--text-primary)', marginTop: 8 }}>{s.value}</div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2, fontWeight: 500 }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Data management icon */}
        <div className="card full-width" style={{ borderRadius: 24, padding: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: showData ? 24 : 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <div style={{ width: 44, height: 44, borderRadius: 12, background: 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>⚙️</div>
              <div>
                <p style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>Privacy & Control</p>
                <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 4, margin: 0 }}>Manage your session & AI preferences.</p>
              </div>
            </div>
            <button className="btn btn-ghost" onClick={() => setShowData(v => !v)} style={{ padding: '8px 16px', borderRadius: 10 }}>
              {showData ? 'Hide Settings' : 'Manage Settings'}
            </button>
          </div>
          {showData && (
            <div style={{ marginTop: 24, animation: 'fadeIn 0.4s both' }}>
              <div key="orb-toggle" style={{ 
                display: 'flex', alignItems: 'center', justifyContent: 'space-between', 
                padding: '20px', background: 'rgba(255,255,255,0.03)', borderRadius: 20,
                border: '1px solid var(--border-subtle)', marginBottom: 20
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ fontSize: 22 }}>🎙️</div>
                  <div>
                    <p style={{ fontSize: 14, fontWeight: 700, margin: 0 }}>Voice Assistant Orb</p>
                    <p style={{ fontSize: 11, color: 'var(--text-muted)', margin: 0 }}>Global hands-free navigation & empathy</p>
                  </div>
                </div>
                <button 
                  onClick={() => setVoiceOrbEnabled(!currentSession.voiceOrbEnabled)}
                  style={{
                    padding: '8px 16px', borderRadius: 100, border: 'none',
                    background: currentSession.voiceOrbEnabled ? 'var(--success)' : 'rgba(255,255,255,0.1)',
                    color: currentSession.voiceOrbEnabled ? '#000' : 'white', cursor: 'pointer',
                    fontSize: 12, fontWeight: 800, transition: 'all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)'
                  }}
                >
                  {currentSession.voiceOrbEnabled ? 'ENABLED' : 'DISABLED'}
                </button>
              </div>
              <ExportData theme={theme} />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
