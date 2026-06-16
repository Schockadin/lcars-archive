'use client';

import { useEffect } from 'react';
import { useNeo } from '@/context/useNeo';
import { SectionKey } from '@/types/character';

export function usePageMeta(title: string, section: SectionKey) {
  const { setTitle, setActiveSection } = useNeo();

  useEffect(() => {
    setTitle(title);
    setActiveSection(section);
  }, [title, section, setTitle, setActiveSection]);
}