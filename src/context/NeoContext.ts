'use client'
import { createContext } from 'react';
import type { SectionKey } from '../types/character';

export interface NeoContextValue {
  activeSection: SectionKey;
  setActiveSection: (section: SectionKey) => void;
  title: string;
  setTitle: (title : string) => void;
}

export const NeoContext = createContext<NeoContextValue | undefined>(undefined);