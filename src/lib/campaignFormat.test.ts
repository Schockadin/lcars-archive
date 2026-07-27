import { describe, it, expect } from "vitest";
import { inferAgeFromDateOfBirth } from "./campaignFormat";

describe("inferAgeFromDateOfBirth", () => {
  it("leitet das Alter aus Geburtsjahr und Ingame-Jahr ab", () => {
    expect(inferAgeFromDateOfBirth("2380-05-12", 2402)).toBe(22);
  });

  it("rechnet nur auf Jahresbasis (Monat/Tag egal)", () => {
    expect(inferAgeFromDateOfBirth("2380-12-31", 2400)).toBe(20);
    expect(inferAgeFromDateOfBirth("2380-01-01", 2400)).toBe(20);
  });

  it("gibt null zurück, wenn kein Geburtsdatum gesetzt ist", () => {
    expect(inferAgeFromDateOfBirth(null, 2402)).toBeNull();
  });

  it("gibt null zurück, wenn kein Ingame-Jahr gesetzt ist", () => {
    expect(inferAgeFromDateOfBirth("2380-05-12", null)).toBeNull();
  });

  it("gibt null zurück, wenn die Geburt nach dem Ingame-Jahr liegt", () => {
    expect(inferAgeFromDateOfBirth("2410-05-12", 2402)).toBeNull();
  });

  it("erlaubt Alter 0 (im selben Jahr geboren)", () => {
    expect(inferAgeFromDateOfBirth("2402-01-01", 2402)).toBe(0);
  });

  it("gibt null bei unparsebarem Datum zurück", () => {
    expect(inferAgeFromDateOfBirth("keine-zahl", 2402)).toBeNull();
  });
});
