export default function ExportData({ theme }) {

  const exportAll = () => {
    try {
      const data = {
        exportedAt: new Date().toISOString(),
        moodHistory: JSON.parse(localStorage.getItem('focuscoach_mood') || '[]'),
        journalEntries: JSON.parse(localStorage.getItem('focuscoach_journal') || '[]'),
        gratitudeEntries: JSON.parse(localStorage.getItem('mindease_gratitude') || '[]'),
        reframingHistory: JSON.parse(localStorage.getItem('mindease_reframing') || '[]'),
        thoughtDiary: JSON.parse(localStorage.getItem('mindease_thoughts') || '[]'),
        voiceMemos: JSON.parse(localStorage.getItem('mindease_voicememos') || '[]'),
        savedAffirmations: JSON.parse(localStorage.getItem('mindease_saved_affirmations') || '[]'),
        streak: JSON.parse(localStorage.getItem('mindease_streak') || '{}'),
      }

      // Build human-readable text
      let text = `MindEase — My Data Export\n`
      text += `Exported: ${new Date().toLocaleString()}\n`
      text += `${'='.repeat(50)}\n\n`

      text += `MOOD HISTORY (${data.moodHistory.length} entries)\n${'-'.repeat(30)}\n`
      data.moodHistory.forEach(e => { text += `${new Date(e.timestamp).toLocaleDateString()} — ${e.mood}\n` })

      text += `\nJOURNAL ENTRIES (${data.journalEntries.length} entries)\n${'-'.repeat(30)}\n`
      data.journalEntries.forEach(e => { text += `${new Date(e.timestamp).toLocaleString()}\n${e.text}\n\n` })

      text += `GRATITUDE LOG (${data.gratitudeEntries.length} entries)\n${'-'.repeat(30)}\n`
      data.gratitudeEntries.forEach(e => { text += `${new Date(e.timestamp).toLocaleDateString()}\n${e.items?.join('\n') || ''}\n\n` })

      text += `THOUGHT DIARY (${data.thoughtDiary.length} entries)\n${'-'.repeat(30)}\n`
      data.thoughtDiary.forEach(e => {
        text += `${new Date(e.timestamp).toLocaleDateString()}\n`
        if (e.happened) text += `What happened: ${e.happened}\n`
        if (e.thought) text += `My thought: ${e.thought}\n`
        if (e.reframe) text += `Reframe: ${e.reframe}\n`
        text += '\n'
      })

      text += `AFFIRMATIONS (${data.savedAffirmations.length} saved)\n${'-'.repeat(30)}\n`
      data.savedAffirmations.forEach(a => { text += `• ${a.text}\n` })

      text += `\nSTREAK\n${'-'.repeat(30)}\n`
      text += `Current: ${data.streak.current || 0} days\nLongest: ${data.streak.longest || 0} days\n`

      text += `\n${'='.repeat(50)}\n`
      text += `This data was generated entirely on your device.\nNo servers. No cloud. Just yours.\n`

      const blob = new Blob([text], { type: 'text/plain' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `mindease-export-${new Date().toISOString().split('T')[0]}.txt`
      a.click()
      URL.revokeObjectURL(url)
    } catch (e) {
      console.error('Export failed:', e)
    }
  }

  const clearAll = () => {
    if (!window.confirm('This will delete ALL your MindEase data. This cannot be undone. Are you sure?')) return
    const keys = ['focuscoach_mood', 'focuscoach_journal', 'mindease_gratitude', 'mindease_reframing', 'mindease_thoughts', 'mindease_voicememos', 'mindease_saved_affirmations', 'mindease_streak', 'mindease_onboarded', 'focuscoach_journal', 'mindease_last_crisis']
    keys.forEach(k => localStorage.removeItem(k))
    window.location.reload()
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <button onClick={exportAll} style={{
        width: '100%', padding: '14px 0', borderRadius: 12,
        border: `1px solid ${theme.primary}`, background: theme.primary + '11',
        color: theme.primary, fontSize: 14, fontWeight: 500, cursor: 'pointer',
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
      }}>
        <span>⬇️</span> Export all my data
      </button>
      <p style={{ fontSize: 11, color: theme.textMuted, textAlign: 'center', lineHeight: 1.5 }}>
        Downloads as a .txt file. Your data never left this device — this export is just for you.
      </p>
      <button onClick={clearAll} style={{
        width: '100%', padding: '10px 0', borderRadius: 12,
        border: '1px solid #EF4444', background: 'transparent',
        color: '#EF4444', fontSize: 13, cursor: 'pointer',
      }}>
        🗑️ Delete all my data
      </button>
    </div>
  )
}
