import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

type Technique = 'pomodoro' | 'rule52' | 'flowtime';
type Mode = 'work' | 'short' | 'long';

interface FocusContextType {
  technique: Technique;
  mode: Mode;
  timeLeft: number;
  isActive: boolean;
  sessionsCompleted: number;
  setTechnique: (tech: Technique) => void;
  setMode: (mode: Mode) => void;
  setIsActive: (active: boolean) => void;
  resetTimer: () => void;
  switchMode: (newMode: Mode) => void;
  changeTechnique: (newTech: Technique) => void;
}

const TECHNIQUES = {
  pomodoro: {
    modes: { work: 25 * 60, short: 5 * 60, long: 15 * 60 }
  },
  rule52: {
    modes: { work: 52 * 60, short: 17 * 60, long: 30 * 60 }
  },
  flowtime: {
    modes: { work: 90 * 60, short: 10 * 60, long: 25 * 60 }
  }
};

const FocusContext = createContext<FocusContextType | undefined>(undefined);

export const FocusProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [technique, setTechniqueState] = useState<Technique>(() => (localStorage.getItem('focus_technique') as Technique) || 'pomodoro');
  const [mode, setModeState] = useState<Mode>(() => (localStorage.getItem('focus_mode') as Mode) || 'work');
  const [sessionsCompleted, setSessionsCompleted] = useState(() => parseInt(localStorage.getItem('focus_sessions') || '0'));
  const [isActive, setIsActive] = useState(() => localStorage.getItem('focus_isActive') === 'true');
  
  const [timeLeft, setTimeLeft] = useState(() => {
    const savedTime = localStorage.getItem('focus_timeLeft');
    const savedActive = localStorage.getItem('focus_isActive') === 'true';
    const savedTimestamp = localStorage.getItem('focus_lastTimestamp');
    if (savedTime && savedActive && savedTimestamp) {
      const elapsed = Math.floor((Date.now() - parseInt(savedTimestamp)) / 1000);
      return Math.max(0, parseInt(savedTime) - elapsed);
    }
    return savedTime ? parseInt(savedTime) : TECHNIQUES[technique].modes[mode];
  });

  // Persist state to localStorage
  useEffect(() => {
    localStorage.setItem('focus_timeLeft', timeLeft.toString());
    localStorage.setItem('focus_isActive', isActive.toString());
    localStorage.setItem('focus_lastTimestamp', Date.now().toString());
    localStorage.setItem('focus_technique', technique);
    localStorage.setItem('focus_mode', mode);
    localStorage.setItem('focus_sessions', sessionsCompleted.toString());
  }, [timeLeft, isActive, technique, mode, sessionsCompleted]);

  // Main Timer Interval
  useEffect(() => {
    let interval: any = null;
    if (isActive && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft((prev) => prev - 1);
      }, 1000);
    } else if (timeLeft === 0 && isActive) {
      setIsActive(false);
      const audio = new Audio('https://actions.google.com/sounds/v1/alarms/alarm_clock.ogg');
      audio.volume = 1.0;
      audio.play().catch(e => console.log('Audio play failed:', e));
      if (mode === 'work') setSessionsCompleted(prev => prev + 1);
    }
    return () => clearInterval(interval);
  }, [isActive, timeLeft, mode]);

  const switchMode = useCallback((newMode: Mode) => {
    setModeState(newMode);
    setTimeLeft(TECHNIQUES[technique].modes[newMode]);
    setIsActive(false);
  }, [technique]);

  const changeTechnique = useCallback((newTech: Technique) => {
    if (technique === newTech) return;
    setTechniqueState(newTech);
    setModeState('work');
    setTimeLeft(TECHNIQUES[newTech].modes.work);
    setIsActive(false);
  }, [technique]);

  const resetTimer = useCallback(() => {
    setTimeLeft(TECHNIQUES[technique].modes[mode]);
    setIsActive(false);
  }, [technique, mode]);

  return (
    <FocusContext.Provider value={{ 
      technique, mode, timeLeft, isActive, sessionsCompleted,
      setTechnique: setTechniqueState, setMode: setModeState, setIsActive, 
      resetTimer, switchMode, changeTechnique 
    }}>
      {children}
    </FocusContext.Provider>
  );
};

export const useFocus = () => {
  const context = useContext(FocusContext);
  if (!context) throw new Error('useFocus must be used within a FocusProvider');
  return context;
};
