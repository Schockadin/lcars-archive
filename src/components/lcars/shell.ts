// App-weite Komponenten sind bewusst nicht Teil des Primitives-Barrels in
// index.ts. AppShell zieht Navigation und Server Actions ein; ein Import eines
// simplen Schalters darf diese Abhängigkeiten nicht in seinen Modulgraphen
// übernehmen.
export { default as LcarsAppShell } from "./AppShell";
export { default as LcarsCookieNotice } from "./CookieNotice";
export { default as LcarsServiceWorkerRegister } from "./ServiceWorkerRegister";
export { default as LcarsInputDraftKeeper } from "./InputDraftKeeper";
