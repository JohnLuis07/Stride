import { useState, useCallback } from 'react';
import type { Note } from '../types';

const NOTE_COLORS = [
  'bg-yellow-50 border-yellow-200',
  'bg-blue-50 border-blue-200',
  'bg-green-50 border-green-200',
  'bg-purple-50 border-purple-200',
  'bg-pink-50 border-pink-200',
  'bg-orange-50 border-orange-200',
];

export function useNotes() {
  const [notes, setNotes] = useState<Note[]>(() => {
    const saved = localStorage.getItem('stride-notes');
    if (!saved) return [];
    const parsed = JSON.parse(saved);
    return parsed.map((n: Note) => ({
      ...n,
      createdAt: new Date(n.createdAt),
      updatedAt: new Date(n.updatedAt),
    }));
  });

  const save = useCallback((updated: Note[]) => {
    setNotes(updated);
    localStorage.setItem('stride-notes', JSON.stringify(updated));
  }, []);

  const createNote = useCallback(() => {
    const note: Note = {
      id: crypto.randomUUID(),
      title: 'Untitled Note',
      content: '',
      tags: [],
      createdAt: new Date(),
      updatedAt: new Date(),
      color: NOTE_COLORS[Math.floor(Math.random() * NOTE_COLORS.length)],
    };
    save([note, ...notes]);
    return note;
  }, [notes, save]);

  const updateNote = useCallback(
    (id: string, changes: Partial<Omit<Note, 'id' | 'createdAt'>>) => {
      const updated = notes.map((n) =>
        n.id === id ? { ...n, ...changes, updatedAt: new Date() } : n
      );
      save(updated);
    },
    [notes, save]
  );

  const deleteNote = useCallback(
    (id: string) => {
      save(notes.filter((n) => n.id !== id));
    },
    [notes, save]
  );

  const searchNotes = useCallback(
    (query: string) => {
      if (!query.trim()) return notes;
      const q = query.toLowerCase();
      return notes.filter(
        (n) =>
          n.title.toLowerCase().includes(q) ||
          n.content.toLowerCase().includes(q) ||
          n.tags.some((t) => t.toLowerCase().includes(q))
      );
    },
    [notes]
  );

  return { notes, createNote, updateNote, deleteNote, searchNotes };
}
