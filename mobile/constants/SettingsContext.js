/**
 * SettingsContext — global persisted user preferences
 *
 * Provides:
 *   primaryCrop  (string)  — e.g. 'tomato'
 *   region       (string)  — e.g. 'Chennai'
 *
 * Language preference is stored here AND synced with LanguageContext
 * so both contexts stay in harmony.
 *
 * All values survive app restarts via AsyncStorage.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useContext, useEffect, useState } from 'react';

const STORAGE_KEY = '@agrisense_settings';

const DEFAULTS = {
  primaryCrop: 'tomato',
  region: 'Chennai',
  language: 'en',
};

const SettingsContext = createContext({
  ...DEFAULTS,
  setPrimaryCrop: () => {},
  setRegion: () => {},
  setLanguageSetting: () => {},
});

export function SettingsProvider({ children }) {
  const [primaryCrop, setPrimaryCropState] = useState(DEFAULTS.primaryCrop);
  const [region, setRegionState] = useState(DEFAULTS.region);
  const [language, setLanguageState] = useState(DEFAULTS.language);
  const [loaded, setLoaded] = useState(false);

  // Load persisted settings on mount
  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((raw) => {
        if (raw) {
          const stored = JSON.parse(raw);
          if (stored.primaryCrop) setPrimaryCropState(stored.primaryCrop);
          if (stored.region) setRegionState(stored.region);
          if (stored.language) setLanguageState(stored.language);
        }
      })
      .catch(() => {}) // silently ignore read errors
      .finally(() => setLoaded(true));
  }, []);

  // Helper — persists the whole settings object
  const persist = (patch) => {
    const next = { primaryCrop, region, language, ...patch };
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next)).catch(() => {});
  };

  const setPrimaryCrop = (crop) => {
    setPrimaryCropState(crop);
    persist({ primaryCrop: crop });
  };

  const setRegion = (r) => {
    setRegionState(r);
    persist({ region: r });
  };

  const setLanguageSetting = (lang) => {
    setLanguageState(lang);
    persist({ language: lang });
  };

  if (!loaded) return null; // wait until storage is read before rendering

  return (
    <SettingsContext.Provider
      value={{ primaryCrop, region, language, setPrimaryCrop, setRegion, setLanguageSetting }}
    >
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  return useContext(SettingsContext);
}
