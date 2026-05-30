import { watch, statSync, type FSWatcher } from "node:fs";
import { resolve } from "node:path";
import type { ResolvedConfig } from "./types.ts";

export type WatchOpts = {
  cfg: ResolvedConfig;
  /** Debounce window in ms. Batches rapid edits (e.g. editor save-then-format). */
  debounceMs?: number;
  /** Extra paths to watch in addition to source dirs (e.g. fcc.config.ts itself).
   *  Auto-detects file vs dir; dirs are watched recursively. */
  extraPaths?: string[];
  /** Extra dirs to watch recursively (explicit alternative when stat is unreliable). */
  extraDirs?: string[];
  /** Called once after the debounce window with all unique changed files. */
  onBatch(files: string[]): void | Promise<void>;
};

export type WatcherHandle = {
  close(): void;
};

export function watchSources(opts: WatchOpts): WatcherHandle {
  const { cfg, onBatch } = opts;
  const debounceMs = opts.debounceMs ?? 80;
  const pending = new Set<string>();
  let timer: ReturnType<typeof setTimeout> | null = null;
  let running = false;
  let rerun = false;

  const flush = async () => {
    if (running) { rerun = true; return; }
    if (pending.size === 0) return;
    const files = [...pending];
    pending.clear();
    running = true;
    try {
      await onBatch(files);
    } finally {
      running = false;
      if (rerun) { rerun = false; setImmediate(flush); }
    }
  };

  const schedule = () => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => { timer = null; flush(); }, debounceMs);
  };

  const watchers: FSWatcher[] = [];

  const addWatch = (path: string, isDir: boolean, warnOnFail = false) => {
    try {
      const w = watch(path, isDir ? { recursive: true } : {}, (_event, filename) => {
        if (!filename) return;
        const base = filename.toString();
        if (isIgnored(base)) return;
        const full = isDir ? resolve(path, base) : path;
        pending.add(full);
        schedule();
      });
      watchers.push(w);
    } catch (e) {
      // Source dirs are often optional (e.g. no examples/) — stay quiet. But an
      // explicitly-declared path (config, plugin watchPaths) failing is worth a
      // heads-up so the developer knows it isn't being watched.
      if (warnOnFail) console.warn(`fcc: not watching ${path} (${(e as Error)?.message ?? "unavailable"})`);
    }
  };

  // Watch every source dir
  for (const src of cfg.sources) {
    addWatch(resolve(cfg.projectRoot, src.dir), true);
  }
  // Watch extra paths (config file, etc.). Detect dir-vs-file via stat.
  if (opts.extraPaths) {
    for (const p of opts.extraPaths) {
      let isDir = false;
      try { isDir = statSync(p).isDirectory(); } catch { /* missing path */ }
      addWatch(p, isDir, true);
    }
  }
  // Explicitly-recursive dirs (plugin watchPaths) — watched recursively even if
  // they don't exist yet, so a later-created pagecontent/ dir still triggers.
  if (opts.extraDirs) {
    for (const p of opts.extraDirs) addWatch(p, true, true);
  }

  return {
    close() {
      for (const w of watchers) {
        try { w.close(); } catch { /* ignore */ }
      }
    },
  };
}

function isIgnored(name: string): boolean {
  // editor temp files (atomic save), vim swap, emacs backup, dotfiles in dist
  return (
    name.includes(".tmp.") ||
    name.endsWith(".tmp") ||
    name.endsWith(".swp") ||
    name.endsWith("~") ||
    name.startsWith(".#") ||
    name === ".DS_Store"
  );
}
