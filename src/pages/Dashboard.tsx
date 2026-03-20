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

const Dashboard: React.FC = () => {
  const [user, setUser] = useState<any>(null);
  const [notes, setNotes] = useState<Note[]>([]);
  const [currentNote, setCurrentNote] = useState<Partial<Note>>({ title: '', content: '' });
  const [lastSavedNote, setLastSavedNote] = useState<Partial<Note>>({ title: '', content: '' });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<string | null>(null);
  const [showWarning, setShowWarning] = useState(false);
  const [pendingAction, setPendingAction] = useState<(() => void) | null>(null);
  
  const navigate = useNavigate();
  const titleInputRef = useRef<HTMLInputElement>(null);

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
      }
    }
  };

  const hasUnsavedChanges = () => {
    return (
      currentNote.title !== lastSavedNote.title ||
      currentNote.content !== lastSavedNote.content
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

  const handleSignOut = () => {
    handleActionWithWarning(() => {
      localStorage.removeItem('userEmail');
      navigate('/login');
    });
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
      <div className="dashboard-sidebar">
        <div className="sidebar-header">
          <h3>My Notes</h3>
          <button onClick={handleNewNote} className="new-note-btn">New Note</button>
        </div>
        
        <div className="notes-list">
          {notes.length === 0 && <div style={{ padding: '20px', color: '#888', textAlign: 'center' }}>No notes yet</div>}
          {notes.map((note) => (
            <div 
              key={note.id} 
              className={`note-item ${currentNote.id === note.id ? 'active' : ''}`}
              onClick={() => handleSelectNote(note)}
            >
              <div className="note-item-title">{note.title || 'Untitled Note'}</div>
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

        <div className="sidebar-footer">
          <div style={{ fontWeight: '600', color: '#374151', fontSize: '0.9rem' }}>{user?.full_name}</div>
          <div style={{ fontSize: '0.8rem', color: '#6b7280', marginBottom: '0.5rem' }}>{user?.email}</div>
          <span onClick={handleSignOut} className="sign-out-link">Sign Out</span>
        </div>
      </div>

      {/* Main Content */}
      <div className="dashboard-main">
        <div className="editor-header">
          <input 
            ref={titleInputRef}
            type="text" 
            className="note-title-input" 
            placeholder="Name your note..." 
            value={currentNote.title || ''}
            onChange={(e) => setCurrentNote(prev => ({ ...prev, title: e.target.value }))}
          />
          <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
            {saveStatus && <span style={{ color: '#10b981', fontWeight: '600', fontSize: '0.9rem' }}>{saveStatus}</span>}
            <button 
              onClick={handleSaveNote} 
              className="save-note-btn"
              disabled={saving}
            >
              {saving ? 'Saving...' : 'Save Note'}
            </button>
          </div>
        </div>

        <div className="editor-container">
          <ReactQuill 
            key={currentNote.id || 'new'}
            theme="snow" 
            value={currentNote.content || ''} 
            onChange={(content) => setCurrentNote(prev => ({ ...prev, content }))}
            placeholder="Start typing or paste images here..."
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

export default Dashboard;
