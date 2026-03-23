import React from 'react';
import useJournal from '../focuscoach/useJournal.js';

const JournalPanel = () => {
  const { last7Days, clearEntries } = useJournal();

  const formatTime = (isoString) => {
    try {
      return new Date(isoString).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
    } catch(e) {
      return '00:00';
    }
  };

  const formatDate = (isoString) => {
    try {
      const date = new Date(isoString);
      const now = new Date();
      if (date.toDateString() === now.toDateString()) return 'Today';
      return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    } catch(e) {
      return '';
    }
  };

  return (
    <div style={{ 
      padding: '24px', 
      borderRadius: '16px', 
      background: 'var(--bg-card)', 
      border: '1px solid var(--border)', 
      width: '100%',
      display: 'flex', 
      flexDirection: 'column',
      maxHeight: '400px',
      boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
    }}>
      <h2 style={{ fontSize: '18px', color: 'white', fontWeight: '700', marginBottom: '20px' }}>Session Journal</h2>

      <div style={{ flex: '1', overflowY: 'auto', paddingRight: '4px' }} className="custom-scroll">
        {last7Days.length === 0 ? (
          <div style={{ 
            textAlign: 'center', 
            padding: '40px 20px', 
            color: '#64748B', 
            fontSize: '14px',
            fontStyle: 'italic',
            lineHeight: '1.5'
          }}>
            No entries yet. Complete a session to see your reflections.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0px' }}>
            {[...last7Days].reverse().map((entry, i) => (
              <div key={entry.id} style={{ 
                borderBottom: i === last7Days.length - 1 ? 'none' : '1px solid rgba(255,255,255,0.05)', 
                paddingBottom: '16px',
                paddingTop: i === 0 ? '0' : '16px'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', alignItems: 'center' }}>
                  <span style={{ fontSize: '11px', color: 'var(--primary)', fontWeight: '700', textTransform: 'uppercase' }}>
                    {formatTime(entry.timestamp)}
                  </span>
                  <span style={{ fontSize: '11px', color: '#475569', fontWeight: '500' }}>
                    {formatDate(entry.timestamp)}
                  </span>
                </div>
                <p style={{ 
                  fontSize: '14px', 
                  color: 'var(--text)', 
                  lineHeight: '1.6',
                  margin: '0',
                  opacity: 0.9 
                }}>
                  {entry.text}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>

      {last7Days.length > 0 && (
        <button
          onClick={clearEntries}
          style={{ 
            marginTop: '20px',
            padding: '8px', 
            background: 'transparent', 
            border: 'none', 
            color: '#475569', 
            fontSize: '11px', 
            cursor: 'pointer',
            textAlign: 'center',
            textDecoration: 'underline',
            alignSelf: 'center'
          }}
        >
          Clear all entries
        </button>
      )}
    </div>
  );
};

export default JournalPanel;
