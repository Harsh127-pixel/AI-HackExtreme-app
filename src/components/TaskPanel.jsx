import React, { useState } from 'react';
import { completeStep, resetSession } from '../focuscoach/sessionState.js';

const TaskPanel = ({ session, onTaskSet }) => {
  const [inputValue, setInputValue] = useState('');

  const handleBreakDown = () => {
    if (inputValue.trim()) {
      onTaskSet(inputValue.trim());
      setInputValue('');
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') handleBreakDown();
  };

  const handleClearTask = () => {
    resetSession();
    onTaskSet('');
  };

  return (
    <div style={{ 
      padding: '24px', 
      borderRadius: '16px', 
      background: 'var(--bg-card)', 
      border: '1px solid var(--border)', 
      width: '100%',
      boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
    }}>
      {session.steps.length === 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', textAlign: 'center' }}>
          <h2 style={{ fontSize: '18px', color: 'white', fontWeight: '700' }}>Break it down</h2>
          <p style={{ fontSize: '14px', color: '#94A3B8' }}>What are we focusing on right now?</p>
          <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
            <input
              style={{
                flex: '1',
                padding: '12px 14px',
                borderRadius: '8px',
                background: '#334155',
                border: '1px solid #475569',
                color: 'white',
                outline: 'none',
                fontSize: '14px',
                transition: 'border-color 0.2s'
              }}
              onFocus={(e) => e.target.style.borderColor = 'var(--primary)'}
              onBlur={(e) => e.target.style.borderColor = '#475569'}
              placeholder="e.g. Write user research summary"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyPress={handleKeyPress}
            />
            <button
              onClick={handleBreakDown}
              className="btn btn-primary"
              style={{
                padding: '0 20px',
                borderRadius: '8px',
                border: 'none',
                cursor: 'pointer',
                fontWeight: '600',
                fontSize: '13px'
              }}
            >
              Start
            </button>
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div>
            <span style={{ fontSize: '10px', color: 'var(--primary)', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '1px' }}>Current Mission</span>
            <h2 style={{ fontSize: '20px', color: 'white', fontWeight: '800', marginTop: '4px' }}>{session.currentTask}</h2>
          </div>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {session.steps.map((step, index) => {
              const isCurrent = index === session.currentStepIndex;
              return (
                <div
                  key={step.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    padding: '14px 16px',
                    borderRadius: '10px',
                    background: isCurrent ? 'rgba(255, 85, 0, 0.08)' : 'rgba(255,255,255,0.02)',
                    border: '1px solid',
                    borderColor: isCurrent ? 'var(--primary)' : 'rgba(255,255,255,0.05)',
                    borderLeftWidth: isCurrent ? '4px' : '1px',
                    opacity: step.done ? 0.5 : 1,
                    transition: 'all 0.3s ease'
                  }}
                >
                  <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', flex: '1', gap: '12px' }}>
                    <input
                      type="checkbox"
                      checked={step.done}
                      onChange={() => completeStep(step.id)}
                      style={{
                        width: '18px',
                        height: '18px',
                        accentColor: 'var(--primary)',
                      }}
                    />
                    <span style={{
                      fontSize: '15px',
                      color: 'white',
                      textDecoration: step.done ? 'line-through' : 'none',
                      fontWeight: isCurrent ? '600' : '400'
                    }}>
                      {step.text}
                    </span>
                  </label>
                </div>
              );
            })}
          </div>

          <button
            onClick={handleClearTask}
            style={{
              padding: '8px 12px',
              background: 'transparent',
              border: 'none',
              color: '#64748B',
              fontSize: '11px',
              textDecoration: 'underline',
              cursor: 'pointer',
              alignSelf: 'center',
              marginTop: '8px'
            }}
          >
            Clear and reset tasks
          </button>
        </div>
      )}
    </div>
  );
};

export default TaskPanel;
