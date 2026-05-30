// Companion files for a resource, enumerated from the SAME tab registry as the
// page tab strip (tabsFor) — one source of truth. Every non-"main" tab becomes
// a companion HTML page rendered through canonicalResource (so its strip marks
// the right tab active), plus an optional raw side-car (e.g. .json) with the
// internal __wasExample flag stripped. Returns [] when there are no companions.
export default async function companionPages(
    ctx: Context,
    opts: { resource: types.fcc.Resource },
): Promise<Array<{ name: string; content: string }>> {
    const r = opts.resource;
    const resolved = ctx.fns.core.tabsFor(ctx, { resource: r });
    const out: Array<{ name: string; content: string }> = [];

    for (const t of resolved) {
        if (t.d.kind === "main") continue; // writeBundle already wrote the main page
        out.push({ name: t.href, content: await ctx.fns.core.canonicalResource(ctx, { resource: r, activeId: t.d.id }) });
        if (t.rawName) {
            const clean = { ...(r.data as Record<string, unknown>) };
            delete (clean as { __wasExample?: boolean }).__wasExample;
            out.push({ name: t.rawName, content: JSON.stringify(clean, null, 2) });
        }
    }
    return out;
}
