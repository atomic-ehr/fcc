// Low-level CDP REST call. Most code should use higher-level helpers
// (cdp.click / cdp.evaluate / cdp.navigate / …) instead of this directly.
import type { SendOpts } from "./$type_CdpOpts.ts";

export default async function send(opts: SendOpts): Promise<any> {
  const cdpUrl = opts.cdpUrl ?? process.env.CDP_URL ?? "http://localhost:2229";
  const session = opts.session ?? process.env.CDP_SESSION ?? "fcc";
  const res = await fetch(`${cdpUrl}/s/${session}`, {
    method: "POST",
    body: JSON.stringify({ method: opts.method, params: opts.params ?? {} }),
  });
  return await res.json();
}
