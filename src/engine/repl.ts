import { mkdir, writeFile, unlink } from "node:fs/promises";
import { join } from "node:path";
import type { BuildState } from "./state.ts";
import { cdp } from "../cdp/index.ts";

export type ReplHandle = {
  port: number;
  close(): Promise<void>;
};

export type ReplOpts = {
  state: BuildState;
  projectRoot: string;
  /** 0 = pick free port. */
  port?: number;
};

/**
 * Minimal REPL over HTTP for fcc dev.
 *
 *   POST /repl    body = JS code; runs `new AsyncFunction("state", code)`
 *                 with the live BuildState in scope. Returns JSON.
 *
 * The user code can `return` an expression, or be a one-liner expression
 * (it gets prefixed with `return ` if it doesn't already contain `return`,
 * `await`, `;`, or a newline).
 */
export async function startRepl(opts: ReplOpts): Promise<ReplHandle> {
  const { state, projectRoot } = opts;

  const server = Bun.serve({
    port: opts.port ?? 0,
    async fetch(req) {
      const url = new URL(req.url);
      if (req.method === "POST" && url.pathname === "/repl") {
        const code = await req.text();
        return runRepl(code, state);
      }
      if (req.method === "GET" && url.pathname === "/health") {
        return Response.json({ ok: true, cycles: cyclesOf(state) });
      }
      return new Response("not found", { status: 404 });
    },
  });

  const dir = join(projectRoot, ".fcc");
  await mkdir(dir, { recursive: true });
  await writeFile(join(dir, "repl-port"), String(server.port), "utf8");

  return {
    port: server.port,
    async close() {
      server.stop(true);
      try { await unlink(join(dir, "repl-port")); } catch {}
    },
  };
}

async function runRepl(code: string, state: BuildState): Promise<Response> {
  const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor;
  const args = ["state", "cfg", "T", "cdp"];
  const argVals = [state, state.cfg, makeT(state), cdp];

  // Try expression form first — wrap as `return (code)`. If that parses, we
  // get a value back for one-liners. If it's a SyntaxError (e.g. multi-statement
  // body, declarations, or already a `return`), fall back to statement form.
  let fn: Function;
  if (/^\s*return\b/.test(code) || /^\s*throw\b/.test(code)) {
    fn = new AsyncFunction(...args, code);
  } else {
    try {
      fn = new AsyncFunction(...args, `return (${code})`);
    } catch {
      fn = new AsyncFunction(...args, code);
    }
  }

  try {
    const value = await fn(...argVals);
    return Response.json({ ok: true, value: safeJson(value) });
  } catch (e) {
    const err = e as Error;
    return Response.json({ ok: false, error: err.message, stack: err.stack }, { status: 200 });
  }
}

/** Shortcut for ctx.byTarget.get(name) — defaults to the first target. */
function makeT(state: BuildState) {
  const first = [...state.byTarget.keys()][0];
  return (name?: string) => state.byTarget.get(name ?? first!);
}

function cyclesOf(state: BuildState): Record<string, number> {
  const out: Record<string, number> = {};
  for (const [name, ts] of state.byTarget) out[name] = ts.cycle;
  return out;
}

/**
 * Convert anything to a JSON-safe shape:
 *   Map  → { __map: [[k,v], …] } (truncated to first 100 entries)
 *   Set  → { __set: [v, …] }
 *   Resource (has resourceType + data) → just resource.data summary
 *   Error → { __error, message, stack }
 * Caps total stringified length at ~64 KB.
 */
function safeJson(v: unknown, depth = 0, seen = new WeakSet<object>()): unknown {
  if (v === null || v === undefined) return v;
  const t = typeof v;
  if (t === "string" || t === "number" || t === "boolean") return v;
  if (t === "bigint") return String(v) + "n";
  if (t === "function") return `[function ${(v as Function).name || "anon"}]`;
  if (t === "symbol") return String(v);

  if (v instanceof Error) {
    return { __error: v.name, message: v.message, stack: v.stack };
  }
  if (v instanceof Date) return { __date: v.toISOString() };
  if (v instanceof Map) {
    const out: Array<[unknown, unknown]> = [];
    let i = 0;
    for (const [k, val] of v) {
      if (i++ >= 100) { out.push(["__truncated__", v.size - 100]); break; }
      out.push([safeJson(k, depth + 1, seen), safeJson(val, depth + 1, seen)]);
    }
    return { __map: out, __size: v.size };
  }
  if (v instanceof Set) {
    const out: unknown[] = [];
    let i = 0;
    for (const val of v) {
      if (i++ >= 100) { out.push({ __truncated__: v.size - 100 }); break; }
      out.push(safeJson(val, depth + 1, seen));
    }
    return { __set: out, __size: v.size };
  }
  if (Array.isArray(v)) {
    if (v.length > 200) return v.slice(0, 200).map(x => safeJson(x, depth + 1, seen)).concat([{ __truncated__: v.length - 200 }]);
    return v.map(x => safeJson(x, depth + 1, seen));
  }
  if (t === "object") {
    if (seen.has(v as object)) return "[circular]";
    seen.add(v as object);
    if (depth > 6) return "[max-depth]";
    const o = v as Record<string, unknown>;
    const out: Record<string, unknown> = {};
    for (const k of Object.keys(o)) out[k] = safeJson(o[k], depth + 1, seen);
    return out;
  }
  return String(v);
}
