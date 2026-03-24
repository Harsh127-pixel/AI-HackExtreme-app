import { useState, useRef, useCallback, useEffect } from 'react'
import { session, notify, setSteps, claimVoice, releaseVoice } from '../focuscoach/sessionState.js'
import buildSystemPrompt from '../focuscoach/systemPrompt.js'
import usePomodoro from '../focuscoach/usePomodoro.js'
import {
  VoicePipeline, ModelCategory, ModelManager,
  AudioCapture, AudioPlayback, SpeechActivity, EventBus
} from '@runanywhere/web'
import { VAD } from '@runanywhere/web-onnx'
import { playSound, stopSound } from '../mindease/ambientSounds.js'
import { t, getLang } from '../mindease/i18n.js'
import { getAIAction } from '../mindease/aiUtils.js'

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
  const convHistoryRef = useRef([]) // [{ role: 'user' | 'assistant', content: string }]
  const lastActivityRef = useRef(Date.now())
  const vadTransitionsRef = useRef(0)
  const lastVadStateRef = useRef(SpeechActivity.Ended)
  const playbackRef = useRef(null)
  const silenceTimerRef = useRef(null)
  const partialProcessingRef = useRef(false)
  const partialTimerRef = useRef(null)
  const audioBufferRef = useRef([])

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

  const voiceId = 'global-voice-orb'

  // Clear history on tab switch or silence
  useEffect(() => {
    convHistoryRef.current = []
    setHistory([])
    const unsubVoice = EventBus.shared.on('voice.stop', (evt) => {
      if (evt?.except !== voiceId) stopVoice()
    })
    return () => {
      unsubVoice();
      stopVoice();
      releaseVoice(voiceId);
    }
  }, [activeTab])

  const speakResponse = useCallback(async (text) => {
    const tts = ModelManager.getLoadedModel(ModelCategory.SpeechSynthesis)
    if (!tts) return
    setVoiceState('speaking')
    setResponse(text)
    setShowPanel(true)
    try {
      const synthFunc = getAIAction(tts, ['synthesize', 'generate', 'speak'])
      if (!synthFunc) { console.error('TTS engine match failed'); setVoiceState('idle'); return }
      
      const res = await synthFunc(text)
      const { audio, sampleRate } = typeof res === 'object' && res.audio ? res : { audio: res, sampleRate: 16000 }
      const p = new AudioPlayback({ sampleRate })
      playbackRef.current = p
      await p.play(audio, sampleRate)
      p.dispose()
      playbackRef.current = null
    } catch (e) { console.error('TTS execution failed:', e) }
    setVoiceState('idle')
  }, [])

  const processSpeech = useCallback(async (audioData) => {
    setVoiceState('processing')
    try {
      const currentLang = getLang();
      let stt = ModelManager.getLoadedModel(ModelCategory.SpeechRecognition);
      
      if (!stt) {
        console.warn('STT model not found, attempting lazy load...');
        const { STT } = await import('@runanywhere/web-onnx');
        stt = STT;
      }

      const transcribeFn = getAIAction(stt, ['transcribe', 'predict', 'generate']);
      if (!transcribeFn) throw new Error('No transcription function discovered');

      let text = '';
      try {
        const result = await transcribeFn(new Float32Array(audioData), { language: currentLang });
        text = typeof result === 'string' ? result : (result.text || '');
      } catch (e) {
        console.error(`STT lang ${currentLang} failed, retry en`, e);
        const result = await transcribeFn(new Float32Array(audioData), { language: 'en' });
        text = typeof result === 'string' ? result : (result.text || '');
      }

      text = text.trim().toLowerCase();
      console.log("[GlobalVoiceOrb] Heard:", text);
      if (!text) { setVoiceState('idle'); return }
      setTranscript(text)
      setShowPanel(true)

      // Crisis detection - highest priority
      const crisisRegex = /i('m| am) not okay|help me|i can't (do|take|handle) this|i want to (die|disappear|give up)|i feel (hopeless|worthless)|panic|can't breathe|anxiety attack/i
      if (crisisRegex.test(text)) {
        onCrisis && onCrisis()
        session.mode = 'sos'; notify()
        await speakResponse("I hear you. I'm right here with you. Let's breathe together. In... 2... 3... 4... Hold... 2... 3... 4... Out slowly... 2... 3... 4... 5... 6. You are safe.")
        return
      }

      // Navigation logic
      // English & Hindi Navigation logic (High Priority)
      const NAV_MAP = {
        home: { keywords: [/home/i, /dashboard/i, /main/i, /घर/i, /वापस/i], msg: currentLang === 'hi' ? "डैशबोर्ड खोल रहा हूँ।" : "Opening dashboard." },
        breathe: { keywords: [/breath/i, /relax/i, /peace/i, /शांत/i, /सांस/i], msg: currentLang === 'hi' ? "चलिए कुछ सांस लेते हैं।" : "Let's take some breaths." },
        reflect: { keywords: [/reflect/i, /journal/i, /diary/i, /think/i, /डायरी/i, /विचार/i], msg: currentLang === 'hi' ? "डायरी खोल रहा हूँ।" : "Opening your journal." },
        focus: { keywords: [/focus/i, /work/i, /study/i, /तनाव/i, /ध्यान/i], msg: currentLang === 'hi' ? "फोकस सत्र शुरू हो रहा है।" : "Starting focus mode." },
      }
      for (const [id, data] of Object.entries(NAV_MAP)) {
        if (data.keywords.some(k => k.test(text))) {
          console.log("[GlobalVoiceOrb] Nav Command Matched:", id);
          onTabChange(id); await speakResponse(data.msg); return
        }
      }

      // Sound commands - detect before LLM (Bilingual support)
      const SOUND_MAP = [
        { id: 'rain', regex: [/rain/i, /rainy/i, /बारिश/i, /पानी/i], label: currentLang === 'hi' ? "बारिश की आवाज़" : "rain sounds" },
        { id: 'whiteNoise', regex: [/white.?noise/i, /static/i, /शोर/i], label: currentLang === 'hi' ? "व्हाइट नॉइज़" : "white noise" },
        { id: 'forest', regex: [/forest/i, /nature/i, /trees/i, /जंगल/i, /प्रकृति/i], label: currentLang === 'hi' ? "जंगल की आवाज़" : "forest sounds" },
        { id: 'focus', regex: [/focus.?music/i, /focus.?hum/i, /hum/i, /तनाव/i], label: currentLang === 'hi' ? "फोकस संगीत" : "focus hum" },
        { id: 'binaural', regex: [/binaural/i, /beats/i, /धुन/i], label: "binaural beats" },
        { id: 'cafe', regex: [/cafe/i, /coffee/i, /ambient/i, /भीड़/i], label: currentLang === 'hi' ? "कैफे का माहौल" : "cafe noise" },
      ]
      for (const s of SOUND_MAP) {
        if (s.regex.some(r => r.test(text))) {
          console.log("[GlobalVoiceOrb] Sound Command Matched:", s.id);
          playSound(s.id); await speakResponse(currentLang === 'hi' ? `${s.label} शुरू कर रहा हूँ।` : `Playing ${s.label}.`); return
        }
      }
      if (/stop.?(sound|music|noise)|silence|quiet|बंद|चुप|काफी/i.test(text)) {
        console.log("[GlobalVoiceOrb] Stop Command Matched");
        stopSound(); await speakResponse(currentLang === 'hi' ? "ध्वनि बंद हो गई है।" : "Ambient sound stopped."); return
      }

      // Voice Tone Analysis
      const samples = new Float32Array(audioData)
      let sum = 0, sumSq = 0
      for (let i = 0; i < samples.length; i++) {
        const s = samples[i]
        sum += s; sumSq += s * s
      }
      const variance = (sumSq / samples.length) - ((sum / samples.length) ** 2)

      // Heuristic: Var > 0.05 is highly agitated (loud/peaky), transitions > 6 per 10s is rushed
      // transitions count is already updated in real-time
      const vScore = Math.min(variance * 10, 0.5) // Variance contribution
      const rScore = Math.min(vadTransitionsRef.current / 12, 0.5) // Rhythm contribution
      session.voiceEmotionScore = vScore + rScore
      notify()

      const tMode = { home: 'idle', breathe: 'breathing', reflect: 'journal', focus: 'focus' }[activeTab] || session.mode
      const systemPrompt = buildSystemPrompt({ ...session, mode: tMode })

      // Multi-turn: Build conversation context
      let context = ""
      if (convHistoryRef.current.length > 0) {
        context = "Previous conversation:\n" + convHistoryRef.current.map(h =>
          `${h.role === 'user' ? 'User' : 'Assistant'}: ${h.content}`
        ).join('\n') + "\n\n"
      }

      const llm = ModelManager.getLoadedModel(ModelCategory.Language)
      const genFunc = llm && (llm.generateText || llm.generate || llm.predict || llm.chat)?.bind(llm)
      if (!genFunc) { setVoiceState('idle'); return }
      const res = await genFunc(`${systemPrompt}\n\n${context}User: ${text}\nAssistant:`, {
        maxTokens: 100, stop: ['User:', '\n\n']
      })

      // Update history reference
      convHistoryRef.current.push({ role: 'user', content: text })
      convHistoryRef.current.push({ role: 'assistant', content: res })
      if (convHistoryRef.current.length > 10) convHistoryRef.current = convHistoryRef.current.slice(-10) // 5 turns = 10 messages
      lastActivityRef.current = Date.now()

      pomodoro.handleVoiceCommand(text)
      const steps = parseSteps(res)
      if (steps.length >= 2) setSteps(steps)
      const cleanRes = res.replace('CRISIS_DETECTED:', '').trim()
      if (res.includes('CRISIS_DETECTED')) onCrisis && onCrisis(cleanRes)

      await speakResponse(cleanRes)
      setHistory(h => [{ q: text, a: res }, ...h].slice(0, 5))
    } catch (err) { setVoiceState('idle') }
  }, [activeTab, pomodoro, onCrisis, onTabChange, speakResponse])

  const stopVoice = useCallback(() => {
    micRef.current?.stop()
    vadUnsubRef.current?.()
    playbackRef.current?.dispose() // Dispose of active playback
    if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current)
    if (partialTimerRef.current) clearInterval(partialTimerRef.current)
    setVoiceState('idle')
  }, [])

  const startListening = async () => {
    const ready = await ensureModels()
    if (!ready) return

    // Check for 10 min silence (600,000 ms)
    if (Date.now() - lastActivityRef.current > 600000) {
      convHistoryRef.current = []; setHistory([])
    }

    triggerHaptic(60)
    claimVoice(voiceId)
    setVoiceState('listening')
    setTranscript(''); setResponse('')
    vadTransitionsRef.current = 0 // Reset analysis for this turn

    const mic = new AudioCapture({ sampleRate: 16000 })
    micRef.current = mic
    VAD.reset()

    vadUnsubRef.current = VAD.onSpeechActivity((activity) => {
      console.log("[GlobalVoiceOrb] VAD Activity:", activity)
      if (activity !== lastVadStateRef.current) {
        vadTransitionsRef.current++
        lastVadStateRef.current = activity
      }
      
      if (activity === SpeechActivity.Started) {
        audioBufferRef.current = [] // Reset buffer for new speech segment
        if (silenceTimerRef.current) {
          clearTimeout(silenceTimerRef.current)
          silenceTimerRef.current = null
        }
      }

      if (activity === SpeechActivity.Ended) {
        // More "patient" detection: Wait 1s of silence before processing
        if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current)
        silenceTimerRef.current = setTimeout(() => {
          const seg = VAD.popSpeechSegment()
          if (seg && seg.samples.length > 4000) { // More robust min length (0.25s)
            processSpeech(seg.samples)
            silenceTimerRef.current = null
          } else {
            stopListening()
          }
        }, 1200) // 1.2s of "patience" for pauses
      }
    })

    partialTimerRef.current = setInterval(async () => {
      if (lastVadStateRef.current === SpeechActivity.Started && !partialProcessingRef.current && audioBufferRef.current.length > 8000) {
        partialProcessingRef.current = true
        try {
          const stt = ModelManager.getLoadedModel(ModelCategory.SpeechRecognition)
          if (stt) {
            const transcribeFn = getAIAction(stt, ['transcribe', 'predict', 'generate'])
            if (transcribeFn) {
              const result = await transcribeFn(new Float32Array(audioBufferRef.current), { language: getLang() })
              const text = (typeof result === 'string' ? result : (result.text || '')).trim()
              if (text && lastVadStateRef.current === SpeechActivity.Started) {
                setTranscript(text)
                if (!showPanel) setShowPanel(true)
              }
            }
          }
        } catch (e) {
          console.warn("Partial STT failed:", e)
        } finally {
          partialProcessingRef.current = false
        }
      }
    }, 1200)

    await mic.start((chunk) => {
      VAD.processSamples(chunk)
      
      let sum = 0
      for (let i = 0; i < chunk.length; i++) sum += Math.abs(chunk[i])
      setAudioLevel(sum / chunk.length)

      if (lastVadStateRef.current === SpeechActivity.Started) {
        audioBufferRef.current.push(...chunk)
      }
    })
  }

  const stopListening = () => {
    stopVoice() // Use the new stopVoice function
    if (voiceState === 'idle') {
      releaseVoice(voiceId)
    }
    setAudioLevel(0)
  }

  const handleClick = () => {
    if (loadingModels || voiceState === 'processing') return
    if (voiceState === 'idle') startListening()
    else if (voiceState === 'listening') stopListening()
    else if (voiceState === 'speaking') { stopVoice(); setShowPanel(false) } // Use stopVoice for speaking state
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
        <div style={{
          flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 20,
          padding: 32, paddingBottom: 110, zIndex: 90, borderTop: '1px solid rgba(255,255,255,0.08)',
        }}>
          <button onClick={() => setShowPanel(false)} style={{
            position: 'absolute', top: 12, right: 12, background: 'rgba(255,255,255,0.05)',
            border: 'none', color: 'var(--text-muted)', width: 28, height: 28, borderRadius: '50%',
            cursor: 'pointer', fontSize: 16
          }}>×</button>

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
            animation: (voiceState === 'listening' || voiceState === 'speaking') ? 'orbPulse 1.5s infinite' : 'none',
            position: 'relative', overflow: 'hidden', backdropFilter: 'blur(10px)',
          }}
        >
          <div style={{
            width: '35%', height: '35%', borderRadius: '50%', background: 'white',
            opacity: voiceState === 'idle' ? 0.2 : 0.8, filter: 'blur(2px)',
          }} />
          {voiceState === 'idle' && !loadingModels && <div style={{ position: 'absolute', fontSize: 20 }}>🎙️</div>}
          {(voiceState === 'listening' || voiceState === 'speaking' || voiceState === 'processing') && !loadingModels && <div style={{ position: 'absolute', fontSize: 20 }}>⏹️</div>}
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
