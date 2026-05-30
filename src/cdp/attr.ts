// Read an attribute of the first element matching `selector`.
import evaluate from "./evaluate.ts";
import type { AttrOpts } from "./$type_CdpOpts.ts";

export default async function attr(opts: AttrOpts): Promise<string | null> {
  return await evaluate({
    expression: `(() => {
      const el = document.querySelector(${JSON.stringify(opts.selector)});
      return el ? el.getAttribute(${JSON.stringify(opts.name)}) : null;
    })()`,
    session: opts.session,
    cdpUrl: opts.cdpUrl,
  });
}
