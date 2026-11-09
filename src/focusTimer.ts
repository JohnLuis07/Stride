import { localDate } from './dates';
export type Technique = 'pomodoro' | 'rule52' | 'flowtime';
export type Mode = 'work' | 'short' | 'long';
const durations = {
  pomodoro: { work: 1500, short: 300, long: 900 },
  rule52: { work: 3120, short: 1020, long: 1800 },
  flowtime: { work: 5400, short: 600, long: 1500 },
};
export type State = {
  technique: Technique;
  mode: Mode;
  timeLeft: number;
  isActive: boolean;
  sessionsCompleted: number;
  todaySessions: number;
  day: string;
  deadline: number;
};
export const defaults: State = {
  technique: 'pomodoro',
  mode: 'work',
  timeLeft: 1500,
  isActive: false,
  sessionsCompleted: 0,
  todaySessions: 0,
  day: localDate(),
  deadline: 0,
};
type Action =
  | { type: 'tick' }
  | { type: 'active'; value: boolean }
  | { type: 'mode'; value: Mode }
  | { type: 'technique'; value: Technique }
  | { type: 'reset' };
export function reducer(state: State, action: Action): State {
  const day = localDate();
  const current = state.day === day ? state : { ...state, day, todaySessions: 0 };
  switch (action.type) {
    case 'tick': {
      if (!current.isActive) return current;
      const timeLeft = Math.max(0, Math.ceil((current.deadline - Date.now()) / 1000));
      return {
        ...current,
        timeLeft,
        isActive: timeLeft > 0,
        sessionsCompleted:
          current.sessionsCompleted + (timeLeft === 0 && current.mode === 'work' ? 1 : 0),
        todaySessions: current.todaySessions + (timeLeft === 0 && current.mode === 'work' ? 1 : 0),
      };
    }
    case 'active':
      return {
        ...current,
        isActive: action.value && current.timeLeft > 0,
        deadline: Date.now() + current.timeLeft * 1000,
      };
    case 'mode':
      return {
        ...current,
        mode: action.value,
        timeLeft: durations[current.technique][action.value],
        isActive: false,
        deadline: 0,
      };
    case 'technique':
      return {
        ...current,
        technique: action.value,
        mode: 'work',
        timeLeft: durations[action.value].work,
        isActive: false,
        deadline: 0,
      };
    case 'reset':
      return {
        ...current,
        timeLeft: durations[current.technique][current.mode],
        isActive: false,
        deadline: 0,
      };
  }
}
