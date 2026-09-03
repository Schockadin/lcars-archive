import { chromium } from "@playwright/test";
const b = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium-1194/chrome-linux/chrome" });
const p = await (await b.newContext({ viewport: { width: 1400, height: 1000 } })).newPage();
p.setDefaultTimeout(120000);
p.setDefaultNavigationTimeout(180000);
await p.goto("http://localhost:3010/login", { waitUntil: "domcontentloaded" });
await p.fill("#email", "test@example.com");
await p.fill("#password", "Testpasswort123!");
await Promise.all([p.waitForURL((u) => !u.pathname.startsWith("/login")), p.getByRole("button", { name: /anmelden/i }).first().click()]);
await p.waitForTimeout(1500);

// Regel auf 12 setzen
await p.goto("http://localhost:3010/gm/ap", { waitUntil: "domcontentloaded" });
await p.waitForTimeout(2500);
await p.locator("[name='apPerMission']").fill("12");
await p.getByRole("button", { name: /speichern/i }).first().click();
await p.waitForTimeout(3000);
console.log("Regel gespeichert:", await p.locator("[name='apPerMission']").inputValue());

// /gm/campaign pruefen
await p.goto("http://localhost:3010/gm/campaign", { waitUntil: "domcontentloaded" });
await p.waitForTimeout(2500);
const form = p.locator("form").filter({ has: p.locator("select[name='missionId']") });
console.log("Missionsabschluss-AP:", await form.locator("input[name='amount']").inputValue());
await b.close();
