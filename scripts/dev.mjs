#!/usr/bin/env node
// scripts/dev.mjs
//
// npm run dev soll immer gegen die Dev-DB laufen (.env.dev), nie
// versehentlich gegen eine in .env.local hinterlegte Produktions-URL.
// `next dev` respawnt intern einen Kindprozess und reicht dabei die
// Node-Flags des aktuellen Prozesses über NODE_OPTIONS weiter — Node
// erlaubt --env-file dort aber nicht ("--env-file= is not allowed in
// NODE_OPTIONS"), ein direktes `node --env-file=.env.dev next dev` schlägt
// deshalb fehl. Dieser Vorprozess lädt .env.dev stattdessen selbst (via
// --env-file auf sich selbst, siehe package.json) und vererbt die Werte ganz
// normal über process.env an next dev — das funktioniert, weil @next/env
// bereits gesetzte process.env-Werte nie mit .env.local/.env überschreibt.
import { spawn } from "node:child_process";

const child = spawn(
  process.execPath,
  ["node_modules/.bin/next", "dev", ...process.argv.slice(2)],
  { stdio: "inherit", env: process.env },
);

child.on("exit", (code, signal) => {
  if (signal) process.kill(process.pid, signal);
  else process.exit(code ?? 0);
});
