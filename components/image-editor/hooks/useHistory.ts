import { useState, useCallback } from 'react';
import { ImageHistory, AppliedEffect } from '../types';

interface UseHistoryReturn {
  history: ImageHistory[];
  historyIndex: number;
  canUndo: boolean;
  canRedo: boolean;
  addToHistory: (dataUrl: string, effects: AppliedEffect[]) => void;
  undo: () => ImageHistory | null;
  redo: () => ImageHistory | null;
  clearHistory: () => void;
  getCurrentState: () => ImageHistory | null;
}

export const useHistory = (): UseHistoryReturn => {
  const [history, setHistory] = useState<ImageHistory[]>([]);
  const [historyIndex, setHistoryIndex] = useState<number>(-1);

  const addToHistory = useCallback((dataUrl: string, effects: AppliedEffect[]) => {
    try {
      const newHistory: ImageHistory = {
        dataUrl,
        effects,
        timestamp: Date.now(),
      };

      // Truncate future history if we're not at the latest point
      const newHistoryList = history.slice(0, historyIndex + 1).concat([newHistory]);
      setHistory(newHistoryList);
      setHistoryIndex(newHistoryList.length - 1);

      console.log('Added to history, new length:', newHistoryList.length);
    } catch (error) {
      console.error('Error adding to history:', error);
    }
  }, [history, historyIndex]);

  const undo = useCallback((): ImageHistory | null => {
    if (historyIndex <= 0) {
      return null;
    }

    const newIndex = historyIndex - 1;
    setHistoryIndex(newIndex);
    return history[newIndex];
  }, [history, historyIndex]);

  const redo = useCallback((): ImageHistory | null => {
    if (historyIndex >= history.length - 1) {
      return null;
    }

    const newIndex = historyIndex + 1;
    setHistoryIndex(newIndex);
    return history[newIndex];
  }, [history, historyIndex]);

  const clearHistory = useCallback(() => {
    setHistory([]);
    setHistoryIndex(-1);
  }, []);

  const getCurrentState = useCallback((): ImageHistory | null => {
    if (historyIndex < 0 || historyIndex >= history.length) {
      return null;
    }
    return history[historyIndex];
  }, [history, historyIndex]);

  return {
    history,
    historyIndex,
    canUndo: historyIndex > 0,
    canRedo: historyIndex < history.length - 1,
    addToHistory,
    undo,
    redo,
    clearHistory,
    getCurrentState,
  };
}; 