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
    <div style={{ display: 'flex', flexDirection: 'column', gap: 0, paddingBottom: 32 }}>

      {/* Model download banner */}
      {pendingLoaders.length > 0 && voiceState === 'idle' && (
        <div style={{
          margin: '16px 16px 0',
          padding: '12px 16px',
          background: 'var(--warning-bg)',
          border: '1px solid rgba(251,191,36,0.2)',
          borderRadius: 'var(--radius-md)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
          animation: 'slideUp 0.3s both',
        }}>
          <div>
            <p style={{ fontSize: 13, fontWeight: 500, color: 'var(--warning)' }}>
              AI models needed
            </p>
            <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>
              {pendingLoaders.map(l => l.label).join(', ')}
            </p>
          </div>
          <button onClick={ensureModels} className="btn btn-sm" style={{
            background: 'var(--warning)', color: '#000', border: 'none', fontWeight: 600,
          }}>
            Download
          </button>
        </div>
      )}

      {/* Mode selector */}
      <div style={{ padding: '16px 16px 0', display: 'flex', gap: 8 }}>
        {[
          { label: '🎯 Focus', mode: 'focus' },
          { label: '☕ Break', mode: 'break' },
        ].map(({ label, mode }) => {
          const active = currentSession.mode === mode
          return (
            <button key={mode} onClick={() => {
              session.mode = mode; notify()
              if (mode === 'focus' && !pomodoro.isRunning) pomodoro.start()
            }} style={{
              flex: 1, padding: '10px 0',
              borderRadius: 'var(--radius-md)',
              border: `1.5px solid ${active ? theme.primary : 'var(--border-default)'}`,
              background: active ? theme.primary + '18' : 'var(--bg-card)',
              color: active ? theme.primary : 'var(--text-secondary)',
              fontSize: 14, fontWeight: active ? 600 : 400,
              cursor: 'pointer', transition: 'all var(--transition-fast)',
            }}>
              {label}
            </button>
          )
        })}
        <button onClick={() => { pomodoro.reset(); session.mode = 'idle'; notify() }}
          className="btn btn-ghost btn-icon" style={{ fontSize: 18, flexShrink: 0 }}
          title="Reset">
          ↺
        </button>
      </div>

      {/* Pomodoro ring */}
      {currentSession.mode !== 'idle' && (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '8px 0 0' }}>
          <PomodoroRing
            progress={pomodoro.progress}
            formattedTime={pomodoro.formattedTime}
            phase={pomodoro.phase}
            isRunning={pomodoro.isRunning}
            pomodoroCount={currentSession.pomodoroCount}
          />
        </div>
      )}

      {/* Voice orb area */}
      <div style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12,
        padding: currentSession.mode === 'idle' ? '32px 16px 16px' : '8px 16px 16px',
      }}>
        <div style={{ position: 'relative' }}>
          <VoiceOrb voiceState={voiceState} audioLevel={audioLevel} mode={currentSession.mode} />
          {voiceState === 'listening' && (
            <div style={{
              position: 'absolute', inset: -8, borderRadius: '50%',
              border: `2px solid ${theme.primary}40`,
              animation: 'orbPulse 2s ease-in-out infinite',
            }} />
          )}
        </div>

        <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: 0 }}>
          {voiceState === 'idle' && 'Tap to speak with MindEase'}
          {voiceState === 'listening' && '🎙️ Listening — speak now'}
          {voiceState === 'processing' && '⚙️ Processing your message...'}
          {voiceState === 'speaking' && '🔊 MindEase is responding'}
        </p>

        {voiceState === 'idle' && (
          <button onClick={startListening} className="btn btn-primary btn-lg" style={{
            background: theme.primary,
            boxShadow: `0 4px 16px ${theme.glow}`,
            border: 'none',
          }}>
            Start Listening
          </button>
        )}
        {voiceState === 'listening' && (
          <button onClick={stopListening} className="btn btn-lg">
            Stop
          </button>
        )}
      </div>

      {/* Celebration toast */}
      {celebrating && (
        <div style={{
          margin: '0 16px',
          padding: '14px 16px',
          background: `linear-gradient(135deg, ${theme.primary}18, ${theme.accent}10)`,
          border: `1px solid ${theme.primary}30`,
          borderRadius: 'var(--radius-lg)',
          display: 'flex', alignItems: 'center', gap: 12,
          animation: 'slideUp 0.4s cubic-bezier(0.175,0.885,0.32,1.275) both',
        }}>
          <span style={{ fontSize: 28 }}>🎉</span>
          <div>
            <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>{celebrationMsg}</p>
            <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>
              {currentSession.pomodoroCount * 25} focus minutes today
            </p>
          </div>
        </div>
      )}

      {/* Session summary */}
      <div style={{ padding: '0 16px' }}>
        <SessionSummaryCard theme={theme} prevPomodoroCount={prevPomodoroCount} />
      </div>

      {/* Task panel */}
      <div style={{ padding: '8px 16px 0' }}>
        <TaskPanel session={currentSession} onTaskSet={(text) => {
          if (text) { setTask(text); session.mode = 'focus'; notify(); pomodoro.start() }
        }} />
      </div>

      {/* Conversation */}
      {(transcript || response) && (
        <div style={{ padding: '12px 16px 0', display: 'flex', flexDirection: 'column', gap: 8 }}>
          {transcript && (
            <div style={{ alignSelf: 'flex-end', maxWidth: '80%' }}>
              <div style={{
                padding: '10px 14px',
                background: theme.primary,
                borderRadius: '16px 16px 4px 16px',
                fontSize: 14, color: '#fff', lineHeight: 1.5,
                boxShadow: `0 2px 8px ${theme.glow}`,
              }}>
                {transcript}
              </div>
            </div>
          )}
          {response && (
            <div style={{ alignSelf: 'flex-start', maxWidth: '85%' }}>
              <div style={{
                padding: '10px 14px',
                background: 'var(--bg-elevated)',
                border: '1px solid var(--border-default)',
                borderRadius: '16px 16px 16px 4px',
                fontSize: 14, color: 'var(--text-primary)', lineHeight: 1.6,
              }}>
                {response}
              </div>
            </div>
          )}
        </div>
      )}

    </div>
  )
}
