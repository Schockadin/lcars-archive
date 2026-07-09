"use client";
import { createContext } from "react";

export interface EditContextValue {
  // Trigger and Preserve EditMode
  editMode: boolean;
  setEditMode: (v: boolean) => void;

  // Saves content between edits
  content: string;
  setContent: (v: string) => void;
}

export const EditContext = createContext<EditContextValue | undefined>(
  undefined,
);
