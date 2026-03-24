import { useState, useEffect, useRef } from 'react'
import { t } from '../mindease/i18n.js'
import { 
  ModelManager, ModelCategory, AudioCapture, 
  AudioPlayback, SpeechActivity, EventBus 
} from '@runanywhere/web'
import { VAD } from '@runanywhere/web-onnx'
import { session, notify, setWellnessMode, claimVoice, releaseVoice } from '../focuscoach/sessionState.js'

export default function Onboarding({ onComplete }) {
  const [step, setStep] = useState(0)
  const [voiceActive, setVoiceActive] = useState(false)
  const [listening, setListening] = useState(false)
  
  const micRef = useRef(null)
  const vadUnsubRef = useRef(null)
  const activeRef = useRef(true)

  const voiceId = "onboarding-voice"

  useEffect(() => {
    const unsubVoice = EventBus.shared.on('voice.stop', (evt) => {
      if (evt?.except !== voiceId) {
        micRef.current?.stop()
        vadUnsubRef.current?.()
        setListening(false)
        releaseVoice(voiceId)
      }
    })
    return () => { 
      unsubVoice()
      activeRef.current = false
      micRef.current?.stop()
      vadUnsubRef.current?.()
      releaseVoice(voiceId)
    }
  }, [])

  const STEPS = [
    {
      emoji: '👋',
      title: t('onboarding_title_1'),
      description: t('onboarding_desc_1'),
      cta: t('onboarding_next'),
      speak: "Hi, I'm MindEase — your private AI companion. Everything I do stays on your device. No cloud, no servers, just us. Tap next when you're ready, or just say next."
    },
    {
      emoji: '🔒',
      title: t('onboarding_title_2'),
      description: t('onboarding_desc_2'),
      cta: t('onboarding_next'),
      speak: "I'm built to be incredibly fast and secure because I run entirely on your hardware. No internet required for my voice features once we're set up."
    },
    {
      emoji: '🧘',
      title: t('onboarding_title_3'),
      description: t('onboarding_desc_3'),
      cta: t('onboarding_get_started'),
      speak: "Before we begin — how are you feeling right now? You can tell me in your own words."
    }
  ]

  const speak = async (text) => {
    if (!activeRef.current) return
    const tts = ModelManager.getLoadedModel(ModelCategory.SpeechSynthesis)
    if (!tts) return
    try {
      const { audio, sampleRate } = await tts.synthesize(text)
      const p = new AudioPlayback({ sampleRate })
      await p.play(audio, sampleRate)
      p.dispose()
    } catch {}
  }

  const classifyMood = async (text) => {
    const llm = ModelManager.getLoadedModel(ModelCategory.Language)
    if (!llm) return 'okay'
    const prompt = `Task: Classify mood: okay, stress, anxiety, depression, burnout. User said: "${text}". Token:`
    try {
      const genFunc = (llm.generateText || llm.generate || llm.predict || llm.chat)?.bind(llm)
      const res = await genFunc(prompt, { maxTokens: 10, stop: ['\n'] })
      const clean = res.toLowerCase().trim()
      return ['stress', 'anxiety', 'depression', 'burnout'].find(m => clean.includes(m)) || 'okay'
    } catch { return 'okay' }
  }

  useEffect(() => {
    const current = STEPS[step]
    if (current?.speak) speak(current.speak)
  }, [step])

  const handleNext = () => {
    micRef.current?.stop(); vadUnsubRef.current?.(); setListening(false)
    if (step < STEPS.length - 1) {
      setStep(step + 1)
    } else {
      localStorage.setItem('mindease_onboarded', 'true')
      onComplete()
    }
  }

  const startListening = async () => {
    const stt = ModelManager.getLoadedModel(ModelCategory.SpeechRecognition)
    if (!stt) return
    claimVoice(voiceId)
    setListening(true)
    const mic = new AudioCapture({ sampleRate: 16000 })
    micRef.current = mic
    VAD.reset()
    vadUnsubRef.current = VAD.onSpeechActivity(async (activity) => {
      if (activity === SpeechActivity.Ended) {
        const seg = VAD.popSpeechSegment()
        if (seg && seg.samples.length > 1600) {
          try {
            const { text } = await stt.transcribe(seg.samples)
            const lower = text.toLowerCase()
            if (step < 2) {
              if (lower.includes('next') || lower.includes('continue')) handleNext()
            } else {
              const mood = await classifyMood(lower)
              setWellnessMode(mood)
              handleNext()
            }
          } catch {}
        }
      }
    })
    await mic.start((chunk) => VAD.processSamples(chunk))
  }

  const current = STEPS[step]

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      height: '100dvh', background: 'var(--bg-base)', color: 'var(--text-primary)',
      padding: 24, textAlign: 'center'
    }}>
      <div style={{ maxWidth: 400, width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <div style={{ fontSize: 64, marginBottom: 24, animation: 'slideUp 0.3s ease-out' }} key={step}>
          {current.emoji}
        </div>
        
        <h1 style={{ fontSize: 28, fontWeight: 700, marginBottom: 12, color: 'var(--text-primary)' }}>
          {current.title}
        </h1>
        
        <p style={{ fontSize: 15, color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: 40, minHeight: 72 }}>
          {current.description}
        </p>

        <div style={{ display: 'flex', gap: 8, marginBottom: 40 }}>
          {STEPS.map((_, i) => (
            <div key={i} style={{
              width: i === step ? 24 : 8,
              height: 8,
              borderRadius: 4,
              background: i === step ? 'var(--accent)' : 'var(--border-default)',
              transition: 'all 0.3s ease'
            }} />
          ))}
        </div>

        <button 
          onClick={handleNext} 
          className="btn btn-primary btn-lg" 
          style={{ width: '100%', marginBottom: 12 }}
        >
          {current.cta}
        </button>

        <button 
          onClick={listening ? () => { micRef.current?.stop(); setListening(false) } : startListening}
          className="btn btn-ghost"
          style={{ 
            width: 54, height: 54, borderRadius: '50%', 
            background: listening ? 'rgba(255,85,0,0.1)' : 'transparent',
            border: `1px solid ${listening ? '#FF5500' : 'rgba(255,255,255,0.1)'}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 20, cursor: 'pointer', transition: 'all 0.3s',
            animation: listening ? 'pulseOnboarding 1.5s infinite' : 'none'
          }}
        >
          {listening ? '⏺️' : '🎙️'}
        </button>

        <button 
          onClick={() => { localStorage.setItem('mindease_onboarded', 'true'); onComplete() }} 
          className="btn btn-ghost btn-sm" 
          style={{ marginTop: 20, color: 'var(--text-muted)' }}
        >
          {t('onboarding_skip')}
        </button>

        <style>{`
          @keyframes pulseOnboarding {
            0% { box-shadow: 0 0 0 0 rgba(255, 85, 0, 0.4); }
            70% { box-shadow: 0 0 0 20px rgba(255, 85, 0, 0); }
            100% { box-shadow: 0 0 0 0 rgba(255, 85, 0, 0); }
          }
        `}</style>
      </div>
    </div>
  )
}
