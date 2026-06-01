import type { Plugin, PluginContext } from "fcc";
import { resolve, join } from "node:path";
import { homedir } from "node:os";
import fixPackageUrl from "./fixPackageUrl.ts";

// Dependency bootstrap (IG-Publisher #1, stage A). Indexes the IG's `dependsOn`
// packages from the FHIR package cache so cross-IG references resolve to the
// dependency's published site. MEMORY-SAFE: reads only each package's `.index.json`
// (a tiny {url,id,resourceType,filename} listing) + `package.json` + `spec.internals`
// — never the resource bodies. Builds canonical/id → published web-path maps and
// stashes them on `ctx.state.deps`; the `lrefDependency` link resolver (stage B)
// and, later, snapshot/validation read it.
//
// Web path = <package url> / <spec.internals path | "<RT>-<id>.html">. spec.internals
// (shipped by core/THO/extensions and most IGs) gives the exact published filename;
// IGs without it fall back to the IG-Publisher `<RT>-<id>.html` convention.

export type DepEntry = { pkg: string; version: string; resourceType: string; id: string; url: string; webPath: string };
export type DepIndex = {
    byCanonical: Map<string, DepEntry>;      // bare canonical url → entry
    byId: Map<string, DepEntry>;             // resource id → entry (first/nearer dep wins)
    packages: { id: string; version: string; base: string }[];
};

// Indexed at `generateBundle` — once per build, AFTER sources have loaded (so
// packages an FSH compile pulled into the cache mid-build are already present),
// and before the site renders. (Stage D consumers that run earlier will trigger
// an explicit ensure-download step when they land.)
export default function deps(opts: { packagesDir?: string; quiet?: boolean } = {}): Plugin {
    return [{ hook: "generateBundle", fn: depsFn, ...opts }];
}

async function depsFn(ctx: PluginContext, config: Record<string, unknown>, _opts: Record<string, unknown>): Promise<void> {
    const declared = ((ctx.config as { deps?: Record<string, string> }).deps ?? {});
    const dirs = [
        config.packagesDir ? resolve(ctx.config.projectRoot, config.packagesDir as string) : null,
        resolve(ctx.config.projectRoot, "input-cache/.fhir/packages"),
        join(homedir(), ".fhir", "packages"),
    ].filter(Boolean) as string[];

    const byCanonical = new Map<string, DepEntry>();
    const byId = new Map<string, DepEntry>();
    const packages: { id: string; version: string; base: string }[] = [];

    for (const [pkg, version] of Object.entries(declared)) {
        const pkgDir = await findPkgDir(dirs, pkg, version);
        if (!pkgDir) { if (!config.quiet) ctx.warn({ severity: "info", source: "fcc/deps", message: `dependency not in cache, skipped: ${pkg}#${version}` }); continue; }
        try {
            const meta = await Bun.file(join(pkgDir, "package.json")).json();
            // Published base for cross-IG links — the package's `url` (versioned,
            // e.g. .../extensions/5.3.0; IGP's preferred base2), corrected by the
            // PackageHacker port for historically-wrong publishes.
            const base = (fixPackageUrl(String(meta.url ?? meta.canonical ?? "")) ?? "").replace(/\/+$/, "");
            if (!base) { if (!config.quiet) ctx.warn({ severity: "warning", source: "fcc/deps", message: `${pkg}#${version} has no url/canonical — skipped (can't build cross-IG web paths)` }); continue; }
            const index = await Bun.file(join(pkgDir, ".index.json")).json().catch(() => ({ files: [] }));
            const specPaths = await loadSpecPaths(pkgDir);
            packages.push({ id: pkg, version, base });
            for (const f of (index.files ?? []) as Array<{ url?: string; id?: string; resourceType?: string; version?: string }>) {
                if (!f.url) continue;
                const rel = specPaths?.[f.url] ?? specPaths?.[`${f.url}|${f.version}`] ?? `${f.resourceType}-${f.id}.html`;
                const entry: DepEntry = { pkg, version, resourceType: f.resourceType ?? "", id: f.id ?? "", url: f.url, webPath: base ? `${base}/${rel}` : rel };
                if (!byCanonical.has(f.url)) byCanonical.set(f.url, entry);   // config order = precedence
                if (f.id && !byId.has(f.id)) byId.set(f.id, entry);
            }
        } catch (e) {
            if (!config.quiet) ctx.warn({ severity: "warning", source: "fcc/deps", message: `failed to index ${pkg}#${version}: ${(e as Error).message}` });
        }
    }

    (ctx.state as Record<string, unknown>).deps = { byCanonical, byId, packages } satisfies DepIndex;
    if (!config.quiet) ctx.warn({ severity: "info", source: "fcc/deps", message: `indexed ${packages.length}/${Object.keys(declared).length} dependency package(s) → ${byCanonical.size} canonical(s) for cross-IG links` });
}

async function findPkgDir(dirs: string[], pkg: string, version: string): Promise<string | null> {
    for (const d of dirs) {
        const p = join(d, `${pkg}#${version}`, "package");
        if (await Bun.file(join(p, "package.json")).exists()) return p;
    }
    return null;
}

// spec.internals (canonical → relative published filename) — shipped under
// package/other/ by the publisher, or package/ in older layouts.
async function loadSpecPaths(pkgDir: string): Promise<Record<string, string> | null> {
    for (const rel of ["other/spec.internals", "spec.internals"]) {
        const f = Bun.file(join(pkgDir, rel));
        if (await f.exists()) { try { return JSON.parse(await f.text()).paths ?? null; } catch { return null; } }
    }
    return null;
}
