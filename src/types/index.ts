export interface Note {
  id: string;
  title: string;
  content: string;
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
  color: string;
}

export interface Task {
  id: string;
  title: string;
  completed: boolean;
  batch: string;
  priority: 'low' | 'medium' | 'high';
  createdAt: Date;
}

export interface PomodoroSession {
  id: string;
  startedAt: Date;
  completedAt?: Date;
  type: 'work' | 'short-break' | 'long-break';
  completed: boolean;
}

export type TimerMode = 'work' | 'short-break' | 'long-break';

export interface TimerSettings {
  workDuration: number;
  shortBreakDuration: number;
  longBreakDuration: number;
  sessionsUntilLongBreak: number;
}
