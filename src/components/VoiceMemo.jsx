import { useState, useRef, useCallback } from 'react'
import { ModelCategory, ModelManager, AudioCapture, SpeechActivity, EventBus } from '@runanywhere/web'
import { VAD } from '@runanywhere/web-onnx'

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
  const [transcribing, setTranscribing] = useState(false)
  const [sttReady, setSttReady] = useState(() => !!ModelManager.getLoadedModel(ModelCategory.SpeechRecognition))
  const micRef = useRef(null)
  const vadUnsubRef = useRef(null)
  const chunksRef = useRef([])

  const ensureSTT = async () => {
    if (ModelManager.getLoadedModel(ModelCategory.SpeechRecognition)) { setSttReady(true); return true }
    const models = ModelManager.getModels().filter(m => m.modality === ModelCategory.SpeechRecognition)
    if (!models.length) return false
    const model = models[0]
    if (model.status !== 'downloaded' && model.status !== 'loaded') {
      const unsub = EventBus.shared.on('model.downloadProgress', () => {})
      await ModelManager.downloadModel(model.id)
      unsub()
    }
    const ok = await ModelManager.loadModel(model.id, { coexist: true })
    setSttReady(ok)
    return ok
  }

  const startRecording = useCallback(async () => {
    const ok = sttReady || await ensureSTT()
    if (!ok) return
    setRecording(true)
    chunksRef.current = []
    const mic = new AudioCapture({ sampleRate: 16000 })
    micRef.current = mic
    VAD.reset()
    vadUnsubRef.current = VAD.onSpeechActivity(async (activity) => {
      if (activity === SpeechActivity.Ended) {
        const seg = VAD.popSpeechSegment()
        if (seg && seg.samples.length > 1600) {
          chunksRef.current.push(...seg.samples)
        }
      }
    })
    await mic.start((chunk) => VAD.processSamples(chunk), () => {})
  }, [sttReady])

  const stopRecording = useCallback(async () => {
    micRef.current?.stop()
    vadUnsubRef.current?.()
    setRecording(false)
    if (chunksRef.current.length === 0) return
    setTranscribing(true)

    try {
      const { STT } = await import('@runanywhere/web-onnx')
      const audio = new Float32Array(chunksRef.current)
      const result = await STT.transcribe(audio, { language: 'en' })
      if (result.text?.trim()) {
        const memo = {
          id: Date.now(),
          text: result.text.trim(),
          timestamp: new Date().toISOString(),
          duration: Math.round(chunksRef.current.length / 16000),
        }
        const updated = [memo, ...memos]
        setMemos(updated)
        saveMemos(updated)
      }
    } catch (e) {}
    setTranscribing(false)
  }, [memos])

  const deleteMemo = (id) => {
    const updated = memos.filter(m => m.id !== id)
    setMemos(updated)
    saveMemos(updated)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, padding: '20px 0' }}>
        <div style={{
          width: 80, height: 80, borderRadius: '50%',
          background: recording ? '#EF444433' : theme.bgCard,
          border: `2px solid ${recording ? '#EF4444' : theme.border}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 32, cursor: 'pointer',
          boxShadow: recording ? '0 0 30px rgba(239,68,68,0.3)' : 'none',
          transition: 'all 0.3s',
          animation: recording ? 'pulse 1.5s ease-in-out infinite' : 'none',
        }} onClick={recording ? stopRecording : startRecording}>
          {transcribing ? '⏳' : recording ? '⏹️' : '🎙️'}
        </div>
        <div style={{ fontSize: 13, color: theme.textMuted }}>
          {transcribing ? 'Transcribing...' : recording ? 'Recording — tap to stop' : 'Tap to record a voice memo'}
        </div>
      </div>

      {memos.length === 0 ? (
        <div style={{ textAlign: 'center', color: theme.textMuted, fontSize: 13, padding: '16px 0' }}>
          Your voice memos will appear here
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {memos.map(memo => (
            <div key={memo.id} style={{
              padding: '12px 14px', background: theme.bgCard,
              borderRadius: 12, border: `1px solid ${theme.border}`,
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                <span style={{ fontSize: 11, color: theme.textMuted }}>
                  {new Date(memo.timestamp).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  {memo.duration ? ` · ${memo.duration}s` : ''}
                </span>
                <button onClick={() => deleteMemo(memo.id)} style={{ background: 'none', border: 'none', color: theme.textMuted, fontSize: 14, cursor: 'pointer', padding: 0 }}>×</button>
              </div>
              <div style={{ fontSize: 14, color: theme.text, lineHeight: 1.5 }}>{memo.text}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
