import { useState, useRef, useCallback, useEffect } from 'react'
import { setWellnessMode } from '../focuscoach/sessionState.js'
import { 
  ModelCategory, ModelManager, AudioCapture, 
  SpeechActivity, EventBus 
} from '@runanywhere/web'
import { VAD } from '@runanywhere/web-onnx'
import { t } from '../mindease/i18n.js'

const MOODS = [
  { id: 'okay',       emoji: '😊', label: 'Feeling okay',      color: '#22C55E', desc: "Ready to focus" },
  { id: 'stress',     emoji: '😤', label: 'Stressed',           color: '#F59E0B', desc: "A lot on my mind" },
  { id: 'anxiety',    emoji: '😰', label: 'Anxious',            color: '#3B82F6', desc: "Feeling nervous or on edge" },
  { id: 'depression', emoji: '😔', label: 'Low mood',           color: '#8B5CF6', desc: "Feeling down or flat" },
  { id: 'burnout',    emoji: '🪫',  label: 'Burned out',         color: '#EF4444', desc: "Exhausted, running on empty" },
]

export default function MoodCheckIn({ onComplete }) {
  const [selected, setSelected] = useState(null)
  const [hovered, setHovered] = useState(null)
  const [voiceState, setVoiceState] = useState('idle') // idle, listening, processing
  const [audioLevel, setAudioLevel] = useState(0)
  const [transcript, setTranscript] = useState('')
  const [loadingModels, setLoadingModels] = useState(false)
  
  const micRef = useRef(null)
  const vadUnsubRef = useRef(null)

  const ensureModels = async () => {
    setLoadingModels(true)
    const categories = [ModelCategory.Audio, ModelCategory.SpeechRecognition, ModelCategory.Language]
    for (const cat of categories) {
      if (!ModelManager.getLoadedModel(cat)) {
        const models = ModelManager.getModels().filter(m => m.modality === cat && m.status === 'downloaded')
        if (models.length > 0) {
          await ModelManager.loadModel(models[0].id, { coexist: true })
        }
      }
    }
    setLoadingModels(false)
    return categories.every(cat => !!ModelManager.getLoadedModel(cat))
  }

  const classifyMood = async (text) => {
    const llm = ModelManager.getLoadedModel(ModelCategory.Language)
    if (!llm) return 'okay'
    
    const prompt = `Task: Classify the user's mood into exactly one of these tokens: okay, stress, anxiety, depression, burnout.
User said: "${text}"
Rules:
- If they seem happy or fine, return "okay".
- If they are worried or nervous, return "anxiety".
- If they have too much work or pressure, return "stress".
- If they are very tired or exhausted, return "burnout".
- If they are sad or low, return "depression".
Return ONLY the token, nothing else.
Token:`

    try {
      const result = await llm.generateText(prompt, { maxTokens: 10, stop: ['\n'] })
      const clean = result.toLowerCase().trim().replace(/[^a-z]/g, '')
      const match = MOODS.find(m => clean.includes(m.id))
      return match ? match.id : 'okay'
    } catch (e) {
      return 'okay'
    }
  }

  const processSpeech = useCallback(async (audioData) => {
    micRef.current?.stop(); vadUnsubRef.current?.()
    setVoiceState('processing')
    
    try {
      const stt = ModelManager.getLoadedModel(ModelCategory.SpeechRecognition)
      if (!stt) throw new Error('STT not loaded')
      
      const { text } = await stt.transcribe(audioData)
      setTranscript(text)
      
      if (text.trim()) {
        const mood = await classifyMood(text)
        setSelected(mood)
        // Auto-confirm after a short delay if mood was detected via voice
        setTimeout(() => {
          setWellnessMode(mood)
          onComplete()
        }, 1500)
      } else {
        setVoiceState('idle')
      }
    } catch (err) {
      console.error(err)
      setVoiceState('idle')
    }
  }, [onComplete])

  const startListening = async () => {
    const ready = await ensureModels()
    if (!ready) {
      alert('Models not ready. Using manual selection.')
      return
    }

    setVoiceState('listening')
    setTranscript('')
    const mic = new AudioCapture({ sampleRate: 16000 })
    micRef.current = mic
    VAD.reset()
    
    vadUnsubRef.current = VAD.onSpeechActivity((activity) => {
      if (activity === SpeechActivity.Ended) {
        const seg = VAD.popSpeechSegment()
        if (seg && seg.samples.length > 1600) processSpeech(seg.samples)
        else setVoiceState('idle')
      }
    })

    await mic.start((chunk) => VAD.processSamples(chunk), (level) => setAudioLevel(level))
  }

  const handleConfirm = () => {
    if (!selected) return
    setWellnessMode(selected)
    onComplete()
  }

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      height: '100dvh', background: 'var(--bg-base)', color: '#F1F5F9',
      padding: '40px 24px', gap: 24, maxWidth: 480, margin: '0 auto',
      overflowY: 'auto'
    }}>
      <div style={{ textAlign: 'center', marginBottom: 12 }}>
        <div style={{ fontSize: 40, marginBottom: 16 }}>🧠</div>
        <h1 style={{ fontSize: 28, letterSpacing: '-0.5px', fontWeight: 700, marginBottom: 12 }}>
          {voiceState === 'idle' ? "How are you feeling today?" : "I'm listening..."}
        </h1>
        <p style={{ color: '#94A3B8', fontSize: 14, lineHeight: 1.6, maxWidth: 320, margin: '0 auto' }}>
          {voiceState === 'idle' ? "Tell me in your own words, or select a mood below." : "Share whatever is on your mind."}
        </p>
      </div>

      {/* Voice Orb Section */}
      <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
        <button 
          onClick={voiceState === 'listening' ? () => { micRef.current?.stop(); setVoiceState('idle') } : startListening}
          disabled={loadingModels || voiceState === 'processing'}
          style={{
            width: 100, height: 100, borderRadius: '50%',
            background: voiceState === 'processing' ? '#F59E0B' : voiceState === 'listening' ? '#FF5500' : 'rgba(255, 85, 0, 0.1)',
            border: `2px solid ${voiceState === 'idle' ? '#FF550040' : 'transparent'}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', outline: 'none', transition: 'all 0.3s',
            boxShadow: voiceState !== 'idle' ? `0 0 30px ${voiceState === 'processing' ? '#F59E0B60' : '#FF550060'}` : 'none',
            animation: voiceState === 'listening' ? 'moodPulse 1.5s infinite ease-in-out' : 'none'
          }}
        >
          <span style={{ fontSize: 32 }}>{voiceState === 'processing' ? '⚙️' : '🎙️'}</span>
        </button>
        
        {transcript && (
          <div style={{ 
            background: 'rgba(255,255,255,0.05)', padding: '12px 16px', borderRadius: 16,
            fontSize: 14, fontStyle: 'italic', color: '#CBD5E1', textAlign: 'center',
            maxWidth: 300, animation: 'fadeIn 0.3s both'
          }}>
            "{transcript}"
          </div>
        )}

        {loadingModels && <div style={{ fontSize: 12, color: '#F59E0B' }}>Initializing voice engine...</div>}
      </div>

      {/* Fallback Buttons */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, width: '100%', marginTop: 20 }}>
        <div style={{ fontSize: 12, color: '#475569', textAlign: 'center', marginBottom: 8, letterSpacing: 1, textTransform: 'uppercase' }}>
          Manual Selection
        </div>
        {MOODS.map(mood => (
          <button
            key={mood.id}
            onClick={() => setSelected(mood.id)}
            onMouseEnter={() => setHovered(mood.id)}
            onMouseLeave={() => setHovered(null)}
            style={{
              display: 'flex', alignItems: 'center', gap: 14,
              padding: '12px 16px', borderRadius: 12, border: 'none', cursor: 'pointer',
              background: selected === mood.id
                ? mood.color + '22'
                : hovered === mood.id ? '#1E293B' : '#1E293B',
              outline: selected === mood.id ? `2px solid ${mood.color}` : '2px solid transparent',
              transition: 'all 0.15s', textAlign: 'left', width: '100%',
            }}
          >
            <span style={{ fontSize: 24 }}>{mood.emoji}</span>
            <div style={{ flex: 1 }}>
              <div style={{ color: '#F1F5F9', fontSize: 14, fontWeight: 500 }}>{mood.label}</div>
            </div>
            {selected === mood.id && (
              <div style={{ width: 18, height: 18, borderRadius: '50%', background: mood.color, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span style={{ color: 'white', fontSize: 10 }}>✓</span>
              </div>
            )}
          </button>
        ))}
      </div>

      <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 12 }}>
        <button
          onClick={handleConfirm}
          disabled={!selected || voiceState !== 'idle'}
          style={{
            width: '100%', padding: '14px 0', borderRadius: 12, border: 'none', 
            cursor: selected ? 'pointer' : 'not-allowed',
            background: selected ? '#FF5500' : '#334155',
            color: selected ? 'white' : '#94A3B8',
            fontSize: 16, fontWeight: 700, transition: 'all 0.2s',
            boxShadow: selected ? '0 4px 12px rgba(255, 85, 0, 0.3)' : 'none'
          }}
        >
          {selected ? t('start_session') : "Select or speak to start"}
        </button>

        <button
          onClick={() => { setWellnessMode('okay'); onComplete() }}
          style={{ background: 'none', border: 'none', color: '#475569', fontSize: 13, cursor: 'pointer', padding: '8px' }}
        >
          Skip for now
        </button>
      </div>

      <style>{`
        @keyframes moodPulse {
          0% { transform: scale(1); box-shadow: 0 0 0 0 rgba(255, 85, 0, 0.4); }
          50% { transform: scale(1.05); box-shadow: 0 0 0 20px rgba(255, 85, 0, 0); }
          100% { transform: scale(1); box-shadow: 0 0 0 0 rgba(255, 85, 0, 0); }
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  )
}
