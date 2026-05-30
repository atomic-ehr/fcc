// Click an element by CSS selector. Synthesises a real click() — works for
// links, buttons, and elements with event listeners.
import evaluate from "./evaluate.ts";
import type { ClickOpts } from "./$type_CdpOpts.ts";

export default async function click(opts: ClickOpts): Promise<{ clicked: boolean; href?: string }> {
  return await evaluate({
    expression: `(() => {
      const el = document.querySelector(${JSON.stringify(opts.selector)});
      if (!el) return { clicked: false, reason: "not found" };
      const href = el.tagName === "A" ? el.getAttribute("href") : null;
      el.click();
      return { clicked: true, href };
    })()`,
    session: opts.session,
    cdpUrl: opts.cdpUrl,
  });
}
