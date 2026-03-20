import { useState, useCallback } from 'react';
import type { Task } from '../types';

export function useTasks() {
  const [tasks, setTasks] = useState<Task[]>(() => {
    const saved = localStorage.getItem('stride-tasks');
    if (!saved) return [];
    const parsed = JSON.parse(saved);
    return parsed.map((t: Task) => ({
      ...t,
      createdAt: new Date(t.createdAt),
    }));
  });

  const save = useCallback((updated: Task[]) => {
    setTasks(updated);
    localStorage.setItem('stride-tasks', JSON.stringify(updated));
  }, []);

  const addTask = useCallback(
    (title: string, batch: string, priority: Task['priority'] = 'medium') => {
      const task: Task = {
        id: crypto.randomUUID(),
        title,
        completed: false,
        batch,
        priority,
        createdAt: new Date(),
      };
      save([task, ...tasks]);
    },
    [tasks, save]
  );

  const toggleTask = useCallback(
    (id: string) => {
      save(tasks.map((t) => (t.id === id ? { ...t, completed: !t.completed } : t)));
    },
    [tasks, save]
  );

  const deleteTask = useCallback(
    (id: string) => {
      save(tasks.filter((t) => t.id !== id));
    },
    [tasks, save]
  );

  const updateTask = useCallback(
    (id: string, changes: Partial<Omit<Task, 'id' | 'createdAt'>>) => {
      save(tasks.map((t) => (t.id === id ? { ...t, ...changes } : t)));
    },
    [tasks, save]
  );

  const getBatches = useCallback(() => {
    return [...new Set(tasks.map((t) => t.batch).filter(Boolean))];
  }, [tasks]);

  return { tasks, addTask, toggleTask, deleteTask, updateTask, getBatches };
}
