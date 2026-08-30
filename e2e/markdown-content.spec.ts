import { test, expect } from "@playwright/test";

// Sichert die Darstellung gerenderter Markdown-Inhalte ab. Tailwinds
// Preflight setzt für ALLE Elemente margin/padding auf 0, nimmt ol/ul die
// list-style und stellt Überschriften auf font-size: inherit — dadurch
// standen Absätze ohne sichtbaren Abstand untereinander („Leerzeilen weg"),
// Listen erschienen ohne Aufzählungszeichen und Einzug (wirkten gar nicht
// als Liste) und Überschriften waren nicht von Fließtext zu unterscheiden.
// src/styles/lcars-components/markdown-content.css stellt das wieder her.
//
// Geprüft wird — wie in content-width.spec.ts — direkt am computed style auf
// einer DB-freien Seite, die dieselben Stylesheets lädt: Ursache und Fix
// liegen in der CSS-Kaskade, nicht in einer bestimmten Detailseite.

// Genau das HTML, das src/lib/markdown.ts aus Absätzen, Listen, einer
// Überschrift und einem Zitat erzeugt (siehe src/lib/markdown.test.ts).
const RENDERED_MARKDOWN = `
<p id="p1">Erster Absatz.</p>
<p id="p2">Zweiter Absatz.</p>
<h3 id="h">Ein Zwischentitel</h3>
<ul id="ul"><li id="li1">Punkt eins</li><li id="li2">Punkt zwei<ul id="nested"><li>verschachtelt</li></ul></li></ul>
<ol id="ol"><li>Erstens</li><li>Zweitens</li></ol>
<blockquote id="quote"><p>Zitat</p></blockquote>
`;

async function styles(
  page: import("@playwright/test").Page,
  containerClass: string,
) {
  await page.goto("/tutorial");
  return page.evaluate(
    ({ cls, html }) => {
      const el = document.createElement("div");
      el.className = `${cls} lcars-text`;
      el.innerHTML = html;
      document.body.appendChild(el);
      const of = (id: string) => {
        const node = document.getElementById(id)!;
        const cs = getComputedStyle(node);
        return {
          listStyleType: cs.listStyleType,
          paddingLeft: parseFloat(cs.paddingLeft),
          marginTop: parseFloat(cs.marginTop),
          fontSize: parseFloat(cs.fontSize),
          borderLeftWidth: parseFloat(cs.borderLeftWidth),
        };
      };
      const result = {
        p1: of("p1"),
        p2: of("p2"),
        h: of("h"),
        ul: of("ul"),
        ol: of("ol"),
        li2: of("li2"),
        nested: of("nested"),
        quote: of("quote"),
      };
      el.remove();
      return result;
    },
    { cls: containerClass, html: RENDERED_MARKDOWN },
  );
}

for (const containerClass of ["mission-body", "char-file-bio"]) {
  test(`.${containerClass}: Absätze behalten sichtbaren Abstand`, async ({
    page,
  }) => {
    const s = await styles(page, containerClass);
    // Erster Absatz ohne Vorgänger: kein Abstand. Jeder folgende Block: Abstand.
    expect(s.p1.marginTop).toBe(0);
    expect(s.p2.marginTop).toBeGreaterThan(0);
  });

  test(`.${containerClass}: Listen bekommen Aufzählungszeichen und Einzug`, async ({
    page,
  }) => {
    const s = await styles(page, containerClass);
    expect(s.ul.listStyleType).toBe("disc");
    expect(s.ol.listStyleType).toBe("decimal");
    expect(s.ul.paddingLeft).toBeGreaterThan(0);
    expect(s.ol.paddingLeft).toBeGreaterThan(0);
    // Verschachtelte Ebene bleibt optisch unterscheidbar und eingerückt.
    expect(s.nested.listStyleType).toBe("circle");
    expect(s.nested.paddingLeft).toBeGreaterThan(0);
  });

  test(`.${containerClass}: Listenpunkte und Überschriften sind abgesetzt`, async ({
    page,
  }) => {
    const s = await styles(page, containerClass);
    // Zweiter Listenpunkt hat Abstand zum ersten …
    expect(s.li2.marginTop).toBeGreaterThan(0);
    // … die Überschrift hebt sich in der Größe vom Fließtext ab …
    expect(s.h.fontSize).toBeGreaterThan(s.p1.fontSize);
    // … und das Zitat trägt seinen Rahmen links.
    expect(s.quote.borderLeftWidth).toBeGreaterThan(0);
  });
}

test("Links in Listenpunkten sind als Links erkennbar eingefärbt", async ({
  page,
}) => {
  // Die frühere Regel .lcars-text > * > a erreichte nur Links direkt in einem
  // Block der obersten Ebene — ein Link in einem Listenpunkt (ul > li > a)
  // liegt eine Ebene tiefer und blieb dadurch unformatiert.
  await page.goto("/tutorial");
  const colors = await page.evaluate(() => {
    const el = document.createElement("div");
    el.className = "mission-body lcars-text";
    el.innerHTML =
      '<p><a id="plain" href="/x">Absatz-Link</a></p>' +
      '<ul><li><a id="inlist" href="/x">Listen-Link</a></li></ul>';
    document.body.appendChild(el);
    const read = (id: string) => getComputedStyle(document.getElementById(id)!);
    const result = {
      plain: read("plain").color,
      inList: read("inlist").color,
      plainDecoration: read("plain").textDecorationLine,
      inListDecoration: read("inlist").textDecorationLine,
    };
    el.remove();
    return result;
  });
  expect(colors.inList).toBe(colors.plain);
  expect(colors.inListDecoration).toBe(colors.plainDecoration);
});
