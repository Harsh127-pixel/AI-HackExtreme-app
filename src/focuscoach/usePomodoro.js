import { useEffect, useRef, useCallback } from 'react';
import { session, notify, setPomodoroState } from './sessionState.js';
import { playChime } from '../mindease/usePomodoroChime.js';

const FOCUS_DURATION = 25 * 60;
const BREAK_DURATION = 5 * 60;

export default function usePomodoro() {
  const timerRef = useRef(null);

  const start = useCallback(() => {
    setPomodoroState({ pomodoroRunning: true });
  }, []);

  const pause = useCallback(() => {
    setPomodoroState({ pomodoroRunning: false });
  }, []);

  const reset = useCallback(() => {
    const dur = session.pomodoroPhase === 'focus' ? FOCUS_DURATION : BREAK_DURATION;
    setPomodoroState({
      pomodoroRunning: false,
      pomodoroSecondsLeft: dur,
      pomodoroDuration: dur
    });
  }, []);

  const switchPhase = useCallback(() => {
    const nextPhase = session.pomodoroPhase === 'focus' ? 'break' : 'focus';
    if (session.pomodoroPhase === 'focus') {
      session.pomodoroCount++;
      playChime('focus');
    } else {
      playChime('break');
    }
    const dur = nextPhase === 'focus' ? FOCUS_DURATION : BREAK_DURATION;
    setPomodoroState({
      pomodoroPhase: nextPhase,
      pomodoroSecondsLeft: dur,
      pomodoroDuration: dur,
      pomodoroRunning: true
    });
  }, []);

  const skip = useCallback(() => {
    switchPhase();
  }, [switchPhase]);

  useEffect(() => {
    if (session.pomodoroRunning && session.pomodoroSecondsLeft > 0) {
      timerRef.current = setInterval(() => {
        setPomodoroState({ pomodoroSecondsLeft: session.pomodoroSecondsLeft - 1 });
      }, 1000);
    } else if (session.pomodoroSecondsLeft <= 0 && session.pomodoroRunning) {
      switchPhase();
    }
    return () => clearInterval(timerRef.current);
  }, [session.pomodoroRunning, session.pomodoroSecondsLeft, switchPhase]);

  const formattedTime = `${Math.floor(session.pomodoroSecondsLeft / 60)}:${(session.pomodoroSecondsLeft % 60).toString().padStart(2, '0')}`;
  const progress = session.pomodoroSecondsLeft / session.pomodoroDuration;

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
    secondsLeft: session.pomodoroSecondsLeft,
    isRunning: session.pomodoroRunning,
    phase: session.pomodoroPhase,
    progress,
    formattedTime,
    start,
    pause,
    reset,
    skip,
    handleVoiceCommand
  };
}
