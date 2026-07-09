// src/context/RuneProvider.tsx
"use client";
import { useCallback, useState, type ReactNode } from "react";
import { EditContextValue, EditContext } from "./EditContext";

interface EditProviderProps {
  children: ReactNode;
}

export function EditProvider({ children }: EditProviderProps) {
  const [editMode, setEditMode] = useState<boolean>(false);
  const [content, setContent] = useState<string>("");

  const value: EditContextValue = {
    editMode,
    setEditMode,
    content,
    setContent,
  };

  return <EditContext.Provider value={value}>{children}</EditContext.Provider>;
}
