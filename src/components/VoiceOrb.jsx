import React from 'react';

const VoiceOrb = ({ voiceState, audioLevel = 0, mode = 'idle' }) => {
  // Mode-based colors for the inner circle
  const modeColors = {
    focus: '#FF5500',
    break: '#14B8A6',
    journal: '#8B5CF6',
    idle: '#334155',
  };

  // State-based styles for the outer orb
  const orbStyles = {
    width: '120px',
    height: '120px',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
    position: 'relative',
    margin: '0 auto',
  };

  // Dynamic overrides based on voiceState
  const getDynamicOrbStyle = () => {
    switch (voiceState) {
      case 'listening':
        return {
          backgroundColor: '#FF5500',
          boxShadow: '0 0 40px rgba(255, 85, 0, 0.4)',
          transform: `scale(${1 + audioLevel * 0.3})`,
          animation: 'orb-pulse 1.5s ease-in-out infinite',
        };
      case 'processing':
        return {
          backgroundColor: '#F59E0B',
          boxShadow: '0 0 20px rgba(245, 158, 11, 0.3)',
          animation: 'orb-spin 2s linear infinite',
        };
      case 'speaking':
        return {
          backgroundColor: '#22C55E',
          boxShadow: '0 0 30px rgba(34, 197, 94, 0.4)',
          animation: 'orb-gentle-pulse 2s ease-in-out infinite',
        };
      case 'idle':
      default:
        return {
          backgroundColor: '#1E293B',
          boxShadow: 'none',
        };
    }
  };

  const innerCircleStyle = {
    width: '80px',
    height: '80px',
    borderRadius: '50%',
    backgroundColor: modeColors[mode] || modeColors.idle,
    transition: 'all 0.5s ease',
    opacity: voiceState === 'idle' ? 0.6 : 1,
    boxShadow: 'inset 0 2px 10px rgba(0,0,0,0.2)',
  };

  return (
    <div style={{ padding: '40px 0', width: '100%', display: 'flex', justifyContent: 'center' }}>
      <style>
        {`
          @keyframes orb-pulse {
            0% { transform: scale(1); }
            50% { transform: scale(1.05); }
            100% { transform: scale(1); }
          }
          @keyframes orb-gentle-pulse {
            0% { transform: scale(1); opacity: 0.9; }
            50% { transform: scale(1.02); opacity: 1; }
            100% { transform: scale(1); opacity: 0.9; }
          }
          @keyframes orb-spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
        `}
      </style>
      <div style={{ ...orbStyles, ...getDynamicOrbStyle() }}>
        <div style={innerCircleStyle} />
      </div>
    </div>
  );
};

export default VoiceOrb;
