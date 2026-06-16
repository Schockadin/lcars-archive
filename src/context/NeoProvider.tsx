// src/context/RuneProvider.tsx
'use client'
import { useState, type ReactNode } from 'react';
import { NeoContextValue, NeoContext } from './NeoContext';
import type { SectionKey } from '@/types/character';

interface NeoProviderProps {
  children: ReactNode;
}

export function NeoProvider({ children }: NeoProviderProps) {
  const [activeSection, setActiveSection] = useState<SectionKey>('home');
  const [title, setTitle] = useState<string>('NeoVerse Archiv')

  const value: NeoContextValue = {
    activeSection,
    setActiveSection,
    title,
    setTitle,
  };

  return (
    <NeoContext.Provider value={value}>
      {children}
    </NeoContext.Provider>
  );
}