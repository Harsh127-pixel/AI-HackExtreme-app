import { useState, useEffect } from 'react'
import { ModelManager, ModelCategory } from '@runanywhere/web'

export default function OfflineStatus({ theme }) {
  const [isOnline, setIsOnline] = useState(navigator.onLine)
  const [allLoaded, setAllLoaded] = useState(false)

  useEffect(() => {
    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    
    const checkModels = setInterval(() => {
      const cats = [
        ModelCategory.Audio, 
        ModelCategory.SpeechRecognition, 
        ModelCategory.Language, 
        ModelCategory.SpeechSynthesis
      ]
      const loaded = cats.every(cat => !!ModelManager.getLoadedModel(cat))
      setAllLoaded(loaded)
    }, 2000)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
      clearInterval(checkModels)
    }
  }, [])

  // Case 1: Online but models not yet fully loaded - stay quiet
  if (isOnline && !allLoaded) return null

  let config = {
    label: '',
    color: '',
    bg: '',
    icon: '',
    pulse: 'subtlePulse'
  }

  if (isOnline && allLoaded) {
    config = {
      label: 'Fully Offline Ready',
      color: '#22C55E',
      bg: 'rgba(34, 197, 94, 0.1)',
      icon: '🔒',
      pulse: 'subtlePulse'
    }
  } else if (!isOnline && allLoaded) {
    config = {
      label: 'Running Offline',
      color: '#22C55E',
      bg: 'rgba(34, 197, 94, 0.2)',
      icon: '✈️',
      pulse: 'strongPulse'
    }
  } else if (!isOnline && !allLoaded) {
    config = {
      label: 'No Connection',
      color: '#EF4444',
      bg: 'rgba(239, 68, 68, 0.1)',
      icon: '⚠️',
      pulse: 'none'
    }
  }

  return (
    <div style={{
      position: 'fixed',
      top: 20,
      right: 20,
      zIndex: 1000,
      display: 'flex',
      alignItems: 'center',
      gap: 8,
      padding: '6px 14px',
      borderRadius: '20px',
      background: config.bg,
      border: `1px solid ${config.color}40`,
      color: config.color,
      fontSize: '12px',
      fontWeight: 600,
      backdropFilter: 'blur(8px)',
      boxShadow: `0 4px 12px rgba(0,0,0,0.2)`,
      animation: config.pulse === 'none' ? 'none' : `${config.pulse} 2s infinite ease-in-out`,
      pointerEvents: 'none'
    }}>
      <span>{config.icon}</span>
      <span>{config.label}</span>

      <style>{`
        @keyframes subtlePulse {
          0% { transform: scale(1); opacity: 0.9; }
          50% { transform: scale(1.02); opacity: 1; }
          100% { transform: scale(1); opacity: 0.9; }
        }
        @keyframes strongPulse {
          0% { transform: scale(1); box-shadow: 0 0 0 0 rgba(34, 197, 94, 0.4); opacity: 0.8; }
          50% { transform: scale(1.05); box-shadow: 0 0 20px 5px rgba(34, 197, 94, 0.2); opacity: 1; }
          100% { transform: scale(1); box-shadow: 0 0 0 0 rgba(34, 197, 94, 0.4); opacity: 0.8; }
        }
      `}</style>
    </div>
  )
}
