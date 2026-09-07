import { describe, expect, it } from "vitest";
import { isPrivateAddress } from "./portraitImport";

// Der Import holt ein Bild von einer fremden Adresse — also vom Server aus,
// mit dessen Netzsicht. Ohne diese Prüfung wäre er ein Werkzeug, um interne
// Dienste abzufragen (SSRF); besonders 169.254.169.254 ist bei Cloud-Anbietern
// die Metadaten-Adresse und damit ein Zugang zu Zugangsdaten.

describe("isPrivateAddress", () => {
  it("weist die internen IPv4-Bereiche ab", () => {
    for (const address of [
      "127.0.0.1",
      "0.0.0.0",
      "10.1.2.3",
      "172.16.0.1",
      "172.31.255.255",
      "192.168.1.1",
      "169.254.169.254",
      "100.64.0.1",
    ]) {
      expect(isPrivateAddress(address), address).toBe(true);
    }
  });

  it("lässt öffentliche IPv4-Adressen durch", () => {
    for (const address of ["1.1.1.1", "8.8.8.8", "172.32.0.1", "192.169.0.1"]) {
      expect(isPrivateAddress(address), address).toBe(false);
    }
  });

  it("weist die internen IPv6-Bereiche ab", () => {
    for (const address of ["::1", "::", "fc00::1", "fd12::3", "fe80::1"]) {
      expect(isPrivateAddress(address), address).toBe(true);
    }
  });

  it("durchschaut die IPv4-in-IPv6-Schreibweise", () => {
    // Sonst käme man mit ::ffff:127.0.0.1 an der IPv4-Prüfung vorbei.
    expect(isPrivateAddress("::ffff:127.0.0.1")).toBe(true);
    expect(isPrivateAddress("::ffff:169.254.169.254")).toBe(true);
    expect(isPrivateAddress("::ffff:8.8.8.8")).toBe(false);
  });

  it("lässt öffentliche IPv6-Adressen durch", () => {
    expect(isPrivateAddress("2606:4700:4700::1111")).toBe(false);
  });

  it("hält Unsinn für unsicher, statt ihn durchzulassen", () => {
    // Kann nicht vorkommen (hier kommen nur aufgelöste Adressen an) — wenn
    // doch, wird abgelehnt statt durchgewinkt.
    expect(isPrivateAddress("keine-adresse")).toBe(true);
    expect(isPrivateAddress("10.0.0")).toBe(true);
  });
});
