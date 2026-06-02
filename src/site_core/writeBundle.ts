import { join, resolve } from "node:path";

// Builds the route table (buildRoutes) once, then:
//   • always publishes pctx.shared.site.render(path) — a lazy renderer the dev
//     server calls to render one page on demand from the in-memory graph;
//   • in prod (not dev) precomputes every route to disk, honoring changedIds
//     for incremental rebuilds (resource pages skipped when unchanged;
//     chrome/aggregate pages always rewritten).
export default async function writeBundle(
    ctx: Context,
    opts: { pluginCtx: types.fcc.PluginContext },
): Promise<void> {
    const pctx = opts.pluginCtx;
    const o = (ctx.state.site ?? {}) as types.site_core.SiteOpts;
    const outDir = resolve(pctx.config.projectRoot, pctx.target.out, o.out ?? "site");
    const imgDir = o.images ? resolve(pctx.config.projectRoot, o.images) : null;

    const { routes, notesCount } = await ctx.fns.site_core.buildRoutes(ctx, { pluginCtx: pctx });

    // Lazy renderer for the dev server (always fresh from the current graph). A
    // path with no route falls back to the IG's static images dir, so <img> works.
    (pctx.shared as any).site = {
        render: async (path: string): Promise<{ contentType: string; body: string | Uint8Array } | null> => {
            const route = routes.get(normalize(path));
            if (route) return { contentType: route.contentType, body: await route.render() };
            if (imgDir) {
                const f = Bun.file(join(imgDir, normalize(path)));
                if (await f.exists()) return { contentType: f.type || "application/octet-stream", body: new Uint8Array(await f.arrayBuffer()) };
            }
            return null;
        },
    };

    // Dev: the server renders on demand — don't precompute to disk.
    if (pctx.dev) {
        pctx.warn({ severity: "info", source: "fcc/site", message: `site ready (dev · lazy render): ${routes.size} route(s), ${notesCount} with intro/notes` });
        return;
    }

    // Prod: precompute every route. Resource pages honor changedIds; aggregates
    // (id:null) are always (re)written.
    const changed = pctx.changedIds;
    let count = 0;
    for (const [path, route] of routes) {
        if (route.id && changed && !changed.has(route.id)) continue;
        await Bun.write(join(outDir, path), await route.render());  // Bun.write creates parent dirs
        count++;
    }

    // Copy the IG's static images to the site root (IG-Publisher input/images/*
    // → <site>/*), so markdown `<img src="x.png">` resolves on the published site.
    let imgCount = 0;
    if (imgDir) {
        try {
            for await (const rel of new Bun.Glob("**/*").scan({ cwd: imgDir, onlyFiles: true })) {
                await Bun.write(join(outDir, rel), Bun.file(join(imgDir, rel)));
                imgCount++;
            }
        } catch { /* no images dir */ }
    }

    pctx.emitFile({ path: join(outDir, "index.html"), bytes: ctx.fns.site_core.bytes(ctx, { s: "" }) });
    pctx.warn({
        severity: "info", source: "fcc/site",
        message: changed
            ? `site: ${count} file(s) re-rendered + chrome (${notesCount} have intro/notes)`
            : `site rendered: ${count} files${imgCount ? ` + ${imgCount} image(s)` : ""} → ${outDir} (${notesCount} have intro/notes)`,
    });

    // Drop notes cache between full builds so file add/delete is picked up.
    if (!changed) (ctx.state.site as any).notesCache = null;
}

function normalize(path: string): string {
    let p = path.split("?")[0]!.split("#")[0]!;
    if (p.startsWith("/")) p = p.slice(1);
    if (p === "" ) p = "index.html";
    return p;
}
