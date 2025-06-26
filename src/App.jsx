import React, { useState, useEffect } from 'react';
import './App.css';
import RichTextEditor from './components/RichTextEditor';
import NotesListPanel from './components/NotesListPanel';
import PasswordModal from './components/PasswordModal';
import AIInsightsPanel from './components/AIInsightsPanel';
import { generateId } from './utils/helpers';
import { encryptNote, decryptNote, hashPassword, verifyPassword } from './utils/encryption';
import { DataManager } from './utils/dataManager';
import { useUserPreferences } from './hooks/useUserPreferences';
import { useAutoSave } from './hooks/useAutoSave';

function App() {
  const [notes, setNotes] = useState([]);
  const [activeNote, setActiveNote] = useState(null);
  const [passwordModal, setPasswordModal] = useState({
    isOpen: false,
    mode: 'encrypt',
    noteId: null
  });
  const [aiInsightsOpen, setAiInsightsOpen] = useState(false);
  const [decryptedNotes, setDecryptedNotes] = useState(new Map());
  const [isLoading, setIsLoading] = useState(true);

  // User preferences and auto-save
  const { preferences, updatePreference } = useUserPreferences();
  const [sidebarOpen, setSidebarOpen] = useState(preferences.sidebarOpen);
  const { manualSave } = useAutoSave(notes, preferences.autoSave, preferences.autoSaveInterval * 1000);

  // Load notes on component mount
  useEffect(() => {
    const loadNotes = () => {
      try {
        const savedNotes = DataManager.loadNotes();
        if (savedNotes && savedNotes.length > 0) {
          setNotes(savedNotes);
          
          // Restore editor state
          const editorState = DataManager.loadEditorState();
          if (editorState && editorState.activeNoteId) {
            const activeNote = savedNotes.find(note => note.id === editorState.activeNoteId);
            if (activeNote && !activeNote.isEncrypted) {
              setActiveNote(activeNote);
            }
          } else {
            // Set first unencrypted note as active
            const firstUnencrypted = savedNotes.find(note => !note.isEncrypted);
            setActiveNote(firstUnencrypted || savedNotes[0]);
          }
        }
      } catch (error) {
        console.error('Failed to load notes:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadNotes();
  }, []);

  // Save notes to storage whenever notes change
  useEffect(() => {
    if (notes.length > 0 && !isLoading) {
      // Don't save decrypted content in storage
      const notesToSave = notes.map(note => {
        if (note.isEncrypted && decryptedNotes.has(note.id)) {
          return {
            ...note,
            content: note.encryptedContent || note.content
          };
        }
        return note;
      });
      DataManager.saveNotes(notesToSave);
    }
  }, [notes, isLoading, decryptedNotes]);

  // Save editor state
  useEffect(() => {
    if (activeNote && !isLoading) {
      DataManager.saveEditorState({
        activeNoteId: activeNote.id,
        sidebarOpen: sidebarOpen
      });
    }
  }, [activeNote, sidebarOpen, isLoading]);

  // Update sidebar preference
  useEffect(() => {
    updatePreference('sidebarOpen', sidebarOpen);
  }, [sidebarOpen, updatePreference]);

  const createNote = () => {
    const newNote = {
      id: generateId(),
      title: 'Untitled Note',
      content: '',
      isPinned: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      isEncrypted: false,
      encryptedContent: null,
      passwordHash: null,
      tags: [],
      insights: null,
      wordCount: 0,
      characterCount: 0,
      creator: 'HarshPatel0523'
    };
    
    setNotes(prevNotes => [newNote, ...prevNotes]);
    setActiveNote(newNote);
  };

  const updateNote = (noteId, updates) => {
    setNotes(prevNotes => 
      prevNotes.map(note => {
        if (note.id === noteId) {
          const updatedNote = { 
            ...note, 
            ...updates, 
            updatedAt: new Date().toISOString(),
            lastEditor: 'HarshPatel0523'
          };
          
          // Calculate word and character count for unencrypted content
          if (updates.content && !note.isEncrypted) {
            const textContent = updates.content.replace(/<[^>]*>/g, '');
            const words = textContent.trim().split(/\s+/).filter(word => word.length > 0);
            updatedNote.wordCount = words.length;
            updatedNote.characterCount = textContent.length;
          }
          
          // If note is encrypted and we have decrypted content, update cache
          if (note.isEncrypted && updates.content && decryptedNotes.has(noteId)) {
            setDecryptedNotes(prev => new Map(prev.set(noteId, updates.content)));
          }
          
          return updatedNote;
        }
        return note;
      })
    );
    
    if (activeNote && activeNote.id === noteId) {
      setActiveNote(prev => ({ ...prev, ...updates }));
    }
  };

  const deleteNote = (noteId) => {
    setNotes(prevNotes => prevNotes.filter(note => note.id !== noteId));
    
    // Remove from decrypted cache
    if (decryptedNotes.has(noteId)) {
      setDecryptedNotes(prev => {
        const newMap = new Map(prev);
        newMap.delete(noteId);
        return newMap;
      });
    }
    
    if (activeNote && activeNote.id === noteId) {
      const remainingNotes = notes.filter(note => note.id !== noteId);
      setActiveNote(remainingNotes.length > 0 ? remainingNotes[0] : null);
    }
  };

  const togglePin = (noteId) => {
    setNotes(prevNotes => {
      const updatedNotes = prevNotes.map(note => 
        note.id === noteId 
          ? { ...note, isPinned: !note.isPinned, updatedAt: new Date().toISOString() }
          : note
      );
      
      // Sort notes: pinned notes first, then by updated date
      return updatedNotes.sort((a, b) => {
        if (a.isPinned && !b.isPinned) return -1;
        if (!a.isPinned && b.isPinned) return 1;
        return new Date(b.updatedAt) - new Date(a.updatedAt);
      });
    });
  };

  const selectNote = (note) => {
    if (note.isEncrypted && !decryptedNotes.has(note.id)) {
      setPasswordModal({
        isOpen: true,
        mode: 'decrypt',
        noteId: note.id
      });
    } else {
      setActiveNote(note);
    }
  };

  // Encryption handlers
  const handleEncryptNote = () => {
    if (!activeNote || activeNote.isEncrypted) return;
    
    setPasswordModal({
      isOpen: true,
      mode: 'encrypt',
      noteId: activeNote.id
    });
  };

  const handleDecryptNote = () => {
    if (!activeNote || !activeNote.isEncrypted) return;
    
    setPasswordModal({
      isOpen: true,
      mode: 'decrypt',
      noteId: activeNote.id
    });
  };

  const handlePasswordSubmit = async (password) => {
    const { mode, noteId } = passwordModal;
    const note = notes.find(n => n.id === noteId);
    
    if (!note) throw new Error('Note not found');

    if (mode === 'encrypt') {
      try {
        const encryptedContent = encryptNote(note.content, password);
        const passwordHashValue = hashPassword(password);
        
        const encryptedNote = {
          ...note,
          isEncrypted: true,
          encryptedContent: encryptedContent,
          passwordHash: passwordHashValue,
          content: '🔒 This note is encrypted. Click to unlock.',
          encryptedAt: new Date().toISOString(),
          encryptedBy: 'HarshPatel0523'
        };
        
        updateNote(noteId, encryptedNote);
        
        // Remove from decrypted cache
        if (decryptedNotes.has(noteId)) {
          setDecryptedNotes(prev => {
            const newMap = new Map(prev);
            newMap.delete(noteId);
            return newMap;
          });
        }
        
      } catch (error) {
        throw new Error('Failed to encrypt note: ' + error.message);
      }
    } else if (mode === 'decrypt') {
      try {
        if (!verifyPassword(password, note.passwordHash)) {
          throw new Error('Invalid password');
        }
        
        const decryptedContent = decryptNote(note.encryptedContent, password);
        
        // Store decrypted content in cache
        setDecryptedNotes(prev => new Map(prev.set(noteId, decryptedContent)));
        
        // Update active note with decrypted content
        const decryptedNote = {
          ...note,
          content: decryptedContent,
          lastDecrypted: new Date().toISOString()
        };
        
        setActiveNote(decryptedNote);
        
      } catch (error) {
        throw new Error('Failed to decrypt note: ' + error.message);
      }
    }
  };

  // Export/Import functions
  const handleExportData = () => {
    const success = DataManager.exportData();
    if (success) {
      alert('Data exported successfully!');
    } else {
      alert('Failed to export data');
    }
  };

  const handleImportData = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const success = await DataManager.importData(file);
    if (success) {
      // Reload notes after import
      const importedNotes = DataManager.loadNotes();
      setNotes(importedNotes);
      alert('Data imported successfully!');
    } else {
      alert('Failed to import data');
    }
    
    // Reset file input
    event.target.value = '';
  };

  // Get display version of a note
  const getDisplayNote = (note) => {
    if (note.isEncrypted && decryptedNotes.has(note.id)) {
      return {
        ...note,
        content: decryptedNotes.get(note.id)
      };
    }
    return note;
  };

  // Get all notes for AI analysis
  const getAllNotesForAI = () => {
    return notes.map(note => getDisplayNote(note)).filter(note => !note.isEncrypted);
  };

  // Sort notes: pinned first, then by updated date
  const sortedNotes = [...notes].sort((a, b) => {
    if (a.isPinned && !b.isPinned) return -1;
    if (!a.isPinned && b.isPinned) return 1;
    return new Date(b.updatedAt) - new Date(a.updatedAt);
  });

  const displayActiveNote = activeNote ? getDisplayNote(activeNote) : null;

  if (isLoading) {
    return (
      <div className="app">
        <div className="loading-screen">
          <div className="spinner"></div>
          <p>Loading your notes...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="app">
      <div className="app-header">
        <div className="header-left">
          <button 
            className="sidebar-toggle"
            onClick={() => setSidebarOpen(!sidebarOpen)}
          >
            ☰
          </button>
          <h1>Shareable Notes</h1>
        </div>
        
        <div className="header-center">
          {activeNote && (
            <div className="note-status">
              {activeNote.isEncrypted && (
                <span className="encryption-badge">🔒 Encrypted</span>
              )}
              {activeNote.isPinned && (
                <span className="pin-badge">📌 Pinned</span>
              )}
            </div>
          )}
        </div>
        
        <div className="header-right">
          {activeNote && (
            <>
              <button 
                className="ai-insights-btn"
                onClick={() => setAiInsightsOpen(true)}
                disabled={activeNote.isEncrypted && !decryptedNotes.has(activeNote.id)}
                title="AI Insights"
              >
                🤖 Insights
              </button>
              
              {activeNote.isEncrypted ? (
                <button 
                  className="decrypt-btn"
                  onClick={handleDecryptNote}
                  title="Decrypt Note"
                >
                  🔓 Decrypt
                </button>
              ) : (
                <button 
                  className="encrypt-btn"
                  onClick={handleEncryptNote}
                  title="Encrypt Note"
                >
                  🔒 Encrypt
                </button>
              )}
            </>
          )}
          
          <div className="header-menu">
            <button className="menu-btn" title="Export Data" onClick={handleExportData}>
              📤 Export
            </button>
            <label className="menu-btn import-btn" title="Import Data">
              📥 Import
              <input
                type="file"
                accept=".json"
                onChange={handleImportData}
                style={{ display: 'none' }}
              />
            </label>
            <button 
              className="manual-save-btn" 
              onClick={manualSave}
              title="Manual Save"
            >
              💾 Save
            </button>
          </div>
          
          <button className="new-note-btn" onClick={createNote}>
            + New Note
          </button>
        </div>
      </div>

      <div className="app-body">
        <NotesListPanel 
          notes={sortedNotes}
          activeNote={activeNote}
          onSelectNote={selectNote}
          onDeleteNote={deleteNote}
          onTogglePin={togglePin}
          isOpen={sidebarOpen}
          decryptedNotes={decryptedNotes}
        />
        
        <div className="editor-container">
          {displayActiveNote ? (
            <RichTextEditor 
              note={displayActiveNote}
              onUpdateNote={updateNote}
              isEncrypted={activeNote.isEncrypted && !decryptedNotes.has(activeNote.id)}
            />
          ) : (
            <div className="no-note-selected">
              <h2>Welcome to Shareable Notes</h2>
              <p>Logged in as: <strong>HarshPatel0523</strong></p>
              <p>Create a new note or select an existing one to start writing.</p>
              
              {/* Temporary API test component */}
              {/* <APITestButton /> */}
              
              <div className="welcome-features">
                <div className="feature">
                  <span className="feature-icon">🔒</span>
                  <h3>Secure Encryption</h3>
                  <p>Protect your sensitive notes with password encryption</p>
                </div>
                <div className="feature">
                  <span className="feature-icon">🤖</span>
                  <h3>AI Insights</h3>
                  <p>Get intelligent analysis and suggestions for your notes</p>
                </div>
                <div className="feature">
                  <span className="feature-icon">✅</span>
                  <h3>Grammar Check</h3>
                  <p>AI-powered grammar checking and suggestions</p>
                </div>
                <div className="feature">
                  <span className="feature-icon">💾</span>
                  <h3>Auto Save</h3>
                  <p>Automatic saving and data persistence</p>
                </div>
              </div>
              
              <div className="stats-display">
                <div className="stat-item">
                  <span className="stat-number">{notes.length}</span>
                  <span className="stat-label">Total Notes</span>
                </div>
                <div className="stat-item">
                  <span className="stat-number">{notes.filter(n => n.isEncrypted).length}</span>
                  <span className="stat-label">Encrypted</span>
                </div>
                <div className="stat-item">
                  <span className="stat-number">{notes.filter(n => n.isPinned).length}</span>
                  <span className="stat-label">Pinned</span>
                </div>
              </div>
              
              <button className="create-first-note" onClick={createNote}>
                Create Your First Note
              </button>
            </div>
          )}
        </div>
      </div>

      <PasswordModal
        isOpen={passwordModal.isOpen}
        onClose={() => setPasswordModal({ isOpen: false, mode: 'encrypt', noteId: null })}
        onSubmit={handlePasswordSubmit}
        mode={passwordModal.mode}
        title={passwordModal.mode === 'encrypt' ? 'Encrypt Note' : 'Unlock Note'}
      />

      <AIInsightsPanel
        note={displayActiveNote}
        allNotes={getAllNotesForAI()}
        isOpen={aiInsightsOpen}
        onClose={() => setAiInsightsOpen(false)}
      />
    </div>
  );
}

export default App;