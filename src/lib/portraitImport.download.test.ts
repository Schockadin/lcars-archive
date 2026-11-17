// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
vi.mock("@/lib/characterAssets", () => ({
  uploadCharacterPortraitImage: vi.fn(
    async () => "https://assets.example.test/image.png",
  ),
}));
import { uploadCharacterPortraitImage } from "@/lib/characterAssets";
import { importPortraitFromUrl } from "@/lib/portraitImport";
import { MAX_ASSET_IMAGE_BYTES } from "@/lib/assetStorage";

beforeEach(() => vi.mocked(uploadCharacterPortraitImage).mockClear());
afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe("Portrait-Download-Grenzen", () => {
  it("lädt ein gültiges Bild vollständig hoch", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(
        async () =>
          new Response(new Uint8Array([1, 2, 3]), {
            headers: { "content-type": "image/png" },
          }),
      ),
    );
    await expect(
      importPortraitFromUrl("https://8.8.8.8/image.png"),
    ).resolves.toContain("assets.example.test");
    expect(uploadCharacterPortraitImage).toHaveBeenCalledWith({
      buffer: Buffer.from([1, 2, 3]),
      mimeType: "image/png",
    });
  });

  it("bricht einen zu großen Chunked-Download ab, bevor er vollständig gepuffert wird", async () => {
    const cancel = vi.fn();
    const body = new ReadableStream<Uint8Array>({
      pull(controller) {
        controller.enqueue(new Uint8Array(MAX_ASSET_IMAGE_BYTES / 2 + 1));
      },
      cancel,
    });
    vi.stubGlobal(
      "fetch",
      vi.fn(
        async () =>
          new Response(body, { headers: { "content-type": "image/png" } }),
      ),
    );
    await expect(
      importPortraitFromUrl("https://8.8.8.8/image.png"),
    ).rejects.toThrow("größer als");
    expect(cancel).toHaveBeenCalledOnce();
    expect(uploadCharacterPortraitImage).not.toHaveBeenCalled();
  });

  it("wendet die Deadline auch nach dem Empfang der Header auf einen blockierten Body an", async () => {
    vi.useFakeTimers();
    vi.stubGlobal(
      "fetch",
      vi.fn(async (_url, init: RequestInit) => {
        const body = new ReadableStream<Uint8Array>({
          start(controller) {
            init.signal!.addEventListener(
              "abort",
              () => controller.error(new Error("Download abgebrochen")),
              { once: true },
            );
          },
        });
        return new Response(body, { headers: { "content-type": "image/png" } });
      }),
    );
    const failed = expect(
      importPortraitFromUrl("https://8.8.8.8/image.png"),
    ).rejects.toThrow("abgebrochen");
    await vi.advanceTimersByTimeAsync(15_001);
    await failed;
    expect(uploadCharacterPortraitImage).not.toHaveBeenCalled();
  });
});
