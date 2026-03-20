import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import ReactQuill from 'react-quill-new';
import 'react-quill-new/dist/quill.snow.css';
import '../App.css';

interface Note {
  id: string;
  title: string;
  content: string;
  created_at: string;
  updated_at: string;
}

const Notes: React.FC = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);
  const [notes, setNotes] = useState<Note[]>([]);
  const [currentNote, setCurrentNote] = useState<Partial<Note>>({ title: '', content: '' });
  const [lastSavedNote, setLastSavedNote] = useState<Partial<Note>>({ title: '', content: '' });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<string | null>(null);
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

  const fetchNotes = async (userId: string, selectFirst: boolean = false) => {
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
  };

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
    setSaveStatus(null);

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
      const { data, error: insertError } = await supabase
        .from('notes')
        .insert([noteData])
        .select();
      error = insertError;
      if (data) savedNote = data[0];
    }

    if (error) {
      alert('Error saving: ' + error.message);
    } else if (savedNote) {
      setCurrentNote(savedNote);
      setLastSavedNote(savedNote);
      setSaveStatus('Saved!');
      fetchNotes(user.id);
      setTimeout(() => setSaveStatus(null), 2000);
    }
    setSaving(false);
  };

  const handleDeleteNote = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm('Delete this note permanently?')) return;

    const { error } = await supabase.from('notes').delete().eq('id', id);
    if (!error) {
      if (currentNote.id === id) {
        const resetNote = { title: '', content: '' };
        setCurrentNote(resetNote);
        setLastSavedNote(resetNote);
      }
      fetchNotes(user.id);
    }
  };

  if (loading) return <div className="auth-container">Opening Workspace...</div>;

  return (
    <div className="dashboard-container">
      {/* Warning Modal */}
      {showWarning && (
        <div className="modal-overlay">
          <div className="modal-card">
            <div className="modal-icon">!</div>
            <h3>Unsaved Changes</h3>
            <p>You have made changes that haven't been saved. If you leave now, these changes will be lost.</p>
            <div className="modal-actions">
              <button className="modal-btn btn-cancel" onClick={() => setShowWarning(false)}>Go Back</button>
              <button className="modal-btn btn-discard" onClick={confirmDiscard}>Discard Changes</button>
            </div>
          </div>
        </div>
      )}

      {/* Sidebar */}
      <div className="dashboard-sidebar notes-sidebar" style={{ width: '380px' }}>
        <div className="sidebar-header notes-sidebar-header">
          <div className="notes-sidebar-title-row">
            <div>
              <h3 className="notes-sidebar-title">Notes</h3>
              <p className="notes-sidebar-subtitle">Search and reopen your latest work.</p>
            </div>
            <button onClick={handleNewNote} className="new-note-btn">New Note</button>
          </div>
          <div className="notes-search-shell">
            <span className="notes-search-icon" aria-hidden="true">⌕</span>
            <input
              className="notes-search-input"
              type="text" 
              placeholder="Search notes..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>
        
        <div className="notes-list" style={{ padding: '1rem' }}>
          {notes.filter(n => n.title.toLowerCase().includes(searchQuery.toLowerCase()) || n.content.toLowerCase().includes(searchQuery.toLowerCase())).length === 0 && 
            <div style={{ padding: '20px', color: '#888', textAlign: 'center' }}>
              {searchQuery ? 'No notes found' : 'No notes yet'}
            </div>
          }
          {notes
            .filter(n => n.title.toLowerCase().includes(searchQuery.toLowerCase()) || n.content.toLowerCase().includes(searchQuery.toLowerCase()))
            .map((note) => (
            <div 
              key={note.id} 
              className={`note-item ${currentNote.id === note.id ? 'active' : ''}`}
              onClick={() => handleSelectNote(note)}
              style={{ padding: '1.5rem' }}
            >
              <div className="note-item-title" style={{ fontSize: '1.1rem', marginBottom: '0.6rem' }}>{note.title || 'Untitled Note'}</div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span className="note-item-date">{new Date(note.updated_at).toLocaleDateString()}</span>
                <span 
                  onClick={(e) => handleDeleteNote(note.id, e)} 
                  className="delete-note-link"
                >
                  Delete
                </span>
              </div>
            </div>
          ))}
        </div>

        <div className="sidebar-footer" style={{ padding: '2rem' }}>
          <div style={{ fontWeight: '600', color: '#374151', fontSize: '1rem' }}>{user?.full_name}</div>
          <div style={{ fontSize: '0.85rem', color: '#6b7280' }}>{user?.email}</div>
        </div>
      </div>

      {/* Main Content */}
      <div className="dashboard-main notes-main" style={{ padding: '0 4rem' }}>
        <div className="editor-header notes-editor-header">
          <button
            onClick={() => handleActionWithWarning(() => navigate('/dashboard'))}
            className="notes-dashboard-btn"
          >
            Back to Dashboard
          </button>
          <input
            ref={titleInputRef}
            type="text"
            className="note-title-input notes-title-input"
            placeholder="Name your note..."
            value={currentNote.title || ''}
            onChange={(e) => setCurrentNote(prev => ({ ...prev, title: e.target.value }))}
          />
          <div className="notes-editor-actions">
            {saveStatus && <span className="notes-save-status">{saveStatus}</span>}
            <button
              onClick={handleSaveNote}
              className="save-note-btn"
              disabled={saving}
            >
              {saving ? 'Saving...' : 'Save Note'}
            </button>
          </div>
        </div>

        <div className="editor-container notes-editor-container">
          <ReactQuill 
            key={currentNote.id || 'new'}
            theme="snow" 
            value={currentNote.content || ''} 
            onChange={(content) => setCurrentNote(prev => ({ ...prev, content }))}
            placeholder="Start typing or paste images here..."
            style={{ fontSize: '1.2rem' }}
            modules={{
              toolbar: [
                [{ 'header': [1, 2, 3, false] }],
                ['bold', 'italic', 'underline', 'strike'],
                [{'list': 'ordered'}, {'list': 'bullet'}],
                ['link', 'image'],
                ['clean']
              ],
            }}
          />
        </div>
      </div>
    </div>
  );
};

export default Notes;
