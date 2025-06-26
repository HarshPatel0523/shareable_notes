import { useState, useEffect, useCallback } from 'react';
import { DataManager } from '../utils/dataManager';

export const useUserPreferences = () => {
  const [preferences, setPreferences] = useState(DataManager.getDefaultPreferences());
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadPreferences = () => {
      try {
        const loadedPreferences = DataManager.loadUserPreferences();
        setPreferences(loadedPreferences);
      } catch (error) {
        console.error('Failed to load preferences:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadPreferences();
  }, []);

  const updatePreference = useCallback((key, value) => {
    setPreferences(prev => {
      const updated = { ...prev, [key]: value };
      DataManager.saveUserPreferences(updated);
      return updated;
    });
  }, []);

  const updatePreferences = useCallback((updates) => {
    setPreferences(prev => {
      const updated = { ...prev, ...updates };
      DataManager.saveUserPreferences(updated);
      return updated;
    });
  }, []);

  const resetPreferences = useCallback(() => {
    const defaultPrefs = DataManager.getDefaultPreferences();
    setPreferences(defaultPrefs);
    DataManager.saveUserPreferences(defaultPrefs);
  }, []);

  return {
    preferences,
    updatePreference,
    updatePreferences,
    resetPreferences,
    isLoading
  };
};