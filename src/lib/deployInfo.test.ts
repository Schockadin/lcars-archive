import { describe, it, expect } from "vitest";
import {
  describeDeployOrigin,
  formatDeployContext,
  shortCommitRef,
} from "./deployInfo";

describe("formatDeployContext", () => {
  it("nennt die Produktion beim Namen", () => {
    expect(
      formatDeployContext({ context: "production", branch: "master" }),
    ).toBe("production");
  });

  it("hängt an eine Deploy-Preview ihre PR-Nummer", () => {
    expect(
      formatDeployContext({
        context: "deploy-preview",
        reviewId: "78",
        branch: "claude/irgendwas",
      }),
    ).toBe("deploy-preview #78");
  });

  it("kommt auch ohne PR-Nummer aus", () => {
    expect(formatDeployContext({ context: "deploy-preview" })).toBe(
      "deploy-preview",
    );
  });

  it("nennt beim Branch-Deploy den Branch", () => {
    expect(
      formatDeployContext({ context: "branch-deploy", branch: "experiment" }),
    ).toBe("branch-deploy (experiment)");
  });

  it("reicht unbekannte Kontexte unverändert durch", () => {
    expect(formatDeployContext({ context: "dev" })).toBe("dev");
  });

  it("gibt ohne Kontext höchstens den Branch, sonst null", () => {
    expect(formatDeployContext({ branch: "master" })).toBe("branch (master)");
    expect(formatDeployContext({})).toBeNull();
    // Nicht gesetzte Netlify-Variablen kommen als leerer String an, wenn sie
    // beim Build eingesetzt wurden — das ist „keine Angabe", nicht „leer".
    expect(formatDeployContext({ context: "", branch: "  " })).toBeNull();
  });
});

describe("shortCommitRef", () => {
  it("kürzt auf die git-übliche Länge", () => {
    expect(shortCommitRef("9f301b3413e22656249a0ad8a2cdd17680280791")).toBe(
      "9f301b3",
    );
  });

  it("verträgt fehlende und leere Werte", () => {
    expect(shortCommitRef(undefined)).toBeNull();
    expect(shortCommitRef("")).toBeNull();
    expect(shortCommitRef("   ")).toBeNull();
  });
});

describe("describeDeployOrigin", () => {
  it("fasst Version, Kontext und Commit zusammen", () => {
    expect(
      describeDeployOrigin(
        {
          context: "deploy-preview",
          reviewId: "78",
          commit: "f96f5357bbc46ba54de95072df89ebeeee1e7fe2",
        },
        "1.41.0",
      ),
    ).toEqual({
      appVersion: "1.41.0",
      deployContext: "deploy-preview #78",
      commitRef: "f96f535",
    });
  });

  it("liefert lokal nur die Version", () => {
    expect(describeDeployOrigin({}, "1.41.0")).toEqual({
      appVersion: "1.41.0",
      deployContext: null,
      commitRef: null,
    });
  });
});
