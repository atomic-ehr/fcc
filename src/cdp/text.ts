// Read textContent of the first element matching `selector` (trimmed).
import evaluate from "./evaluate.ts";
import type { TextOpts } from "./$type_CdpOpts.ts";

export default async function text(opts: TextOpts): Promise<string | null> {
  return await evaluate({
    expression: `(() => {
      const el = document.querySelector(${JSON.stringify(opts.selector)});
      return el ? (el.textContent || "").trim() : null;
    })()`,
    session: opts.session,
    cdpUrl: opts.cdpUrl,
  });
}
