import { describe, expect, it } from "vitest";
import nextConfig from "../../next.config";

describe("Content-Security-Policy", () => {
  it("allows the primary and fallback Ably Realtime endpoints", async () => {
    const configuredHeaders = await nextConfig.headers?.();
    const csp = configuredHeaders
      ?.find((entry) => entry.source === "/(.*)")
      ?.headers.find((header) => header.key === "Content-Security-Policy")
      ?.value;
    const connectSrc = csp
      ?.split("; ")
      .find((directive) => directive.startsWith("connect-src "));

    expect(connectSrc).toContain("'self'");
    expect(connectSrc).toContain("https://rest.ably.io");
    expect(connectSrc).toContain("https://realtime.ably.io");
    expect(connectSrc).toContain("wss://realtime.ably.io");
    expect(connectSrc).toContain("https://*.ably-realtime.com");
    expect(connectSrc).toContain("wss://*.ably-realtime.com");
    expect(connectSrc).toContain("https://*.ably.net");
    expect(connectSrc).toContain("wss://*.ably.net");
  });
});
