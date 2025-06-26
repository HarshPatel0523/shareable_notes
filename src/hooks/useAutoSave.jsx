import { useEffect, useRef, useCallback } from 'react';
import { DataManager } from '../utils/dataManager';

export const useAutoSave = (data, enabled = true, interval = 300000) => { // 5 minutes default
  const timeoutRef = useRef(null);
  const lastSavedRef = useRef(null);

  const saveData = useCallback(() => {
    if (data && JSON.stringify(data) !== JSON.stringify(lastSavedRef.current)) {
      const success = DataManager.saveNotes(data);
      if (success) {
        lastSavedRef.current = data;
        console.log('Auto-saved at:', new Date().toISOString());
      }
    }
  }, [data]);

  useEffect(() => {
    if (!enabled || !data) return;

    // Clear existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Set new timeout
    timeoutRef.current = setTimeout(saveData, interval);

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [data, enabled, interval, saveData]);

  // Manual save function
  const manualSave = useCallback(() => {
    saveData();
  }, [saveData]);

  return { manualSave };
};