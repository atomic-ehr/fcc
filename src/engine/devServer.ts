// Dev-mode HTTP server. Serves the site by rendering one page on demand from
// the in-memory build state — the site plugin publishes a lazy renderer at
// `ts.shared.site.render(path)` each (incremental) build — and pushes a
// live-reload over SSE after every rebuild. No files are written to disk in dev.
import type { BuildState } from "./state.ts";

type RenderFn = (path: string) => Promise<{ contentType: string; body: string | Uint8Array } | null>;

export type DevServer = { port: number; broadcastReload(): void; close(): void };

// Tiny client: subscribe to the SSE stream, reload on a "reload" message.
const RELOAD_CLIENT =
    `<script>(()=>{try{const s=new EventSource("/__fcc/events");` +
    `s.onmessage=(e)=>{if(e.data==="reload")location.reload();};}catch(_){}})();</script>`;

export function startDevServer(opts: { state: BuildState; targetName?: string; port?: number }): DevServer {
    const { state } = opts;
    const targetName = opts.targetName ?? [...state.byTarget.keys()][0]!;
    const enc = new TextEncoder();
    const clients = new Set<ReadableStreamDefaultController>();

    const server = Bun.serve({
        port: opts.port ?? Number(process.env.SITE_PORT ?? 4321),
        idleTimeout: 0,                                   // keep SSE connections open
        async fetch(req) {
            const url = new URL(req.url);

            if (url.pathname === "/__fcc/events") {
                let ctl!: ReadableStreamDefaultController;
                const stream = new ReadableStream({
                    start(c) {
                        ctl = c;
                        try { c.enqueue(enc.encode(": ok\n\n")); clients.add(c); }   // register only once the stream is live
                        catch { try { c.close(); } catch { /* gone */ } }
                    },
                    cancel() { clients.delete(ctl); },
                });
                return new Response(stream, {
                    headers: { "content-type": "text/event-stream", "cache-control": "no-cache", connection: "keep-alive" },
                });
            }

            const render = (state.byTarget.get(targetName)?.shared as any)?.site?.render as RenderFn | undefined;
            if (!render) return new Response("fcc dev: site not ready yet", { status: 503 });

            let out: Awaited<ReturnType<RenderFn>>;
            try {
                out = await render(url.pathname);
            } catch (e) {
                const msg = e instanceof Error ? `${e.message}\n\n${e.stack ?? ""}` : String(e);
                return new Response(`fcc dev render error:\n\n${msg}`, { status: 500, headers: { "content-type": "text/plain" } });
            }
            if (!out) return new Response("Not found", { status: 404 });

            const isHtml = out.contentType.startsWith("text/html");
            const body = isHtml && typeof out.body === "string" ? inject(out.body) : out.body;
            const contentType = isHtml ? "text/html; charset=utf-8" : out.contentType;
            return new Response(body, { headers: { "content-type": contentType } });
        },
    });

    return {
        port: server.port,
        broadcastReload() {
            const msg = enc.encode("data: reload\n\n");
            const dead: ReadableStreamDefaultController[] = [];
            for (const c of clients) { try { c.enqueue(msg); } catch { dead.push(c); } }
            for (const c of dead) clients.delete(c);          // delete after iteration
        },
        close() {
            for (const c of clients) { try { c.close(); } catch { /* already gone */ } }
            server.stop(true);
        },
    };
}

function inject(html: string): string {
    return html.includes("</body>") ? html.replace("</body>", RELOAD_CLIENT + "</body>") : html + RELOAD_CLIENT;
}
