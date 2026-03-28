import React, { useEffect, useState, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import ReactQuill, { Quill } from 'react-quill-new';
import 'react-quill-new/dist/quill.snow.css';
import '../App.css';

// Register custom numeric font sizes
const Size = Quill.import('attributors/style/size') as any;
Size.whitelist = ['10px', '12px', '14px', '16px', '18px', '20px', '24px', '32px', '48px', '64px'];
Quill.register(Size, true);

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
  const [toast, setToast] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [showWarning, setShowWarning] = useState(false);
  const [pendingAction, setPendingAction] = useState<(() => void) | null>(null);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [isFeaturesOpen, setIsFeaturesOpen] = useState(false);
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
      const { data, error: insertError } = await supabase
        .from('notes')
        .insert([noteData])
        .select();
      error = insertError;
      if (data) savedNote = data[0];
    }

    if (error) {
      showToast('error', `Error saving note: ${error.message}`);
    } else if (savedNote) {
      setCurrentNote(savedNote);
      setLastSavedNote(savedNote);
      showToast('success', 'Note saved');
      fetchNotes(user.id);
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

  const handleSignOut = () => {
    localStorage.removeItem('userEmail');
    navigate('/login');
  };

  if (loading) return <div className="dashboard-container" style={{ justifyContent: 'center', alignItems: 'center' }}>Opening Workspace...</div>;

  return (
    <div className="dashboard-container">
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
              <button className="btn-secondary" onClick={() => setShowWarning(false)}>Go Back</button>
              <button className="btn-danger" onClick={confirmDiscard}>Discard</button>
            </div>
          </div>
        </div>
      )}

      {/* Sidebar */}
      <aside className="dashboard-sidebar">
        <div className="sidebar-header">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
            <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/>
          </svg>
          <h3>Stride.</h3>
        </div>
        
        <nav className="sidebar-nav">
          <Link to="/dashboard" className="sidebar-link">🏠 Overview</Link>
          
          {/* COLLAPSIBLE FEATURES */}
          <div className="sidebar-item-group">
            <button 
              onClick={() => setIsFeaturesOpen(!isFeaturesOpen)}
              className="sidebar-link"
              style={{ width: '100%', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', display: 'flex', justifyContent: 'space-between' }}
            >
              <span>🚀 Show more</span>
              <span style={{ transform: isFeaturesOpen ? 'rotate(180deg)' : 'rotate(0)', transition: 'transform 0.2s' }}>▼</span>
            </button>
            {isFeaturesOpen && (
              <div style={{ paddingLeft: '1rem', display: 'flex', flexDirection: 'column', gap: '0.25rem', marginTop: '0.25rem' }}>
                <Link to="/calendar" className="sidebar-link" style={{ fontSize: '0.9rem' }}>📅 Calendar</Link>
                <Link to="/todo" className="sidebar-link" style={{ fontSize: '0.9rem' }}>✅ Tasks</Link>
                <Link to="/goals" className="sidebar-link" style={{ fontSize: '0.9rem' }}>🎯 Goals</Link>
                <Link to="/focus" className="sidebar-link" style={{ fontSize: '0.9rem' }}>⏱️ Focus</Link>
              </div>
            )}
          </div>

          <div className="sidebar-divider" style={{ height: '1px', background: 'var(--border)', margin: '0.5rem 0' }}></div>
          
          {/* SEARCH BAR */}
          <div className="notes-search-container">
            <div className="notes-search-input-wrapper">
              <svg className="notes-search-icon-svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>
              </svg>
              <input 
                type="text" 
                placeholder="Search notes..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>

          <button onClick={handleNewNote} className="btn-primary" style={{ margin: '0 0.75rem 1.5rem 0.75rem' }}>+ New Note</button>
          
          <div style={{ padding: '0 0.75rem 0.5rem 1rem', fontSize: '0.75rem', fontWeight: '700', textTransform: 'uppercase', color: 'var(--text)', opacity: 0.6, letterSpacing: '0.05em' }}>Recent Notes</div>
          <div className="notes-list-sidebar" style={{ display: 'flex', flexDirection: 'column' }}>
            {notes
              .filter(n => n.title.toLowerCase().includes(searchQuery.toLowerCase()) || n.content.toLowerCase().includes(searchQuery.toLowerCase()))
              .map((note) => (
              <div 
                key={note.id} 
                className={`sidebar-link ${currentNote.id === note.id ? 'active' : ''}`}
                onClick={() => handleSelectNote(note)}
                style={{ cursor: 'pointer', justifyContent: 'space-between', margin: '0 0.5rem' }}
              >
                <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{note.title || 'Untitled Note'}</span>
                {currentNote.id === note.id && <span onClick={(e) => handleDeleteNote(note.id, e)} style={{ fontSize: '0.8rem', opacity: 0.7 }}>✕</span>}
              </div>
            ))}
          </div>
        </nav>

        <div className="sidebar-footer">
          <div style={{ padding: '0.5rem' }}>
            <div style={{ fontWeight: '700', color: 'var(--text-h)', fontSize: '0.95rem' }}>{user?.full_name}</div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text)' }}>{user?.email}</div>
          </div>
          <button onClick={handleSignOut} className="btn-sign-out">Logout</button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="dashboard-main" style={{ padding: '0' }}>
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
          <header style={{ padding: '1.25rem 3.5rem', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: '2rem', background: 'white' }}>
             <input
              ref={titleInputRef}
              type="text"
              className="note-title-input-enhanced"
              placeholder="Give your note a title..."
              value={currentNote.title || ''}
              onChange={(e) => setCurrentNote(prev => ({ ...prev, title: e.target.value }))}
            />
            <div style={{ display: 'flex', gap: '1.25rem', alignItems: 'center' }}>
               {hasUnsavedChanges() && (
                 <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--accent)', fontSize: '0.85rem', fontWeight: '700' }}>
                   <span style={{ width: '8px', height: '8px', background: 'currentColor', borderRadius: '50%', display: 'inline-block' }}></span>
                   Unsaved
                 </div>
               )}
               <button onClick={handleSaveNote} className="btn-save-enhanced" disabled={saving}>
                 <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                   <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/>
                 </svg>
                 {saving ? 'Saving...' : 'Save Note'}
               </button>
            </div>
          </header>

          <div style={{ flex: 1, padding: '2rem 3.5rem', overflowY: 'auto', background: 'white' }}>
            <ReactQuill 
              key={currentNote.id || 'new'}
              theme="snow" 
              value={currentNote.content || ''} 
              onChange={(content) => setCurrentNote(prev => ({ ...prev, content }))}
              placeholder="Start writing your brilliant ideas here..."
              modules={{
                toolbar: [
                  [{ 'header': [1, 2, 3, false] }, { 'size': Size.whitelist }],
                  ['bold', 'italic', 'underline', 'strike'],
                  [{ 'color': [] }, { 'background': [] }],
                  [{'list': 'ordered'}, {'list': 'bullet'}],
                  ['link', 'image'],
                  ['clean']
                ],
              }}
              formats={[
                'header', 'size',
                'bold', 'italic', 'underline', 'strike',
                'color', 'background',
                'list', 'bullet',
                'link', 'image'
              ]}
              style={{ height: 'calc(100% - 60px)' }}
            />
          </div>
        </div>
      </main>
    </div>
  );
};

export default Notes;
