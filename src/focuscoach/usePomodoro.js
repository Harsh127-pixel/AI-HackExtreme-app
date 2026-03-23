import { useState, useEffect, useRef, useCallback } from 'react';
import { session, notify } from './sessionState.js';
import { playChime } from '../mindease/usePomodoroChime.js';

const FOCUS_DURATION = 25 * 60;
const BREAK_DURATION = 5 * 60;

export default function usePomodoro() {
  const [phase, setPhase] = useState('focus');
  const [secondsLeft, setSecondsLeft] = useState(FOCUS_DURATION);
  const [isRunning, setIsRunning] = useState(false);
  const timerRef = useRef(null);

  const totalSeconds = phase === 'focus' ? FOCUS_DURATION : BREAK_DURATION;

  const start = useCallback(() => setIsRunning(true), []);
  const pause = useCallback(() => setIsRunning(false), []);

  const reset = useCallback(() => {
    setIsRunning(false);
    setSecondsLeft(phase === 'focus' ? FOCUS_DURATION : BREAK_DURATION);
  }, [phase]);

  const switchPhase = useCallback(() => {
    const nextPhase = phase === 'focus' ? 'break' : 'focus';
    if (phase === 'focus') {
      session.pomodoroCount++;
      playChime('focus'); // Signal focus is OVER
    } else {
      playChime('break'); // Signal break is OVER
    }
    setPhase(nextPhase);
    session.pomodoroPhase = nextPhase;
    setSecondsLeft(nextPhase === 'focus' ? FOCUS_DURATION : BREAK_DURATION);
    setIsRunning(true);
    notify();
  }, [phase]);

  const skip = useCallback(() => {
    switchPhase();
  }, [switchPhase]);

  useEffect(() => {
    if (isRunning && secondsLeft > 0) {
      timerRef.current = setInterval(() => {
        setSecondsLeft((s) => s - 1);
      }, 1000);
    } else if (secondsLeft === 0) {
      switchPhase();
    }
    return () => clearInterval(timerRef.current);
  }, [isRunning, secondsLeft, switchPhase]);

  const formattedTime = `${Math.floor(secondsLeft / 60)}:${(secondsLeft % 60).toString().padStart(2, '0')}`;
  const progress = secondsLeft / totalSeconds;

  const handleVoiceCommand = useCallback((transcript) => {
    const t = transcript.toLowerCase();
    if (t.includes('start') || t.includes('begin') || t.includes("let's go") || t.includes('go')) {
      start();
      return true;
    }
    if (t.includes('pause') || t.includes('stop') || t.includes('wait')) {
      pause();
      return true;
    }
    if (t.includes('skip') || t.includes('next phase')) {
      skip();
      return true;
    }
    if (t.includes('reset timer')) {
      reset();
      return true;
    }
    return false;
  }, [start, pause, skip, reset]);

  return {
    secondsLeft,
    isRunning,
    phase,
    progress,
    formattedTime,
    start,
    pause,
    reset,
    skip,
    handleVoiceCommand
  };
}
