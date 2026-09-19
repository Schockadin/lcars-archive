import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { act, cleanup, fireEvent, render } from "@testing-library/react";
import InputDraftKeeper, {
  dropInputDraftsForPage,
} from "./InputDraftKeeper";
import { draftStorageKey } from "@/lib/inputDraft";

// usePathname braucht einen Next-Runtime — hier stellvertretend gemockt (wie
// in HeaderUserNav.test.tsx).
vi.mock("next/navigation", () => ({
  usePathname: () => "/testseite",
}));

// Der Fall, für den es die Anheft-Phase gibt: Nach dem ersten Einsetzen
// hydriert React die Seite und schreibt den vom Server gelieferten
// Vorgabewert zurück. Das lässt sich hier direkt nachstellen — eine
// Zuweisung an .value ohne Ereignis ist genau das, was React dabei tut.
function hydrationSetzt(el: HTMLTextAreaElement, value: string) {
  el.value = value;
}

function seedDraft(key: string, value: string) {
  window.sessionStorage.setItem(
    draftStorageKey("/testseite"),
    JSON.stringify({ [key]: { kind: "text", value } }),
  );
}

function feld(): HTMLTextAreaElement {
  return document.querySelector("textarea") as HTMLTextAreaElement;
}

function Seite({ defaultValue = "Vom Server" }: { defaultValue?: string }) {
  return (
    <>
      <InputDraftKeeper />
      <textarea name="body" defaultValue={defaultValue} />
    </>
  );
}

beforeEach(() => {
  vi.useFakeTimers();
  window.sessionStorage.clear();
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  window.sessionStorage.clear();
});

describe("InputDraftKeeper", () => {
  it("setzt den gesicherten Stand ein", () => {
    seedDraft("doc|n:body", "Mein Entwurf");
    render(<Seite />);
    expect(feld().value).toBe("Mein Entwurf");
  });

  it("hält ihn gegen die Hydration", () => {
    // Ohne das Anheften stünde hier wieder der Vorgabewert — der Fehler, an
    // dem die Sicherung in jedem Editor mit defaultValue scheiterte.
    seedDraft("doc|n:body", "Mein Entwurf");
    render(<Seite />);

    hydrationSetzt(feld(), "Vom Server");
    act(() => {
      vi.advanceTimersByTime(300);
    });

    expect(feld().value).toBe("Mein Entwurf");
  });

  it("lässt ein angefasstes Feld in Ruhe", () => {
    seedDraft("doc|n:body", "Mein Entwurf");
    render(<Seite />);

    fireEvent.input(feld(), { target: { value: "Gerade getippt" } });
    act(() => {
      vi.advanceTimersByTime(1000);
    });

    expect(feld().value).toBe("Gerade getippt");
  });

  it("hört nach der Anheft-Phase auf nachzuziehen", () => {
    // Danach gehört das Feld wieder der Anwendung: Was sie dort hinschreibt,
    // bleibt stehen.
    seedDraft("doc|n:body", "Mein Entwurf");
    render(<Seite />);
    act(() => {
      vi.advanceTimersByTime(2000);
    });

    hydrationSetzt(feld(), "Später von der App gesetzt");
    act(() => {
      vi.advanceTimersByTime(1000);
    });

    expect(feld().value).toBe("Später von der App gesetzt");
  });

  it("übernimmt, was vor dem ersten Durchgang schon im Feld stand", () => {
    // Wer schneller tippt, als die Seite fertig wird: kein Ereignis, das
    // jemand mitbekommen hätte — aber der Stand weicht vom Vorgabewert ab.
    // Erst das Feld allein — die Sicherung hört noch nicht zu.
    const { container } = render(
      <textarea name="body" defaultValue="Vom Server" />,
    );
    const ta = container.querySelector("textarea") as HTMLTextAreaElement;
    ta.value = "Schneller als die Seite";
    // Und jetzt erst läuft sie an.
    render(<InputDraftKeeper />);

    act(() => {
      vi.advanceTimersByTime(500);
    });

    expect(
      window.sessionStorage.getItem(draftStorageKey("/testseite")),
    ).toContain("Schneller als die Seite");
  });

  it("vergisst den Stand eines zurückgesetzten Formulars", () => {
    seedDraft("form#notiz|n:body", "Notiz, die gespeichert wurde");
    render(
      <>
        <InputDraftKeeper />
        <form id="notiz">
          <textarea name="body" />
        </form>
      </>,
    );
    expect(feld().value).toBe("Notiz, die gespeichert wurde");

    const form = document.querySelector("form") as HTMLFormElement;
    act(() => {
      form.reset();
      vi.advanceTimersByTime(1000);
    });

    expect(feld().value).toBe("");
    expect(
      window.sessionStorage.getItem(draftStorageKey("/testseite")),
    ).toBeNull();
  });

  // Siehe RevisionsPanel.tsx: Holt jemand eine frühere Fassung zurück, hat
  // der Server den Text absichtlich ersetzt — der gesicherte Stand beschreibt
  // dann etwas, das es nicht mehr geben soll.
  describe("dropInputDraftsForPage", () => {
    it("setzt den verworfenen Stand nicht mehr ein", () => {
      seedDraft("doc|n:body", "Mein Entwurf");
      render(<Seite />);
      expect(feld().value).toBe("Mein Entwurf");

      act(() => {
        dropInputDraftsForPage();
      });
      hydrationSetzt(feld(), "Wiederhergestellte Fassung");
      act(() => {
        vi.advanceTimersByTime(1000);
      });

      // Ohne das Verwerfen zöge die Anheft-Phase hier wieder den Entwurf nach.
      expect(feld().value).toBe("Wiederhergestellte Fassung");
    });

    it("räumt den Sitzungsspeicher dieser Seite ab", () => {
      seedDraft("doc|n:body", "Mein Entwurf");
      render(<Seite />);

      act(() => {
        dropInputDraftsForPage();
      });

      expect(
        window.sessionStorage.getItem(draftStorageKey("/testseite")),
      ).toBeNull();
    });

    it("schreibt den Stand auch beim Verlassen der Seite nicht zurück", () => {
      // Der eigentliche Grund für das Ereignis: Die Sicherung hält denselben
      // Stand zusätzlich im Arbeitsspeicher und schreibt ihn bei pagehide
      // zurück. Ein Löschen an ihr vorbei wäre damit sofort wieder erledigt.
      seedDraft("doc|n:body", "Mein Entwurf");
      render(<Seite />);

      act(() => {
        dropInputDraftsForPage();
      });
      act(() => {
        window.dispatchEvent(new Event("pagehide"));
      });

      expect(
        window.sessionStorage.getItem(draftStorageKey("/testseite")),
      ).toBeNull();
    });
  });
});
