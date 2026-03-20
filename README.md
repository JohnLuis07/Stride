# Stride

A high performance web application designed to bridge the gap between academic study and professional workflow. Stride combines structured note taking with cognitive science backed productivity tools like Pomodoro timers and task-batching to help students and employees achieve Deep Work faster.

## Features

- **📝 Notes** — Create, edit, search, and tag notes with color-coded cards. All notes are saved locally in your browser.
- **⏱ Pomodoro Timer** — Focus with configurable 25-minute work sessions and short/long breaks. Tracks your sessions and shows progress.
- **✅ Task Batching** — Group related tasks into named batches with priority levels. See overall completion progress at a glance.
- **📚 Study Strategies** — Evidence-based techniques including Active Recall, Spaced Repetition, Cornell Notes, Feynman Technique, and more.
- **🏠 Dashboard** — Overview of your notes, daily focus sessions, and pending tasks with quick-action shortcuts.

## Tech Stack

- [React 19](https://react.dev/) + [TypeScript](https://www.typescriptlang.org/)
- [Vite](https://vite.dev/) — fast build tool with HMR
- [Tailwind CSS v4](https://tailwindcss.com/) — utility-first styling
- [React Router v7](https://reactrouter.com/) — client-side routing
- [Lucide React](https://lucide.dev/) — icon library

## Getting Started

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

## Data Storage

All data (notes, tasks, Pomodoro sessions, settings) is stored in your browser's `localStorage`. No account or backend required.
