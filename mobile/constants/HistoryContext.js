/**
 * HistoryContext — stores the scan history across sessions.
 *
 * Each history entry shape:
 * {
 *   id:            string   (timestamp + random)
 *   crop:          string   e.g. 'tomato'
 *   disease_name:  string
 *   confidence:    number
 *   risk_level:    string
 *   date:          string   ISO date string
 * }
 *
 * ResultScreen calls addScanResult() after a successful prediction.
 * HistoryScreen reads scanHistory[].
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useContext, useEffect, useState } from 'react';

const STORAGE_KEY = '@agrisense_history';
const MAX_ENTRIES = 50; // keep latest 50 scans

const HistoryContext = createContext({
  scanHistory: [],
  addScanResult: () => {},
  clearHistory: () => {},
});

export function HistoryProvider({ children }) {
  const [scanHistory, setScanHistory] = useState([]);

  // Load persisted history on mount
  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((raw) => {
        if (raw) {
          const stored = JSON.parse(raw);
          if (Array.isArray(stored)) setScanHistory(stored);
        }
      })
      .catch(() => {});
  }, []);

  const persist = (list) => {
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(list)).catch(() => {});
  };

  /**
   * Add a new scan record to the top of the history list.
   * @param {object} result — the full response from predictDisease()
   * @param {string} crop   — the crop that was scanned
   */
  const addScanResult = (result, crop) => {
    const entry = {
      id: `${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      crop: result?.crop || crop,
      disease_name: result?.disease_name || 'Unknown',
      confidence: typeof result?.confidence === 'number'
        ? parseFloat(result.confidence.toFixed(1))
        : 0,
      risk_level: result?.risk_level || 'low',
      date: new Date().toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      }),
    };

    setScanHistory((prev) => {
      const next = [entry, ...prev].slice(0, MAX_ENTRIES);
      persist(next);
      return next;
    });
  };

  const clearHistory = () => {
    setScanHistory([]);
    AsyncStorage.removeItem(STORAGE_KEY).catch(() => {});
  };

  return (
    <HistoryContext.Provider value={{ scanHistory, addScanResult, clearHistory }}>
      {children}
    </HistoryContext.Provider>
  );
}

export function useHistory() {
  return useContext(HistoryContext);
}
