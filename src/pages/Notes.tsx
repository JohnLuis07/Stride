import { useSessionProfile } from '../Session';
import { LoadingContent } from '../components/WorkspaceLoading';
import type { Profile as UserProfile } from '../types';
import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import NoteStudy from '../components/NoteStudy';
import { invoke } from '../api';
import Sidebar from '../components/Sidebar';
import Icon from '../components/Icon';
import ReactQuill, { Quill } from 'react-quill-new';
import 'react-quill-new/dist/quill.snow.css';
import '../App.css';

// Register custom numeric font sizes
const Size = Quill.import('attributors/style/size') as { whitelist: string[] };
Size.whitelist = ['10px', '12px', '14px', '16px', '18px', '20px', '24px', '32px', '48px', '64px'];
Quill.register('attributors/style/size', Size, true);

interface Note {
  id: string;
  title: string;
  content: string;
  created_at: string;
  updated_at: string;
}

const Notes: React.FC = () => {
  const [studyOpen, setStudyOpen] = useState(false);
  const navigate = useNavigate();
  const [user, setUser] = useState<UserProfile | null>(useSessionProfile());
  const [notes, setNotes] = useState<Note[]>([]);
  const [currentNote, setCurrentNote] = useState<Partial<Note>>({ title: '', content: '' });
  const [lastSavedNote, setLastSavedNote] = useState<Partial<Note>>({ title: '', content: '' });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [showWarning, setShowWarning] = useState(false);
  const [pendingAction, setPendingAction] = useState<(() => void) | null>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const titleInputRef = useRef<HTMLInputElement>(null);

  const normalizeTitle = (value?: string) => (value || '').trim();
  const normalizeContent = (value?: string) =>
    (value || '')
      .replace(/<p><br><\/p>/gi, '')
      .replace(/<p>\s*<\/p>/gi, '')
      .replace(/&nbsp;/gi, ' ')
      .replace(/\s+/g, ' ')
      .trim();

  const showToast = (type: 'success' | 'error', text: string) => {
    setToast({ type, text });
    setTimeout(() => setToast(null), 2500);
  };

  async function fetchNotes(userId: string, selectFirst: boolean = false) {
    const { data, error } = await supabase
      .from('notes')
      .select('*')
      .eq('user_id', userId)
      .order('updated_at', { ascending: false });

    if (!error && data) {
      setNotes(data);
      if (selectFirst && data.length > 0) {
        setCurrentNote(data[0]);
        setLastSavedNote(data[0]);
      } else if (selectFirst) {
        const emptyNote = { title: '', content: '' };
        setCurrentNote(emptyNote);
        setLastSavedNote(emptyNote);
      }
    }
  }

  useEffect(() => {
    const checkUser = async () => {
      const storedEmail = localStorage.getItem('userEmail');
      if (!storedEmail) {
        navigate('/login');
        return;
      }

      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('email', storedEmail)
        .single();

      if (error || !data) {
        localStorage.removeItem('userEmail');
        navigate('/login');
      } else {
        setUser(data);
        fetchNotes(data.id, true);
      }
      setLoading(false);
    };

    checkUser();
  }, [navigate]);

  const hasUnsavedChanges = () => {
    return (
      normalizeTitle(currentNote.title) !== normalizeTitle(lastSavedNote.title) ||
      normalizeContent(currentNote.content) !== normalizeContent(lastSavedNote.content)
    );
  };

  const handleActionWithWarning = (action: () => void) => {
    if (hasUnsavedChanges()) {
      setPendingAction(() => action);
      setShowWarning(true);
    } else {
      action();
    }
  };

  const confirmDiscard = () => {
    if (pendingAction) {
      pendingAction();
    }
    setShowWarning(false);
    setPendingAction(null);
  };

  const handleSelectNote = (note: Note) => {
    handleActionWithWarning(() => {
      setCurrentNote({ ...note });
      setLastSavedNote({ ...note });
    });
  };

  const handleNewNote = () => {
    handleActionWithWarning(() => {
      const newNote = { title: '', content: '' };
      setCurrentNote(newNote);
      setLastSavedNote(newNote);
      if (titleInputRef.current) {
        titleInputRef.current.focus();
      }
    });
  };

  const handleSaveNote = async () => {
    if (!user) return;
    setSaving(true);
    setToast(null);

    const noteData = {
      title: currentNote.title || 'Untitled Note',
      content: currentNote.content || '',
      user_id: user.id,
      updated_at: new Date().toISOString(),
    };

    let error;
    let savedNote: Note | null = null;

    if (currentNote.id) {
      const { data, error: updateError } = await supabase
        .from('notes')
        .update(noteData)
        .eq('id', currentNote.id)
        .select();
      error = updateError;
      if (data) savedNote = data[0];
    } else {
      const { data, error: insertError } = await supabase.from('notes').insert([noteData]).select();
      error = insertError;
      if (data) savedNote = data[0];
    }

    if (error) {
      showToast('error', `Error saving note: ${error.message}`);
    } else if (savedNote) {
      setCurrentNote(savedNote);
      setLastSavedNote(savedNote);
      showToast('success', 'Note saved');
      if (user) fetchNotes(user.id);
    }
    setSaving(false);
  };

  const handleDeleteNote = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm('Delete this note permanently?')) return;

    let error: unknown = null;
    try {
      await invoke('notes-ai', { action: 'delete_notebook', note_id: id });
    } catch (e) {
      error = e;
      showToast('error', e instanceof Error ? e.message : String(e));
    }
    if (!error) {
      if (currentNote.id === id) {
        const resetNote = { title: '', content: '' };
        setCurrentNote(resetNote);
        setLastSavedNote(resetNote);
      }
      if (user) fetchNotes(user.id);
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    localStorage.removeItem('userEmail');
    navigate('/login');
  };

  return (
    <div className="dashboard-container notes-shell">
      {studyOpen && currentNote.id && (
        <NoteStudy
          key={currentNote.id}
          noteId={currentNote.id}
          onClose={() => setStudyOpen(false)}
        />
      )}
      <button
        className="study-launch btn-primary"
        disabled={!currentNote.id || hasUnsavedChanges()}
        onClick={() => setStudyOpen(true)}
        title="Save your note before opening study tools"
      >
        Sources & study tools
      </button>
      {toast && (
        <div className="toast-stack">
          <div className={`toast-notification toast-${toast.type}`}>{toast.text}</div>
        </div>
      )}

      {/* Warning Modal */}
      {showWarning && (
        <div className="modal-overlay">
          <div className="modal-card">
            <div className="modal-icon-wrapper">⚠️</div>
            <h3>Unsaved Changes</h3>
            <p>Your latest edits haven't been saved yet. Are you sure you want to discard them?</p>
            <div className="modal-actions">
              <button className="btn-secondary" onClick={() => setShowWarning(false)}>
                Go Back
              </button>
              <button className="btn-danger" onClick={confirmDiscard}>
                Discard
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Sidebar */}
      <Sidebar
        user={user}
        onSignOut={() => handleActionWithWarning(handleSignOut)}
        beforeNavigate={handleActionWithWarning}
      >
        <section className="notes-library" aria-label="Your notes">
          <div className="section-heading">
            <h2>Your notes</h2>
            <button className="icon-button" onClick={handleNewNote} aria-label="Create a new note">
              <Icon name="plus" size={18} />
            </button>
          </div>
          <div className="notes-search-container">
            <div className="notes-search-input-wrapper">
              <span className="notes-search-icon-svg">
                <Icon name="notes" size={15} />
              </span>
              <input
                aria-label="Search notes"
                placeholder="Search your notes…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>
          <div className="notes-list-sidebar">
            {notes
              .filter(
                (n) =>
                  n.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                  n.content.toLowerCase().includes(searchQuery.toLowerCase()),
              )
              .map((note) => (
                <div
                  className={'note-library-row ' + (currentNote.id === note.id ? 'selected' : '')}
                  key={note.id}
                >
                  <button className="note-select" onClick={() => handleSelectNote(note)}>
                    <Icon name="notes" size={16} />
                    <span>{note.title || 'Untitled note'}</span>
                  </button>
                  <button
                    className="icon-button"
                    aria-label={'Delete ' + (note.title || 'untitled note')}
                    onClick={(e) => handleDeleteNote(note.id, e)}
                  >
                    <Icon name="close" size={14} />
                  </button>
                </div>
              ))}
          </div>
          {!notes.length && (
            <p className="library-empty">
              A fresh page for your next idea.
              <button className="text-button" onClick={handleNewNote}>
                Create your first note
              </button>
            </p>
          )}
        </section>
      </Sidebar>

      {/* Main Content */}
      <main className="dashboard-main" style={{ padding: '0' }}>
        {loading ? (
          <LoadingContent />
        ) : (
          <>
            <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
              <header className="notes-editor-header">
                <input
                  ref={titleInputRef}
                  type="text"
                  className="note-title-input-enhanced"
                  placeholder="Give your note a title..."
                  value={currentNote.title || ''}
                  onChange={(e) => setCurrentNote((prev) => ({ ...prev, title: e.target.value }))}
                />
                <div style={{ display: 'flex', gap: '1.25rem', alignItems: 'center' }}>
                  {hasUnsavedChanges() && (
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        color: 'var(--accent)',
                        fontSize: '0.85rem',
                        fontWeight: '700',
                      }}
                    >
                      <span
                        style={{
                          width: '8px',
                          height: '8px',
                          background: 'currentColor',
                          borderRadius: '50%',
                          display: 'inline-block',
                        }}
                      ></span>
                      Unsaved
                    </div>
                  )}
                  <button onClick={handleSaveNote} className="btn-save-enhanced" disabled={saving}>
                    <svg
                      width="18"
                      height="18"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
                      <polyline points="17 21 17 13 7 13 7 21" />
                      <polyline points="7 3 7 8 15 8" />
                    </svg>
                    {saving ? 'Saving...' : 'Save Note'}
                  </button>
                </div>
              </header>

              <div className="notes-editor-body">
                <ReactQuill
                  key={currentNote.id || 'new'}
                  theme="snow"
                  value={currentNote.content || ''}
                  onChange={(content) => setCurrentNote((prev) => ({ ...prev, content }))}
                  placeholder="Start writing your brilliant ideas here..."
                  modules={{
                    toolbar: [
                      [{ header: [1, 2, 3, false] }, { size: Size.whitelist }],
                      ['bold', 'italic', 'underline', 'strike'],
                      [{ color: [] }, { background: [] }],
                      [{ list: 'ordered' }, { list: 'bullet' }],
                      ['link', 'image'],
                      ['clean'],
                    ],
                  }}
                  formats={[
                    'header',
                    'size',
                    'bold',
                    'italic',
                    'underline',
                    'strike',
                    'color',
                    'background',
                    'list',
                    'bullet',
                    'link',
                    'image',
                  ]}
                  style={{ height: 'calc(100% - 60px)' }}
                />
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
};

export default Notes;
