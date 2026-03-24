import { useState, useEffect, useRef } from 'react'
import { ModelManager, ModelCategory, AudioPlayback, EventBus } from '@runanywhere/web'
import { session, notify } from '../focuscoach/sessionState.js'
import buildSystemPrompt from '../focuscoach/systemPrompt.js'

export default function SleepStoryPlayer({ theme, onClose }) {
  const [status, setStatus] = useState('Preparing AI...')
  const [sentences, setSentences] = useState([])
  const [currentIndex, setCurrentIndex] = useState(-1)
  const [isDone, setIsDone] = useState(false)
  const playbackRef = useRef(null)
  const activeRef = useRef(true)

  useEffect(() => {
    async function startStory() {
      try {
        const categories = [ModelCategory.Language, ModelCategory.SpeechSynthesis]
        for (const cat of categories) {
           if (!ModelManager.getLoadedModel(cat)) {
              const models = ModelManager.getModels().filter(m => m.modality === cat)
              if (models.length > 0) {
                 await ModelManager.loadModel(models[0].id, { coexist: true })
              }
           }
        }

        const llm = ModelManager.getLoadedModel(ModelCategory.Language)
        if (!llm) { setStatus('Language Engine Offline'); return }
        
        setStatus('Dreaming up a story...')
        const prompt = buildSystemPrompt(session)
        const genFunc = (llm.generateText || llm.generate || llm.predict || llm.chat)?.bind(llm)
        if (!genFunc) { setStatus('Logic engine mismatch'); return }
        const story = await genFunc(`${prompt}\nMindease: Close your eyes.`, { maxTokens: 300, temperature: 0.7 })
        
        if (!activeRef.current) return

        // Clean up and split sentences
        let cleanStory = story.trim()
        if (!cleanStory.startsWith('Close your eyes')) cleanStory = 'Close your eyes. ' + cleanStory
        
        const parts = cleanStory.match(/[^.!?]+[.!?]+/g) || [cleanStory]
        setSentences(parts)
        setStatus('Story starts...')
        
        const tts = ModelManager.getLoadedModel(ModelCategory.SpeechSynthesis)
        if (!tts) { setStatus('Voice Engine Offline'); return }

        const synthFunc = (tts.synthesize || tts.generate || tts.speak)?.bind(tts)
        if (!synthFunc) { setStatus('Voice Logic Mismatch'); return }

        for (let i = 0; i < parts.length; i++) {
          if (!activeRef.current) break
          setCurrentIndex(i)
          const { audio, sampleRate } = await synthFunc(parts[i])
          const p = new AudioPlayback({ sampleRate })
          playbackRef.current = p
          await p.play(audio, sampleRate)
          p.dispose()
          await new Promise(r => setTimeout(r, 2000))
        }

        if (!activeRef.current) return
        setStatus('Rest well.')
        const { audio: finalAudio, sampleRate: sr } = await synthFunc("Rest well.")
        const pf = new AudioPlayback({ sampleRate: sr })
        await pf.play(finalAudio, sr)
        pf.dispose()
        
        setIsDone(true)
        setTimeout(() => {
           if (!activeRef.current) return
           session.mode = 'idle'
           notify()
           onClose()
        }, 3000)

      } catch (err) {
        console.error('[SleepStoryPlayer] Error:', err)
        setStatus('Something unexpected happened')
      }
    }
    
    startStory()
    return () => {
      activeRef.current = false
      playbackRef.current?.dispose()
    }
  }, [])

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 1000,
      background: 'rgba(8, 12, 24, 0.98)',
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      color: 'white', overflow: 'hidden', padding: '40px 32px', textAlign: 'center'
    }}>
      <style>{`
        .star { position: absolute; background: white; border-radius: 50%; opacity: 0; animation: twinkle var(--d) infinite; }
        @keyframes twinkle { 0%, 100% { opacity: 0; transform: scale(0.5); } 50% { opacity: 0.8; transform: scale(1.2); } }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
      `}</style>
      
      {Array.from({ length: 60 }).map((_, i) => (
        <div key={i} className="star" style={{
          left: `${Math.random() * 100}%`,
          top: `${Math.random() * 100}%`,
          width: Math.random() * 3, height: Math.random() * 3,
          '--d': `${2 + Math.random() * 5}s`,
          animationDelay: `${Math.random() * 7}s`
        }} />
      ))}

      <div style={{ fontSize: 72, marginBottom: 24, filter: 'drop-shadow(0 0 20px rgba(129, 140, 248, 0.4))' }}>🌙</div>
      <h2 style={{ fontSize: 28, fontWeight: 800, letterSpacing: '-0.5px' }}>MindEase Bedtime</h2>
      
      <div style={{ minHeight: 120, display: 'flex', alignItems: 'center', justifyContent: 'center', marginTop: 24 }}>
        <p style={{ fontSize: 18, color: '#CBD5E1', maxWidth: 450, lineHeight: 1.6, animation: 'fadeIn 1s' }}>
          {currentIndex >= 0 ? sentences[currentIndex] : status}
        </p>
      </div>

      {!isDone && (
        <button onClick={() => { session.mode = 'idle'; notify(); onClose() }} style={{
          marginTop: 80, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
          color: '#94A3B8', padding: '12px 32px', borderRadius: 24, cursor: 'pointer', fontSize: 14, fontWeight: 600
        }}>
          Stop Story
        </button>
      )}
    </div>
  )
}
