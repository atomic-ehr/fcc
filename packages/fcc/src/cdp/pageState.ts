// Snapshot of the currently-open page useful for assertions and tracing.
//   { url, title, h1, readyState, anchors, dataMarkers, jsErrors? }
import evaluate from "./evaluate.ts";
import type { SessionOpts } from "./$type_CdpOpts.ts";

export default async function pageState(opts: SessionOpts = {}): Promise<{
  url: string;
  title: string;
  h1: string | null;
  readyState: string;
  anchors: number;
  tables: number;
  dataMarkers: Record<string, number>;
}> {
  return await evaluate({
    expression: `(() => {
      const dataMarkers = {};
      for (const el of document.querySelectorAll("*")) {
        for (const a of el.attributes) {
          if (!a.name.startsWith("data-")) continue;
          dataMarkers[a.name] = (dataMarkers[a.name] || 0) + 1;
        }
      }
      const h1 = document.querySelector("h1");
      return {
        url: location.href,
        title: document.title,
        h1: h1 ? (h1.textContent || "").replace(/\\s+/g, " ").trim() : null,
        readyState: document.readyState,
        anchors: document.querySelectorAll("a[href]").length,
        tables: document.querySelectorAll("table").length,
        dataMarkers,
      };
    })()`,
    session: opts.session,
    cdpUrl: opts.cdpUrl,
  });
}
