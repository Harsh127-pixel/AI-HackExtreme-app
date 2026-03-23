import React from 'react';

const PomodoroRing = ({ progress, formattedTime, phase, isRunning, pomodoroCount }) => {
  const radius = 88;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - progress);
  const color = phase === 'focus' ? '#FF5500' : '#14B8A6';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '20px', padding: '8px 0 0' }}>
      <div style={{ position: 'relative', width: '200px', height: '200px' }}>
        <svg width="200" height="200" viewBox="0 0 200 200" style={{ transform: 'rotate(-90deg)' }}>
          {/* Background circle */}
          <circle
            cx="100"
            cy="100"
            r={radius}
            stroke="var(--border-default)"
            strokeWidth="8"
            fill="transparent"
          />
          {/* Progress arc */}
          <circle
            cx="100"
            cy="100"
            r={radius}
            stroke={color}
            strokeWidth="8"
            fill="transparent"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
            style={{ 
              transition: 'stroke-dashoffset 0.5s ease-out, stroke 0.3s ease',
            }}
          />
        </svg>

        {/* Center text overlay */}
        <div style={{
          position: 'absolute',
          top: 0, left: 0, right: 0, bottom: 0,
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          userSelect: 'none'
        }}>
          <span style={{ fontSize: '36px', fontWeight: '800', color: 'white', lineHeight: '1' }}>
            {formattedTime}
          </span>
          <span style={{ 
            fontSize: '11px', 
            fontWeight: '700', 
            color: '#94A3B8', 
            textTransform: 'uppercase', 
            letterSpacing: '2px',
            marginTop: '4px'
          }}>
            {phase}
          </span>
        </div>
      </div>

      {/* Pomodoro count visualization */}
      <div style={{ 
        display: 'flex', 
        gap: '6px', 
        height: '24px', 
        alignItems: 'center',
        padding: '4px 12px',
        background: 'rgba(255,255,255,0.03)',
        borderRadius: '12px'
      }}>
        {pomodoroCount === 0 && <span style={{ fontSize: '11px', color: '#475569', opacity: 0.6 }}>No sessions today</span>}
        {Array.from({ length: Math.min(8, pomodoroCount) }).map((_, i) => (
          <span key={i} style={{ fontSize: '16px' }} role="img" aria-label="pomodoro">🍅</span>
        ))}
        {pomodoroCount > 8 && <span style={{ fontSize: '11px', color: '#94A3B8' }}>+{pomodoroCount - 8}</span>}
      </div>
    </div>
  );
};

export default PomodoroRing;
