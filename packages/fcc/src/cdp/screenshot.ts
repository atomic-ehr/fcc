// Capture a PNG screenshot. If `path` is set, writes to disk and returns
// { path, bytes }. Otherwise returns the raw base64 data.
import send from "./send.ts";
import type { ScreenshotOpts } from "./$type_CdpOpts.ts";

export default async function screenshot(opts: ScreenshotOpts = {}): Promise<{ path?: string; bytes?: number; base64?: string }> {
  const res = await send({
    method: "Page.captureScreenshot",
    params: { format: "png", captureBeyondViewport: !!opts.fullPage },
    session: opts.session,
    cdpUrl: opts.cdpUrl,
  });
  const base64 = res?.data as string | undefined;
  if (!base64) throw new Error("cdp.screenshot: empty response");

  if (opts.path) {
    const buf = Buffer.from(base64, "base64");
    await Bun.write(opts.path, buf);
    return { path: opts.path, bytes: buf.byteLength };
  }
  return { base64 };
}
