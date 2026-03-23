import { useState, useRef, useCallback, useEffect } from 'react'
import { session, notify, setSteps } from '../focuscoach/sessionState.js'
import buildSystemPrompt from '../focuscoach/systemPrompt.js'
import usePomodoro from '../focuscoach/usePomodoro.js'
import {
  VoicePipeline, ModelCategory, ModelManager,
  AudioCapture, AudioPlayback, SpeechActivity, EventBus
} from '@runanywhere/web'
import { VAD } from '@runanywhere/web-onnx'
import { t } from '../mindease/i18n.js'

function parseSteps(text) {
  return text.split('\n').filter(l => /^\d+[\.\)]\s/.test(l.trim())).map((l, i) => ({
    id: Date.now() + i, text: l.replace(/^\d+[\.\)]\s+/, '').trim(), done: false,
  }))
}

export default function GlobalVoiceOrb({ theme, activeTab, onCrisis, onTabChange }) {
  const [voiceState, setVoiceState] = useState('idle') // idle, listening, processing, speaking
  const [audioLevel, setAudioLevel] = useState(0)
  const [loadingModels, setLoadingModels] = useState(false)
  const [downloadProgress, setDownloadProgress] = useState(0)
  const [transcript, setTranscript] = useState('')
  const [response, setResponse] = useState('')
  const [history, setHistory] = useState([])
  const [showPanel, setShowPanel] = useState(false)

  const pomodoro = usePomodoro()
  const micRef = useRef(null)
  const pipelineRef = useRef(null)
  const vadUnsubRef = useRef(null)
  const analyserRef = useRef(null)
  const rafRef = useRef(null)

  // Haptic Feedback helper
  const triggerHaptic = (pattern = 50) => {
    if ('vibrate' in navigator) navigator.vibrate(pattern)
  }

  const ensureModels = async () => {
    const categories = [
      ModelCategory.Audio, ModelCategory.SpeechRecognition, 
      ModelCategory.Language, ModelCategory.SpeechSynthesis 
    ]
    setLoadingModels(true); setDownloadProgress(0)
    try {
      for (const cat of categories) {
        if (!ModelManager.getLoadedModel(cat)) {
          const models = ModelManager.getModels().filter(m => m.modality === cat)
          if (models.length > 0) {
            const model = models[0]
            if (model.status !== 'downloaded' && model.status !== 'loaded') {
                const unsub = EventBus.shared.on('model.downloadProgress', evt => {
                  if (evt.modelId === model.id) setDownloadProgress(evt.progress ?? 0)
                })
                await ModelManager.downloadModel(model.id); unsub()
            }
            await ModelManager.loadModel(model.id, { coexist: true })
          }
        }
      }
    } catch (e) {
      setLoadingModels(false); return false
    }
    setLoadingModels(false); return true
  }

  const speakResponse = useCallback(async (text) => {
    const tts = ModelManager.getLoadedModel(ModelCategory.SpeechSynthesis)
    if (!tts) return
    setVoiceState('speaking')
    setResponse(text)
    setShowPanel(true)
    try {
      const { audio, sampleRate } = await tts.synthesize(text)
      const p = new AudioPlayback({ sampleRate })
      await p.play(audio, sampleRate)
      p.dispose()
    } catch (e) { console.error(e) } 
    finally { setVoiceState('idle') }
  }, [])

  const processSpeech = useCallback(async (audioData) => {
    setVoiceState('processing')
    try {
      const { STT } = await import('@runanywhere/web-onnx')
      const result = await STT.transcribe(new Float32Array(audioData), { language: 'en' })
      let text = result.text?.trim()?.toLowerCase() || ''
      if (!text) { setVoiceState('idle'); return }

      setTranscript(text)
      setShowPanel(true)

      // Navigation logic
      const NAV_MAP = {
        home: { keywords: [/home/, /dashboard/], msg: "Opening dashboard." },
        breathe: { keywords: [/breath/], msg: "Let's breathe." },
        reflect: { keywords: [/reflect/, /journal/], msg: "Opening journal." },
        focus: { keywords: [/focus/], msg: "Starting focus." },
      }
      for (const [id, data] of Object.entries(NAV_MAP)) {
        if (data.keywords.some(k => k.test(text))) {
          onTabChange(id); await speakResponse(data.msg); return
        }
      }

      const tMode = { home: 'idle', breathe: 'breathing', reflect: 'journal', focus: 'focus' }[activeTab] || session.mode
      const prompt = buildSystemPrompt({ ...session, mode: tMode })
      const llm = ModelManager.getLoadedModel(ModelCategory.Language)
      const res = await llm.generateText(`${prompt}\n\nUser: ${text}\nResponse:`, { maxTokens: 100, stop: ['User:', '\n\n'] })
      
      pomodoro.handleVoiceCommand(text)
      const steps = parseSteps(res)
      if (steps.length >= 2) setSteps(steps)
      const cleanRes = res.replace('CRISIS_DETECTED:', '').trim()
      if (res.includes('CRISIS_DETECTED')) onCrisis && onCrisis(cleanRes)

      await speakResponse(cleanRes)
      setHistory(h => [{ q: text, a: res }, ...h].slice(0, 5))
    } catch (err) { setVoiceState('idle') }
  }, [activeTab, pomodoro, onCrisis, onTabChange, speakResponse])

  const startListening = async () => {
    const ready = await ensureModels()
    if (!ready) return
    
    triggerHaptic(60)
    setVoiceState('listening')
    setTranscript(''); setResponse('')
    
    const mic = new AudioCapture({ sampleRate: 16000 })
    micRef.current = mic
    VAD.reset()
    
    const audioCtx = new (window.AudioContext || window.webkitAudioContext)()
    const analyser = audioCtx.createAnalyser()
    analyser.fftSize = 256
    analyserRef.current = analyser

    vadUnsubRef.current = VAD.onSpeechActivity((activity) => {
      if (activity === SpeechActivity.Ended) {
        const seg = VAD.popSpeechSegment()
        if (seg && seg.samples.length > 1600) processSpeech(seg.samples)
        else stopListening()
      }
    })

    await mic.start((chunk) => {
      VAD.processSamples(chunk)
      // Level check for waveform
      let sum = 0
      for (let i = 0; i < chunk.length; i++) sum += Math.abs(chunk[i])
      setAudioLevel(sum / chunk.length)
    })
  }

  const stopListening = () => {
    micRef.current?.stop(); vadUnsubRef.current?.()
    triggerHaptic([40, 30, 40])
    setVoiceState('idle'); setAudioLevel(0)
  }

  const handleClick = () => {
    if (loadingModels || voiceState === 'processing') return
    if (voiceState === 'idle') startListening()
    else if (voiceState === 'listening') stopListening()
    else if (voiceState === 'speaking') { setVoiceState('idle'); setShowPanel(false) }
  }

  return (
    <>
      {/* Frosted Glass Overlay Panel */}
      <div style={{
        position: 'absolute', bottom: 0, left: 0, right: 0,
        height: '45dvh', background: 'rgba(15, 23, 42, 0.8)',
        backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
        borderTop: '1px solid rgba(255,255,255,0.1)',
        zIndex: 90, padding: '24px 20px',
        transform: `translateY(${(showPanel || voiceState !== 'idle') ? '0' : '100%'})`,
        transition: 'transform 0.5s cubic-bezier(0.4, 0, 0.2, 1)',
        display: 'flex', flexDirection: 'column', gap: 16,
        boxShadow: '0 -20px 40px rgba(0,0,0,0.4)',
      }}>
        <div style={{ alignSelf: 'center', width: 40, height: 4, borderRadius: 2, background: 'rgba(255,255,255,0.2)', marginBottom: 8 }} onClick={() => setShowPanel(false)} />
        
        <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 20 }}>
          {transcript && (
            <div style={{ animation: 'fadeInUp 0.4s both' }}>
              <p style={{ fontSize: 11, color: theme.primary, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 }}>You said</p>
              <p style={{ fontSize: 18, color: 'white', fontWeight: 500, lineHeight: 1.4 }}>{transcript}</p>
            </div>
          )}
          {response && (
            <div style={{ animation: 'fadeInUp 0.4s 0.2s both' }}>
              <p style={{ fontSize: 11, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 }}>MindEase</p>
              <p style={{ fontSize: 15, color: '#CBD5E1', lineHeight: 1.6 }}>{response}</p>
            </div>
          )}
          {history.length > 0 && !transcript && !response && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {history.map((h, i) => (
                <div key={i} style={{ opacity: 1 - i * 0.2, fontSize: 13 }}>
                  <p style={{ color: theme.primary, marginBottom: 4 }}>“ {h.q} ”</p>
                  <p style={{ color: '#94A3B8' }}>{h.a}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Main Floating Orb & Waveform */}
      <div style={{
        position: 'absolute', bottom: 80, left: '50%', transform: 'translateX(-50%)',
        zIndex: 100, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12,
      }}>
        <style>{`
          @keyframes fadeInUp { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
          @keyframes orbPulse { 0% { transform: scale(1); } 50% { transform: scale(1.1); } 100% { transform: scale(1); } }
          @keyframes waveBar { 0%, 100% { height: 4px; } 50% { height: var(--h); } }
        `}</style>

        {/* Dynamic Waveform */}
        {voiceState === 'listening' && (
          <div style={{ display: 'flex', gap: 3, alignItems: 'center', height: 24, marginBottom: 4 }}>
            {[0.4, 0.8, 0.5, 1.0, 0.6, 0.9, 0.4].map((v, i) => (
              <div key={i} style={{
                width: 3, borderRadius: 1.5, background: theme.primary,
                '--h': `${v * audioLevel * 100 + 4}px`,
                animation: `waveBar 0.2s infinite ease-in-out ${i * 0.05}s`
              }} />
            ))}
          </div>
        )}

        {loadingModels && (
          <div style={{ position: 'absolute', top: -30, whiteSpace: 'nowrap', fontSize: 11, fontWeight: 600, color: theme.primary }}>
             {downloadProgress > 0 ? `AI READYING ${Math.round(downloadProgress * 100)}%` : 'PREPARING AI...'}
          </div>
        )}

        <button
          onClick={handleClick}
          disabled={loadingModels}
          style={{
            width: 60, height: 60, borderRadius: '50%',
            background: voiceState === 'speaking' ? '#22C55E' : voiceState === 'processing' ? '#F59E0B' : 'rgba(255,255,255,0.05)',
            border: `2px solid ${voiceState === 'idle' ? 'rgba(255,255,255,0.1)' : 'transparent'}`,
            boxShadow: voiceState === 'idle' ? '0 8px 32px rgba(0,0,0,0.3)' : `0 0 30px ${getOrbShadow(voiceState, theme)}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
            transition: 'all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
            animation: voiceState === 'listening' ? 'orbPulse 1s infinite' : 'none',
            position: 'relative', overflow: 'hidden', backdropFilter: 'blur(10px)',
          }}
        >
          <div style={{
            width: '35%', height: '35%', borderRadius: '50%', background: 'white',
            opacity: voiceState === 'idle' ? 0.2 : 0.8, filter: 'blur(2px)',
          }} />
          {voiceState === 'idle' && !loadingModels && <div style={{ position: 'absolute', fontSize: 20 }}>🎙️</div>}
          {loadingModels && <div style={{ position: 'absolute', inset: 0, border: `2px solid ${theme.primary}`, borderRadius: '50%', borderTopColor: 'transparent', animation: 'orbSpin 1s linear infinite' }} />}
        </button>
      </div>
    </>
  )
}

function getOrbShadow(state, theme) {
  if (state === 'speaking') return '#22C55E60'
  if (state === 'processing') return '#F59E0B60'
  if (state === 'listening') return theme.glow
  return 'transparent'
}
