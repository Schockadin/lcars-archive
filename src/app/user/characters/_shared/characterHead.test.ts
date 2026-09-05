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
  it("nimmt eine Bild-Adresse unverändert", async () => {
    const result = await readCharacterHead(
      form({ portrait: "https://example.org/tuvok.png" }),
    );
    expect(result).toMatchObject({
      head: {
        portrait: "https://example.org/tuvok.png",
        portraitCrop: null,
      },
    });
    expect(uploadCharacterPortraitImage).not.toHaveBeenCalled();
  });

  it("lädt einen zugeschnittenen Ausschnitt hoch und merkt sich die Einstellung", async () => {
    const result = await readCharacterHead(
      form({
        portrait: "https://example.org/alt.png",
        portraitCropped: `data:image/png;base64,${PNG_BASE64}`,
        portraitCrop: JSON.stringify({ zoom: 2, x: 40, y: 60 }),
        portraitSource: "https://example.org/original.png",
      }),
    );
    expect(uploadCharacterPortraitImage).toHaveBeenCalledTimes(1);
    expect(result).toMatchObject({
      head: {
        portrait: expect.stringContaining("https://assets.example/"),
        portraitSource: "https://example.org/original.png",
        portraitCrop: { zoom: 2, x: 40, y: 60 },
      },
    });
  });

  it("speichert einen unveränderten Ausschnitt nicht — er ist die Vorgabe", async () => {
    const result = await readCharacterHead(
      form({
        portraitCropped: `data:image/png;base64,${PNG_BASE64}`,
        portraitCrop: JSON.stringify({ zoom: 1, x: 50, y: 50 }),
      }),
    );
    expect(result).toMatchObject({ head: { portraitCrop: null } });
  });

  it("weist eine unbrauchbare Data-URL ab, statt sie hochzuladen", async () => {
    for (const value of ["nicht-wirklich-eine-data-url", "data:text/plain;base64,QQ=="]) {
      const result = await readCharacterHead(form({ portraitCropped: value }));
      expect(result).toEqual({ error: "Der Bildausschnitt ist unbrauchbar." });
    }
    expect(uploadCharacterPortraitImage).not.toHaveBeenCalled();
  });

  it("weist einen übergroßen Ausschnitt ab", async () => {
    // 5 MB Base64 — über der Grenze von 4 MB.
    const huge = "A".repeat(7 * 1024 * 1024);
    const result = await readCharacterHead(
      form({ portraitCropped: `data:image/png;base64,${huge}` }),
    );
    expect(result).toEqual({ error: "Der Bildausschnitt ist zu groß." });
    expect(uploadCharacterPortraitImage).not.toHaveBeenCalled();
  });

  it("verträgt eine kaputte Einstellung und fällt auf die Vorgabe zurück", async () => {
    const result = await readCharacterHead(
      form({
        portraitCropped: `data:image/png;base64,${PNG_BASE64}`,
        portraitCrop: "{kein json",
      }),
    );
    // Vorgabe = unverändert = wird nicht gespeichert.
    expect(result).toMatchObject({ head: { portraitCrop: null } });
  });

  it("macht die hochgeladene Datei zum Original für spätere Zuschnitte", async () => {
    const data = form({});
    data.set(
      "portraitFile",
      new File([Buffer.from(PNG_BASE64, "base64")], "tuvok.png", {
        type: "image/png",
      }),
    );
    const result = await readCharacterHead(data);
    expect(result).toMatchObject({ head: {} });
    if ("head" in result) {
      // Ohne eigenen Ausschnitt sind Bild und Original dasselbe — der Editor
      // schneidet später aus der Datei, nicht aus einem Ergebnis.
      expect(result.head.portraitSource).toBe(result.head.portrait);
    }
  });
});
