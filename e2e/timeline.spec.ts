import { test, expect, type Page } from "@playwright/test";

// Die Chronologie (/chronologie). Geprüft auf /dev-gallery, weil die echte
// Seite Datenbank UND Sichtbarkeit des Betrachters braucht — gerendert wird
// dort dieselbe Komponente mit sechs Attrappen-Ereignissen über zwei Jahre,
// darunter zwei Missionsstarts und ein Missionsende.
//
// Die Chronologie ist zugleich die Missions-Übersicht: in der Vorgabe zeigt
// sie nur die Starts, mit „Alle Ereignisse" den vollen Zeitstrahl.

const UMFANG = 'select[aria-label="Umfang der Chronologie"]';
const ART = 'select[aria-label="Nach Ereignisart filtern"]';
const BETEILIGT = 'select[aria-label="Nach beteiligter Person filtern"]';

async function alleEreignisse(page: Page) {
  await page.locator(`#timeline ${UMFANG}`).selectOption("all");
  await expect(page.locator("#timeline .timeline-event")).toHaveCount(6);
}

test.describe("Chronologie", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/dev-gallery");
    await expect(page.locator("#timeline .timeline-event").first()).toBeVisible();
  });

  test("zeigt in der Vorgabe nur die Missionsstarts", async ({ page }) => {
    const timeline = page.locator("#timeline");
    // Zwei Starts — das Missionsende, das Logbuch, die Marke, das abgeleitete
    // Ereignis und der Geburtstag bleiben draußen.
    await expect(timeline.locator(".timeline-event")).toHaveCount(2);
    await expect(timeline.locator(".timeline-dot")).toHaveCount(2);
    await expect(timeline).toContainText("2 Missionen");
    await expect(timeline).not.toContainText("Abschluss des Einsatzes");
  });

  test("führt jeden Missionsstart auf seine Missionsseite", async ({ page }) => {
    const hrefs = await page
      .locator("#timeline .timeline-card-title")
      .evaluateAll((nodes) => nodes.map((n) => n.getAttribute("href")));
    expect(hrefs).toEqual([
      "/chronologie/mission/zweite-mission",
      "/chronologie/mission/erste-mission",
    ]);
  });

  test("zeigt mit „Alle Ereignisse“ den vollen Zeitstrahl", async ({ page }) => {
    await alleEreignisse(page);
    const timeline = page.locator("#timeline");
    await expect(timeline.locator(".timeline-card-title")).toHaveCount(6);
    await expect(timeline).toContainText("6 Ereignisse");
  });

  test("sortiert absteigend und dreht auf Klick um", async ({ page }) => {
    await alleEreignisse(page);
    const titles = () =>
      page.locator("#timeline .timeline-card-title").allTextContents();
    const desc = await titles();
    expect(desc[0]).toContain("Zweite Mission");
    expect(desc[desc.length - 1]).toContain("Tuvok geboren");

    await page.locator("#timeline .mission-sort button").first().click();
    const asc = await titles();
    expect(asc[0]).toContain("Tuvok geboren");
  });

  test("bietet nur das Datum als Sortierung an", async ({ page }) => {
    await alleEreignisse(page);
    // Ein Zeitstrahl wird nach dem Datum geordnet, sonst ist er keiner —
    // die frühere zweite Option „Art" ist entfallen.
    await expect(page.locator("#timeline .mission-sort button")).toHaveCount(1);
    await expect(page.locator("#timeline .mission-sort")).toContainText("Datum");
    await expect(page.locator("#timeline .mission-sort")).not.toContainText(
      "Art",
    );
  });

  test("trennt die Monate mit einer Zwischenüberschrift", async ({ page }) => {
    await alleEreignisse(page);
    const periods = page.locator("#timeline .timeline-period");
    // 2401 · Juni, 2401 · März und 2364 · Mai.
    await expect(periods).toHaveCount(3);
    await expect(periods.first()).toContainText("2401");
  });

  test("bietet je Jahr einen Knopf und schränkt darauf ein", async ({
    page,
  }) => {
    await alleEreignisse(page);
    const years = page.locator("#timeline .timeline-year");
    // „Alle" plus die beiden Jahre.
    await expect(years).toHaveCount(3);

    await years.filter({ hasText: "2364" }).click();
    await expect(page.locator("#timeline .timeline-event")).toHaveCount(1);

    // Ein zweiter Klick auf dasselbe Jahr hebt den Filter wieder auf.
    await years.filter({ hasText: "2364" }).click();
    await expect(page.locator("#timeline .timeline-event")).toHaveCount(6);
  });

  test("stellt das neueste Jahr nach links", async ({ page }) => {
    await alleEreignisse(page);
    const years = await page
      .locator("#timeline .timeline-year")
      .allTextContents();
    expect(years).toEqual(["Alle", "2401", "2364"]);
  });

  test("zeigt in der Missions-Ansicht keine Jahresleiste, wenn es nur ein Jahr gibt", async ({
    page,
  }) => {
    // Beide Missionsstarts liegen in 2401 — auszuwählen gibt es da nichts.
    await expect(page.locator("#timeline .timeline-year")).toHaveCount(0);
  });

  test("bietet kein Jahr an, in dem die übrigen Filter nichts übrig lassen", async ({
    page,
  }) => {
    await alleEreignisse(page);
    // Alle Konflikte der Attrappe liegen in 2401 — 2364 hat dann nichts mehr
    // beizutragen. Es bleibt ein einziges Jahr, also gibt es auch nichts mehr
    // auszuwählen und die Leiste verschwindet.
    await page.locator(`#timeline ${ART}`).selectOption({ label: "Konflikt" });
    await expect(page.locator("#timeline .timeline-year")).toHaveCount(0);
  });

  test("lässt ein leer gefiltertes Jahr trotzdem abwählbar", async ({
    page,
  }) => {
    await alleEreignisse(page);
    // 2364 wählen, dann auf Konflikte einschränken: 2364 hat keinen Treffer
    // mehr, muss aber sichtbar bleiben — sonst steht man vor einer leeren
    // Liste, deren Ursache man nicht mehr anklicken kann.
    await page
      .locator("#timeline .timeline-year")
      .filter({ hasText: "2364" })
      .click();
    await page.locator(`#timeline ${ART}`).selectOption({ label: "Konflikt" });
    await expect(page.locator("#timeline .timeline-event")).toHaveCount(0);

    const jahr2364 = page
      .locator("#timeline .timeline-year")
      .filter({ hasText: "2364" });
    await expect(jahr2364).toHaveAttribute("aria-pressed", "true");
    await jahr2364.click();
    await expect(page.locator("#timeline .timeline-event")).toHaveCount(1);
  });

  test("filtert über die Suche in Titel, Text und Beteiligten", async ({
    page,
  }) => {
    await alleEreignisse(page);
    const input = page.locator("#timeline input[type=search], #timeline input");
    await input.first().fill("erstkontakt");
    await expect(page.locator("#timeline .timeline-event")).toHaveCount(1);
    await expect(page.locator("#timeline .timeline-card-title")).toContainText(
      "Erstkontakt",
    );
  });

  test("filtert nach Ereignisart", async ({ page }) => {
    await alleEreignisse(page);
    await page.locator(`#timeline ${ART}`).selectOption({ label: "Konflikt" });
    await expect(page.locator("#timeline .timeline-event")).toHaveCount(1);
  });

  test("filtert nach beteiligter Person", async ({ page }) => {
    await alleEreignisse(page);
    // Tuvok steht an der ersten Mission (Beginn UND Abschluss), an der
    // markierten Stelle im Logbuch und an seiner eigenen Personalakte.
    await page.locator(`#timeline ${BETEILIGT}`).selectOption("Tuvok");
    await expect(page.locator("#timeline .timeline-event")).toHaveCount(4);
  });

  test("bietet in der Missions-Ansicht nur die dort vorkommenden Beteiligten", async ({
    page,
  }) => {
    // Die Auswahl richtet sich nach dem Umfang: eine Person, die nur an einem
    // ausgeblendeten Ereignis hängt, wäre eine Auswahl ohne Treffer.
    const options = await page
      .locator(`#timeline ${BETEILIGT} option`)
      .allInnerTexts();
    expect(options).toEqual(["Alle Beteiligten", "Kira", "Tuvok"]);
    await page.locator(`#timeline ${BETEILIGT}`).selectOption("Tuvok");
    await expect(page.locator("#timeline .timeline-event")).toHaveCount(1);
  });

  test("nimmt beim Wechsel des Umfangs die übrigen Filter zurück", async ({
    page,
  }) => {
    await alleEreignisse(page);
    await page.locator(`#timeline ${ART}`).selectOption({ label: "Konflikt" });
    await expect(page.locator("#timeline .timeline-event")).toHaveCount(1);

    // Zurück auf die Missionen: „Konflikt" gibt es dort nicht, der Filter
    // dürfte nicht unsichtbar weiterwirken.
    await page.locator(`#timeline ${UMFANG}`).selectOption("missions");
    await expect(page.locator("#timeline .timeline-event")).toHaveCount(2);
  });

  test("kennzeichnet, was nicht aus den gepflegten Angaben stammt", async ({
    page,
  }) => {
    await alleEreignisse(page);
    // Eine gepflegte Angabe ist der Normalfall und braucht keine Marke;
    // „im Text markiert" und „aus dem Text abgeleitet" schränken ein und
    // stehen deshalb als Etikett in der Titelzeile.
    const origins = page.locator("#timeline .timeline-origin");
    await expect(origins).toHaveCount(2);
    await expect(origins.filter({ hasText: "im Text markiert" })).toHaveCount(1);
    await expect(
      origins.filter({ hasText: "aus dem Text abgeleitet" }),
    ).toHaveCount(1);
  });

  test("zeigt im Missions-Umfang den Zeitraum statt des Startdatums", async ({
    page,
  }) => {
    // „Missionen" meint die Einsätze: eine Karte je Einsatz, die Beginn UND
    // Abschluss trägt. Das Wort „Mission" im Ereignisart-Filter meint dagegen
    // die einzelnen Marker — deshalb steht hier ein Zeitraum, dort ein Datum.
    const ersteMission = page
      .locator("#timeline .timeline-card")
      .filter({ hasText: "Erste Mission" });
    await expect(ersteMission.locator(".timeline-card-date")).toHaveText(
      "Zeitraum 05.03.2401 – 20.03.2401",
    );
    // Die noch laufende zweite Mission hat kein Ende und behält ihr Datum.
    await expect(
      page
        .locator("#timeline .timeline-card")
        .filter({ hasText: "Zweite Mission" })
        .locator(".timeline-card-date"),
    ).toHaveText("Datum 12.06.2401");

    // Mit „Alle Ereignisse" sind Beginn und Abschluss wieder eigene Marker.
    await alleEreignisse(page);
    await expect(
      page
        .locator("#timeline .timeline-card")
        .filter({ hasText: "Erste Mission" })
        .first()
        .locator(".timeline-card-date"),
    ).toContainText("Datum");
  });

  test("zeigt Art und Titel in der Kopfzeile, Datum darunter", async ({
    page,
  }) => {
    const karte = page.locator("#timeline .timeline-card").first();
    // Das Art-Etikett steht VOR dem Titel in derselben Zeile.
    await expect(karte.locator(".timeline-card-head .timeline-tag")).toHaveText(
      "Mission",
    );
    await expect(karte.locator(".timeline-card-title")).toContainText(
      "Zweite Mission",
    );
    // Die Datumszeile trägt NUR das Datum: die Ereignisart steht schon als
    // Etikett darüber, und die Quelle wiederholte meist bloß den Titel.
    await expect(karte.locator(".timeline-card-date")).toHaveText(
      "Datum 12.06.2401",
    );
  });

  test("färbt die Karte in der Farbe ihrer Ereignisart", async ({ page }) => {
    await alleEreignisse(page);
    const farben = await page
      .locator("#timeline .timeline-card")
      .evaluateAll((nodes) =>
        nodes.map((n) => getComputedStyle(n).backgroundColor),
      );
    // Missionen und Konflikt tragen verschiedene Farben, und keine Karte
    // bleibt auf der Grundfläche stehen.
    expect(new Set(farben).size).toBeGreaterThan(1);
    for (const f of farben) {
      expect(f).not.toBe("rgba(0, 0, 0, 0)");
    }
  });

  test("zeigt die Kurzfassung offen und die Beteiligten zugeklappt", async ({
    page,
  }) => {
    const karte = page.locator("#timeline .timeline-card").first();
    const panels = karte.locator(".timeline-panel");
    await expect(panels.nth(0)).toContainText("Teaser");
    await expect(panels.nth(0)).toHaveAttribute("open", "");
    await expect(panels.nth(1)).toContainText("Beteiligt");
    await expect(panels.nth(1)).not.toHaveAttribute("open", "");

    // Beteiligte werden erst nach dem Aufklappen angezeigt. Geprüft auf
    // Sichtbarkeit, nicht auf den Text: der Inhalt eines geschlossenen
    // <details> steht im DOM und damit auch in textContent.
    const beteiligte = panels.nth(1).locator(".timeline-panel-body");
    await expect(beteiligte).toBeHidden();
    await panels.nth(1).locator("summary").click();
    await expect(beteiligte).toBeVisible();
    await expect(beteiligte).toHaveText("Kira");
  });

  test("nennt die Zahl der angezeigten Ereignisse", async ({ page }) => {
    await alleEreignisse(page);
    await expect(page.locator("#timeline")).toContainText("6 Ereignisse");
    await page
      .locator("#timeline .timeline-year")
      .filter({ hasText: "2364" })
      .click();
    await expect(page.locator("#timeline")).toContainText("1 von 6");
  });

  test("führt ein Klick irgendwo auf der Karte zum Eintrag", async ({
    page,
  }) => {
    // Die ganze Karte ist anklickbar, nicht nur der Titel — umgesetzt über
    // eine unsichtbare Fläche des Titel-Links (siehe timeline.css).
    const karte = page.locator("#timeline .timeline-card").first();
    // Auf die Datumszeile gezielt — per Maus-Koordinate, weil Playwright
    // sonst meldet, dass der Titel-Link die Klicks abfängt. Genau das ist ja
    // der Zweck: die unsichtbare Fläche liegt über der Karte.
    await karte.scrollIntoViewIfNeeded();
    const datum = await karte.locator(".timeline-card-date").boundingBox();
    await page.mouse.click(datum!.x + datum!.width / 2, datum!.y + datum!.height / 2);
    await expect(page).toHaveURL(/\/chronologie\/mission\/zweite-mission$/);
  });

  test("klappt ein Feld auf, ohne der Karte zu folgen", async ({ page }) => {
    // Die Felder liegen über der Klickfläche: ein Klick auf „Beteiligt"
    // klappt auf und navigiert NICHT.
    const karte = page.locator("#timeline .timeline-card").first();
    const beteiligte = karte.locator(".timeline-panel").last();
    await beteiligte.locator("summary").click();
    await expect(beteiligte.locator(".timeline-panel-body")).toBeVisible();
    await expect(page).toHaveURL(/\/dev-gallery$/);
  });

  test("verlinkt eine im Text markierte Stelle auf ihre Sprungmarke", async ({
    page,
  }) => {
    await alleEreignisse(page);
    // Der Marker erzeugt im gerenderten Text ein <span id="timeline-N">
    // (remarkTimelineAnchors) — die Karte muss genau dorthin führen.
    const link = page
      .locator("#timeline .timeline-card-title")
      .filter({ hasText: "Erstkontakt" });
    await expect(link).toHaveAttribute("href", /#timeline-1$/);
  });
});

// Das Eintragen von Hand steht seit v1.29.46 in einem Fenster (ModalOverlay)
// statt in einem aufklappbaren Feld — mit einem echten Datumswähler, der auf
// dem jüngsten Ereignis der Chronologie steht.
test.describe("Ereignis eintragen", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/dev-gallery");
    await expect(page.locator("#timeline .timeline-event").first()).toBeVisible();
  });

  test("öffnet das Formular als Fenster, mit dem jüngsten Datum vorbelegt", async ({
    page,
  }) => {
    // Zugeklappt gibt es kein Formular, nur den Knopf.
    await expect(page.locator("#manual-event-date")).toHaveCount(0);

    await page
      .locator("#timeline")
      .getByRole("button", { name: "Ereignis eintragen" })
      .click();

    const dialog = page.getByRole("dialog", { name: "Ereignis eintragen" });
    await expect(dialog).toBeVisible();
    const datum = page.locator("#manual-event-date");
    await expect(datum).toHaveAttribute("type", "date");
    // Das jüngste Attrappen-Ereignis der Galerie.
    await expect(datum).toHaveValue("2401-06-12");
  });

  test("schließt das Fenster mit Escape", async ({ page }) => {
    await page
      .locator("#timeline")
      .getByRole("button", { name: "Ereignis eintragen" })
      .click();
    await expect(page.getByRole("dialog")).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(page.getByRole("dialog")).toHaveCount(0);
  });
});
