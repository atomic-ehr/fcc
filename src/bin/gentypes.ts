#!/usr/bin/env bun
// Regenerate `ctx_ns.d.ts` for a flat-namespace plugin directory.
//
//   bun gentypes.ts <srcDir> [--ns <name>] [--external "<ns>:<pkg>:Type,Type,...">
//
// Scans <srcDir> for .ts files, classifies each:
//   $type_<Name>.ts → ambient `types.<ns>.<Name>`
//   $type_<Name>.test.ts / *.test.ts / *.d.ts / loadFns.ts / ctx_ns.d.ts → skip
//   *.ts            → entry in `FnsRegistry.<ns>.*` keyed by basename (with `$` prefix kept)
//
// Writes a single `<srcDir>/ctx_ns.d.ts` that re-declares Context,
// FnsRegistry, and types.* namespaces. The Context/`types.fcc.*` shape
// is included by default — extend via --external if your plugin needs
// types from another npm package.
//
// Idempotent. Run after adding/removing files. Commit the result.

import { resolve, basename, relative, dirname } from "node:path";
import { readdir, writeFile, stat } from "node:fs/promises";

type Entry =
    | { kind: "fn";   rel: string; runtimeName: string; fnFileName: string }
    | { kind: "type"; rel: string; typeName: string; typeFileName: string };

async function main() {
    const args = process.argv.slice(2);
    let srcDir: string | null = null;
    let ns: string | null = null;
    let fragment = false;
    const externals: Array<{ ns: string; pkg: string; types: string[] }> = [];

    for (let i = 0; i < args.length; i++) {
        const a = args[i];
        if (a === "--ns")        { ns = args[++i] ?? null; continue; }
        if (a === "--fragment")  { fragment = true; continue; } // skip Context+fcc (declared once elsewhere)
        if (a === "--external")  {
            const spec = args[++i] ?? "";
            const [exNs, pkg, list] = spec.split(":");
            if (!exNs || !pkg || !list) { console.error(`gentypes: bad --external "${spec}"`); process.exit(2); }
            externals.push({ ns: exNs, pkg, types: list.split(",").filter(Boolean) });
            continue;
        }
        if (!srcDir) { srcDir = a; continue; }
    }
    if (!srcDir) {
        console.error("usage: gentypes <srcDir> [--ns <name>] [--external <ns>:<pkg>:Type,Type,...]");
        process.exit(2);
    }
    srcDir = resolve(srcDir);

    // Default ns = basename of parent dir without leading "plugin-".
    if (!ns) {
        const parent = basename(dirname(srcDir));
        ns = parent.replace(/^plugin-/, "");
    }

    // Files that are not fn-per-file leaves and must never enter FnsRegistry:
    //   <ns>.ts   — plugin entry / setup function (e.g. menu.ts), named after the ns
    //   style.ts  — static CSS aggregator (named export, no default fn)
    //   render.ts — legacy monolithic aggregator (transitional)
    const FRAMEWORK_SKIP = new Set(["ctx_ns.d.ts", "loadFns.ts", "index.ts", "style.ts", "render.ts", `${ns}.ts`]);

    const files = await collect(srcDir);
    const entries: Entry[] = [];
    for (const f of files) {
        const rel = relative(srcDir, f);
        const name = basename(rel);
        if (FRAMEWORK_SKIP.has(name)) continue;
        if (name.endsWith(".d.ts")) continue;
        if (name.endsWith(".test.ts")) continue;
        if (!name.endsWith(".ts")) continue;
        const stem = name.slice(0, -3);

        if (stem.startsWith("$type_")) {
            const typeName = stem.slice("$type_".length);
            if (!typeName) continue;
            entries.push({ kind: "type", rel, typeName, typeFileName: stem });
            continue;
        }
        // Skip $script_ and $route_ in fcc plugin context (not used here yet)
        const runtimeName = stem; // keep leading $ for $render_*, etc.
        entries.push({ kind: "fn", rel, runtimeName, fnFileName: stem });
    }

    entries.sort((a, b) => a.rel.localeCompare(b.rel));

    const fns   = entries.filter(e => e.kind === "fn")   as Extract<Entry, { kind: "fn" }>[];
    const types = entries.filter(e => e.kind === "type") as Extract<Entry, { kind: "type" }>[];

    const out = render({ ns, fns, types, externals, fragment });
    const dest = resolve(srcDir, "ctx_ns.d.ts");
    await writeFile(dest, out, "utf8");
    console.log(`[gentypes] ${ns}: ${fns.length} fn(s), ${types.length} type(s) → ${relative(process.cwd(), dest)}`);
}

async function collect(dir: string): Promise<string[]> {
    const out: string[] = [];
    const ents = await readdir(dir, { withFileTypes: true }).catch(() => []);
    for (const e of ents) {
        if (e.name === "node_modules" || e.name === "dist" || e.name.startsWith(".")) continue;
        const full = resolve(dir, e.name);
        if (e.isDirectory()) out.push(...await collect(full));
        else out.push(full);
    }
    return out;
}

function render(opts: {
    ns: string;
    fns: Array<{ runtimeName: string; fnFileName: string; rel: string }>;
    types: Array<{ typeName: string; typeFileName: string; rel: string }>;
    externals: Array<{ ns: string; pkg: string; types: string[] }>;
    fragment?: boolean;
}): string {
    const { ns, fns, types, externals, fragment } = opts;
    const lines: string[] = [];
    lines.push(`// Auto-generated by fcc/gentypes — do not edit.`);
    lines.push(`// Sources: $type_*.ts → types.${ns}.*, every other .ts → FnsRegistry.${ns}.*`);
    lines.push(``);
    lines.push(`declare global {`);
    // In a multi-namespace tree, Context + the external (fcc) namespace are
    // declared once by the base run; fragment runs only augment FnsRegistry +
    // their own types namespace (interface/namespace declaration merging).
    if (!fragment) {
        lines.push(`    type Context = {`);
        lines.push(`        cfg:     types.fcc.ResolvedConfig;`);
        lines.push(`        target:  types.fcc.Target;`);
        lines.push(`        bundle:  types.fcc.Bundle;`);
        lines.push(`        notes?:  Map<string, { intro?: string; notes?: string }>;`);
        lines.push(`        state:   Record<string, any>;`);
        lines.push(`        env:     Record<string, string | undefined>;`);
        lines.push(`        fns:     FnsRegistry;`);
        lines.push(`    };`);
        lines.push(``);
    }
    lines.push(`    interface FnsRegistry {`);
    lines.push(`        ${ns}: {`);
    for (const f of fns) {
        const path = relImport(f.rel);
        lines.push(`            ${quoteKey(f.runtimeName)}: typeof import(${JSON.stringify(path)}).default;`);
    }
    lines.push(`        };`);
    lines.push(`    }`);
    lines.push(``);
    lines.push(`    namespace types {`);
    // External namespaces (e.g. fcc core types) — base run only.
    if (!fragment) for (const ex of externals) {
        lines.push(`        namespace ${ex.ns} {`);
        for (const t of ex.types) {
            lines.push(`            type ${t} = import(${JSON.stringify(ex.pkg)}).${t};`);
        }
        lines.push(`        }`);
    }
    lines.push(`        namespace ${ns} {`);
    for (const t of types) {
        const path = relImport(t.rel);
        lines.push(`            type ${t.typeName} = import(${JSON.stringify(path)}).${t.typeName};`);
    }
    lines.push(`        }`);
    lines.push(`    }`);
    lines.push(`}`);
    lines.push(`export {};`);
    lines.push(``);
    return lines.join("\n");
}

function quoteKey(name: string): string {
    // $-prefixed and dot-free identifiers — quote only if not a valid identifier.
    return /^[A-Za-z_$][A-Za-z0-9_$]*$/.test(name) ? name : JSON.stringify(name);
}

function relImport(rel: string): string {
    // Strip .ts; ensure leading "./"
    const noext = rel.replace(/\.ts$/, "");
    return noext.startsWith(".") ? noext : `./${noext}`;
}

main().catch(e => { console.error(e); process.exit(2); });
