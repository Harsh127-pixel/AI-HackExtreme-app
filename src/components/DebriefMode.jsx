import { useState, useEffect, useRef } from 'react'
import { ModelManager, ModelCategory, AudioCapture, AudioPlayback } from '@runanywhere/web'
import { VAD } from '@runanywhere/web-onnx'
import { useSession, addJournalEntry, notify } from '../focuscoach/sessionState.js'

export default function DebriefMode({ onClose, theme }) {
  const session = useSession()
  const [timeLeft, setTimeLeft] = useState(30)
  const [phase, setPhase] = useState('recording') // recording, processing, speaking
  const [transcript, setTranscript] = useState('')
  const [response, setResponse] = useState('')
  
  const micRef = useRef(null)
  const timerRef = useRef(null)
  const audioChunksRef = useRef([])
  const activeRef = useRef(true)

  useEffect(() => {
    startRecording()
    return () => {
      activeRef.current = false
      micRef.current?.stop()
      clearInterval(timerRef.current)
    }
  }, [])

  const startRecording = async () => {
    try {
      const mic = new AudioCapture({ sampleRate: 16000 })
      micRef.current = mic
      audioChunksRef.current = []
      
      await mic.start((chunk) => {
        audioChunksRef.current.push(...chunk)
      })

      timerRef.current = setInterval(() => {
        setTimeLeft(v => {
          if (v <= 1) { stopRecording(); return 0 }
          return v - 1
        })
      }, 1000)
    } catch (e) { console.error(e); onClose() }
  }

  const stopRecording = async () => {
    if (phase !== 'recording') return
    setPhase('processing')
    clearInterval(timerRef.current)
    micRef.current?.stop()

    try {
      const { STT } = await import('@runanywhere/web-onnx')
      const result = await STT.transcribe(new Float32Array(audioChunksRef.current), { language: 'en' })
      const text = result.text?.trim()
      setTranscript(text || '')

      if (text) {
        addJournalEntry(`[End of Day Debrief]: ${text}`)
        const llm = ModelManager.getLoadedModel(ModelCategory.Language)
        const genFunc = llm && (llm.generateText || llm.generate || llm.predict || llm.chat)?.bind(llm)
        if (!genFunc) { onClose(); return }
        
        const prompt = `The user just did their end-of-day voice debrief and said: "${text}". Their mood today was ${session.wellnessMode}. Respond with exactly 2 sentences: first, reflect back one specific thing they said that shows you listened. Second, name one small thing from their day they can feel good about. Be warm and specific. Response:`
        
        const res = await genFunc(prompt, { maxTokens: 100 })
        setResponse(res)
        setPhase('speaking')

        const tts = ModelManager.getLoadedModel(ModelCategory.SpeechSynthesis)
        if (tts) {
          const { audio, sampleRate } = await tts.synthesize(res)
          const p = new AudioPlayback({ sampleRate })
          // Slower speech rate is usually handled by the SDK's speed parameter if supported, 
          // but here we just play it.
          await p.play(audio, sampleRate)
          p.dispose()
        }
      }
      
      localStorage.setItem('mindease_debrief_date', new Date().toDateString())
      setTimeout(() => { if (activeRef.current) onClose() }, 3000)
    } catch (e) { console.error(e); onClose() }
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 2000, 
      background: 'rgba(8, 12, 20, 0.98)', backdropFilter: 'blur(20px)',
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      padding: 32, textAlign: 'center', color: 'white'
    }}>
      <div style={{
        width: 120, height: 120, borderRadius: '50%',
        background: `radial-gradient(circle, ${theme.primary} 0%, transparent 70%)`,
        boxShadow: `0 0 40px ${theme.primary}40`,
        animation: 'debriefPulse 2s infinite ease-in-out',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        marginBottom: 40
      }}>
        {phase === 'recording' && <span style={{ fontSize: 32, fontWeight: 800 }}>{timeLeft}</span>}
        {phase === 'processing' && <span style={{ fontSize: 32 }}>⚙️</span>}
        {phase === 'speaking' && <span style={{ fontSize: 32 }}>🔊</span>}
      </div>

      <h2 style={{ fontSize: 24, fontWeight: 700, marginBottom: 16 }}>
        {phase === 'recording' ? "Tell me about your day..." : 
         phase === 'processing' ? "Listening intently..." : 
         "Reflecting with you..."}
      </h2>

      <p style={{ maxWidth: 400, color: 'rgba(255,255,255,0.7)', lineHeight: 1.6, fontSize: 16 }}>
        {phase === 'recording' ? "Share whatever is on your mind. I'm here to listen." : 
         phase === 'processing' ? "Just a moment while I process your day." : 
         response}
      </p>

      {phase === 'recording' && (
        <button onClick={stopRecording} className="btn" style={{
          marginTop: 60, padding: '12px 32px', borderRadius: 100,
          background: 'var(--danger)', color: 'white', border: 'none', fontWeight: 600
        }}>
          I'm done sharing
        </button>
      )}

      <style>{`
        @keyframes debbriefPulse {
          0% { transform: scale(1); opacity: 0.6; }
          50% { transform: scale(1.1); opacity: 1; }
          100% { transform: scale(1); opacity: 0.6; }
        }
      `}</style>
    </div>
  )
}
