import { beforeEach, describe, expect, it, vi } from "vitest";

// Der Upload in den Asset-Bucket ist hier nicht das Thema (er braucht R2) —
// geprüft wird, WAS hochgeladen wird und was davon in der Metadata landet.
const uploadCharacterPortraitImage = vi.fn(
  async (file: { buffer: Buffer; mimeType: string }) =>
    `https://assets.example/${file.mimeType.replace("/", "-")}-${file.buffer.byteLength}`,
);

vi.mock("@/lib/characterAssets", () => ({ uploadCharacterPortraitImage }));

const { readCharacterHead } = await import("./characterHead");

// Ein winziges, gültiges PNG (1×1, transparent).
const PNG_BASE64 =
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==";

function form(fields: Record<string, string>): FormData {
  const data = new FormData();
  data.set("name", "Tuvok");
  data.set("status", "active");
  for (const [key, value] of Object.entries(fields)) data.set(key, value);
  return data;
}

beforeEach(() => {
  uploadCharacterPortraitImage.mockClear();
});

describe("readCharacterHead — Portrait", () => {
  // Eine Bild-ADRESSE kann nicht mehr aus dem Formular kommen: sie steht dort
  // nicht mehr, und der Server liest auch keins mehr aus.
  it("übergeht eine im Formular untergeschobene Bild-Adresse", async () => {
    const result = await readCharacterHead(
      form({
        portrait: "https://fremder-server.example/tuvok.png",
        portraitSource: "https://fremder-server.example/original.png",
      }),
    );
    expect(result).toMatchObject({
      head: { portrait: null, portraitSource: null, portraitCrop: null },
    });
    expect(uploadCharacterPortraitImage).not.toHaveBeenCalled();
  });

  it("behält beim Bearbeiten ohne neues Bild das gespeicherte Portrait", async () => {
    const result = await readCharacterHead(form({}), {
      portrait: "https://assets.example/gespeichert.png",
      portraitSource: "https://assets.example/original.png",
    });
    expect(result).toMatchObject({
      head: {
        portrait: "https://assets.example/gespeichert.png",
        portraitSource: "https://assets.example/original.png",
      },
    });
    expect(uploadCharacterPortraitImage).not.toHaveBeenCalled();
  });

  it("merkt sich den gewählten Ausschnitt, ohne ein zweites Bild zu bauen", async () => {
    const result = await readCharacterHead(
      form({ portraitCrop: JSON.stringify({ zoom: 2, x: 40, y: 60 }) }),
      {
        portrait: "https://assets.example/original.png",
        portraitSource: null,
      },
    );
    // Kein Upload: der Ausschnitt ist eine Anweisung auf dem Original, kein
    // eigenes Bild (bis v1.29.57 wurde er hier eingebacken und hochgeladen).
    expect(uploadCharacterPortraitImage).not.toHaveBeenCalled();
    expect(result).toMatchObject({
      head: {
        portrait: "https://assets.example/original.png",
        portraitCrop: { zoom: 2, x: 40, y: 60 },
      },
    });
  });

  it("speichert einen unveränderten Ausschnitt nicht — er ist die Vorgabe", async () => {
    const result = await readCharacterHead(
      form({ portraitCrop: JSON.stringify({ zoom: 1, x: 50, y: 50 }) }),
    );
    expect(result).toMatchObject({ head: { portraitCrop: null } });
  });

  it("verträgt eine kaputte Einstellung und fällt auf die Vorgabe zurück", async () => {
    const result = await readCharacterHead(form({ portraitCrop: "{kein json" }));
    expect(result).toMatchObject({ head: { portraitCrop: null } });
  });

  it("behält den gespeicherten Ausschnitt, wenn das Formular keinen mitschickt", async () => {
    // Ein Formular ohne Portrait-Bereich darf den gewählten Ausschnitt nicht
    // stillschweigend verwerfen.
    const result = await readCharacterHead(form({}), {
      portrait: "https://assets.example/original.png",
      portraitSource: null,
      portraitCrop: { zoom: 1.5, x: 20, y: 80 },
    });
    expect(result).toMatchObject({
      head: { portraitCrop: { zoom: 1.5, x: 20, y: 80 } },
    });
  });

  it("macht die hochgeladene Datei zum Portrait und lädt genau sie hoch", async () => {
    const data = form({});
    data.set(
      "portraitFile",
      new File([Buffer.from(PNG_BASE64, "base64")], "tuvok.png", {
        type: "image/png",
      }),
    );
    const result = await readCharacterHead(data, {
      // Altbestand: bisher lag hier ein eingebackenes Bild mit Original
      // daneben. Mit dem neuen Bild ist beides gegenstandslos.
      portrait: "https://assets.example/alt-eingebacken.png",
      portraitSource: "https://assets.example/alt-original.png",
    });
    expect(uploadCharacterPortraitImage).toHaveBeenCalledTimes(1);
    expect(result).toMatchObject({
      head: {
        portrait: expect.stringContaining("https://assets.example/image-png-"),
        // Der Zeiger auf das frühere Original fällt weg — das hochgeladene
        // Bild IST jetzt das Original.
        portraitSource: null,
      },
    });
  });
});
