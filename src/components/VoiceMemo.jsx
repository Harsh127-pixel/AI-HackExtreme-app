import { useState, useRef, useCallback, useEffect } from 'react'
import { 
  ModelCategory, ModelManager, AudioCapture, 
  SpeechActivity, EventBus, AudioPlayback 
} from '@runanywhere/web'
import { VAD } from '@runanywhere/web-onnx'
import { t, getLang } from '../mindease/i18n.js'

const STORAGE_KEY = 'mindease_voicememos'

function loadMemos() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]') } catch { return [] }
}

function saveMemos(memos) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(memos)) } catch {}
}

export default function VoiceMemo({ theme }) {
  const [memos, setMemos] = useState(loadMemos)
  const [recording, setRecording] = useState(false)
  const [processing, setProcessing] = useState(false)
  const [sttReady, setSttReady] = useState(() => !!ModelManager.getLoadedModel(ModelCategory.SpeechRecognition))
  
  const micRef = useRef(null)
  const vadUnsubRef = useRef(null)
  const chunksRef = useRef([])

  useEffect(() => {
    return () => {
      micRef.current?.stop()
      vadUnsubRef.current?.()
    }
  }, [])

  const ensureModels = async () => {
    const categories = [ModelCategory.SpeechRecognition, ModelCategory.Language, ModelCategory.SpeechSynthesis]
    for (const cat of categories) {
      if (!ModelManager.getLoadedModel(cat)) {
        const models = ModelManager.getModels().filter(m => m.modality === cat && m.status === 'downloaded')
        if (models.length > 0) {
          await ModelManager.loadModel(models[0].id, { coexist: true })
        }
      }
    }
    const ok = categories.every(cat => !!ModelManager.getLoadedModel(cat))
    setSttReady(ok)
    return ok
  }

  const getAIResponse = async (text) => {
    const llm = ModelManager.getLoadedModel(ModelCategory.Language)
    if (!llm) return null

    const prompt = `You are a compassionate journaling companion. The user just shared this journal entry: "${text}"
Respond with 2-3 sentences of warm empathy and one gentle reflection question. Keep it brief and supportive.
Response:`

    try {
      const response = await llm.generateText(prompt, { maxTokens: 100, stop: ['\n\n'] })
      return response.trim()
    } catch (e) {
      console.error('LLM failed:', e)
      return null
    }
  }

  const speakResponse = async (text) => {
    const tts = ModelManager.getLoadedModel(ModelCategory.SpeechSynthesis)
    if (!tts) return
    try {
      const { audio, sampleRate } = await tts.synthesize(text)
      const player = new AudioPlayback({ sampleRate })
      await player.play(audio, sampleRate)
      player.dispose()
    } catch (e) {
      console.error('TTS failed:', e)
    }
  }

  const startRecording = useCallback(async () => {
    const ok = sttReady || await ensureModels()
    if (!ok) {
      alert("Voice models not ready. Please download them first.")
      return
    }
    setRecording(true)
    chunksRef.current = []
    const mic = new AudioCapture({ sampleRate: 16000 })
    micRef.current = mic
    VAD.reset()
    vadUnsubRef.current = VAD.onSpeechActivity((activity) => {
      if (activity === SpeechActivity.Ended) {
        const seg = VAD.popSpeechSegment()
        if (seg && seg.samples.length > 400) {
          chunksRef.current.push(...Array.from(seg.samples))
        }
      }
    })
    await mic.start((chunk) => VAD.processSamples(chunk))
  }, [sttReady])

  const stopRecording = useCallback(async () => {
    micRef.current?.stop()
    vadUnsubRef.current?.()
    setRecording(false)

    const finalSeg = VAD.popSpeechSegment()
    if (finalSeg && finalSeg.samples.length > 400) {
      chunksRef.current.push(...Array.from(finalSeg.samples))
    }

    if (chunksRef.current.length < 1600) return
    setProcessing(true)

    try {
      const { STT } = await import('@runanywhere/web-onnx')
      const audio = new Float32Array(chunksRef.current)
      const result = await STT.transcribe(audio, { language: getLang() === 'hi' ? 'hi' : 'en' })
      const text = result.text?.trim()
      
      if (text) {
        const aiResponse = await getAIResponse(text)
        const memo = {
          id: Date.now(),
          text,
          aiResponse,
          timestamp: new Date().toISOString(),
          duration: Math.round(chunksRef.current.length / 16000),
        }
        const updated = [memo, ...memos]
        setMemos(updated)
        saveMemos(updated)
        if (aiResponse) speakResponse(aiResponse)
      }
    } catch (e) {
      console.error('Processing failed:', e)
    } finally {
      setProcessing(false)
    }
  }, [memos])

  const deleteMemo = (id) => {
    const updated = memos.filter(m => m.id !== id)
    setMemos(updated)
    saveMemos(updated)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, padding: '20px 0' }}>
        <button 
          onClick={recording ? stopRecording : startRecording}
          disabled={processing}
          style={{
            width: 80, height: 80, borderRadius: '50%',
            background: recording ? '#EF4444' : 'rgba(255, 255, 255, 0.05)',
            border: `2px solid ${recording ? '#EF4444' : theme.primary + '30'}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 32, cursor: processing ? 'default' : 'pointer',
            boxShadow: recording ? `0 0 30px #EF444450` : 'none',
            transition: 'all 0.3s', outline: 'none',
          }}
        >
          {processing ? '⏳' : recording ? '⏹️' : '🎙️'}
        </button>
        <div style={{ fontSize: 13, color: theme.textMuted, textAlign: 'center' }}>
          {processing ? 'AI is reflecting...' : recording ? t('recording_tap_stop') : t('tap_to_record')}
        </div>
      </div>

      {memos.length === 0 ? (
        <div style={{ textAlign: 'center', color: theme.textMuted, fontSize: 13, padding: '16px 0' }}>
          {t('empty_memos')}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {memos.map(memo => (
            <div key={memo.id} style={{
              padding: '16px', background: 'rgba(255,255,255,0.03)',
              borderRadius: 16, border: `1px solid ${theme.primary}15`,
              animation: 'fadeIn 0.4s both'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
                <span style={{ fontSize: 11, color: theme.textMuted, letterSpacing: 0.5 }}>
                  {new Date(memo.timestamp).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  {memo.duration ? ` · ${memo.duration}s` : ''}
                </span>
                <button onClick={() => deleteMemo(memo.id)} style={{ background: 'none', border: 'none', color: '#475569', fontSize: 18, cursor: 'pointer', padding: 0, lineWeight: 1 }}>×</button>
              </div>
              <div style={{ fontSize: 15, color: theme.text, lineHeight: 1.6, marginBottom: memo.aiResponse ? 14 : 0 }}>
                {memo.text}
              </div>
              {memo.aiResponse && (
                <div style={{ 
                  marginTop: 12, paddingTop: 12, borderTop: `1px dashed ${theme.primary}20`,
                  fontSize: 14, color: theme.primary, lineHeight: 1.6,
                  fontStyle: 'italic', display: 'flex', gap: 10
                }}>
                  <span style={{ flexShrink: 0 }}>✨</span>
                  <span>{memo.aiResponse}</span>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  )
}

