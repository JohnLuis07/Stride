import { useState } from 'react';
import { Plus, Search, Trash2, Tag, X, FileText } from 'lucide-react';
import { useNotes } from '../hooks/useNotes';
import { formatRelativeTime } from '../utils/format';
import type { Note } from '../types';

export function Notes() {
  const { createNote, updateNote, deleteNote, searchNotes } = useNotes();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedNote, setSelectedNote] = useState<Note | null>(null);
  const [newTag, setNewTag] = useState('');

  const filteredNotes = searchNotes(searchQuery);

  const handleCreateNote = () => {
    const note = createNote();
    setSelectedNote(note);
  };

  const handleSelectNote = (note: Note) => {
    setSelectedNote(note);
  };

  const handleDeleteNote = (id: string) => {
    deleteNote(id);
    if (selectedNote?.id === id) setSelectedNote(null);
  };

  const handleAddTag = () => {
    if (!newTag.trim() || !selectedNote) return;
    const tag = newTag.trim().toLowerCase();
    if (!selectedNote.tags.includes(tag)) {
      const updatedTags = [...selectedNote.tags, tag];
      updateNote(selectedNote.id, { tags: updatedTags });
      setSelectedNote({ ...selectedNote, tags: updatedTags });
    }
    setNewTag('');
  };

  const handleRemoveTag = (tag: string) => {
    if (!selectedNote) return;
    const updatedTags = selectedNote.tags.filter((t) => t !== tag);
    updateNote(selectedNote.id, { tags: updatedTags });
    setSelectedNote({ ...selectedNote, tags: updatedTags });
  };

  return (
    <div className="flex h-screen">
      {/* Sidebar panel */}
      <div className="w-72 bg-white border-r border-slate-200 flex flex-col">
        <div className="p-4 border-b border-slate-200">
          <div className="flex items-center justify-between mb-3">
            <h1 className="text-lg font-bold text-slate-900">Notes</h1>
            <button
              onClick={handleCreateNote}
              className="bg-indigo-600 text-white p-1.5 rounded-lg hover:bg-indigo-700 transition-colors"
              title="New note"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search notes..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-300"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {filteredNotes.length === 0 ? (
            <div className="text-center py-8 text-slate-400">
              <FileText className="w-8 h-8 mx-auto mb-2" />
              <p className="text-sm">
                {searchQuery ? 'No notes found' : 'No notes yet'}
              </p>
            </div>
          ) : (
            filteredNotes.map((note) => (
              <div
                key={note.id}
                onClick={() => handleSelectNote(note)}
                className={`p-3 rounded-lg cursor-pointer border transition-all group ${
                  selectedNote?.id === note.id
                    ? 'border-indigo-300 bg-indigo-50'
                    : `${note.color} hover:border-slate-300`
                }`}
              >
                <div className="flex items-start justify-between">
                  <h3 className="text-sm font-medium text-slate-800 truncate flex-1">{note.title}</h3>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteNote(note.id);
                    }}
                    className="opacity-0 group-hover:opacity-100 p-0.5 text-slate-400 hover:text-red-500 transition-all ml-1"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
                <p className="text-xs text-slate-500 mt-1 line-clamp-2">
                  {note.content || 'Empty note...'}
                </p>
                <p className="text-xs text-slate-400 mt-1">{formatRelativeTime(note.updatedAt)}</p>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Editor area */}
      {selectedNote ? (
        <div className="flex-1 flex flex-col bg-white">
          <div className="border-b border-slate-200 px-6 py-3 flex items-center justify-between">
            <div className="flex items-center gap-2 flex-1">
              <input
                type="text"
                value={selectedNote.title}
                onChange={(e) => {
                  const val = e.target.value;
                  updateNote(selectedNote.id, { title: val });
                  setSelectedNote({ ...selectedNote, title: val });
                }}
                className="text-xl font-bold text-slate-900 bg-transparent focus:outline-none flex-1"
                placeholder="Note title..."
              />
            </div>
            <span className="text-xs text-slate-400">
              Updated {formatRelativeTime(selectedNote.updatedAt)}
            </span>
          </div>

          {/* Tags */}
          <div className="px-6 py-2 border-b border-slate-100 flex items-center gap-2 flex-wrap">
            <Tag className="w-4 h-4 text-slate-400" />
            {selectedNote.tags.map((tag) => (
              <span
                key={tag}
                className="flex items-center gap-1 text-xs bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-full border border-indigo-200"
              >
                {tag}
                <button onClick={() => handleRemoveTag(tag)}>
                  <X className="w-3 h-3 hover:text-red-500" />
                </button>
              </span>
            ))}
            <input
              type="text"
              value={newTag}
              onChange={(e) => setNewTag(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ',') {
                  e.preventDefault();
                  handleAddTag();
                }
              }}
              placeholder="Add tag..."
              className="text-xs text-slate-500 bg-transparent focus:outline-none w-24"
            />
          </div>

          {/* Content */}
          <textarea
            value={selectedNote.content}
            onChange={(e) => {
              const val = e.target.value;
              updateNote(selectedNote.id, { content: val });
              setSelectedNote({ ...selectedNote, content: val });
            }}
            placeholder="Start writing your note here... Use this space to capture ideas, lecture notes, summaries, or anything you want to remember."
            className="flex-1 p-6 text-slate-700 text-sm leading-relaxed resize-none focus:outline-none"
          />
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center bg-slate-50">
          <div className="text-center">
            <FileText className="w-16 h-16 text-slate-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-slate-700 mb-2">No Note Selected</h3>
            <p className="text-slate-500 mb-4">Select a note from the list or create a new one.</p>
            <button
              onClick={handleCreateNote}
              className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 flex items-center gap-2 mx-auto"
            >
              <Plus className="w-4 h-4" />
              New Note
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
