// Navigate the tab. Uses JS location assignment (Page.navigate is blocked in
// some preview environments). If `path` is given without `url`, builds
// `http://localhost:<port><path>` — `port` defaults to SITE_PORT env or 4321.
import evaluate from "./evaluate.ts";
import type { NavigateOpts } from "./$type_CdpOpts.ts";

export default async function navigate(opts: NavigateOpts): Promise<{ url: string }> {
  const port = opts.port ?? Number(process.env.SITE_PORT ?? 4321);
  const url = opts.url ?? `http://localhost:${port}${opts.path ?? "/"}`;
  await evaluate({
    expression: `window.location.href = ${JSON.stringify(url)}`,
    session: opts.session,
    cdpUrl: opts.cdpUrl,
    awaitPromise: false,
  });
  await Bun.sleep(opts.settleMs ?? 600);
  return { url };
}
