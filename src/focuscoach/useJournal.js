import { useSession, addJournalEntry, session, notify } from '../focuscoach/sessionState.js';
import { useMemo } from 'react';

export default function useJournal() {
  const currentSession = useSession();
  const entries = currentSession.journalEntries || [];

  const addEntry = (text) => {
    addJournalEntry(text);
  };

  const clearEntries = () => {
    localStorage.removeItem('focuscoach_journal');
    session.journalEntries = [];
    notify();
  };

  const last7Days = useMemo(() => {
    const sevenDaysAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
    return entries.filter(entry => new Date(entry.timestamp).getTime() >= sevenDaysAgo);
  }, [entries]);

  const sessionSummary = useMemo(() => {
    return entries.slice(-3).map(e => e.text).join(' | ') || '';
  }, [entries]);

  return {
    entries,
    addEntry,
    clearEntries,
    last7Days,
    sessionSummary
  };
}
