#!/usr/bin/env bun
import { resolve } from "node:path";
import { existsSync } from "node:fs";
import { build, runBuild, runIncremental, makeContext } from "../engine/runner.ts";
import { createState } from "../engine/state.ts";
import { watchSources } from "../engine/watcher.ts";
import { startRepl } from "../engine/repl.ts";
import { startDevServer } from "../engine/devServer.ts";
import type { Config, Diagnostic, ResolvedConfig } from "../engine/types.ts";

async function main() {
  const [, , cmd0 = "build", ...rest] = process.argv;
  const cmd = cmd0;
  const flags = parseFlags(rest);
  const target = flags.target;
  const watchMode = flags.watch || cmd === "dev";

  const cwd = process.cwd();
  const configPath = resolve(cwd, "fcc.config.ts");
  if (!existsSync(configPath)) {
    console.error(`fcc: no fcc.config.ts in ${cwd}`);
    process.exit(2);
  }

  const config = await loadConfig(configPath);
  if (!config || !Array.isArray(config.targets)) {
    console.error(`fcc: fcc.config.ts does not default-export a valid config`);
    process.exit(2);
  }

  switch (cmd) {
    case "info":
      printInfo(config);
      return;

    case "check":
    case "build":
    case "pack":
    case "dev": {
      if (!watchMode) {
        const result = await build({ projectRoot: cwd, configPath, config, targetName: target });
        printDiagnostics(result.diagnostics);
        if (!result.ok) {
          console.error(`\nfcc: ${countBySeverity(result.diagnostics, "error")} error(s)`);
          process.exit(1);
        }
        console.log(`\nfcc: build ok in ${result.durationMs.toFixed(0)}ms — ${result.bundles.size} target(s)`);
        for (const [name, b] of result.bundles) {
          console.log(`  ${name}: ${b.resources.size} resources, ${b.emitted.length} emitted file(s)`);
        }
        return;
      }

      // ---- watch mode ----
      // dev: true makes emit plugins (site) serve lazily from memory instead of
      // precomputing every file to disk.
      const resolved: ResolvedConfig = { ...config, projectRoot: cwd, dev: true };
      const state = createState(resolved);

      console.log("fcc: initial build…");
      const initial = await runBuild(state, target);
      printDiagnostics(initial.diagnostics);
      console.log(
        `fcc: initial build ${initial.ok ? "ok" : "FAILED"} in ${initial.durationMs.toFixed(0)}ms — ` +
        `${[...initial.bundles.values()].map(b => b.resources.size).join("/")} resources`,
      );

      // Dev HTTP server: renders pages on demand from the in-memory graph and
      // live-reloads the browser over SSE after each rebuild.
      const dev = startDevServer({ state, targetName: target });
      console.log(`fcc: site on http://localhost:${dev.port}/  (lazy render + live reload)`);

      const repl = await startRepl({ state, projectRoot: cwd });
      console.log(`fcc: REPL on http://localhost:${repl.port}/repl  (port written to .fcc/repl-port)`);
      console.log(`     try:  bun ../../src/bin/repl.ts 'state.byTarget.get("${[...state.byTarget.keys()][0]}").resources.size'`);

      // Collect extra dirs declared by plugins (e.g. the site's pagecontent +
      // intro-notes — non-resource markdown the source dirs miss). These are
      // recursive dirs, so pass them as extraDirs (watched recursively even if
      // they don't exist yet) rather than letting the watcher stat-guess.
      const pluginDirs: string[] = [];
      const wpTs = state.byTarget.get(target ?? "") ?? [...state.byTarget.values()][0];
      const wpCtx = wpTs ? makeContext(resolved, wpTs, null) : undefined;
      if (wpCtx) for (const fn of state.hooks.watchPaths) {
        try { for (const e of (await fn(wpCtx)) ?? []) pluginDirs.push(e.path); }
        catch { /* hook opted out */ }
      }

      console.log("fcc: watching for changes (Ctrl+C to stop)…\n");

      const handle = watchSources({
        cfg: resolved,
        extraPaths: [configPath],
        extraDirs: pluginDirs,
        async onBatch(files) {
          if (files.includes(configPath)) {
            console.log("fcc: config changed — full rebuild");
            const r = await runBuild(state, target);
            printDiagnostics(r.diagnostics);
            console.log(`fcc: rebuilt in ${r.durationMs.toFixed(0)}ms`);
            dev.broadcastReload();
            return;
          }
          const ts0 = performance.now();
          const r = await runIncremental(state, files, target);
          const ms = (performance.now() - ts0).toFixed(0);
          console.log(`fcc: ${files.length} file(s) changed — ${r.ok ? "ok" : "ERRORS"} in ${ms}ms`);
          for (const f of files) console.log(`  · ${shorten(f, cwd)}`);
          printDiagnostics(r.diagnostics);
          dev.broadcastReload();
        },
      });

      const shutdown = async () => {
        handle.close();
        dev.close();
        await repl.close();
        console.log("\nfcc: stopped");
        process.exit(0);
      };
      process.on("SIGINT", shutdown);
      process.on("SIGTERM", shutdown);
      // keep the process alive
      await new Promise(() => {});
      return;
    }

    default:
      console.error(`fcc: unknown command "${cmd}"`);
      process.exit(2);
  }
}

function parseFlags(args: string[]): { target?: string; watch: boolean } {
  let target: string | undefined;
  let watch = false;
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === "-t" || a === "--target") { target = args[++i]; continue; }
    if (a === "-w" || a === "--watch")  { watch = true; continue; }
  }
  return { target, watch };
}

async function loadConfig(configPath: string): Promise<Config> {
  // bust ESM cache so config edits in watch mode pick up fresh values
  const url = `${configPath}?t=${Date.now()}`;
  const mod = await import(url);
  return mod.default;
}

function printInfo(c: Config) {
  console.log(`id:        ${c.id}`);
  console.log(`canonical: ${c.canonical}`);
  console.log(`version:   ${c.version}`);
  console.log(`targets:`);
  for (const t of c.targets) console.log(`  - ${t.name} (fhir ${t.fhir}) → ${t.out}`);
  console.log(`sources:`);
  for (const s of c.sources) console.log(`  - ${s.dir} via ${s.loader.name}`);
  console.log(`plugins:  ${c.plugins.length} registered`);
}

function printDiagnostics(diags: Diagnostic[]) {
  for (const d of diags) {
    const prefix = d.severity === "error" ? "ERROR" : d.severity === "warning" ? "WARN " : "INFO ";
    const where = d.path ? ` ${d.path}` : "";
    const src = d.source ? ` (${d.source})` : "";
    console.log(`  ${prefix}${where}: ${d.message}${src}`);
  }
}

function countBySeverity(diags: Diagnostic[], s: string) {
  return diags.filter(d => d.severity === s).length;
}

function shorten(p: string, base: string): string {
  return p.startsWith(base + "/") ? p.slice(base.length + 1) : p;
}

main().catch(e => {
  console.error(e instanceof Error ? e.stack : e);
  process.exit(2);
});
