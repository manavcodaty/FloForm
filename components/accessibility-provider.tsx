"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";

type AccessibilityState = {
  lowCognitiveLoad: boolean;
  highContrast: boolean;
  largeText: boolean;
  setLowCognitiveLoad: (value: boolean) => void;
  setHighContrast: (value: boolean) => void;
  setLargeText: (value: boolean) => void;
};

const AccessibilityContext = createContext<AccessibilityState | null>(null);

function usePersistentToggle(key: string, fallback = false) {
  const [value, setValue] = useState(fallback);

  useEffect(() => {
    const stored = window.localStorage.getItem(key);
    if (stored === "true") {
      setValue(true);
    }
    if (stored === "false") {
      setValue(false);
    }
  }, [key]);

  useEffect(() => {
    window.localStorage.setItem(key, String(value));
  }, [key, value]);

  return [value, setValue] as const;
}

export function AccessibilityProvider({ children }: { children: React.ReactNode }) {
  const [lowCognitiveLoad, setLowCognitiveLoad] = usePersistentToggle("floform-low-cognitive-load", true);
  const [highContrast, setHighContrast] = usePersistentToggle("floform-high-contrast", false);
  const [largeText, setLargeText] = usePersistentToggle("floform-large-text", false);

  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle("mode-high-contrast", highContrast);
    root.classList.toggle("mode-large-text", largeText);
    root.classList.toggle("mode-low-cognitive", lowCognitiveLoad);
  }, [highContrast, largeText, lowCognitiveLoad]);

  const value = useMemo(
    () => ({
      lowCognitiveLoad,
      highContrast,
      largeText,
      setLowCognitiveLoad,
      setHighContrast,
      setLargeText
    }),
    [lowCognitiveLoad, highContrast, largeText, setLowCognitiveLoad, setHighContrast, setLargeText]
  );

  return <AccessibilityContext.Provider value={value}>{children}</AccessibilityContext.Provider>;
}

export function useAccessibility() {
  const context = useContext(AccessibilityContext);
  if (!context) {
    throw new Error("useAccessibility must be used inside AccessibilityProvider");
  }
  return context;
}
