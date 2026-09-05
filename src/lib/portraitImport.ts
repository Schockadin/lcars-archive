import "server-only";
import dns from "node:dns/promises";
import net from "node:net";
import { uploadCharacterPortraitImage } from "@/lib/characterAssets";
import { InvalidAssetError, MAX_ASSET_IMAGE_BYTES } from "@/lib/assetStorage";
import { parseImageDataUrl } from "@/lib/portraitSource";

// Ein Portrait, das als Adresse vorliegt, EINMAL holen und als eigenen Upload
// ablegen. Danach liegt jedes Portrait im eigenen Asset-Bucket — ein Bild auf
// einem fremden Server verschwindet, sobald dort jemand aufräumt, lässt sich
// nicht zuschneiden (die Leinwand wird davon „verunreinigt", siehe
// PortraitPicker.tsx) und meldet jeden Aufruf des Bogens an diesen Server.
//
// Zwei Aufrufer: der einmalige Wartungslauf über den Bestand
// (scripts/import-portrait-links.ts) und der Markdown-Import, der eine Adresse
// aus dem Frontmatter beim Import gleich mitnimmt statt sie zu speichern.
//
// Die Adresse stammt in beiden Fällen von der Administration bzw. aus dem
// eigenen Datenbestand — trotzdem holt diese Funktion nichts blind: sie ist
// ein serverseitiger Abruf einer fremden Adresse, also ein Weg ins interne
// Netz, wenn man ihn ungeprüft lässt (SSRF). Deshalb die Schranken unten.

// Wie lange auf den fremden Server gewartet wird, bevor abgebrochen wird.
const FETCH_TIMEOUT_MS = 15_000;
// Wie viele Umleitungen gefolgt wird. Jede einzelne wird erneut geprüft —
// sonst führte ein harmlos aussehender Link über einen Redirect doch noch ins
// interne Netz.
const MAX_REDIRECTS = 3;

export class PortraitImportError extends Error {}

// Ein Portrait aus einer Adresse oder einer Data-URL holen und hochladen.
// Liefert die neue Upload-URL. Wirft PortraitImportError (Adresse unbrauchbar,
// nicht erreichbar, kein Bild) oder InvalidAssetError (Typ/Größe), damit der
// Aufrufer beides unterscheiden kann.
export async function importPortraitFromUrl(url: string): Promise<string> {
  const image = url.trim().startsWith("data:")
    ? decodeDataUrlImage(url)
    : await fetchRemoteImage(url);
  return uploadCharacterPortraitImage(image);
}

function decodeDataUrlImage(url: string): {
  buffer: Buffer;
  mimeType: string;
} {
  const parsed = parseImageDataUrl(url);
  if (!parsed) {
    throw new PortraitImportError("Die Data-URL enthält kein brauchbares Bild.");
  }
  const buffer = Buffer.from(parsed.base64, "base64");
  if (buffer.byteLength === 0) {
    throw new PortraitImportError("Die Data-URL enthält kein brauchbares Bild.");
  }
  return { buffer, mimeType: parsed.mimeType };
}

async function fetchRemoteImage(
  rawUrl: string,
): Promise<{ buffer: Buffer; mimeType: string }> {
  let current = rawUrl.trim();

  for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
    const target = await assertFetchableUrl(current);

    const response = await fetchWithTimeout(target);
    // Umleitungen selbst verfolgen statt sie fetch zu überlassen: nur so wird
    // JEDES Ziel gegen dieselben Schranken geprüft.
    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get("location");
      if (!location) {
        throw new PortraitImportError(
          `Umleitung ohne Ziel (HTTP ${response.status}).`,
        );
      }
      current = new URL(location, target).toString();
      continue;
    }

    if (!response.ok) {
      throw new PortraitImportError(
        `Der Server antwortete mit HTTP ${response.status}.`,
      );
    }

    const mimeType = (response.headers.get("content-type") ?? "")
      .split(";")[0]
      .trim()
      .toLowerCase();
    if (!mimeType.startsWith("image/")) {
      throw new PortraitImportError(
        `Die Adresse liefert kein Bild (${mimeType || "ohne Typ"}).`,
      );
    }

    const buffer = Buffer.from(await response.arrayBuffer());
    if (buffer.byteLength === 0) {
      throw new PortraitImportError("Die Adresse liefert eine leere Datei.");
    }
    // Die Größe prüft assertImageAsset beim Hochladen noch einmal; hier geht es
    // darum, einen absurd großen Download nicht erst komplett zu verarbeiten.
    if (buffer.byteLength > MAX_ASSET_IMAGE_BYTES) {
      throw new InvalidAssetError(
        `Das Bild ist größer als ${Math.round(MAX_ASSET_IMAGE_BYTES / 1024 / 1024)} MB.`,
      );
    }
    return { buffer, mimeType };
  }

  throw new PortraitImportError("Zu viele Umleitungen.");
}

async function fetchWithTimeout(url: URL): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    return await fetch(url, {
      redirect: "manual",
      signal: controller.signal,
      headers: { accept: "image/*" },
    });
  } catch (err) {
    throw new PortraitImportError(
      `Die Adresse ist nicht erreichbar: ${err instanceof Error ? err.message : String(err)}`,
    );
  } finally {
    clearTimeout(timer);
  }
}

// Nur http(s), und der Hostname darf nicht ins eigene Netz zeigen. Ohne diese
// Prüfung wäre der Import ein Werkzeug, mit dem sich vom Server aus interne
// Adressen abfragen lassen.
async function assertFetchableUrl(value: string): Promise<URL> {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new PortraitImportError(`Keine gültige Adresse: "${value}"`);
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new PortraitImportError(
      `Nur http(s) wird geladen, nicht "${url.protocol}".`,
    );
  }

  const addresses = net.isIP(url.hostname)
    ? [url.hostname]
    : await resolveHost(url.hostname);
  for (const address of addresses) {
    if (isPrivateAddress(address)) {
      throw new PortraitImportError(
        `"${url.hostname}" zeigt auf eine interne Adresse (${address}).`,
      );
    }
  }
  return url;
}

async function resolveHost(hostname: string): Promise<string[]> {
  try {
    const records = await dns.lookup(hostname, { all: true });
    if (records.length === 0) {
      throw new Error("keine Adresse");
    }
    return records.map((record) => record.address);
  } catch {
    throw new PortraitImportError(`"${hostname}" ist nicht auflösbar.`);
  }
}

// Loopback, private und Link-Local-Bereiche (IPv4 und IPv6) — plus die
// IPv4-in-IPv6-Schreibweise, mit der sich die IPv4-Prüfung sonst umgehen
// ließe.
export function isPrivateAddress(address: string): boolean {
  const value = address.toLowerCase();

  if (net.isIPv4(value)) return isPrivateIpv4(value);

  if (net.isIPv6(value)) {
    if (value === "::" || value === "::1") return true;
    // ::ffff:10.0.0.1 und ::ffff:0a00:0001 meinen dieselbe IPv4-Adresse.
    const mapped = /^::ffff:(\d+\.\d+\.\d+\.\d+)$/.exec(value);
    if (mapped) return isPrivateIpv4(mapped[1]);
    // fc00::/7 (unique local) und fe80::/10 (link local).
    if (/^f[cd]/.test(value)) return true;
    if (/^fe[89ab]/.test(value)) return true;
    return false;
  }

  // Weder IPv4 noch IPv6: kann eigentlich nicht vorkommen (hier kommen nur
  // aufgelöste Adressen an). Falls doch, gilt der sichere Ausgang — lieber
  // einen Import ablehnen als ihn ungeprüft laufen lassen.
  return true;
}

function isPrivateIpv4(address: string): boolean {
  const parts = address.split(".").map(Number);
  if (parts.length !== 4 || parts.some((n) => !Number.isInteger(n))) return true;
  const [a, b] = parts;
  if (a === 0 || a === 10 || a === 127) return true;
  if (a === 169 && b === 254) return true; // Link-local (Cloud-Metadaten!)
  if (a === 172 && b >= 16 && b <= 31) return true;
  if (a === 192 && b === 168) return true;
  if (a === 100 && b >= 64 && b <= 127) return true; // Carrier-NAT
  return false;
}
