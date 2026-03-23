// Plain mutable state object
export const session = {
  mode: 'idle',
  currentTask: '',
  steps: [],
  currentStepIndex: 0,
  pomodoroPhase: 'focus',
  pomodoroCount: 0,
  frustrationCount: 0,
  distractionCount: 0,
  journalEntries: [],
  wellnessMode: null,        // null | 'anxiety' | 'depression' | 'burnout' | 'stress' | 'okay'
  moodCheckedIn: false,      // whether user has done today's check-in
  moodHistory: [],           // array of { mood, timestamp } saved to localStorage
  sleepQuality: null,        // null | 'great' | 'okay' | 'poor' | 'terrible'
  sleepCheckedIn: false,
  gratitudeEntries: [],      // array of { id, items: [str,str,str], timestamp }
  reframingHistory: [],      // array of { id, negative, reframe, timestamp }
  affirmations: [],          // array of strings, AI-generated
  weeklyReflection: null,    // string, AI-generated weekly summary
  sosActive: false,          // whether SOS mode is active
  pomodoroRunning: false,
  pomodoroSecondsLeft: 25 * 60,
  pomodoroDuration: 25 * 60,
}

// Load persistence on init
try {
  const savedJournal = localStorage.getItem('focuscoach_journal')
  if (savedJournal) session.journalEntries = JSON.parse(savedJournal)
  
  const savedMood = localStorage.getItem('focuscoach_mood')
  if (savedMood) session.moodHistory = JSON.parse(savedMood)
  
  const savedGratitude = localStorage.getItem('mindease_gratitude')
  if (savedGratitude) session.gratitudeEntries = JSON.parse(savedGratitude)
  
  const savedReframing = localStorage.getItem('mindease_reframing')
  if (savedReframing) session.reframingHistory = JSON.parse(savedReframing)

  const savedAffirmations = localStorage.getItem('mindease_affirmations')
  if (savedAffirmations) session.affirmations = JSON.parse(savedAffirmations)

  const savedWeekly = localStorage.getItem('mindease_weekly')
  if (savedWeekly) session.weeklyReflection = savedWeekly

  // Check if already checked in today
  const today = new Date().toDateString()
  const lastEntry = session.moodHistory[session.moodHistory.length - 1]
  if (lastEntry && new Date(lastEntry.timestamp).toDateString() === today) {
    session.wellnessMode = lastEntry.mood
    session.moodCheckedIn = true
  }
} catch (e) {
  console.error('Failed to load session state', e)
}

// Pub/sub
const subscribers = new Set()
export function subscribe(fn) { subscribers.add(fn) }
export function unsubscribe(fn) { subscribers.delete(fn) }
export function notify() { subscribers.forEach(fn => fn()) }

// React hook
import { useState, useEffect } from 'react'
export function useSession() {
  const [, forceUpdate] = useState(0)
  useEffect(() => {
    const fn = () => forceUpdate(n => n + 1)
    subscribe(fn)
    return () => unsubscribe(fn)
  }, [])
  return session
}

// Mutators
export function setTask(taskText) {
  session.currentTask = taskText
  session.steps = []
  session.currentStepIndex = 0
  notify()
}

export function setSteps(stepsArray) {
  session.steps = stepsArray
  session.currentStepIndex = 0
  notify()
}

export function completeStep(id) {
  const step = session.steps.find(s => s.id === id)
  if (step) step.done = true
  const nextIdx = session.steps.findIndex(s => !s.done)
  session.currentStepIndex = nextIdx === -1 ? session.steps.length : nextIdx
  notify()
}

export function incrementFrustration() {
  session.frustrationCount++
  notify()
}

export function incrementDistraction() {
  session.distractionCount++
  notify()
}

export function resetSession() {
  session.mode = 'idle'
  session.currentTask = ''
  session.steps = []
  session.currentStepIndex = 0
  session.pomodoroPhase = 'focus'
  session.pomodoroCount = 0
  session.frustrationCount = 0
  session.distractionCount = 0
  notify()
}

export function addJournalEntry(text) {
  const entry = { id: Date.now(), text, timestamp: new Date().toISOString() }
  session.journalEntries.push(entry)
  try {
    localStorage.setItem('focuscoach_journal', JSON.stringify(session.journalEntries))
  } catch (e) {}
  notify()
}

export function setWellnessMode(mode) {
  session.wellnessMode = mode
  session.moodCheckedIn = true
  const entry = { mood: mode, timestamp: new Date().toISOString() }
  session.moodHistory.push(entry)
  try {
    localStorage.setItem('focuscoach_mood', JSON.stringify(session.moodHistory))
  } catch (e) {}
  notify()
}

export function setSleepQuality(quality) {
  session.sleepQuality = quality
  session.sleepCheckedIn = true
  notify()
}

export function addGratitudeEntry(items) {
  const entry = { id: Date.now(), items, timestamp: new Date().toISOString() }
  session.gratitudeEntries.push(entry)
  try { localStorage.setItem('mindease_gratitude', JSON.stringify(session.gratitudeEntries)) } catch(e) {}
  notify()
}

export function addReframingEntry(negative, reframe) {
  const entry = { id: Date.now(), negative, reframe, timestamp: new Date().toISOString() }
  session.reframingHistory.push(entry)
  try { localStorage.setItem('mindease_reframing', JSON.stringify(session.reframingHistory)) } catch(e) {}
  notify()
}

export function setAffirmations(list) {
  session.affirmations = list
  try { localStorage.setItem('mindease_affirmations', JSON.stringify(list)) } catch(e) {}
  notify()
}

export function setWeeklyReflection(text) {
  session.weeklyReflection = text
  try { localStorage.setItem('mindease_weekly', text) } catch(e) {}
  notify()
}

export function toggleSOS(active) {
  session.sosActive = active
  notify()
}

export function setPomodoroState(state) {
  Object.assign(session, state)
  notify()
}

