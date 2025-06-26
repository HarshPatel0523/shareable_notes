import React, { useState } from 'react';
import './NotesListPanel.css';

const NotesListPanel = ({ 
  notes, 
  activeNote, 
  onSelectNote, 
  onDeleteNote, 
  onTogglePin, 
  isOpen,
  decryptedNotes = new Map()
}) => {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredNotes = notes.filter(note => {
    const searchableContent = note.isEncrypted && !decryptedNotes.has(note.id) 
      ? note.title // Only search title for encrypted notes
      : note.title + ' ' + (decryptedNotes.get(note.id) || note.content);
    
    return searchableContent.toLowerCase().includes(searchTerm.toLowerCase());
  });

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now - date);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 1) return 'Today';
    if (diffDays === 2) return 'Yesterday';
    if (diffDays <= 7) return `${diffDays - 1} days ago`;
    return date.toLocaleDateString();
  };

  const getPreview = (note) => {
    if (note.isEncrypted && !decryptedNotes.has(note.id)) {
      return '🔒 Encrypted note - unlock to view content';
    }
    
    const content = decryptedNotes.get(note.id) || note.content;
    const textContent = content.replace(/<[^>]*>/g, '');
    return textContent.length > 100 ? textContent.substring(0, 100) + '...' : textContent;
  };

  const getWordCount = (note) => {
    if (note.isEncrypted && !decryptedNotes.has(note.id)) {
      return 0;
    }
    
    const content = decryptedNotes.get(note.id) || note.content;
    const textContent = content.replace(/<[^>]*>/g, '');
    const words = textContent.trim().split(/\s+/).filter(word => word.length > 0);
    return words.length;
  };

  return (
    <div className={`notes-list-panel ${isOpen ? 'open' : 'closed'}`}>
      <div className="panel-header">
        <div className="search-container">
          <input
            type="text"
            placeholder="Search notes..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input"
          />
        </div>
        
        <div className="notes-count">
          {filteredNotes.length} {filteredNotes.length === 1 ? 'note' : 'notes'}
        </div>
      </div>

      <div className="notes-list">
        {filteredNotes.length === 0 ? (
          <div className="no-notes">
            {searchTerm ? 'No notes found' : 'No notes yet'}
          </div>
        ) : (
          filteredNotes.map(note => (
            <div
              key={note.id}
              className={`note-item ${activeNote?.id === note.id ? 'active' : ''} ${note.isEncrypted ? 'encrypted' : ''} ${note.isPinned ? 'pinned' : ''}`}
              onClick={() => onSelectNote(note)}
            >
              <div className="note-item-header">
                <div className="note-title-section">
                  <div className="note-icons">
                    {note.isPinned && <span className="pin-icon" title="Pinned">📌</span>}
                    {note.isEncrypted && <span className="lock-icon" title="Encrypted">🔒</span>}
                  </div>
                  <div className="note-title">
                    {note.title || 'Untitled'}
                  </div>
                </div>
                <div className="note-actions">
                  <button
                    className={`action-btn pin-btn ${note.isPinned ? 'pinned' : ''}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      onTogglePin(note.id);
                    }}
                    title={note.isPinned ? 'Unpin note' : 'Pin note'}
                  >
                    📌
                  </button>
                  <button
                    className="action-btn delete-btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (window.confirm('Are you sure you want to delete this note?')) {
                        onDeleteNote(note.id);
                      }
                    }}
                    title="Delete note"
                  >
                    🗑️
                  </button>
                </div>
              </div>
              
              <div className="note-preview">
                {getPreview(note) || 'No content'}
              </div>
              
              <div className="note-footer">
                <div className="note-meta">
                  <div className="note-date">
                    {formatDate(note.updatedAt)}
                  </div>
                  <div className="note-stats">
                    {!note.isEncrypted || decryptedNotes.has(note.id) ? (
                      <span className="word-count">{getWordCount(note)} words</span>
                    ) : (
                      <span className="encrypted-indicator">Encrypted</span>
                    )}
                  </div>
                </div>
                
                {note.tags && note.tags.length > 0 && (
                  <div className="note-tags">
                    {note.tags.slice(0, 2).map((tag, index) => (
                      <span key={index} className="note-tag">{tag}</span>
                    ))}
                    {note.tags.length > 2 && <span className="more-tags">+{note.tags.length - 2}</span>}
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      <div className="panel-footer">
        <div className="user-info">
          <span className="user-name">👤 HarshPatel0523</span>
          <span className="last-sync">Last sync: {new Date().toLocaleTimeString()}</span>
        </div>
      </div>
    </div>
  );
};

export default NotesListPanel;