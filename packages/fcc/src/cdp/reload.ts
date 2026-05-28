// Reload the open page and wait until document.readyState === "complete".
import send from "./send.ts";
import evaluate from "./evaluate.ts";
import type { ReloadOpts } from "./$type_CdpOpts.ts";

export default async function reload(opts: ReloadOpts = {}): Promise<{ ok: true }> {
  await send({ method: "Page.reload", session: opts.session, cdpUrl: opts.cdpUrl });
  const deadline = Date.now() + (opts.timeoutMs ?? 5000);
  while (Date.now() < deadline) {
    try {
      const ready = await evaluate({
        expression: `document.readyState === "complete"`,
        session: opts.session,
        cdpUrl: opts.cdpUrl,
      });
      if (ready) return { ok: true };
    } catch { /* navigation in flight; retry */ }
    await Bun.sleep(50);
  }
  throw new Error("cdp.reload: timed out waiting for page to settle");
}
