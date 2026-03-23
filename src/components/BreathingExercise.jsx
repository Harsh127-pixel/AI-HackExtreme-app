import { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import { getTheme } from '../mindease/theme.js'
import { session } from '../focuscoach/sessionState.js'
import { t } from '../mindease/i18n.js'
import { 
  ModelCategory, ModelManager, AudioPlayback, 
  AudioCapture, SpeechActivity 
} from '@runanywhere/web'
import { VAD } from '@runanywhere/web-onnx'

export default function BreathingExercise({ onClose }) {
  const theme = getTheme(session.wellnessMode)
  const [selected, setSelected] = useState(null)
  const [running, setRunning] = useState(false)
  const [stepIdx, setStepIdx] = useState(0)
  const [secondsLeft, setSecondsLeft] = useState(0)
  const [cycles, setCycles] = useState(0)
  const [isSpeaking, setIsSpeaking] = useState(false)
  const [isListening, setIsListening] = useState(false)
  
  const timerRef = useRef(null)
  const micRef = useRef(null)
  const vadUnsubRef = useRef(null)

  const PATTERNS = useMemo(() => ({
    box:   { name: t('box_breathing'),  steps: [t('breathe_in'), t('hold'), t('breathe_out'), t('hold')],      durations: [4,4,4,4] },
    relax: { name: t('relaxing_478'), steps: [t('breathe_in'), t('hold'), t('breathe_out')],         durations: [4,7,8]   },
    deep:  { name: t('deep_breath'),    steps: [t('breathe_in_slowly'), t('hold'), t('breathe_out_slowly')], durations: [5,2,7]   },
  }), [])

  const pattern = selected ? PATTERNS[selected] : null

  const speakInstruction = useCallback(async (text, duration) => {
    const tts = ModelManager.getLoadedModel(ModelCategory.SpeechSynthesis)
    if (!tts) return

    setIsSpeaking(true)
    let fullText = text
    if (duration > 2 && text.toLowerCase().includes('breathe')) {
      const counts = Array.from({ length: duration - 1 }, (_, i) => i + 2).join('... ')
      fullText = `${text}... ${counts}`
    }

    try {
      const { audio, sampleRate } = await tts.synthesize(fullText)
      const player = new AudioPlayback({ sampleRate })
      await player.play(audio, sampleRate)
      player.dispose()
    } catch (e) {
      console.error(e)
    } finally {
      setIsSpeaking(false)
    }
  }, [])

  const startListening = useCallback(async () => {
    if (!ModelManager.getLoadedModel(ModelCategory.Audio)) return
    
    setIsListening(true)
    const mic = new AudioCapture({ sampleRate: 16000 })
    micRef.current = mic
    VAD.reset()
    
    vadUnsubRef.current = VAD.onSpeechActivity((activity) => {
      if (activity === SpeechActivity.Ended) {
        const seg = VAD.popSpeechSegment()
        // If they said something, we just assume it was "next/ready" for simplicity 
        // since we are just checking for VAD activity in this minimal flow
        if (seg && seg.samples.length > 4000) {
          stopTimer()
          advanceStep()
        }
      }
    })
    await mic.start((chunk) => VAD.processSamples(chunk))
  }, [])

  const stopListening = useCallback(() => {
    micRef.current?.stop()
    vadUnsubRef.current?.()
    setIsListening(false)
  }, [])

  const advanceStep = useCallback(() => {
    if (!pattern) return
    setStepIdx(si => {
      const next = (si + 1) % pattern.steps.length
      if (next === 0) setCycles(c => c + 1)
      setSecondsLeft(pattern.durations[next])
      return next
    })
  }, [pattern])

  const startTimer = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current)
    timerRef.current = setInterval(() => {
      setSecondsLeft(prev => {
        if (prev <= 1) {
          advanceStep()
          return 0
        }
        return prev - 1
      })
    }, 1000)
  }, [advanceStep])

  const stopTimer = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current)
  }, [])

  useEffect(() => {
    if (!running || !pattern) return
    
    const step = pattern.steps[stepIdx]
    const dur = pattern.durations[stepIdx]
    
    speakInstruction(step, dur)
    startTimer()
    startListening()

    return () => {
      stopTimer()
      stopListening()
    }
  }, [running, selected, stepIdx, pattern, speakInstruction, startTimer, startListening, stopTimer, stopListening])

  const start = (key) => {
    setSelected(key)
    setStepIdx(0)
    setSecondsLeft(PATTERNS[key].durations[0])
    setRunning(true)
    setCycles(0)
  }

  const stop = () => { setRunning(false); stopTimer(); stopListening() }

  const currentStep = pattern?.steps[stepIdx] || ''
  const isBreatheIn = currentStep === t('breathe_in') || currentStep === t('breathe_in_slowly')
  const isBreatheOut = currentStep === t('breathe_out') || currentStep === t('breathe_out_slowly')
  
  // Circle scales up/down
  const scale = isBreatheIn ? 1.5 : isBreatheOut ? 0.8 : 1.1

  if (!selected) {
    return (
      <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 12, alignItems: 'center' }}>
        <div style={{ fontSize: 14, color: theme.textMuted, marginBottom: 4 }}>{t('choose_breathing')}</div>
        {Object.entries(PATTERNS).map(([key, p]) => (
          <button key={key} onClick={() => start(key)} className="card" style={{ cursor: 'pointer', textAlign: 'left', width: '100%', border: `1px solid ${theme.border}` }}>
            <div style={{ fontWeight: 600, color: theme.text }}>{p.name}</div>
            <div style={{ fontSize: 12, color: theme.textMuted, marginTop: 4 }}>
              {p.steps.join(' → ')}
            </div>
          </button>
        ))}
        <button onClick={onClose} style={{ background: 'none', border: 'none', color: theme.textMuted, fontSize: 13, cursor: 'pointer', marginTop: 8 }}>
          {t('cancel')}
        </button>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 32, padding: '32px 24px' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 12, color: theme.textMuted, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 4 }}>{pattern.name}</div>
        <div style={{ fontSize: 14, color: theme.primary }}>Cycle {cycles + 1}</div>
      </div>

      <div style={{ position: 'relative', width: 220, height: 220, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {/* Animated outer ring */}
        <div style={{
          position: 'absolute', inset: 0, borderRadius: '50%',
          border: `2px solid ${theme.primary}20`,
          transform: `scale(${scale * 1.2})`,
          transition: `transform ${pattern.durations[stepIdx]}s linear`,
        }} />
        
        {/* Main breathing orb */}
        <div style={{
          width: 120, height: 120, borderRadius: '50%',
          background: theme.gradient,
          boxShadow: `0 0 50px ${theme.glow}`,
          transform: `scale(${scale})`,
          transition: `transform ${pattern.durations[stepIdx]}s linear`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: 'white', fontWeight: 700, fontSize: 32,
        }}>
          {secondsLeft}
        </div>
      </div>

      <div style={{ textAlign: 'center', minHeight: 60 }}>
        <div style={{ fontSize: 24, color: theme.text, fontWeight: 600, marginBottom: 8 }}>{currentStep}</div>
        <div style={{ fontSize: 13, color: theme.textMuted }}>
          {isSpeaking ? 'AI is guiding...' : isListening ? 'Say "next" to skip' : ''}
        </div>
      </div>

      <div style={{ display: 'flex', gap: 12 }}>
        <button onClick={() => { stop(); setSelected(null) }} className="btn" style={{ background: 'transparent', border: `1px solid ${theme.border}`, color: theme.text }}>
          {t('close_btn')}
        </button>
        <button onClick={advanceStep} className="btn" style={{ background: theme.primary, border: 'none', color: 'white', fontWeight: 600 }}>
          {t('next_btn')}
        </button>
      </div>
    </div>
  )
}
