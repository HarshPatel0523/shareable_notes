// Enhanced data manager for comprehensive persistence
export class DataManager {
  static STORAGE_KEYS = {
    NOTES: 'shareable_notes_data',
    USER_PREFERENCES: 'shareable_notes_preferences',
    APP_SETTINGS: 'shareable_notes_settings',
    EDITOR_STATE: 'shareable_notes_editor_state',
    BACKUP: 'shareable_notes_backup'
  };

  // Notes management
  static saveNotes(notes) {
    try {
      const notesData = {
        notes: notes,
        lastSaved: new Date().toISOString(),
        version: '1.0.0'
      };
      localStorage.setItem(this.STORAGE_KEYS.NOTES, JSON.stringify(notesData));
      
      // Create automatic backup
      this.createBackup(notesData);
      return true;
    } catch (error) {
      console.error('Failed to save notes:', error);
      return false;
    }
  }

  static loadNotes() {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEYS.NOTES);
      if (!stored) return [];

      const notesData = JSON.parse(stored);
      return notesData.notes || [];
    } catch (error) {
      console.error('Failed to load notes:', error);
      // Try to load from backup
      return this.loadFromBackup() || [];
    }
  }

  // User preferences management
  static saveUserPreferences(preferences) {
    try {
      const prefData = {
        ...preferences,
        lastUpdated: new Date().toISOString(),
        user: 'HarshPatel0523' // Current user
      };
      localStorage.setItem(this.STORAGE_KEYS.USER_PREFERENCES, JSON.stringify(prefData));
      return true;
    } catch (error) {
      console.error('Failed to save preferences:', error);
      return false;
    }
  }

  static loadUserPreferences() {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEYS.USER_PREFERENCES);
      if (!stored) return this.getDefaultPreferences();

      return JSON.parse(stored);
    } catch (error) {
      console.error('Failed to load preferences:', error);
      return this.getDefaultPreferences();
    }
  }

  static getDefaultPreferences() {
    return {
      theme: 'light',
      sidebarOpen: true,
      autoSave: true,
      autoSaveInterval: 300, // 5 minutes
      defaultFontSize: 16,
      grammarCheck: true,
      encryptionEnabled: true,
      backupFrequency: 'daily',
      dateFormat: 'YYYY-MM-DD',
      timeFormat: '24h',
      language: 'en',
      lastUpdated: new Date().toISOString(),
      user: 'HarshPatel0523'
    };
  }

  // App settings management
  static saveAppSettings(settings) {
    try {
      const settingsData = {
        ...settings,
        lastModified: new Date().toISOString()
      };
      localStorage.setItem(this.STORAGE_KEYS.APP_SETTINGS, JSON.stringify(settingsData));
      return true;
    } catch (error) {
      console.error('Failed to save app settings:', error);
      return false;
    }
  }

  static loadAppSettings() {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEYS.APP_SETTINGS);
      if (!stored) return this.getDefaultAppSettings();

      return JSON.parse(stored);
    } catch (error) {
      console.error('Failed to load app settings:', error);
      return this.getDefaultAppSettings();
    }
  }

  static getDefaultAppSettings() {
    return {
      aiInsightsEnabled: true,
      grammarCheckEnabled: true,
      autoBackup: true,
      maxNotesHistory: 50,
      debugMode: false,
      apiRetryCount: 3,
      lastModified: new Date().toISOString()
    };
  }

  // Editor state persistence
  static saveEditorState(state) {
    try {
      const editorData = {
        ...state,
        timestamp: new Date().toISOString()
      };
      localStorage.setItem(this.STORAGE_KEYS.EDITOR_STATE, JSON.stringify(editorData));
      return true;
    } catch (error) {
      console.error('Failed to save editor state:', error);
      return false;
    }
  }

  static loadEditorState() {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEYS.EDITOR_STATE);
      if (!stored) return null;

      const editorState = JSON.parse(stored);
      
      // Check if state is not too old (max 1 day)
      const timestamp = new Date(editorState.timestamp);
      const now = new Date();
      const hoursDiff = (now - timestamp) / (1000 * 60 * 60);
      
      if (hoursDiff > 24) {
        this.clearEditorState();
        return null;
      }

      return editorState;
    } catch (error) {
      console.error('Failed to load editor state:', error);
      return null;
    }
  }

  static clearEditorState() {
    localStorage.removeItem(this.STORAGE_KEYS.EDITOR_STATE);
  }

  // Backup and restore functionality
  static createBackup(data) {
    try {
      const backupData = {
        ...data,
        backupDate: new Date().toISOString(),
        user: 'HarshPatel0523'
      };
      localStorage.setItem(this.STORAGE_KEYS.BACKUP, JSON.stringify(backupData));
    } catch (error) {
      console.error('Failed to create backup:', error);
    }
  }

  static loadFromBackup() {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEYS.BACKUP);
      if (!stored) return null;

      const backupData = JSON.parse(stored);
      return backupData.notes || [];
    } catch (error) {
      console.error('Failed to load from backup:', error);
      return null;
    }
  }

  // Export/Import functionality
  static exportData() {
    try {
      const exportData = {
        notes: this.loadNotes(),
        preferences: this.loadUserPreferences(),
        settings: this.loadAppSettings(),
        exportDate: new Date().toISOString(),
        user: 'HarshPatel0523',
        version: '1.0.0'
      };

      const dataStr = JSON.stringify(exportData, null, 2);
      const dataBlob = new Blob([dataStr], { type: 'application/json' });
      
      const url = URL.createObjectURL(dataBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `shareable-notes-backup-${new Date().toISOString().split('T')[0]}.json`;
      link.click();
      
      URL.revokeObjectURL(url);
      return true;
    } catch (error) {
      console.error('Failed to export data:', error);
      return false;
    }
  }

  static async importData(file) {
    try {
      const text = await file.text();
      const importData = JSON.parse(text);

      // Validate import data
      if (!importData.notes || !Array.isArray(importData.notes)) {
        throw new Error('Invalid backup file format');
      }

      // Save imported data
      if (importData.notes) this.saveNotes(importData.notes);
      if (importData.preferences) this.saveUserPreferences(importData.preferences);
      if (importData.settings) this.saveAppSettings(importData.settings);

      return true;
    } catch (error) {
      console.error('Failed to import data:', error);
      return false;
    }
  }

  // Storage management
  static getStorageInfo() {
    try {
      let totalSize = 0;
      const storageData = {};

      Object.values(this.STORAGE_KEYS).forEach(key => {
        const data = localStorage.getItem(key);
        if (data) {
          const size = new Blob([data]).size;
          totalSize += size;
          storageData[key] = {
            size: size,
            sizeFormatted: this.formatBytes(size)
          };
        }
      });

      return {
        totalSize,
        totalSizeFormatted: this.formatBytes(totalSize),
        breakdown: storageData
      };
    } catch (error) {
      console.error('Failed to get storage info:', error);
      return null;
    }
  }

  static formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  static clearAllData() {
    try {
      Object.values(this.STORAGE_KEYS).forEach(key => {
        localStorage.removeItem(key);
      });
      return true;
    } catch (error) {
      console.error('Failed to clear data:', error);
      return false;
    }
  }

  // Search functionality
  static searchNotes(query, notes = null) {
    const notesToSearch = notes || this.loadNotes();
    const searchTerm = query.toLowerCase().trim();

    if (!searchTerm) return notesToSearch;

    return notesToSearch.filter(note => {
      // Don't search encrypted content
      const searchableContent = note.isEncrypted 
        ? note.title.toLowerCase()
        : (note.title + ' ' + note.content).toLowerCase();

      return searchableContent.includes(searchTerm) ||
             (note.tags && note.tags.some(tag => tag.toLowerCase().includes(searchTerm)));
    });
  }

  // Statistics
  static getStatistics() {
    const notes = this.loadNotes();
    const preferences = this.loadUserPreferences();

    return {
      totalNotes: notes.length,
      encryptedNotes: notes.filter(note => note.isEncrypted).length,
      pinnedNotes: notes.filter(note => note.isPinned).length,
      totalWords: notes.reduce((total, note) => {
        if (note.isEncrypted) return total;
        const words = note.content.replace(/<[^>]*>/g, '').trim().split(/\s+/).filter(word => word.length > 0);
        return total + words.length;
      }, 0),
      averageNoteLength: notes.length > 0 ? Math.round(notes.reduce((total, note) => {
        if (note.isEncrypted) return total;
        return total + note.content.replace(/<[^>]*>/g, '').length;
      }, 0) / notes.filter(note => !note.isEncrypted).length) : 0,
      oldestNote: notes.length > 0 ? new Date(Math.min(...notes.map(note => new Date(note.createdAt)))).toISOString() : null,
      newestNote: notes.length > 0 ? new Date(Math.max(...notes.map(note => new Date(note.createdAt)))).toISOString() : null,
      user: preferences.user || 'HarshPatel0523',
      lastActivity: new Date().toISOString()
    };
  }
}