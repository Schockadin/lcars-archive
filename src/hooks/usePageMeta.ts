"use client";

import { useEffect } from "react";
import { useNeo } from "@/hooks/useNeo";
import { NavKey } from "@/lib/nav";

export function usePageMeta(title: string, section: NavKey) {
  const { setTitle, setActiveSection } = useNeo();

  useEffect(() => {
    setTitle(title);
    setActiveSection(section);
  }, [title, section, setTitle, setActiveSection]);
}
