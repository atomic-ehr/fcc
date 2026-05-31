// A lazily-built in-memory SQLite index of the whole resource graph, backing the
// procedural `ctx.sql(query, params)` query API. One `resources` table, one row
// per resource, with a `json` column so plugins can `json_extract` into resource
// data. Built on demand and invalidated whenever the graph mutates (see
// indexResource/dropResource in state.ts) — a build that never queries pays
// nothing. The Database is an engine-internal detail: ctx.sql returns plain rows.
import { Database } from "bun:sqlite";
import type { Resource } from "./types.ts";

export function buildGraphDb(resources: Map<string, Resource>): Database {
  const db = new Database(":memory:");
  db.run(`CREATE TABLE resources (
    id           TEXT PRIMARY KEY,
    resourceType TEXT NOT NULL,
    rid          TEXT,
    url          TEXT,
    version      TEXT,
    example      INTEGER,
    json         TEXT
  );`);
  const ins = db.prepare(
    `INSERT OR REPLACE INTO resources (id, resourceType, rid, url, version, example, json) VALUES (?,?,?,?,?,?,?)`,
  );
  const insertAll = db.transaction((rows: Resource[]) => {
    for (const r of rows) {
      let json: string;
      try { json = JSON.stringify(r.data); } catch { json = "null"; }   // a non-serializable resource degrades, never crashes the index
      ins.run(
        r.id,
        r.resourceType,
        (r.data.id as string | undefined) ?? null,
        r.url ?? null,
        r.version ?? null,
        (r.data as { __wasExample?: boolean }).__wasExample ? 1 : 0,
        json,
      );
    }
  });
  insertAll([...resources.values()]);
  return db;
}
