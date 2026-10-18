import "server-only";
import dns from "node:dns/promises";
import { request as httpRequest } from "node:http";
import type { IncomingMessage } from "node:http";
import { request as httpsRequest } from "node:https";
import net from "node:net";
import { uploadCharacterPortraitImage } from "@/lib/characterAssets";
import {
  ASSET_IMAGE_MIME_TO_EXT,
  InvalidAssetError,
  MAX_ASSET_IMAGE_BYTES,
} from "@/lib/assetStorage";
import { parseImageDataUrl } from "@/lib/portraitSource";

// Ein Portrait, das als Adresse vorliegt, EINMAL holen und als eigenen Upload
// ablegen. Danach liegt jedes Portrait im eigenen Asset-Bucket. Dieser
// serverseitige Abruf ist ein möglicher SSRF-Pfad und wird deshalb auf
// öffentliche HTTP(S)-Ziele, feste DNS-Adressen, begrenzte Laufzeit und eine
// begrenzte Dateigröße beschränkt.
const FETCH_TIMEOUT_MS = 15_000;
const MAX_REDIRECTS = 3;

export class PortraitImportError extends Error {}

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
  const maxBase64Length = Math.ceil(MAX_ASSET_IMAGE_BYTES / 3) * 4;
  if (parsed.base64.length > maxBase64Length) {
    throw new InvalidAssetError(
      `Das Bild ist größer als ${Math.round(MAX_ASSET_IMAGE_BYTES / 1024 / 1024)} MB.`,
    );
  }
  const buffer = Buffer.from(parsed.base64, "base64");
  if (buffer.byteLength === 0) {
    throw new PortraitImportError("Die Data-URL enthält kein brauchbares Bild.");
  }
  if (buffer.byteLength > MAX_ASSET_IMAGE_BYTES) {
    throw new InvalidAssetError(
      `Das Bild ist größer als ${Math.round(MAX_ASSET_IMAGE_BYTES / 1024 / 1024)} MB.`,
    );
  }
  const mimeType = detectImageMimeType(buffer);
  if (!mimeType) {
    throw new PortraitImportError("Die Data-URL enthält kein unterstütztes Bild.");
  }
  return { buffer, mimeType };
}

async function fetchRemoteImage(
  rawUrl: string,
): Promise<{ buffer: Buffer; mimeType: string }> {
  let current = rawUrl.trim();

  for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
    const controller = new AbortController();
    let timedOut = false;
    const timer = setTimeout(() => {
      timedOut = true;
      controller.abort();
    }, FETCH_TIMEOUT_MS);

    try {
      // DNS wird vor dem Request geprüft und derselbe geprüfte Datensatz wird
      // anschließend im Socket-Lookup verwendet. Damit kann eine zweite
      // Auflösung nach der Prüfung keinen privaten Host einschleusen.
      const { url, addresses } = await withAbort(
        assertFetchableUrl(current),
        controller.signal,
      );
      const response = await requestPublicAddress(
        url,
        addresses,
        controller.signal,
      );

      if (response.statusCode && response.statusCode >= 300 && response.statusCode < 400) {
        const location = response.headers.location;
        response.destroy();
        if (!location) {
          throw new PortraitImportError(
            `Umleitung ohne Ziel (HTTP ${response.statusCode}).`,
          );
        }
        if (hop === MAX_REDIRECTS) {
          throw new PortraitImportError("Zu viele Umleitungen.");
        }
        current = new URL(location, url).toString();
        continue;
      }

      if (!response.statusCode || response.statusCode < 200 || response.statusCode >= 300) {
        response.destroy();
        throw new PortraitImportError(
          `Der Server antwortete mit HTTP ${response.statusCode ?? "unbekannt"}.`,
        );
      }

      const mimeType = (response.headers["content-type"] ?? "")
        .split(";")[0]
        .trim()
        .toLowerCase();
      if (!mimeType.startsWith("image/")) {
        response.destroy();
        throw new PortraitImportError(
          `Die Adresse liefert kein Bild (${mimeType || "ohne Typ"}).`,
        );
      }

      const contentLength = Number(response.headers["content-length"]);
      if (Number.isFinite(contentLength) && contentLength > MAX_ASSET_IMAGE_BYTES) {
        response.destroy();
        throw tooLargeError();
      }
      const buffer = await readLimitedBody(response);
      if (buffer.byteLength === 0) {
        throw new PortraitImportError("Die Adresse liefert eine leere Datei.");
      }
      const detectedMimeType = detectImageMimeType(buffer);
      if (!detectedMimeType) {
        throw new PortraitImportError(
          "Die Adresse liefert kein unterstütztes JPEG-, PNG-, WebP- oder GIF-Bild.",
        );
      }
      return { buffer, mimeType: detectedMimeType };
    } catch (err) {
      if (err instanceof PortraitImportError || err instanceof InvalidAssetError) {
        throw err;
      }
      if (timedOut) {
        throw new PortraitImportError(
          "Der Bildabruf hat das Zeitlimit von 15 Sekunden überschritten.",
        );
      }
      throw new PortraitImportError(
        `Die Adresse ist nicht erreichbar: ${err instanceof Error ? err.message : String(err)}`,
      );
    } finally {
      clearTimeout(timer);
    }
  }

  throw new PortraitImportError("Zu viele Umleitungen.");
}

async function requestPublicAddress(
  url: URL,
  addresses: ResolvedAddress[],
  signal: AbortSignal,
): Promise<IncomingMessage> {
  let lastError: unknown;
  for (const address of addresses) {
    try {
      return await requestPinnedAddress(url, address, signal);
    } catch (error) {
      lastError = error;
      if (signal.aborted) throw error;
    }
  }
  throw lastError ?? new Error("Keine öffentliche Adresse verfügbar.");
}

function requestPinnedAddress(
  url: URL,
  address: ResolvedAddress,
  signal: AbortSignal,
): Promise<IncomingMessage> {
  return new Promise((resolve, reject) => {
    const request = (url.protocol === "https:" ? httpsRequest : httpRequest)(
      url,
      {
        method: "GET",
        headers: { accept: "image/*" },
        signal,
        lookup: (_hostname, options, callback) => {
          if (options.all) {
            callback(null, [
              { address: address.address, family: address.family },
            ]);
          } else {
            callback(null, address.address, address.family);
          }
        },
      },
      resolve,
    );
    request.once("error", reject);
    request.end();
  });
}

async function readLimitedBody(response: IncomingMessage): Promise<Buffer> {
  const chunks: Buffer[] = [];
  let total = 0;
  for await (const chunk of response) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    total += buffer.byteLength;
    if (total > MAX_ASSET_IMAGE_BYTES) {
      response.destroy();
      throw tooLargeError();
    }
    chunks.push(buffer);
  }
  return Buffer.concat(chunks, total);
}

function tooLargeError(): InvalidAssetError {
  return new InvalidAssetError(
    `Das Bild ist größer als ${Math.round(MAX_ASSET_IMAGE_BYTES / 1024 / 1024)} MB.`,
  );
}

function detectImageMimeType(buffer: Buffer): string | null {
  const matches: Array<[string, (value: Buffer) => boolean]> = [
    ["image/jpeg", (value) => value.length >= 3 && value[0] === 0xff && value[1] === 0xd8 && value[2] === 0xff],
    ["image/png", (value) => value.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))],
    ["image/webp", (value) => value.length >= 12 && value.toString("ascii", 0, 4) === "RIFF" && value.toString("ascii", 8, 12) === "WEBP"],
    ["image/gif", (value) => value.toString("ascii", 0, 6) === "GIF87a" || value.toString("ascii", 0, 6) === "GIF89a"],
  ];
  return (
    matches.find(
      ([mimeType, matchesSignature]) =>
        mimeType in ASSET_IMAGE_MIME_TO_EXT && matchesSignature(buffer),
    )?.[0] ?? null
  );
}

interface ResolvedAddress {
  address: string;
  family: 4 | 6;
}

async function assertFetchableUrl(
  value: string,
): Promise<{ url: URL; addresses: ResolvedAddress[] }> {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new PortraitImportError("Keine gültige Bildadresse.");
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new PortraitImportError("Nur HTTP- und HTTPS-Bildadressen werden unterstützt.");
  }
  if (url.username || url.password) {
    throw new PortraitImportError("Bildadressen mit Zugangsdaten werden nicht unterstützt.");
  }
  const defaultPort = url.protocol === "https:" ? "443" : "80";
  if (url.port && url.port !== defaultPort) {
    throw new PortraitImportError("Nur die Standardports 80 und 443 werden unterstützt.");
  }

  const hostname = url.hostname.replace(/^\[|\]$/g, "");
  const literalFamily = net.isIP(hostname);
  const addresses = literalFamily
    ? [{ address: hostname, family: literalFamily as 4 | 6 }]
    : await resolveHost(hostname);
  if (addresses.length === 0 || addresses.some(({ address }) => isPrivateAddress(address))) {
    throw new PortraitImportError(
      `"${hostname}" zeigt nicht ausschließlich auf öffentliche Adressen.`,
    );
  }
  return { url, addresses };
}

async function resolveHost(hostname: string): Promise<ResolvedAddress[]> {
  try {
    const records = await dns.lookup(hostname, { all: true, verbatim: true });
    if (records.length === 0) throw new Error("keine Adresse");
    return records.map(({ address, family }) => ({
      address,
      family: family as 4 | 6,
    }));
  } catch {
    throw new PortraitImportError(`"${hostname}" ist nicht auflösbar.`);
  }
}

// Nur global routbare Adressen zulassen. Das sperrt auch reservierte,
// dokumentations- und multicast-Netze sowie IPv4-mapped-IPv6-Adressen.
export function isPrivateAddress(address: string): boolean {
  const value = address.toLowerCase();
  if (net.isIPv4(value)) return !isGlobalIpv4(value);
  if (!net.isIPv6(value)) return true;

  const parsed = ipv6ToBigInt(value);
  if (parsed === null) return true;
  // Global Unicast Allocation: 2000::/3. Alles außerhalb ist für einen
  // öffentlichen Portrait-Host nicht erforderlich.
  if (parsed >> 125n !== 1n) return true;
  // IPv4-mapped addresses use the IPv4 policy too, so public mapped addresses
  // remain usable while internal and reserved ones stay blocked.
  if (parsed >> 32n === 0xffffn) {
    const ipv4 = Number(parsed & 0xffffffffn);
    const mapped = [
      (ipv4 >>> 24) & 0xff,
      (ipv4 >>> 16) & 0xff,
      (ipv4 >>> 8) & 0xff,
      ipv4 & 0xff,
    ].join(".");
    return !isGlobalIpv4(mapped);
  }
  // Special-purpose, documentation and transition ranges are not accepted.
  if (inIpv6Cidr(parsed, "2001:0000:0000:0000:0000:0000:0000:0000", 23)) return true;
  if (inIpv6Cidr(parsed, "2001:0db8:0000:0000:0000:0000:0000:0000", 32)) return true;
  if (inIpv6Cidr(parsed, "2002:0000:0000:0000:0000:0000:0000:0000", 16)) return true;
  return false;
}

const BLOCKED_IPV4_RANGES: ReadonlyArray<readonly [string, number]> = [
  ["0.0.0.0", 8],
  ["10.0.0.0", 8],
  ["100.64.0.0", 10],
  ["127.0.0.0", 8],
  ["169.254.0.0", 16],
  ["172.16.0.0", 12],
  ["192.0.0.0", 24],
  ["192.0.2.0", 24],
  ["192.88.99.0", 24],
  ["192.168.0.0", 16],
  ["198.18.0.0", 15],
  ["198.51.100.0", 24],
  ["203.0.113.0", 24],
  ["224.0.0.0", 4],
  ["240.0.0.0", 4],
];

function isGlobalIpv4(address: string): boolean {
  const value = ipv4ToNumber(address);
  if (value === null) return false;
  return !BLOCKED_IPV4_RANGES.some(([network, prefix]) => {
    const base = ipv4ToNumber(network);
    if (base === null) return true;
    const shift = 32 - prefix;
    return value >>> shift === base >>> shift;
  });
}

function ipv4ToNumber(address: string): number | null {
  const parts = address.split(".").map(Number);
  if (
    parts.length !== 4 ||
    parts.some((part) => !Number.isInteger(part) || part < 0 || part > 255)
  ) {
    return null;
  }
  return (((parts[0] * 256 + parts[1]) * 256 + parts[2]) * 256 + parts[3]) >>> 0;
}

function ipv6ToBigInt(address: string): bigint | null {
  let value = address;
  const dottedTail = /((?:\d{1,3}\.){3}\d{1,3})$/.exec(value);
  if (dottedTail) {
    const ipv4 = ipv4ToNumber(dottedTail[1]);
    if (ipv4 === null) return null;
    value = value.slice(0, dottedTail.index) +
      `${((ipv4 >>> 16) & 0xffff).toString(16)}:${(ipv4 & 0xffff).toString(16)}`;
  }

  const halves = value.split("::");
  if (halves.length > 2) return null;
  const left = halves[0] ? halves[0].split(":") : [];
  const right = halves.length === 2 && halves[1] ? halves[1].split(":") : [];
  const zeros = halves.length === 2 ? 8 - left.length - right.length : 0;
  const groups = halves.length === 2
    ? [...left, ...Array(Math.max(0, zeros)).fill("0"), ...right]
    : left;
  if (groups.length !== 8 || groups.some((group) => !/^[0-9a-f]{1,4}$/i.test(group))) {
    return null;
  }
  return groups.reduce((result, group) => (result << 16n) | BigInt(`0x${group}`), 0n);
}

function inIpv6Cidr(address: bigint, network: string, prefix: number): boolean {
  const base = ipv6ToBigInt(network);
  if (base === null) return true;
  const shift = 128n - BigInt(prefix);
  return address >> shift === base >> shift;
}

function withAbort<T>(promise: Promise<T>, signal: AbortSignal): Promise<T> {
  if (signal.aborted) return Promise.reject(new Error("Abgebrochen."));
  return new Promise((resolve, reject) => {
    const abort = () => reject(new Error("Abgebrochen."));
    signal.addEventListener("abort", abort, { once: true });
    promise.then(resolve, reject).finally(() => {
      signal.removeEventListener("abort", abort);
    });
  });
}
