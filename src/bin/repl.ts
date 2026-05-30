#!/usr/bin/env bun
// Thin CLI client for fcc dev REPL. Reads `.fcc/repl-port` (walking up
// directories until found), POSTs code to /repl, pretty-prints the JSON.
//
// Usage:
//   bun .../bin/repl.ts 'state.cfg.id'
//   bun .../bin/repl.ts -f path/to/script.js
//   echo 'state.byTarget.size' | bun .../bin/repl.ts -
//
// The server wraps single expressions in `return (…)` automatically,
// so `state.cfg.id` and `return state.cfg.id` are equivalent.

import { resolve, dirname, join } from "node:path";
import { existsSync, readFileSync } from "node:fs";

const args = process.argv.slice(2);

let code: string;
if (args[0] === "-f" && args[1]) {
  code = await Bun.file(args[1]).text();
} else if (args[0] === "-") {
  code = await Bun.stdin.text();
} else if (args.length > 0) {
  code = args.join(" ");
} else if (!process.stdin.isTTY) {
  code = await Bun.stdin.text();
} else {
  console.error("usage: fcc-repl '<code>' | -f <file> | -  (stdin)");
  process.exit(2);
}

const portFile = findUp(process.cwd(), ".fcc/repl-port");
if (!portFile) {
  console.error("fcc-repl: no .fcc/repl-port found above " + process.cwd() + " — is `fcc dev` running?");
  process.exit(1);
}
const port = readFileSync(portFile, "utf8").trim();

const res = await fetch(`http://localhost:${port}/repl`, {
  method: "POST",
  body: code,
});

const text = await res.text();
let parsed: unknown;
try { parsed = JSON.parse(text); } catch { parsed = { ok: false, raw: text }; }

print(parsed);
if (typeof parsed === "object" && parsed !== null && (parsed as { ok?: boolean }).ok === false) {
  process.exit(1);
}

function findUp(start: string, rel: string): string | null {
  let dir = resolve(start);
  while (true) {
    const candidate = join(dir, rel);
    if (existsSync(candidate)) return candidate;
    const parent = dirname(dir);
    if (parent === dir) return null;
    dir = parent;
  }
}

function print(v: unknown): void {
  // Render special markers compactly:
  //   { __map: [[k,v], …], __size } → Map(N) { k => v, … }
  //   { __set: [v, …], __size }     → Set(N) { v, … }
  //   { __error, message, stack }   → ERROR: message + stack
  console.log(JSON.stringify(v, null, 2));
}
