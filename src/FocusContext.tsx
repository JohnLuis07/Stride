/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useReducer, useEffect, type ReactNode } from 'react';
import { defaults, reducer, type Technique, type Mode, type State } from './focusTimer';
export type { Technique, Mode } from './focusTimer';
function initial(): State {
  try {
    const saved = JSON.parse(localStorage.getItem('stride_focus_v2') || 'null');
    if (
      saved &&
      ['pomodoro', 'rule52', 'flowtime'].includes(saved.technique) &&
      ['work', 'short', 'long'].includes(saved.mode) &&
      Number.isFinite(saved.timeLeft) &&
      Number.isFinite(saved.deadline)
    )
      return { ...defaults, ...saved };
  } catch {
    /* Use defaults for invalid saved state. */
  }
  return defaults;
}
type Value = State & {
  setTechnique: (value: Technique) => void;
  setMode: (value: Mode) => void;
  setIsActive: (value: boolean) => void;
  resetTimer: () => void;
  switchMode: (value: Mode) => void;
  changeTechnique: (value: Technique) => void;
};
const FocusContext = createContext<Value | undefined>(undefined);
export function FocusProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, undefined, initial);
  useEffect(() => {
    localStorage.setItem('stride_focus_v2', JSON.stringify(state));
  }, [state]);
  useEffect(() => {
    const tick = () => dispatch({ type: 'tick' });
    const timer = setInterval(tick, 500);
    window.addEventListener('focus', tick);
    return () => {
      clearInterval(timer);
      window.removeEventListener('focus', tick);
    };
  }, []);
  useEffect(() => {
    if (state.timeLeft === 0) {
      const audio = new Audio('https://actions.google.com/sounds/v1/alarms/alarm_clock.ogg');
      audio.play().catch(() => {});
    }
  }, [state.timeLeft]);
  const mode = (value: Mode) => dispatch({ type: 'mode', value });
  const technique = (value: Technique) => dispatch({ type: 'technique', value });
  return (
    <FocusContext.Provider
      value={{
        ...state,
        setTechnique: technique,
        changeTechnique: technique,
        setMode: mode,
        switchMode: mode,
        setIsActive: (value) => dispatch({ type: 'active', value }),
        resetTimer: () => dispatch({ type: 'reset' }),
      }}
    >
      {children}
    </FocusContext.Provider>
  );
}
export function useFocus() {
  const value = useContext(FocusContext);
  if (!value) throw new Error('FocusProvider missing');
  return value;
}
