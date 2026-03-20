import { useState, useEffect, useRef, useCallback } from 'react';
import type { TimerMode, TimerSettings, PomodoroSession } from '../types';

const DEFAULT_SETTINGS: TimerSettings = {
  workDuration: 25 * 60,
  shortBreakDuration: 5 * 60,
  longBreakDuration: 15 * 60,
  sessionsUntilLongBreak: 4,
};

export function usePomodoro() {
  const [settings, setSettings] = useState<TimerSettings>(() => {
    const saved = localStorage.getItem('pomodoro-settings');
    return saved ? JSON.parse(saved) : DEFAULT_SETTINGS;
  });

  const [mode, setMode] = useState<TimerMode>('work');
  const [timeLeft, setTimeLeft] = useState(settings.workDuration);
  const [isRunning, setIsRunning] = useState(false);
  const [sessionsCompleted, setSessionsCompleted] = useState(0);
  const [sessions, setSessions] = useState<PomodoroSession[]>(() => {
    const saved = localStorage.getItem('pomodoro-sessions');
    return saved ? JSON.parse(saved) : [];
  });

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const sessionStartRef = useRef<Date | null>(null);

  const getDuration = useCallback(
    (m: TimerMode) => {
      if (m === 'work') return settings.workDuration;
      if (m === 'short-break') return settings.shortBreakDuration;
      return settings.longBreakDuration;
    },
    [settings]
  );

  useEffect(() => {
    setTimeLeft(getDuration(mode));
  }, [mode, getDuration]);

  useEffect(() => {
    localStorage.setItem('pomodoro-settings', JSON.stringify(settings));
  }, [settings]);

  useEffect(() => {
    localStorage.setItem('pomodoro-sessions', JSON.stringify(sessions));
  }, [sessions]);

  useEffect(() => {
    if (isRunning) {
      intervalRef.current = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            clearInterval(intervalRef.current!);
            setIsRunning(false);

            if (mode === 'work') {
              const newCount = sessionsCompleted + 1;
              setSessionsCompleted(newCount);

              const session: PomodoroSession = {
                id: crypto.randomUUID(),
                startedAt: sessionStartRef.current ?? new Date(),
                completedAt: new Date(),
                type: 'work',
                completed: true,
              };
              setSessions((prev) => [session, ...prev].slice(0, 50));

              const nextMode: TimerMode =
                newCount % settings.sessionsUntilLongBreak === 0
                  ? 'long-break'
                  : 'short-break';
              setMode(nextMode);
            } else {
              setMode('work');
            }
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current);
    }

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isRunning, mode, sessionsCompleted, settings.sessionsUntilLongBreak]);

  const start = useCallback(() => {
    sessionStartRef.current = new Date();
    setIsRunning(true);
  }, []);

  const pause = useCallback(() => setIsRunning(false), []);

  const reset = useCallback(() => {
    setIsRunning(false);
    setTimeLeft(getDuration(mode));
  }, [mode, getDuration]);

  const switchMode = useCallback((newMode: TimerMode) => {
    setIsRunning(false);
    setMode(newMode);
  }, []);

  const updateSettings = useCallback((newSettings: Partial<TimerSettings>) => {
    setSettings((prev) => ({ ...prev, ...newSettings }));
    setIsRunning(false);
  }, []);

  return {
    mode,
    timeLeft,
    isRunning,
    sessionsCompleted,
    sessions,
    settings,
    start,
    pause,
    reset,
    switchMode,
    updateSettings,
  };
}
