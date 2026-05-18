import { watch, type FSWatcher } from "node:fs";
import { resolve } from "node:path";
import type { ResolvedConfig } from "./types.ts";

export type WatchOpts = {
  cfg: ResolvedConfig;
  /** Debounce window in ms. Batches rapid edits (e.g. editor save-then-format). */
  debounceMs?: number;
  /** Extra paths to watch in addition to source dirs (e.g. fcc.config.ts itself). */
  extraPaths?: string[];
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

  const addWatch = (path: string, isDir: boolean) => {
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
      // The dir may not exist — skip; on macOS recursive watch is supported.
      void e;
    }
  };

  // Watch every source dir
  for (const src of cfg.sources) {
    addWatch(resolve(cfg.projectRoot, src.dir), true);
  }
  // Watch extra single files (config etc.)
  if (opts.extraPaths) {
    for (const p of opts.extraPaths) addWatch(p, false);
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
