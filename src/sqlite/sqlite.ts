import { Database } from "bun:sqlite";
import { indexEntry, packageEntries } from "fcc";
import type { Plugin, PluginContext, Bundle, IndexEntry } from "fcc";

type Opts = {
  /** Override the table name (default "ResourceList", IG Publisher's name). */
  table?: string;
};

export default function sqlite(opts: Opts = {}): Plugin {
  return [{ hook: "generateBundle", fn: sqliteFn, ...opts }];
}

// Build the IG-Publisher .index.db — a SQLite image of the conformance resources
// (one ResourceList table, examples excluded, exactly like .index.json) — and
// publish its BYTES on ctx.shared.sqlite for the npm plugin to ship as
// package/.index.db. Procedural + data-only: the db is a build-time detail
// (built, serialized, closed here); nothing OO leaks into the graph, and plugins
// meet only at ctx.shared (npm reads ctx.shared.sqlite.indexDb, a Uint8Array).
function sqliteFn(ctx: PluginContext, config: Record<string, unknown>, { bundle }: { bundle: Bundle }): void {
  const table = (config.table as string | undefined) ?? "ResourceList";
  if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(table)) {                    // interpolated into DDL — must be a bare identifier
    ctx.error(`sqlite: table name must be a bare SQL identifier, got ${JSON.stringify(table)}`);
  }

  // Same selection as npm's .index.json (shared helper → the two never drift),
  // conformance only, sorted for reproducible bytes.
  const rows = packageEntries(bundle)
    .filter(x => !x.example)
    .map(({ resource }) => indexEntry(resource))
    .sort((a, b) => (a.filename < b.filename ? -1 : a.filename > b.filename ? 1 : 0));

  (ctx.shared as Record<string, unknown>).sqlite = { indexDb: serialize(table, rows) };
}

// ResourceList columns in IG Publisher's order/casing.
const COLS = ["FileName", "ResourceType", "Id", "Url", "Version", "Kind", "Type", "Supplements", "Content", "ValueSet", "Derivation"] as const;

function colValues(e: IndexEntry): (string | null)[] {
  return [
    e.filename, e.resourceType, e.id ?? null,
    e.url ?? null, e.version ?? null, e.kind ?? null, e.type ?? null,
    e.supplements ?? null, e.content ?? null, e.valueSet ?? null, e.derivation ?? null,
  ];
}

// Build the in-memory db, serialize to bytes, and always close it. Schema mirrors
// IG Publisher's .index.db exactly (a fresh image of the same input is byte-stable).
function serialize(table: string, rows: IndexEntry[]): Uint8Array {
  const db = new Database(":memory:");
  try {
    db.run(`CREATE TABLE ${table} (
FileName       nvarchar NOT NULL,
ResourceType   nvarchar NOT NULL,
Id             nvarchar NULL,
Url            nvarchar NULL,
Version        nvarchar NULL,
Kind           nvarchar NULL,
Type           nvarchar NULL,
Supplements    nvarchar NULL,
Content        nvarchar NULL,
ValueSet       nvarchar NULL,
Derivation     nvarchar NULL,
PRIMARY KEY (FileName));`);
    const ins = db.prepare(`INSERT INTO ${table} (${COLS.join(",")}) VALUES (${COLS.map(() => "?").join(",")})`);
    for (const e of rows) ins.run(...colValues(e));
    return new Uint8Array(db.serialize());
  } finally {
    db.close();
  }
}
