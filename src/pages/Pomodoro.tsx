import { useState } from 'react';
import { Play, Pause, RotateCcw, Settings, X, Coffee, Brain } from 'lucide-react';
import { usePomodoro } from '../hooks/usePomodoro';
import { formatTime, formatDate } from '../utils/format';
import type { TimerMode } from '../types';

const MODE_LABELS: Record<TimerMode, string> = {
  work: 'Focus',
  'short-break': 'Short Break',
  'long-break': 'Long Break',
};

const MODE_COLORS: Record<TimerMode, string> = {
  work: 'from-indigo-600 to-purple-700',
  'short-break': 'from-green-500 to-teal-600',
  'long-break': 'from-blue-500 to-cyan-600',
};

export function Pomodoro() {
  const { mode, timeLeft, isRunning, sessionsCompleted, sessions, settings, start, pause, reset, switchMode, updateSettings } =
    usePomodoro();
  const [showSettings, setShowSettings] = useState(false);
  const [tempSettings, setTempSettings] = useState(settings);

  const progress = 1 - timeLeft / (mode === 'work' ? settings.workDuration : mode === 'short-break' ? settings.shortBreakDuration : settings.longBreakDuration);
  const circumference = 2 * Math.PI * 110;
  const strokeDashoffset = circumference * (1 - progress);

  const handleSaveSettings = () => {
    updateSettings(tempSettings);
    setShowSettings(false);
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Pomodoro Timer</h1>
          <p className="text-slate-500">Stay focused with timed work sessions</p>
        </div>
        <button
          onClick={() => setShowSettings(true)}
          className="p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
        >
          <Settings className="w-5 h-5" />
        </button>
      </div>

      {/* Mode Selector */}
      <div className="flex gap-2 mb-8 bg-slate-100 p-1 rounded-xl w-fit mx-auto">
        {(['work', 'short-break', 'long-break'] as TimerMode[]).map((m) => (
          <button
            key={m}
            onClick={() => switchMode(m)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              mode === m
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            {MODE_LABELS[m]}
          </button>
        ))}
      </div>

      {/* Timer Circle */}
      <div className="flex flex-col items-center mb-8">
        <div className={`relative w-64 h-64 rounded-full bg-gradient-to-br ${MODE_COLORS[mode]} p-1 shadow-2xl`}>
          <div className="absolute inset-0 rounded-full flex items-center justify-center">
            <svg className="absolute inset-0 w-full h-full -rotate-90" viewBox="0 0 260 260">
              <circle cx="130" cy="130" r="110" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="8" />
              <circle
                cx="130"
                cy="130"
                r="110"
                fill="none"
                stroke="rgba(255,255,255,0.9)"
                strokeWidth="8"
                strokeLinecap="round"
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                style={{ transition: 'stroke-dashoffset 0.5s ease' }}
              />
            </svg>
            <div className="text-center text-white z-10">
              <div className="text-6xl font-bold font-mono tabular-nums">{formatTime(timeLeft)}</div>
              <div className="text-sm font-medium opacity-80 mt-1">{MODE_LABELS[mode]}</div>
            </div>
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-4 mt-8">
          <button
            onClick={reset}
            className="p-3 bg-white border border-slate-200 text-slate-600 rounded-full hover:bg-slate-50 transition-colors shadow-sm"
          >
            <RotateCcw className="w-5 h-5" />
          </button>
          <button
            onClick={isRunning ? pause : start}
            className={`px-8 py-3 rounded-full text-white font-semibold flex items-center gap-2 shadow-lg transition-all active:scale-95 bg-gradient-to-r ${MODE_COLORS[mode]}`}
          >
            {isRunning ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
            {isRunning ? 'Pause' : 'Start'}
          </button>
        </div>
      </div>

      {/* Session Progress */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 mb-6 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-slate-900 flex items-center gap-2">
            <Brain className="w-4 h-4 text-indigo-600" />
            Session Progress
          </h3>
          <span className="text-sm text-slate-500">
            {sessionsCompleted % settings.sessionsUntilLongBreak} / {settings.sessionsUntilLongBreak} until long break
          </span>
        </div>
        <div className="flex gap-2">
          {Array.from({ length: settings.sessionsUntilLongBreak }).map((_, i) => (
            <div
              key={i}
              className={`flex-1 h-3 rounded-full transition-all ${
                i < sessionsCompleted % settings.sessionsUntilLongBreak
                  ? 'bg-indigo-600'
                  : 'bg-slate-100'
              }`}
            />
          ))}
        </div>
        <p className="text-sm text-slate-500 mt-2">
          Total sessions today: <span className="font-medium text-slate-700">{sessions.filter((s) => {
            const d = new Date(s.completedAt ?? s.startedAt);
            const today = new Date();
            return d.getDate() === today.getDate() && d.getMonth() === today.getMonth() && d.getFullYear() === today.getFullYear();
          }).length}</span>
        </p>
      </div>

      {/* Recent Sessions */}
      {sessions.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
          <h3 className="font-semibold text-slate-900 mb-3 flex items-center gap-2">
            <Coffee className="w-4 h-4 text-indigo-600" />
            Recent Sessions
          </h3>
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {sessions.slice(0, 10).map((session) => (
              <div key={session.id} className="flex items-center justify-between py-1.5 border-b border-slate-50 last:border-0">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-green-500" />
                  <span className="text-sm text-slate-700">Focus session completed</span>
                </div>
                <span className="text-xs text-slate-400">{formatDate(session.completedAt ?? session.startedAt)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Settings Modal */}
      {showSettings && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold text-slate-900">Timer Settings</h2>
              <button onClick={() => setShowSettings(false)} className="p-1 text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              {[
                { label: 'Focus Duration (minutes)', key: 'workDuration' },
                { label: 'Short Break (minutes)', key: 'shortBreakDuration' },
                { label: 'Long Break (minutes)', key: 'longBreakDuration' },
                { label: 'Sessions until Long Break', key: 'sessionsUntilLongBreak' },
              ].map(({ label, key }) => (
                <div key={key}>
                  <label className="block text-sm font-medium text-slate-700 mb-1">{label}</label>
                  <input
                    type="number"
                    min={1}
                    max={key === 'sessionsUntilLongBreak' ? 10 : 60}
                    value={
                      key === 'sessionsUntilLongBreak'
                        ? tempSettings[key as keyof typeof tempSettings]
                        : (tempSettings[key as keyof typeof tempSettings] as number) / 60
                    }
                    onChange={(e) => {
                      const val = parseInt(e.target.value, 10);
                      setTempSettings((prev) => ({
                        ...prev,
                        [key]: key === 'sessionsUntilLongBreak' ? val : val * 60,
                      }));
                    }}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
                  />
                </div>
              ))}
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowSettings(false)}
                className="flex-1 border border-slate-200 text-slate-700 py-2 rounded-lg text-sm font-medium hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveSettings}
                className="flex-1 bg-indigo-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-indigo-700"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
