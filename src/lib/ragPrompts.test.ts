import { describe, it, expect } from "vitest";
import {
  RAG_PROMPTS,
  PROMPT_PLACEHOLDER,
  promptNeedsInput,
  fillPrompt,
  promptCaret,
} from "./ragPrompts";

describe("RAG_PROMPTS", () => {
  it("hat eindeutige IDs, Beschriftung, Hinweis und Text", () => {
    const ids = RAG_PROMPTS.map((p) => p.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const p of RAG_PROMPTS) {
      expect(p.label.length, p.id).toBeGreaterThan(0);
      expect(p.hint.length, p.id).toBeGreaterThan(0);
      expect(p.template.length, p.id).toBeGreaterThan(20);
    }
  });

  it("nutzt höchstens einen Platzhalter je Vorlage", () => {
    for (const p of RAG_PROMPTS) {
      const n = p.template.split(PROMPT_PLACEHOLDER).length - 1;
      expect(n, p.id).toBeLessThanOrEqual(1);
    }
  });

  it("enthält eine Rückschau ohne nötige Eingabe", () => {
    const recap = RAG_PROMPTS.find((p) => p.id === "recap");
    expect(recap).toBeDefined();
    expect(promptNeedsInput(recap!)).toBe(false);
  });
});

describe("promptNeedsInput / fillPrompt / promptCaret", () => {
  const withPlaceholder = RAG_PROMPTS.find((p) => p.id === "person")!;
  const without = RAG_PROMPTS.find((p) => p.id === "recap")!;

  it("erkennt Vorlagen mit und ohne Eingabe", () => {
    expect(promptNeedsInput(withPlaceholder)).toBe(true);
    expect(promptNeedsInput(without)).toBe(false);
  });

  it("setzt den Wert ein", () => {
    expect(fillPrompt(withPlaceholder, "Tuvok")).toContain("Wer ist Tuvok?");
  });

  it("entfernt den Platzhalter, wenn kein Wert übergeben wird", () => {
    const text = fillPrompt(withPlaceholder);
    expect(text).not.toContain(PROMPT_PLACEHOLDER);
    expect(text.startsWith("Wer ist ?")).toBe(true);
  });

  it("lässt Vorlagen ohne Platzhalter unverändert", () => {
    expect(fillPrompt(without, "egal")).toBe(without.template);
  });

  it("liefert die Cursor-Position des Platzhalters", () => {
    expect(promptCaret(withPlaceholder)).toBe("Wer ist ".length);
    expect(promptCaret(without)).toBeNull();
  });
});
