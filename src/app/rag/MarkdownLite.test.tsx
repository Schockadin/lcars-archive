import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import MarkdownLite from "./MarkdownLite";

function html(md: string): string {
  const { container } = render(<MarkdownLite text={md} />);
  return container.innerHTML;
}

describe("MarkdownLite — Inline", () => {
  it("rendert Fett und Kursiv", () => {
    const { container } = render(
      <MarkdownLite text="Das ist **fett** und *kursiv*." />,
    );
    expect(container.querySelector("strong")?.textContent).toBe("fett");
    expect(container.querySelector("em")?.textContent).toBe("kursiv");
  });

  it("rendert Inline-Code", () => {
    const { container } = render(<MarkdownLite text="Nutze `sql` dafür." />);
    expect(container.querySelector("code")?.textContent).toBe("sql");
  });

  it("rendert sichere Links (intern ohne target=_blank)", () => {
    const { container } = render(
      <MarkdownLite text="Siehe [Kirk](/characters/kirk)." />,
    );
    const a = container.querySelector("a");
    expect(a?.getAttribute("href")).toBe("/characters/kirk");
    expect(a?.textContent).toBe("Kirk");
    expect(a?.getAttribute("target")).toBeNull();
  });

  it("externe Links bekommen target=_blank + rel", () => {
    const { container } = render(
      <MarkdownLite text="[Extern](https://example.com)" />,
    );
    const a = container.querySelector("a");
    expect(a?.getAttribute("target")).toBe("_blank");
    expect(a?.getAttribute("rel")).toContain("noopener");
  });

  it("gefährliche Link-Schemata werden NICHT verlinkt (als Text ausgegeben)", () => {
    const { container } = render(
      <MarkdownLite text="[klick](javascript:alert(1))" />,
    );
    expect(container.querySelector("a")).toBeNull();
    expect(container.textContent).toContain("[klick](javascript:alert(1))");
  });
});

describe("MarkdownLite — Blöcke", () => {
  it("rendert Überschriften", () => {
    const { container } = render(<MarkdownLite text="## Tholianer" />);
    expect(container.querySelector("h2")?.textContent).toBe("Tholianer");
  });

  it("rendert ungeordnete Listen", () => {
    const { container } = render(
      <MarkdownLite text={"- eins\n- zwei\n- drei"} />,
    );
    const items = container.querySelectorAll("ul > li");
    expect(items).toHaveLength(3);
    expect(items[0].textContent).toBe("eins");
  });

  it("rendert nummerierte Listen", () => {
    const { container } = render(<MarkdownLite text={"1. a\n2. b"} />);
    expect(container.querySelectorAll("ol > li")).toHaveLength(2);
  });

  it("trennt Absätze an Leerzeilen", () => {
    const { container } = render(
      <MarkdownLite text={"Erster Absatz.\n\nZweiter Absatz."} />,
    );
    const ps = container.querySelectorAll("p");
    expect(ps).toHaveLength(2);
  });

  it("rendert Codeblöcke", () => {
    const { container } = render(
      <MarkdownLite text={"```\nSELECT 1\n```"} />,
    );
    expect(container.querySelector("pre code")?.textContent).toContain("SELECT 1");
  });

  it("escaped HTML im Text (kein XSS)", () => {
    const out = html("<img src=x onerror=alert(1)>");
    expect(out).not.toContain("<img");
    expect(out).toContain("&lt;img");
  });
});
