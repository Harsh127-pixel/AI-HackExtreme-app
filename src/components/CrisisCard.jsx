import React, { useEffect } from 'react';

export default function CrisisCard({ onDismiss }) {
  useEffect(() => {
    localStorage.setItem('mindease_last_crisis', Date.now().toString())
  }, [])
  return (
    <div style={{
      margin: '0 16px',
      background: 'rgba(139,92,246,0.08)',
      border: '1px solid rgba(139,92,246,0.25)',
      borderRadius: 'var(--radius-lg)',
      animation: 'slideUp 0.3s both',
      padding: '16px 18px',
      display: 'flex',
      flexDirection: 'column',
      gap: 10,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ fontSize: 18 }}>💜</span>
        <span style={{ color: '#C4B5FD', fontSize: 14, fontWeight: 600 }}>You're not alone</span>
      </div>
      <p style={{ color: '#E2E8F0', fontSize: 13, lineHeight: 1.6, margin: 0 }}>
        It sounds like you might be going through something really hard right now.
        That takes courage to express. Please consider reaching out to someone you trust,
        or contact a free support line.
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <a
          href="https://www.iCall.iitb.ac.in"
          target="_blank"
          rel="noopener noreferrer"
          style={{ color: '#A78BFA', fontSize: 13, textDecoration: 'none' }}
        >
          📞 iCall (India) — 9152987821
        </a>
        <a
          href="https://www.vandrevalafoundation.com"
          target="_blank"
          rel="noopener noreferrer"
          style={{ color: '#A78BFA', fontSize: 13, textDecoration: 'none' }}
        >
          📞 Vandrevala Foundation — 1860-2662-345 (24/7)
        </a>
        <a
          href="https://icallhelpline.org"
          target="_blank"
          rel="noopener noreferrer"
          style={{ color: '#A78BFA', fontSize: 13, textDecoration: 'none' }}
        >
          💬 Chat support — icallhelpline.org
        </a>
      </div>
      <button
        onClick={onDismiss}
        style={{ alignSelf: 'flex-start', background: 'none', border: '1px solid #475569', borderRadius: 6, color: '#94A3B8', fontSize: 12, padding: '4px 10px', cursor: 'pointer', marginTop: 4 }}
      >
        I'm okay, continue
      </button>
    </div>
  )
}
