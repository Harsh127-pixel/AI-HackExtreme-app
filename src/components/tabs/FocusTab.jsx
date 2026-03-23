import { useState, useRef, useCallback, useEffect } from 'react'
import { session, useSession, notify, setTask, setSteps, addJournalEntry } from '../../focuscoach/sessionState.js'
import buildSystemPrompt from '../../focuscoach/systemPrompt.js'
import usePomodoro from '../../focuscoach/usePomodoro.js'
import VoiceOrb from '../VoiceOrb.jsx'
import PomodoroRing from '../PomodoroRing.jsx'
import TaskPanel from '../TaskPanel.jsx'
import SessionSummaryCard from '../SessionSummaryCard.jsx'
import {
  VoicePipeline, ModelCategory, ModelManager,
  AudioCapture, AudioPlayback, SpeechActivity, EventBus
} from '@runanywhere/web'
import { VAD } from '@runanywhere/web-onnx'

function useModelLoader(category, coexist = false) {
  const [state, setState] = useState(() => ModelManager.getLoadedModel(category) ? 'ready' : 'idle')
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState(null)
  const loadingRef = useRef(false)
  const ensure = useCallback(async () => {
    if (ModelManager.getLoadedModel(category)) { setState('ready'); return true }
    if (loadingRef.current) return false
    loadingRef.current = true
    try {
      const models = ModelManager.getModels().filter(m => m.modality === category)
      if (!models.length) { setError(`No ${category} model`); setState('error'); return false }
      const model = models[0]
      if (model.status !== 'downloaded' && model.status !== 'loaded') {
        setState('downloading'); setProgress(0)
        const unsub = EventBus.shared.on('model.downloadProgress', evt => {
          if (evt.modelId === model.id) setProgress(evt.progress ?? 0)
        })
        await ModelManager.downloadModel(model.id)
        unsub(); setProgress(1)
      }
      setState('loading')
      const ok = await ModelManager.loadModel(model.id, { coexist })
      if (ok) { setState('ready'); return true }
      setError('Failed to load'); setState('error'); return false
    } catch (err) { setError(err.message); setState('error'); return false }
    finally { loadingRef.current = false }
  }, [category, coexist])
  return { state, progress, error, ensure }
}

export default function FocusTab({ theme, onCrisis }) {
  const currentSession = useSession()
  const pomodoro = usePomodoro()
  const llmLoader = useModelLoader(ModelCategory.Language, true)
  const sttLoader = useModelLoader(ModelCategory.SpeechRecognition, true)
  const ttsLoader = useModelLoader(ModelCategory.SpeechSynthesis, true)
  const vadLoader = useModelLoader(ModelCategory.Audio, true)
  const [voiceState, setVoiceState] = useState('idle')
  const [audioLevel, setAudioLevel] = useState(0)
  const [transcript, setTranscript] = useState('')
  const [response, setResponse] = useState('')
  const [loadError, setLoadError] = useState(null)
  const [celebrating, setCelebrating] = useState(false)
  const [celebrationMsg, setCelebrationMsg] = useState('')
  const [prevPomodoroCount, setPrevPomodoroCount] = useState(0)
  const micRef = useRef(null)
  const pipelineRef = useRef(null)
  const vadUnsubRef = useRef(null)

  useEffect(() => {
    if (currentSession.pomodoroCount > 0) {
      const msgs = [
        "25 minutes of pure focus. That's real.",
        "One pomodoro down. You showed up.",
        "Your brain just did something hard. Well done.",
        "Focus session complete. Take your break seriously.",
        `${currentSession.pomodoroCount} pomodoros today. Keep going.`,
      ]
      setCelebrationMsg(msgs[Math.min(currentSession.pomodoroCount - 1, msgs.length - 1)])
      setCelebrating(true)
      const t = setTimeout(() => setCelebrating(false), 4000)
      return () => clearTimeout(t)
    }
  }, [currentSession.pomodoroCount])

  useEffect(() => {
    setPrevPomodoroCount(currentSession.pomodoroCount)
  }, [currentSession.pomodoroCount])

  useEffect(() => () => { micRef.current?.stop(); vadUnsubRef.current?.() }, [])

  const allReady = [llmLoader, sttLoader, ttsLoader, vadLoader].every(l => l.state === 'ready')

  const ensureModels = useCallback(async () => {
    const results = await Promise.all([vadLoader.ensure(), sttLoader.ensure(), llmLoader.ensure(), ttsLoader.ensure()])
    return results.every(Boolean)
  }, [vadLoader, sttLoader, llmLoader, ttsLoader])

  function parseSteps(text) {
    return text.split('\n').filter(l => /^\d+[\.\)]\s/.test(l.trim())).map((l, i) => ({
      id: Date.now() + i, text: l.replace(/^\d+[\.\)]\s+/, '').trim(), done: false,
    }))
  }

  const processSpeech = useCallback(async (audioData) => {
    if (!pipelineRef.current) pipelineRef.current = new VoicePipeline()
    micRef.current?.stop(); vadUnsubRef.current?.()
    setVoiceState('processing')
    try {
      await pipelineRef.current.processTurn(audioData, {
        systemPrompt: buildSystemPrompt(session), maxTokens: 120, temperature: 0.7,
      }, {
        onTranscription: (text) => {
          setTranscript(text)
          pomodoro.handleVoiceCommand(text)
        },
        onResponseToken: (_t, acc) => setResponse(acc),
        onResponseComplete: (text) => {
          if (text.startsWith('CRISIS_DETECTED:')) {
            onCrisis(); setResponse(text.replace('CRISIS_DETECTED:', '').trim())
          } else {
            setResponse(text)
          }
          const steps = parseSteps(text)
          if (steps.length >= 2) setSteps(steps)
          if (session.mode === 'weekly') {
            const { setWeeklyReflection } = require('../../focuscoach/sessionState.js')
            setWeeklyReflection(text)
          }
        },
        onSynthesisComplete: async (audio, sr) => {
          setVoiceState('speaking')
          const p = new AudioPlayback({ sampleRate: sr })
          await p.play(audio, sr); p.dispose()
        },
        onStateChange: (s) => {
          if (s === 'processingSTT') setVoiceState('processing')
          if (s === 'generatingResponse') setVoiceState('processing')
          if (s === 'playingTTS') setVoiceState('speaking')
        },
      })
    } catch (err) { setLoadError(err.message) }
    setVoiceState('idle'); setAudioLevel(0)
  }, [pomodoro, onCrisis])

  const startListening = useCallback(async () => {
    setTranscript(''); setResponse(''); setLoadError(null)
    const ok = allReady || await ensureModels()
    if (!ok) return
    setVoiceState('listening')
    const mic = new AudioCapture({ sampleRate: 16000 })
    micRef.current = mic
    VAD.reset()
    vadUnsubRef.current = VAD.onSpeechActivity((activity) => {
      if (activity === SpeechActivity.Ended) {
        const seg = VAD.popSpeechSegment()
        if (seg && seg.samples.length > 1600) processSpeech(seg.samples)
      }
    })
    await mic.start((chunk) => VAD.processSamples(chunk), (level) => setAudioLevel(level))
  }, [allReady, ensureModels, processSpeech])

  const stopListening = useCallback(() => {
    micRef.current?.stop(); vadUnsubRef.current?.()
    setVoiceState('idle'); setAudioLevel(0)
  }, [])

  const pendingLoaders = [
    { label: 'VAD', loader: vadLoader }, { label: 'STT', loader: sttLoader },
    { label: 'LLM', loader: llmLoader }, { label: 'TTS', loader: ttsLoader },
  ].filter(l => l.loader.state !== 'ready')

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, padding: '20px 0 20px' }}>

      {/* Model banner */}
      {pendingLoaders.length > 0 && voiceState === 'idle' && (
        <div style={{ margin: '0 16px', padding: '10px 14px', background: theme.bgCard, borderRadius: 12, border: `1px solid ${theme.border}`, fontSize: 13, color: theme.textMuted, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span>Models needed: {pendingLoaders.map(l => l.label).join(', ')}</span>
          <button onClick={ensureModels} style={{ padding: '4px 12px', borderRadius: 8, border: 'none', background: theme.primary, color: 'white', fontSize: 12, cursor: 'pointer' }}>
            Download
          </button>
        </div>
      )}

      {/* Mode buttons */}
      <div style={{ display: 'flex', gap: 8, padding: '0 16px' }}>
        {[{ label: '🎯 Focus', mode: 'focus' }, { label: '☕ Break', mode: 'break' }].map(({ label, mode }) => (
          <button key={mode} onClick={() => { session.mode = mode; notify(); if (mode === 'focus' && !pomodoro.isRunning) pomodoro.start() }} style={{
            flex: 1, padding: '10px 0', borderRadius: 10, border: 'none', cursor: 'pointer', fontSize: 14, fontWeight: 500,
            background: currentSession.mode === mode ? theme.primary : theme.bgCard,
            color: currentSession.mode === mode ? 'white' : theme.textMuted,
          }}>
            {label}
          </button>
        ))}
        <button onClick={() => { pomodoro.reset(); session.mode = 'idle'; notify() }} style={{ padding: '10px 14px', borderRadius: 10, border: `1px solid ${theme.border}`, background: 'transparent', color: theme.textMuted, fontSize: 13, cursor: 'pointer' }}>
          ↺
        </button>
      </div>

      {/* Pomodoro */}
      {currentSession.mode !== 'idle' && (
        <div style={{ display: 'flex', justifyContent: 'center' }}>
          <PomodoroRing progress={pomodoro.progress} formattedTime={pomodoro.formattedTime} phase={pomodoro.phase} isRunning={pomodoro.isRunning} pomodoroCount={currentSession.pomodoroCount} />
        </div>
      )}

      {/* Voice orb */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
        <VoiceOrb voiceState={voiceState} audioLevel={audioLevel} mode={currentSession.mode} />
        <p style={{ fontSize: 13, color: theme.textMuted, margin: 0 }}>
          {voiceState === 'idle' && 'Tap to speak'}
          {voiceState === 'listening' && 'Listening...'}
          {voiceState === 'processing' && 'Processing...'}
          {voiceState === 'speaking' && 'Speaking...'}
        </p>
        {voiceState === 'idle' ? (
          <button onClick={startListening} style={{ padding: '10px 28px', borderRadius: 8, border: 'none', background: theme.primary, color: 'white', fontSize: 14, cursor: 'pointer' }}>
            Start Listening
          </button>
        ) : voiceState === 'listening' ? (
          <button onClick={stopListening} style={{ padding: '10px 28px', borderRadius: 8, border: `1px solid ${theme.border}`, background: theme.bgCard, color: theme.text, fontSize: 14, cursor: 'pointer' }}>
            Stop
          </button>
        ) : null}
      </div>

      {/* Celebration toast */}
      {celebrating && (
        <div style={{
          margin: '0 16px',
          padding: '12px 16px',
          background: theme.gradient,
          border: `1px solid ${theme.primary}`,
          borderRadius: 12,
          display: 'flex', alignItems: 'center', gap: 10,
          animation: 'fadeIn 0.3s ease',
        }}>
          <span style={{ fontSize: 24 }}>🎉</span>
          <span style={{ color: theme.text, fontSize: 14 }}>{celebrationMsg}</span>
        </div>
      )}

      {/* Session summary */}
      <SessionSummaryCard theme={theme} prevPomodoroCount={prevPomodoroCount} />

      {/* Task panel */}
      <TaskPanel session={currentSession} onTaskSet={(text) => { if (text) { setTask(text); session.mode = 'focus'; notify(); pomodoro.start() } }} />

      {/* Last exchange */}
      {(transcript || response) && (
        <div style={{ margin: '0 16px', display: 'flex', flexDirection: 'column', gap: 8 }}>
          {transcript && <div style={{ padding: '10px 14px', background: theme.primary, borderRadius: '12px 12px 4px 12px', fontSize: 14, color: 'white', alignSelf: 'flex-end', maxWidth: '85%' }}>{transcript}</div>}
          {response && <div style={{ padding: '10px 14px', background: theme.bgCard, borderRadius: '12px 12px 12px 4px', fontSize: 14, color: theme.text, alignSelf: 'flex-start', maxWidth: '85%', lineHeight: 1.5 }}>{response}</div>}
        </div>
      )}
    </div>
  )
}
